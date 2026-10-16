import { untrack } from "./computations";
import { effect } from "./effect";
import { OwlError } from "./owl_error";
import { Scope, scopeStack } from "./scope";
import { signal } from "./signal";
import { STATUS } from "./status";
import type { StripBrands } from "./types";

// -----------------------------------------------------------------------------
// Plugin system
// -----------------------------------------------------------------------------
//
// Two distinct concepts:
//   - PluginSet: a reactive collection of plugin *definitions* (classes). It
//     never instantiates anything. Sets form a tree (`createChild`): a child
//     set sees its own definitions plus its ancestors'.
//   - PluginHost: *starts* the plugins of a set and owns their instances.
//     Each instance it creates gets its own PluginScope (to which its hooks
//     are attached), destroyed with the host. It watches the set, so a plugin
//     added later is started too.
//     A host may have a parent host, in which case it only starts the
//     definitions its parent's set does not already cover, and delegates the
//     lookup of the others to its parent.
//
// Plugins are identified by a key: their class, or a key created with
// `createPluginKey` (for values that are not plugin instances). There are no
// string ids: two keys with the same name are different keys. A definition may give
// a factory (`use`) building the instance for that key, typically with a
// registration helper: `set.add(ORM, { use: registrations.create(MockORM) })`
// makes `usePlugin(ORM)` return an instance of MockORM. The key may be an
// abstract class, used as an interface.
//
// The lifetime of a plugin, given when adding it to a set
// (`set.add(P, { lifetime: "perHost" })`), tells when its instances are
// created:
//   - "shared" (default): one instance, created when the host that owns the
//     definition starts, and shared with the child hosts.
//   - "perHost": one instance per host, created on demand, i.e. when the host
//     is asked for it (typically by one of its plugins depending on it, while
//     the host starts). A host never creates it just because it is in a set.
//   - "transient": a new instance on every `usePlugin`, owned by the scope
//     calling it (its hooks, like onWillStart and onWillDestroy, are attached
//     to that scope).
// Whatever its lifetime, a plugin must be in the set to be used. A child set
// may redefine a plugin with another lifetime: the closest definition wins.
//
// `usePlugin` resolves plugins according to their lifetime, unless it is given
// another resolver (see `resolvers` in plugin_hooks.ts): a function receiving
// the plugin class, the current host and the consumer scope, and returning the
// instance. Custom resolvers are built on the same public host methods as the
// built-in ones.
//
// Components find their host through their scope (`scope.pluginHost`): the
// app's host, or the one of the closest ancestor calling `providePlugins`.
// -----------------------------------------------------------------------------

export class Plugin {
  setup() {}
}

// willStart callbacks of the plugin instances, while they have not settled (a
// rejected one is kept: the instance is never ready)
const pendingInstances = new WeakMap<object, Promise<unknown>>();

// whether a value can be tracked (WeakMap key) and have a setup method
function isObject(value: unknown): value is object {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}

/**
 * Resolves once the willStart callbacks of the given plugin instance (created
 * by a host, with its own scope) have settled. Resolves immediately for other
 * values, or when there is nothing to wait for.
 */
export function whenPluginReady(plugin: unknown): Promise<void> {
  const pending = isObject(plugin) ? pendingInstances.get(plugin) : undefined;
  return pending ? pending.then(() => {}) : Promise.resolve();
}

export type PluginLifetime = "shared" | "perHost" | "transient";

/** The key of a plugin: its class, or an abstract class used as an interface */
export type PluginClass<T extends Plugin = Plugin> = abstract new () => T;

/**
 * A key for a value that is not (necessarily) a plugin instance: a string, a
 * function, an object... `V` is the type of the value. Created with
 * `createPluginKey`. Each key is distinct: the name is only used in messages.
 */
export class PluginKey<V = unknown> {
  readonly name: string;
  /** The type given to `createPluginKey` (not used at runtime, for now) */
  readonly type: unknown;
  // phantom field, carrying the type of the value
  declare readonly __value?: V;

  constructor(name: string, type?: unknown) {
    this.name = name;
    this.type = type;
  }
}

/**
 * Creates a plugin key for a value of the type described by `type` (an Owl
 * type, e.g. `t.string()`), or given explicitly (`createPluginKey<string>(..)`).
 * The type is only used by TypeScript.
 */
export function createPluginKey<T>(name: string, type: T): PluginKey<StripBrands<T>>;
export function createPluginKey<V = unknown>(name: string): PluginKey<V>;
export function createPluginKey(name: string, type?: unknown): PluginKey {
  return new PluginKey(name, type);
}

/** Any plugin key: a plugin class, or a key created with createPluginKey */
export type AnyPluginKey = PluginClass | PluginKey<any>;

/** What a plugin key resolves to */
export type PluginValue<K extends AnyPluginKey> =
  K extends PluginKey<infer V> ? V : K extends PluginClass ? PluginInstance<K> : never;

/**
 * What factories and resolvers receive: helpers acting on a host (they do not
 * access the host itself), for a scope (`scope`). Without a key, the helpers
 * act on `key`.
 */
export interface PluginContext<K extends AnyPluginKey = AnyPluginKey> {
  /** The key being resolved (resolver) or created (factory) */
  key: K;
  /**
   * The scope the helpers act for: the consumer, i.e. the scope calling
   * `usePlugin` (resolver), or the scope of the new plugin (factory)
   */
  scope: Scope;
  /** The config of the host */
  config: Readonly<Record<string, any>>;
  /** The same helpers, acting on the parent host (null for a root host) */
  parent: PluginContext<K> | null;
  /** An instance, according to its lifetime (see PluginHost.getPlugin) */
  get(): PluginValue<K>;
  get<P extends AnyPluginKey>(key: P): PluginValue<P>;
  /** The closest existing instance in the host chain, or null */
  find(): PluginValue<K> | null;
  find<P extends AnyPluginKey>(key: P): PluginValue<P> | null;
  /**
   * A new instance (built by the factory of the key), owned by `scope`
   * (default), or stored in the host (`owner: "host"`, which must not already
   * have one)
   */
  create(options?: PluginCreateOptions): PluginValue<K>;
  create<P extends AnyPluginKey>(key: P, options?: PluginCreateOptions): PluginValue<P>;
  /**
   * The same helpers, acting on a new child host owned by `scope`: it is
   * destroyed with it, and `scope` waits for it. Its config inherits the
   * host's one, overridden by the given keys.
   */
  createChild(options?: { config?: Record<string, any> }): PluginContext<K>;
}

export interface PluginCreateOptions {
  owner?: "scope" | "host";
}

/**
 * What a factory receives: the helpers of a PluginContext (whose `scope` is
 * the scope of the new plugin), and `instantiate`. In a factory, `key` is the
 * plugin being created: other keys must be given explicitly (`get()` would be
 * a circular dependency).
 */
export interface PluginFactoryContext<
  K extends AnyPluginKey = AnyPluginKey,
> extends PluginContext<K> {
  /**
   * Instantiates a plugin class and sets it up (see `instantiatePlugin`),
   * without going through the host: the way for a factory to build a plugin
   */
  instantiate<C extends new () => Plugin>(C: C): InstanceType<C>;
}

export function pluginContext<K extends AnyPluginKey>(
  key: K,
  host: PluginHost,
  scope: Scope
): PluginContext<K> {
  return {
    key,
    scope,
    config: host.config,
    get parent() {
      return host.parent ? pluginContext(key, host.parent, scope) : null;
    },
    get: (P?: AnyPluginKey) => host.getPlugin(P ?? key, scope),
    find: (P?: AnyPluginKey) => host.findPlugin(P ?? key),
    create: (arg?: AnyPluginKey | PluginCreateOptions, options?: PluginCreateOptions) => {
      // keys are classes or PluginKey instances, never plain objects
      const isOptions = typeof arg === "object" && !(arg instanceof PluginKey);
      const P = arg === undefined || isOptions ? key : (arg as AnyPluginKey);
      const owner = (isOptions ? (arg as PluginCreateOptions) : options)?.owner ?? "scope";
      return owner === "host"
        ? host.createPlugin(P)
        : host.createPlugin(P, { owner: scope, store: false });
    },
    createChild: (options = {}) => {
      const child = host.createChild(undefined, { config: options.config });
      scope.onDestroy(() => child.destroy());
      child.start({ waitForParent: false });
      // called later (once the resolver or factory has returned): the plugins
      // created in the child host meanwhile are part of its readiness
      scope.willStart.push(() => child.ready);
      return pluginContext(key, child, scope);
    },
  } as PluginContext<K>;
}

/**
 * Builds a plugin: instantiates the class, then calls its `setup`. This is the
 * simple path used by factories (through `ctx.instantiate`): it runs in the active
 * scope (the scope of the new plugin, while a host creates it), and knows
 * nothing about hosts. The host path (PluginHost.createPlugin) checks the
 * definition, creates the scope of the plugin, calls the factory, and stores
 * the result.
 */
function instantiatePlugin<C extends new () => Plugin>(C: C): InstanceType<C> {
  const plugin = new C() as InstanceType<C>;
  plugin.setup();
  return plugin;
}

/**
 * Builds the instance of a plugin, ready to be used: a plugin built by a
 * factory is set up by it (use `ctx.instantiate(C)`, not `new C()`). It is called
 * with the scope of the new plugin as the active scope: hooks called by the
 * factory (or the plugin it builds) are attached to it. It may return any
 * value with the interface of the key (not necessarily a Plugin), or an
 * existing instance (e.g. `registrations.alias`).
 */
export type PluginFactory<V = unknown> = (ctx: PluginFactoryContext) => V;

export interface PluginAddOptions<K extends AnyPluginKey = AnyPluginKey> {
  lifetime?: PluginLifetime;
  /**
   * Builds the instance for this key (`registrations.create(key)` by default,
   * for a plugin class: required for a key created with createPluginKey)
   */
  use?: PluginFactory<PluginValue<K>>;
}

export interface PluginDefinition {
  lifetime: PluginLifetime;
  use: PluginFactory;
}

/** Helpers building the factories given to `PluginSet.add` (`use` option) */
export const registrations = {
  /** Instantiates the given class (by default, the key itself) */
  create<C extends new () => Plugin>(C: C): PluginFactory<InstanceType<C>> {
    return ({ instantiate }) => instantiate(C);
  },

  /**
   * The instance of another key, resolved (according to its own lifetime)
   * from the host creating it: both keys share the same instance.
   */
  alias<K extends AnyPluginKey>(key: K): PluginFactory<PluginValue<K>> {
    return ({ get }) => get(key);
  },

  /**
   * The closest existing instance of the key in the host chain (e.g. the one
   * of a parent host), or, if there is none, a new one built by `fallback`
   * (`registrations.create(key)` by default: required for a key created with
   * createPluginKey).
   */
  reuseInstance<V>(fallback?: PluginFactory<V>): PluginFactory<V> {
    return (ctx) => {
      const existing = ctx.find(ctx.key);
      if (existing !== null) {
        return existing as V;
      }
      if (fallback) {
        return fallback(ctx);
      }
      if (ctx.key instanceof PluginKey) {
        throw new OwlError(
          `Plugin key "${ctx.key.name}" has no instance to reuse, and no fallback factory`
        );
      }
      return ctx.instantiate(ctx.key as unknown as new () => Plugin) as V;
    };
  },
};

/**
 * What a plugin key resolves to: an object with the interface of the key
 * (without `setup`). It is usually an instance of the key, but a factory may
 * build another object with the same interface.
 */
export type PluginInstance<T extends PluginClass> = Omit<InstanceType<T>, "setup">;

// -----------------------------------------------------------------------------
// PluginSet
// -----------------------------------------------------------------------------

export class PluginSet {
  readonly parent: PluginSet | null;
  // definitions of this set (ancestors excluded), in insertion order
  private _plugins = signal.Map<AnyPluginKey, PluginDefinition>();

  constructor(parent: PluginSet | null = null) {
    this.parent = parent;
  }

  /**
   * Creates a new (root) set, with all the definitions visible from the given
   * sets (ancestors included, with their closest definition), in order. It is
   * a snapshot: later changes to the given sets are not reflected. Throws if a
   * plugin is in several of them, unless it is the same definition (e.g. from
   * a common ancestor).
   */
  static merge(...sets: PluginSet[]): PluginSet {
    const result = new PluginSet();
    untrack(() => {
      const merged = new Map<AnyPluginKey, PluginDefinition>();
      for (const set of sets) {
        for (const P of set.plugins()) {
          const definition = set.definitionOf(P)!;
          if (merged.get(P) !== definition) {
            // an existing definition always has a factory (any key type)
            result.add(P as PluginKey<any>, definition);
            merged.set(P, definition);
          }
        }
      }
    });
    return result;
  }

  createChild(): PluginSet {
    return new PluginSet(this);
  }

  add<K extends PluginClass>(P: K, options?: PluginAddOptions<K>): this;
  add<K extends PluginKey<any>>(
    P: K,
    options: PluginAddOptions<K> & { use: PluginFactory<PluginValue<K>> }
  ): this;
  add(P: AnyPluginKey, options: PluginAddOptions = {}): this {
    let use = options.use;
    if (!use) {
      if (P instanceof PluginKey) {
        throw new OwlError(`Plugin key "${P.name}" needs a factory (use option)`);
      }
      use = registrations.create(P as unknown as new () => Plugin);
    }
    const definition: PluginDefinition = { lifetime: options.lifetime ?? "shared", use };
    untrack(() => {
      const plugins = this._plugins();
      if (plugins.has(P)) {
        throw new OwlError(`Plugin "${P.name}" is already in the set`);
      }
      plugins.set(P, definition);
    });
    return this;
  }

  delete(P: AnyPluginKey): this {
    untrack(() => {
      this._plugins().delete(P);
    });
    return this;
  }

  /**
   * The closest definition of the plugin (this set first, then its ancestors),
   * or undefined if it is not in the set.
   */
  definitionOf(P: AnyPluginKey): PluginDefinition | undefined {
    return this._plugins().get(P) ?? this.parent?.definitionOf(P);
  }

  /** The lifetime of the closest definition of the plugin (see definitionOf) */
  lifetimeOf(P: AnyPluginKey): PluginLifetime | undefined {
    return this.definitionOf(P)?.lifetime;
  }

  /** Whether the plugin is defined in this set itself (ancestors excluded). */
  hasOwn(P: AnyPluginKey): boolean {
    return this._plugins().has(P);
  }

  /** Whether the plugin is defined in this set or one of its ancestors. */
  has(P: AnyPluginKey): boolean {
    return this.lifetimeOf(P) !== undefined;
  }

  /** Definitions of this set itself (ancestors excluded). */
  ownPlugins(): AnyPluginKey[] {
    return [...this._plugins().keys()];
  }

  /** All definitions visible from this set, ancestors first. */
  plugins(): AnyPluginKey[] {
    const result = this.parent ? this.parent.plugins() : [];
    for (const P of this._plugins().keys()) {
      if (!result.includes(P)) {
        result.push(P);
      }
    }
    return result;
  }
}

// -----------------------------------------------------------------------------
// PluginScope
// -----------------------------------------------------------------------------

/**
 * The scope of a plugin instance created by a host: its hooks (onWillStart,
 * onWillDestroy, effects, ...) are attached to it, and `usePlugin` finds the
 * host through it.
 */
export class PluginScope extends Scope {
  /** The key of the plugin */
  readonly plugin: AnyPluginKey;

  constructor(host: PluginHost, plugin: AnyPluginKey) {
    super(host.app, host);
    this.plugin = plugin;
  }
}

// -----------------------------------------------------------------------------
// PluginHost
// -----------------------------------------------------------------------------

interface PluginHostOptions {
  parent?: PluginHost | null;
  config?: Record<string, any>;
}

export class PluginHost {
  readonly app: any;
  readonly set: PluginSet;
  readonly parent: PluginHost | null;
  // Inherited from the parent host: own keys override the parent's ones (top
  // level only, the parent's value of an overridden key is not merged)
  readonly config: Readonly<Record<string, any>>;

  // Resolves once the host has started (after its parent is ready) and the
  // willStart callbacks of all plugins started so far have settled.
  ready: Promise<void> = Promise.resolve();

  // willStart callbacks of the plugins started so far. Kept apart from `ready`
  // because, before the host starts, `ready` may be waiting for the startup
  // itself (chaining onto it from the startup would never settle).
  private pending: Promise<unknown> = Promise.resolve();
  // - idle: `start` has not been called
  // - starting: `start` has been called, the initial plugins are not created
  //   yet (e.g. waiting for the parent)
  // - started: the initial plugins have been created
  // - destroyed: final, from any other state
  private state: "idle" | "starting" | "started" | "destroyed" = "idle";
  // number of plugin creations whose willStart callbacks have not settled yet
  // (a rejection keeps it from going back to 0: the host is never ready)
  private pendingCount = 0;
  // instances whose willStart callbacks have not settled yet
  private pendingPlugins = new Set<unknown>();
  // values may be falsy (e.g. a key for a number): check with `has`
  private instances = new Map<AnyPluginKey, unknown>();
  // Scopes of the plugins created by this host, in creation order: a plugin is
  // added once its setup is done, so after its dependencies
  private scopes: PluginScope[] = [];
  private stopWatching: (() => void) | null = null;
  // Plugins currently being instantiated, outermost first (cycle detection)
  private starting: AnyPluginKey[] = [];
  // The sets whose own definitions this host is responsible for: `set` and
  // its ancestors, up to (excluding) the parent host's set.
  private ownedSets: PluginSet[] = [];

  constructor(app: any, set: PluginSet, options: PluginHostOptions = {}) {
    const parent = options.parent ?? null;
    this.app = app;
    this.set = set;
    this.parent = parent;
    this.config = Object.assign(Object.create(parent?.config ?? null), options.config);
    let current: PluginSet | null = set;
    while (current && current !== parent?.set) {
      this.ownedSets.push(current);
      current = current.parent;
    }
    if (parent && current !== parent.set) {
      throw new OwlError("The plugin set of a host must descend from its parent host's set");
    }
  }

  /**
   * Creates a child host, with the same app. Its set must descend from this
   * host's set; by default, a new (empty) child set. Its config inherits this
   * host's one, overridden by the given keys.
   */
  createChild(
    set: PluginSet = this.set.createChild(),
    options: { config?: Record<string, any> } = {}
  ): PluginHost {
    return new PluginHost(this.app, set, { parent: this, config: options.config });
  }

  isDestroyed(): boolean {
    return this.state === "destroyed";
  }

  /**
   * Whether this host and its ancestors are started, with no pending willStart
   * callbacks. Synchronous counterpart of `whenReady`.
   */
  isReady(): boolean {
    return this.state === "started" && this.pendingCount === 0 && (this.parent?.isReady() ?? true);
  }

  /**
   * Resolves once this host and its ancestors are ready. Unlike `ready`, it
   * includes plugins created later in the ancestors (e.g. on demand).
   */
  whenReady(): Promise<void> {
    const parentReady = this.parent?.whenReady();
    return (parentReady ? Promise.all([parentReady, this.ready]) : this.ready).then(() => {});
  }

  /** @internal whether the willStart callbacks of the instance have settled */
  isPending(plugin: unknown): boolean {
    return this.pendingPlugins.has(plugin);
  }

  /**
   * Starts every plugin of the owned sets, and keeps watching them: plugins
   * added later are started as well. Returns `ready`. Starting a host starts
   * its ancestors first, if they are not started yet. Calling it again only
   * returns `ready`.
   *
   * A child host waits for its parent to be ready before starting its own
   * plugins: plugins depending on async plugins (with willStart callbacks)
   * should be defined in a child set, and started by a child host. A host
   * created while its parent may still be starting (e.g. by a resolver) can
   * start without waiting for it, with `waitForParent: false`.
   */
  start(options: { waitForParent?: boolean } = {}): Promise<void> {
    if (this.state !== "idle") {
      return this.ready;
    }
    this.state = "starting";
    // before reading the parent's readiness: until it starts, `ready` is
    // already resolved
    this.parent?.start();
    const waitForParent = options.waitForParent ?? true;
    const startNow = () => {
      if (this.state === "destroyed") {
        // destroyed while waiting for the parent
        return;
      }
      this.stopWatching = effect(() => {
        // child sets first, so that a plugin redefined in a child is owned here
        this.createShared(this.ownedSets.flatMap((set) => set.ownPlugins()));
      });
      this.state = "started";
      return this.pending;
    };
    // otherwise, start synchronously (setup errors are thrown here)
    const started =
      this.parent && waitForParent && !this.parent.isReady()
        ? this.parent.whenReady().then(startNow)
        : Promise.resolve(startNow());
    this.ready = started.then(() => {});
    return this.ready;
  }

  /**
   * Creates the shared plugins among `keys` (in their owning host, as
   * `getPlugin` does), if not created yet: other lifetimes are only created on
   * demand. Returns a promise resolved once the willStart callbacks of all the
   * plugins created so far by this host have settled. `start` creates the
   * plugins of the set with it; a subclass may use it to start them in several
   * awaited steps, before calling `super.start()`.
   */
  createPlugins(keys: Iterable<AnyPluginKey>): Promise<void> {
    this.createShared(keys);
    return this.pending.then(() => {});
  }

  private createShared(keys: Iterable<AnyPluginKey>) {
    untrack(() => {
      for (const P of keys) {
        // other lifetimes are only created on demand
        if (this.set.lifetimeOf(P) === "shared") {
          this.getPlugin(P);
        }
      }
    });
  }

  /**
   * Stops watching the set, and destroys the scopes of the plugins created by
   * this host, in reverse creation order: a plugin is destroyed before its
   * dependencies.
   */
  destroy() {
    if (this.state === "destroyed") {
      return;
    }
    this.state = "destroyed";
    this.stopWatching?.();
    const scopes = this.scopes.splice(0);
    for (let i = scopes.length - 1; i >= 0; i--) {
      scopes[i].finalize((e) => console.error(e));
    }
  }

  /**
   * Returns an instance of the given plugin, according to its lifetime:
   *   - shared: the instance of the host owning the definition (this one or an
   *     ancestor), created if not started yet
   *   - perHost: the instance of this host, created if needed
   *   - transient: a new instance, owned by `consumer` (or by a new scope of
   *     this host, if not given)
   */
  getPlugin<K extends AnyPluginKey>(P: K, consumer?: Scope): PluginValue<K> {
    const lifetime = untrack(() => this.set.lifetimeOf(P));
    if (!lifetime) {
      throw this.error(`Plugin "${P.name}" is not in the plugin set`);
    }
    if (lifetime === "transient") {
      return this.createPlugin(P, { owner: consumer, store: false });
    }
    if (this.instances.has(P)) {
      return this.instances.get(P) as PluginValue<K>;
    }
    if (lifetime === "shared" && !untrack(() => this.ownedSets.some((set) => set.hasOwn(P)))) {
      // defined higher in the set tree, i.e. in the parent host's set
      return this.parent!.getPlugin(P, consumer);
    }
    return this.createPlugin(P);
  }

  /**
   * Returns the closest existing instance of the given plugin (this host
   * first, then its ancestors), or null. Never creates an instance.
   */
  findPlugin<K extends AnyPluginKey>(P: K): PluginValue<K> | null {
    if (this.instances.has(P)) {
      return this.instances.get(P) as PluginValue<K>;
    }
    return this.parent ? this.parent.findPlugin(P) : null;
  }

  /**
   * Creates an instance of a plugin of the set, whatever its lifetime: the
   * host path of the creation. It checks the definition (and dependency
   * cycles), calls its factory with `owner` as the active scope (its hooks are
   * attached to it), and stores the result. The factory returns a ready
   * instance (see PluginFactory): the host never sets it up itself. Without
   * `owner`, the plugin gets its own scope, managed by this host (destroyed
   * with it, and whose willStart callbacks are part of `ready`). With `store`
   * (default), the instance is stored in this host, which must not already
   * have one.
   */
  createPlugin<K extends AnyPluginKey>(
    P: K,
    options: { owner?: Scope; store?: boolean } = {}
  ): PluginValue<K> {
    const store = options.store ?? true;
    if (this.state === "destroyed") {
      throw this.error(`Cannot create plugin "${P.name}" in a destroyed host`);
    }
    if (options.owner && options.owner.status > STATUS.MOUNTED) {
      throw this.error(`Cannot create plugin "${P.name}" in a destroyed scope`);
    }
    const definition = untrack(() => this.set.definitionOf(P));
    if (!definition) {
      throw this.error(`Plugin "${P.name}" is not in the plugin set`);
    }
    if (store && this.instances.has(P)) {
      throw this.error(`Plugin "${P.name}" already has an instance in this host`);
    }
    const index = this.starting.indexOf(P);
    if (index !== -1) {
      const cycle = [...this.starting.slice(index), P].map((p) => p.name).join(" -> ");
      throw new OwlError(`Circular plugin dependency: ${cycle}`);
    }
    const ownScope = options.owner ? null : new PluginScope(this, P);
    this.starting.push(P);
    scopeStack.push(options.owner ?? ownScope!);
    let plugin: PluginValue<K>;
    try {
      // class fields (e.g. `orm = usePlugin(ORM)`) run in the constructor, so
      // the owner must be the active scope here, not only during setup.
      // Errors thrown by the plugin itself are rethrown as is (Owl never wraps
      // user errors).
      // the factory returns a ready instance: built (and set up) by it, or an
      // existing one (e.g. an alias). `setup` is part of the construction: a
      // plugin cannot be resolved before its factory returns
      const ctx = pluginContext(P, this, options.owner ?? ownScope!) as PluginFactoryContext<K>;
      ctx.instantiate = instantiatePlugin;
      plugin = definition.use(ctx) as PluginValue<K>;
      if (store) {
        this.instances.set(P, plugin);
      }
    } catch (e) {
      if (store) {
        this.instances.delete(P);
      }
      // release what the plugin already registered (effects, ...)
      ownScope?.finalize((e) => console.error(e));
      throw e;
    } finally {
      scopeStack.pop();
      this.starting.pop();
    }
    if (ownScope) {
      this.scopes.push(ownScope);
      this.addWillStart(plugin, ownScope.willStart.splice(0));
    }
    return plugin;
  }

  /** An OwlError, mentioning the plugins being created, if any */
  private error(message: string): OwlError {
    if (this.starting.length) {
      message += ` (while creating ${this.starting.map((p) => p.name).join(" -> ")})`;
    }
    return new OwlError(message);
  }

  private addWillStart(plugin: unknown, callbacks: Array<() => any>) {
    if (!callbacks.length) {
      return;
    }
    const settled = Promise.all(callbacks.map((fn) => fn()));
    this.pendingCount++;
    this.pendingPlugins.add(plugin);
    if (isObject(plugin)) {
      pendingInstances.set(plugin, settled);
    }
    settled.then(
      () => {
        this.pendingCount--;
        this.pendingPlugins.delete(plugin);
        if (isObject(plugin)) {
          pendingInstances.delete(plugin);
        }
      },
      () => {}
    );
    this.pending = Promise.all([this.pending, settled]);
    if (this.state === "started") {
      // plugins added after the startup
      this.ready = this.pending.then(() => {});
    }
  }
}
