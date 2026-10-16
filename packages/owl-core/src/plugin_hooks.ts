import { OwlError } from "./owl_error";
import {
  PluginHost,
  PluginScope,
  PluginSet,
  pluginContext,
  whenPluginReady,
  type AnyPluginKey,
  type PluginContext,
  type PluginClass,
  type PluginValue,
} from "./plugin_manager";
import { useScope } from "./scope";
import { getDefault, types, type Optional, type StripBrands, type WithDefault } from "./types";
import { assertType } from "./validation";

// -----------------------------------------------------------------------------
// Resolvers
// -----------------------------------------------------------------------------

/**
 * Resolves a plugin for the scope calling `usePlugin` (`ctx.scope`). It may
 * return anything (an instance, null, a getter, ...): `usePlugin` returns what
 * its resolver returns.
 */
export type PluginResolver = <K extends AnyPluginKey>(ctx: PluginContext<K>) => unknown;

type ResolverArgs = [ctx: PluginContext<any>];

/**
 * Runs a resolver, and starts the willStart callbacks it registered on the
 * consumer (e.g. those of a transient plugin, or the readiness of a child
 * host), so that they can be awaited. They are replaced on the consumer by
 * callbacks returning their (already started) promises, so that a consumer
 * that has not started yet still waits for them. Needed when resolving after
 * the consumer has started (lazily): its callbacks would never run otherwise.
 */
function resolveAndStart(
  resolve: Function,
  ctx: PluginContext
): { value: unknown; started: Promise<unknown>[] } {
  const consumer = ctx.scope;
  const count = consumer.willStart.length;
  const value = resolve(ctx);
  const started = consumer.willStart.splice(count).map((fn) => Promise.resolve(fn()));
  for (const promise of started) {
    // rejections are reported by `awaited` (or by the consumer, if it has not
    // started yet)
    promise.catch(() => {});
    consumer.willStart.push(() => promise);
  }
  return { value, started };
}

function awaited(): <K extends AnyPluginKey>(ctx: PluginContext<K>) => Promise<PluginValue<K>>;
function awaited<A extends ResolverArgs, R>(inner: (...args: A) => R): (...args: A) => Promise<R>;
function awaited(inner?: Function) {
  const resolve = inner ?? resolvers.default();
  return (ctx: PluginContext) => {
    const { value, started } = resolveAndStart(resolve, ctx);
    const ready = Promise.all([...started, whenPluginReady(value)]);
    // guarded by the consumer's lifetime: rejects with an AbortError if it is
    // destroyed while waiting
    return ctx.scope.run(() => ready.then(() => value));
  };
}

/**
 * Built-in resolvers. They are all factories, so that they can be configured
 * or combined: `usePlugin(P, { resolve: resolvers.awaited(resolvers.newInstance()) })`.
 */
export const resolvers = {
  /** Resolves according to the plugin lifetime (see PluginHost.getPlugin). */
  default:
    () =>
    <K extends AnyPluginKey>(ctx: PluginContext<K>): PluginValue<K> =>
      ctx.get(),

  /**
   * The closest already created instance in the host chain, or null. Never
   * creates one: a plugin defined but not created yet resolves to null.
   */
  optional:
    () =>
    <K extends AnyPluginKey>(ctx: PluginContext<K>): PluginValue<K> | null =>
      ctx.find(),

  /** A new instance, owned by the consumer (like a transient plugin). */
  newInstance:
    () =>
    <K extends AnyPluginKey>(ctx: PluginContext<K>): PluginValue<K> =>
      ctx.create(),

  /**
   * A new instance, in a new child host owned by the consumer: its per host
   * dependencies are new instances as well, and destroying the consumer
   * destroys the whole child host. The child host config inherits the current
   * host's one, overridden by the given keys.
   */
  newHostInstance:
    (options: { config?: Record<string, any> } = {}) =>
    <K extends AnyPluginKey>(ctx: PluginContext<K>): PluginValue<K> =>
      ctx.createChild(options).create({ owner: "host" }),

  /**
   * The closest already created instance in the host chain, or a new instance
   * in the current host if there is none.
   */
  reuseInstance:
    () =>
    <K extends AnyPluginKey>(ctx: PluginContext<K>): PluginValue<K> =>
      ctx.find() ?? ctx.create({ owner: "host" }),

  /**
   * A promise, resolved with what `inner` (`resolvers.default()` by default)
   * resolves, once it is ready: the willStart callbacks of the instance, and
   * the ones `inner` registered on the consumer (e.g. a child host), have
   * settled. It rejects with an AbortError if the consumer is destroyed while
   * waiting. Useful to wait for a plugin of the same host in an onWillStart.
   */
  awaited,
};

const defaultResolver = resolvers.default();

// -----------------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------------

export interface UsePluginOptions<K extends AnyPluginKey, R> {
  // specialized for T (rather than a PluginResolver), so that the return type
  // of a (generic or inline) resolver is inferred for T
  resolve?: (ctx: PluginContext<K>) => R;
  /**
   * Returns a getter, resolving the plugin on its first call (in the scope of
   * the caller of usePlugin), then returning the same value. Useful to break
   * dependency cycles, or to create a plugin only when it is needed. Nothing
   * waits for what the getter creates: combine it with `resolvers.awaited()`
   * to wait for it.
   */
  lazy?: boolean;
}

/**
 * Returns the given plugin, as resolved by the resolver (`resolvers.default()`
 * by default) from the host of the current scope (a plugin or a component):
 * its instance, or whatever the resolver returns. With `lazy`, returns a
 * getter instead.
 */
export function usePlugin<K extends AnyPluginKey, R = PluginValue<K>>(
  P: K,
  options: UsePluginOptions<K, R> & { lazy: true }
): () => R;
export function usePlugin<K extends AnyPluginKey, R = PluginValue<K>>(
  P: K,
  options?: UsePluginOptions<K, R> & { lazy?: false }
): R;
export function usePlugin<K extends AnyPluginKey, R>(
  P: K,
  options: UsePluginOptions<K, R> = {}
): R | (() => R) {
  const scope = useScope();
  const host = scope.pluginHost;
  const resolve = options.resolve ?? (defaultResolver as (ctx: PluginContext<K>) => R);
  if (options.lazy) {
    let isResolved = false;
    let value: R;
    return () => {
      if (!isResolved) {
        // throws if the consumer is destroyed
        value = scope.run(() => resolveAndStart(resolve, pluginContext(P, host, scope)).value as R);
        isResolved = true;
      }
      return value;
    };
  }
  // the consumer is the active scope while resolving: hooks called by a
  // resolver (e.g. onWillStart) are attached to it
  const instance = scope.run(resolve, pluginContext(P, host, scope));
  if (scope instanceof PluginScope) {
    if (host.app?.dev && instance && host.isPending(instance)) {
      console.warn(
        `Plugin "${scope.plugin.name}" depends on "${P.name}", whose onWillStart has not ` +
          `settled yet: "${scope.plugin.name}" is set up before "${P.name}" is ready. ` +
          `Define "${P.name}" in a parent host, or use resolvers.awaited(), to wait for it.`
      );
    }
  } else if (!host.isReady()) {
    // e.g. a component, using a plugin created on demand (or still starting):
    // it waits for it before rendering
    scope.willStart.push(() => host.whenReady());
  }
  return instance;
}

/**
 * Returns the value of a key of the config of the host of the current plugin.
 * In dev mode, the value is validated against the given type, whose default
 * value (if any) is used when the key is not set.
 */
export function useConfig<T = any>(key: string): T;
export function useConfig<T>(key: string, type: WithDefault<T>): T;
export function useConfig<T>(key: string, type: Optional<T>): T | undefined;
export function useConfig<T>(key: string, type: T): StripBrands<T>;
export function useConfig(key: string, type?: any): any {
  const scope = useScope();
  if (!(scope instanceof PluginScope)) {
    throw new OwlError("useConfig can only be called from a plugin");
  }
  const value = scope.pluginHost.config[key];
  if (scope.app?.dev && type) {
    // validate the value only: the config object inherits from its parent's one
    assertType({ [key]: value }, types.object({ [key]: type }), "Config does not match the type");
  }
  return value === undefined ? getDefault(type)?.() : value;
}

// -----------------------------------------------------------------------------
// Plugin hosts
// -----------------------------------------------------------------------------

/**
 * The plugins of a new host: a list of plugin classes (added with their default
 * definition to a new set), a function filling a new set (for other
 * definitions), or a set.
 */
export type PluginsInput = PluginClass[] | PluginSet | ((set: PluginSet) => void);

export interface PluginHostInputOptions {
  /** Config of the new host, inheriting the current host's one (unless isolated) */
  config?: Record<string, any>;
  /**
   * Creates a root host, not linked to the current one: the plugins of the
   * current host and its ancestors are not visible from it, its config is
   * only the given one, and a given set may be any set.
   */
  isolated?: boolean;
}

/**
 * Creates (without starting it) a new host for the given plugins: a child of
 * `current`, or a root host with `isolated`. A new set is a child of the
 * current host's set (a root set with `isolated`); a given set must descend
 * from it (unless isolated).
 */
export function createPluginHost(
  current: PluginHost,
  plugins: PluginsInput | undefined,
  options: PluginHostInputOptions = {}
): PluginHost {
  let set: PluginSet;
  if (plugins instanceof PluginSet) {
    set = plugins;
  } else {
    set = options.isolated ? new PluginSet() : current.set.createChild();
    if (Array.isArray(plugins)) {
      for (const P of plugins) {
        set.add(P);
      }
    } else {
      plugins?.(set);
    }
  }
  return options.isolated
    ? new PluginHost(current.app, set, { config: options.config })
    : current.createChild(set, { config: options.config });
}

/**
 * Creates and starts a new plugin host: a child of the host of the current
 * scope (a plugin or a component), or a root host with `isolated`. It does not
 * change the current host (`usePlugin` keeps resolving from it): use the
 * returned host (`getPlugin`, ...) to access its plugins.
 *
 * The current scope waits for the new host to be ready, and destroys it with
 * itself (it may be destroyed before, with `host.destroy()`).
 */
export function usePluginHost(
  plugins?: PluginsInput,
  options: PluginHostInputOptions = {}
): PluginHost {
  const scope = useScope();
  const host = createPluginHost(scope.pluginHost, plugins, options);
  scope.onDestroy(() => host.destroy());
  // a plugin is part of the readiness of its host: a child host waiting for
  // it (its parent) would wait for itself
  host.start({ waitForParent: !(scope instanceof PluginScope) });
  if (!host.isReady()) {
    scope.willStart.push(() => host.ready);
  }
  return host;
}
