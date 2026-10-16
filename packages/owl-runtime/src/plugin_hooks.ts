import {
  createPluginHost,
  OwlError,
  onWillDestroy,
  onWillStart,
  STATUS,
  useScope,
  type PluginHost,
  type PluginHostInputOptions,
  type PluginsInput,
} from "@odoo/owl-core";
import type { App, ComponentInstance, Root, RootConfig } from "./app";
import type { ComponentConstructor } from "./component";
import { ComponentNode, getComponentScope } from "./component_node";
import { forwardErrorToParent } from "./rendering/error_handling";
import type { GetProps } from "./props";

export { resolvers, useConfig, usePlugin, usePluginHost } from "@odoo/owl-core";

export type ProvidePluginsOptions = PluginHostInputOptions;

/**
 * Starts a child host for the current component and its descendants: plugins
 * used afterwards in this component (and in its descendants) are resolved from
 * it. The host is destroyed with the component, which waits for it to be ready
 * before rendering.
 *
 * `plugins` is either:
 * - a list of plugin classes, added (with their default definition) to a new
 *   child set of the current host's set,
 * - a function filling a new child set (for other definitions),
 * - a set descending from the current host's set.
 * With `isolated`, the new set is a root set, and a given set may be any set.
 */
export function providePlugins(plugins?: PluginsInput, options: ProvidePluginsOptions = {}): void {
  const node = getComponentScope();
  const host = createPluginHost(node.pluginHost, plugins, options);
  node.pluginHost = host;
  onWillDestroy(() => host.destroy());
  host.start();
  if (!host.isReady()) {
    onWillStart(() => host.whenReady());
  }
}

export interface CreateRootOptions<P> extends RootConfig<P>, PluginHostInputOptions {
  /**
   * Plugins of a new host for the root (see providePlugins): a child of the
   * current host, or a root host with `isolated`
   */
  plugins?: PluginsInput;
}

export type CreateRoot = <T extends ComponentConstructor>(
  C: T,
  options?: CreateRootOptions<GetProps<ComponentInstance<T>>>
) => Root<T>;

/**
 * Returns a function creating roots (see `App.createRoot`) from the current
 * scope (a component or a plugin). It can be called at any time (e.g. in an
 * event handler), until the current scope is destroyed. A root uses:
 * - by default, the plugin host of the current scope: it sees the plugins
 *   provided to it (by `providePlugins`, in the scope or its ancestors);
 * - with `plugins` or `config`, a new child host of the current one;
 * - with `isolated`, a new root host (only the given plugins and config).
 * A new host is started right away (mounting the root waits for it), and
 * destroyed with its root. The roots still alive are destroyed with the
 * current scope. Created by a component, a root forwards its errors to it (its
 * `onError` handlers, then its ancestors'), like a Portal.
 */
export function useCreateRoot(): CreateRoot {
  const scope = useScope();
  const app: App = scope.app;
  const roots = new Set<Root<any>>();
  // plugins have no error handlers: errors of their roots go to the app
  const onError = scope instanceof ComponentNode ? forwardErrorToParent(scope) : undefined;
  onWillDestroy(() => {
    for (const root of roots) {
      root.destroy();
    }
  });
  return (C, options = {}) => {
    if (scope.status > STATUS.MOUNTED) {
      throw new OwlError(`Cannot create root "${C.name}": its creator is destroyed`);
    }
    const { props, plugins, config, isolated } = options;
    let host: PluginHost = scope.pluginHost;
    const ownsHost = plugins !== undefined || config !== undefined || !!isolated;
    if (ownsHost) {
      host = createPluginHost(scope.pluginHost, plugins, { config, isolated });
      host.start();
    }
    const root = app.createRoot(C, { props, pluginHost: host, onError } as RootConfig<any>);
    const destroy = root.destroy;
    root.destroy = () => {
      roots.delete(root);
      destroy();
      if (ownsHost) {
        host.destroy();
      }
    };
    roots.add(root);
    return root;
  };
}
