# Plugins

## Overview

Plugins are self-contained units of shared state and logic. They replace Owl 2's
`env` and services with a more type-safe and composable approach.

A plugin can hold reactive state (signals, computed values), perform side effects,
depend on other plugins, and be shared across a component subtree or the entire
application. Plugins have a simple lifecycle: `setup` then `destroy`.

```js
class Clock extends Plugin {
  value = signal(0);

  setup() {
    const interval = setInterval(() => {
      this.value.set(this.value() + 1);
    }, 1000);
    onWillDestroy(() => clearInterval(interval));
  }
}
```

The plugin system has two parts:

- a [`PluginSet`](#plugin-sets) holds plugin _definitions_ (classes). It never
  creates anything by itself;
- a [`PluginHost`](#plugin-hosts) starts the plugins of a set and owns their
  instances. The app has one, and `providePlugins` creates one per component
  that calls it.

## Defining a Plugin

A plugin is a class that extends `Plugin`. It can define reactive state as
class fields and use `setup()` for initialization:

```js
class NotificationManager extends Plugin {
  notifications = signal.Array([]);

  add(message) {
    this.notifications().push({ id: Date.now(), message });
  }

  dismiss(id) {
    const list = this.notifications();
    const index = list.findIndex((n) => n.id === id);
    if (index >= 0) {
      list.splice(index, 1);
    }
  }
}
```

A plugin is identified by its class: there is no string id. Values that are
not plugins can be given a [plugin key](#plugin-keys).

## Using a Plugin

The `usePlugin()` function imports a plugin instance. It can be used in component
class fields or in the `setup()` method:

```js
class App extends Component {
  static template = xml`
    <div>
      <t t-foreach="this.notifications.notifications()" t-as="n" t-key="n.id">
        <div t-out="n.message" t-on-click="() => this.notifications.dismiss(n.id)"/>
      </t>
    </div>`;

  notifications = usePlugin(NotificationManager);
}
```

The return value is the plugin instance with full type information (minus the
`setup` method). Any reactive values on the plugin (signals, computed) are
tracked automatically when read during a component render.

A plugin must be in the plugin set of the current host (or of one of its
ancestors): otherwise, `usePlugin` throws.

## Plugin Sets

A `PluginSet` is a reactive collection of plugin definitions. Plugins are added
with `add()`, which can be chained:

```js
const plugins = new PluginSet().add(NotificationManager).add(RouterPlugin);
```

- `add(P, options)` adds a definition (see [lifetimes](#lifetimes) and
  [factories](#factories-and-overrides) for the options). Adding a plugin
  already in the set throws (a child set can redefine it).
- `delete(P)` removes a definition.
- `has(P)`, `hasOwn(P)`, `plugins()`, `ownPlugins()` and `definitionOf(P)`
  inspect the set.
- `createChild()` creates a child set, which sees its own definitions and the
  ones of its ancestors.
- `PluginSet.merge(...sets)` creates a new set with all the definitions of the
  given sets (a snapshot: later changes to these sets are not reflected). It
  throws if a plugin is in several of them, unless it is the same definition
  (e.g. from a common ancestor).

Sets are reactive: a plugin added to a set after its host has started is
started as well.

## Providing Plugins

### App-level plugins

Pass the plugins when mounting the application. These plugins are available
to all components, and live as long as the app:

```js
await mount(RootComponent, document.body, {
  plugins: [NotificationManager, RouterPlugin],
});
```

The list is added, with default definitions, to a new set. For other
definitions, or to add plugins later, pass a set instead:

```js
const plugins = new PluginSet().add(NotificationManager).add(Dialog, { lifetime: "perHost" });
await mount(RootComponent, document.body, { plugins });
```

### Component-level plugins

Use `providePlugins()` in a component's `setup()` to make plugins available
only to that component and its descendants:

```js
class FormView extends Component {
  static template = xml`<FormRenderer/>`;

  setup() {
    providePlugins([FormModel, FormValidator]);
  }
}
```

The plugins are added, with their default definition, to a new child set of
the current one. For other definitions (lifetimes, factories, plugin keys),
it takes a function filling that set:

```js
providePlugins((set) => set.add(FormModel).add(Dialog, { lifetime: "perHost" }));
```

It also accepts a set, which must descend from the current host's set.

`providePlugins` creates a child host: plugins of the ancestors (and of the
app) are still visible from it. Plugins provided at the component level are
destroyed when the component is destroyed.

With the `isolated` option, the new host is not linked to the current one:
plugins of the ancestors are not visible from it, its config is only the given
one, and the set can be any set (the function form fills a new root set):

```js
providePlugins((set) => set.add(EditorPlugin), { isolated: true });
```

## Plugin Dependencies

A plugin can depend on other plugins by calling `usePlugin()` in its class
fields or `setup()`. Dependencies are started on demand, so the order of the
plugins in the set does not matter:

```js
class RouterPlugin extends Plugin {
  currentRoute = signal("/");

  navigateTo(url) {
    this.currentRoute.set(url);
  }
}

class ActionPlugin extends Plugin {
  router = usePlugin(RouterPlugin);

  doAction(action) {
    // ... perform action ...
    this.router.navigateTo("/result");
  }
}
```

When `ActionPlugin` is started, `RouterPlugin` is started first if it hasn't
been started already. Both must be in the set. Circular dependencies are
detected, and reported with the dependency path (`A -> B -> A`): a
[lazy resolver](#lazy-resolution) breaks them.

A dependency is resolved from the host owning the plugin that depends on it:
a plugin provided by a parent host never sees the plugins of its children.

## Lifetimes

The lifetime of a plugin, given when adding it to a set, tells when its
instances are created:

```js
const plugins = new PluginSet()
  .add(RouterPlugin) // "shared" (default)
  .add(DialogPlugin, { lifetime: "perHost" })
  .add(FormatterPlugin, { lifetime: "transient" });
```

- **`shared`** (default): one instance, created when the host owning the
  definition starts, and shared with the child hosts.
- **`perHost`**: one instance per host, created on demand, i.e. the first time
  it is used from that host. A host never creates it just because it is in its
  set.
- **`transient`**: a new instance on every `usePlugin`, owned by the caller:
  its hooks (`onWillStart`, `onWillDestroy`, ...) are attached to the calling
  component or plugin, and it is destroyed with it.

A child set may redefine a plugin with another lifetime: the closest
definition wins.

## Factories and Overrides

A definition can give a factory (`use`) building the instance of a plugin key.
By default, the key itself is instantiated. Factories are usually built with
the `registrations` helpers:

- **`registrations.create(C)`**: instantiates the class `C`.
- **`registrations.alias(Key)`**: the instance of another key, resolved
  (according to its own lifetime) from the host creating it: both keys share
  the same instance.
- **`registrations.reuseInstance(fallback?)`**: the closest existing instance
  of the key in the host chain (e.g. the one of a parent host), or, if there is
  none, a new one built by `fallback` (by default, the key itself is
  instantiated; a fallback is required for a [plugin key](#plugin-keys)).

With `reuseInstance`, a child set can make its host share
the instance of an ancestor instead of creating its own, and a `perHost`
plugin is created only by the first host that needs it in a branch:

```js
set.add(Cache, { lifetime: "perHost", use: registrations.reuseInstance() });
```

`registrations.create` registers another class under a key: `usePlugin(Key)`
then returns an instance of that class.

```js
set.add(ORM, { use: registrations.create(MockORM) });
```

This is useful to replace a plugin in tests, or to customize a plugin for a
subtree:

```js
class ThemePlugin extends Plugin {
  color = "blue";
}

class DarkThemePlugin extends ThemePlugin {
  color = "dark-blue";
}

class DarkSection extends Component {
  setup() {
    providePlugins((set) => set.add(ThemePlugin, { use: registrations.create(DarkThemePlugin) }));
  }
}
```

Components inside `DarkSection` get a `DarkThemePlugin` when calling
`usePlugin(ThemePlugin)`, while components outside still get the original.

The key can be an abstract class, used as an interface. With an alias, the
interface and the implementation share the same instance:

```ts
abstract class Logger extends Plugin {
  abstract log(message: string): void;
}

set.add(ConsoleLogger).add(Logger, { use: registrations.alias(ConsoleLogger) });
// usePlugin(Logger) === usePlugin(ConsoleLogger)
```

A factory can also be written directly. It does not receive the host creating
the instance, but a _plugin context_: helpers acting on that host, for a scope.
[Resolvers](#custom-resolvers) receive the same helpers. Without a key, they act
on `key`:

- `key`: the plugin key being created (factory) or resolved (resolver);
- `scope`: the scope of the new plugin (factory), or the scope calling
  `usePlugin` (resolver);
- `config`: the config of the host;
- `get(key?)`: an instance, according to its lifetime;
- `find(key?)`: the closest existing instance in the host chain, or `null`;
- `create(key?, { owner })`: a new instance, built by the factory of the key,
  owned by `scope` (default) or stored in the host (`owner: "host"`);
- `createChild({ config })`: the same helpers, acting on a new child host
  owned by `scope` (destroyed with it, and awaited by it);
- `parent`: the same helpers, acting on the parent host (`null` for a root
  host).

A factory also receives `instantiate(C)`, which instantiates the plugin class
`C` and calls its `setup`, without going through the host (with `new C()`,
`setup` is not called). In a factory, `key` is the plugin being created: always
give the key to the other helpers (`get()` would be a circular dependency).

A factory is called with the scope of the new plugin as the active scope (hooks
it calls are attached to the plugin), and returns a ready instance. For
example, to choose the implementation from the config:

```js
set.add(Storage, {
  use: ({ config, instantiate }) => instantiate(config.test ? MemoryStorage : LocalStorage),
});
```

The host only checks the definition, creates the scope of the plugin, calls
the factory and stores what it returns: it never sets up an instance itself.
So a factory may also return an existing instance (as `alias` and
`reuseInstance` do), which is not set up again.

A factory may return any object with the (public) interface of the key, not
necessarily a `Plugin`. It still has the scope of a plugin, so its factory can
register hooks. This is useful for mocks, or to expose a non-Owl object as a
plugin:

```ts
abstract class Bus extends Plugin {
  abstract send(message: string): void;
}

set.add(Bus, {
  use: () => {
    const socket = new WebSocket(url);
    onWillDestroy(() => socket.close());
    return { send: (message: string) => socket.send(message) };
  },
});
```

`usePlugin(Bus) instanceof Bus` is then `false`: consumers should rely on the
interface of the key, not on its class.

## Plugin Keys

A plugin key, created with `createPluginKey`, identifies a value that is not a
plugin instance: a string, a function, an object... It is used like a plugin
class: added to a set (with a factory, which is required), provided to a
subtree, overridden in a child set, and imported with `usePlugin`.

```js
const ApiUrl = createPluginKey("apiUrl", t.string());

class Orm extends Plugin {
  url = usePlugin(ApiUrl); // string
}

const plugins = new PluginSet().add(ApiUrl, { use: () => "/api" }).add(Orm);
```

The second argument is an [Owl type](types_validation.md): it gives the type of
the value to TypeScript (it is not validated at runtime). In TypeScript, the
type can also be given explicitly: `createPluginKey<string>("apiUrl")`.

Each call creates a distinct key: the name is only used in error messages.
Keys should be created once, and exported, like plugin classes.

Lifetimes, factories (including `registrations.alias`), resolvers and the
`lazy` option work the same with plugin keys. A plugin key is the way to
provide something per subtree that is not a plugin; the config remains the
place for the settings of a host.

## Resolvers

By default, `usePlugin` resolves a plugin according to its lifetime. It can be
given another resolver:

```js
class Customer extends Component {
  orm = usePlugin(ORM, { resolve: resolvers.newInstance() });
}
```

`usePlugin` returns what its resolver returns: an instance, `null`, a
promise, ... and its type follows (e.g. `ORM | null` with
`resolvers.optional()`).

The built-in resolvers are all factories, so that they can be configured or
combined. They are:

- **`resolvers.default()`**: according to the lifetime (see above).
- **`resolvers.optional()`**: the closest already created instance in the host
  chain, or `null`. It never creates one: a plugin defined but not created yet
  resolves to `null`.
- **`resolvers.newInstance()`**: a new instance, owned by the caller (like a
  transient plugin), whatever the lifetime.
- **`resolvers.newHostInstance(options?)`**: a new instance, in a new child
  host owned by the caller. Its `perHost` dependencies are new instances as
  well, and destroying the caller destroys the whole child host.
  `options.config` overrides keys of the child host config. The instance is
  private to the caller: to share a new host with the descendants of a
  component, use `providePlugins`.
- **`resolvers.reuseInstance()`**: the closest already created instance in the
  host chain, or a new instance in the current host if there is none.
- **`resolvers.awaited(inner?)`**: a promise, resolved with what `inner`
  (`resolvers.default()` by default) resolves, once it is ready (its
  `onWillStart` callbacks, and what `inner` registered on the caller, e.g. a
  child host, have settled). It rejects with an `AbortError` if the caller is
  destroyed while waiting.

### Lazy resolution

With the `lazy` option, `usePlugin` returns a getter: the plugin is resolved
(with the given resolver, if any) on its first call, in the scope of the
caller of `usePlugin`, and the getter then returns the same value. It throws
if it is first called after the caller is destroyed.

It is useful to break a dependency cycle, or to create a plugin only when it
is needed:

```js
class ProjectPlugin extends Plugin {
  templates = usePlugin(TemplatePlugin);
}

class TemplatePlugin extends Plugin {
  // ProjectPlugin depends on this plugin: resolve it when it is used
  project = usePlugin(ProjectPlugin, { lazy: true });

  openTemplate(template) {
    this.project().create(template);
  }
}
```

It works with any resolver:

```js
// () => Dialog | null
dialog = usePlugin(Dialog, { lazy: true, resolve: resolvers.optional() });
```

Nothing waits for a plugin created by a lazy getter: the caller has already
started (or rendered). Its `onWillStart` callbacks are run, but not awaited.
Combine `lazy` with `resolvers.awaited()` to wait for it:

```js
class Report extends Component {
  exporter = usePlugin(ExportPlugin, { lazy: true, resolve: resolvers.awaited() });

  async export() {
    const exporter = await this.exporter();
    exporter.export(this.data);
  }
}
```

### Custom resolvers

A resolver is a function receiving a [plugin context](#factories-and-overrides)
(whose `scope` is the scope calling `usePlugin`), and returning anything. The
built-in resolvers are built on the same helpers:

```js
const fromParent = (ctx) => ctx.parent?.find() ?? null;

class Panel extends Component {
  theme = usePlugin(ThemePlugin, { resolve: fromParent });
}
```

Resolvers run with the consumer as the active scope: hooks called by a
resolver are attached to it.

## Configuration

Plugins can read configuration values using the `useConfig()` hook. Config is
given to a host: in the `mount()` options for the app, or in the options of
`providePlugins()`:

```js
class ApiPlugin extends Plugin {
  baseUrl = useConfig("apiBaseUrl", t.string());
  timeout = useConfig("apiTimeout", t.number().optional(5000));

  setup() {
    // use this.baseUrl and this.timeout
  }
}
```

A config key is made optional with
[`.optional()`](types_validation.md#optionalvalue) on its type. In dev mode,
the type validator (second argument) is used to check the value. A default
value can be declared in the type with
[`.optional(value)`](types_validation.md#optionalvalue).

Providing config at app level:

```js
await mount(RootComponent, document.body, {
  plugins: [ApiPlugin],
  config: { apiBaseUrl: "https://api.example.com" },
});
```

Or at component level:

```js
setup() {
  providePlugins((set) => set.add(ApiPlugin), { config: { apiBaseUrl: "/api" } });
}
```

A child host inherits the config of its parent, and the keys it is given
override the parent's ones (top level only: an overridden key is replaced,
not merged). A plugin reads the config of the host owning it: a `shared`
plugin provided by the app reads the app's config, even when used from a
component providing another config.

## Resources

Plugins can define `Resource` fields — ordered collections that components
can contribute to. Items are automatically removed when the contributing
component is destroyed:

```js
class SystrayPlugin extends Plugin {
  items = new Resource({ name: "systray-items" });

  display = computed(() => {
    return this.items.items();
  });
}
```

Components contribute items by calling `use()` on the resource:

```js
class MyComponent extends Component {
  systray = usePlugin(SystrayPlugin);

  setup() {
    this.systray.items.use({ label: "Settings", action: () => this.openSettings() });
  }
}
```

When `MyComponent` is destroyed, its contributed items are automatically
removed from the resource.

## Async Initialization

A plugin can load data asynchronously during startup with `onWillStart()`. The
owning `mount()` call (or `providePlugins()` owner component) waits for all
plugin `onWillStart` callbacks to settle before rendering:

```js
class SessionPlugin extends Plugin {
  user = null;

  setup() {
    onWillStart(async ({ abortSignal }) => {
      const res = await fetch("/api/session", { signal: abortSignal });
      this.user = await res.json();
    });
  }
}
```

With app-level plugins, `mount()` waits for every plugin's `onWillStart` before
creating the root component — so components can read `this.user` in their
setup and first render. A component using a plugin created on demand (e.g. a
`perHost` plugin) waits for it as well before rendering.

When multiple plugins register `onWillStart`, their callbacks run in parallel.

The `abortSignal` passed to the callback is aborted if the plugin is destroyed
before initialization completes. Pass it to `fetch` or check
`abortSignal.throwIfAborted()` between awaits to short-circuit abandoned work.
See [Scope](./scope.md) for the full cancellation model.

## Startup Order

A plugin's `setup()` runs as soon as it is created, possibly before the
`onWillStart` callbacks of its dependencies have settled. When a plugin needs
the data loaded by another plugin in its own `setup()`, define the
foundational plugin in a parent host: a child host waits for its parent to be
ready before starting its own plugins.

```js
class SessionPlugin extends Plugin {
  setup() {
    onWillStart(async () => {
      this.user = await loadSession();
    });
  }
}

class MenuPlugin extends Plugin {
  session = usePlugin(SessionPlugin);

  setup() {
    // the session is loaded: SessionPlugin is in the app's host
    this.items = computeMenus(this.session.user);
  }
}

class WebClient extends Component {
  setup() {
    providePlugins([MenuPlugin]);
  }
}

mount(WebClient, document.body, { plugins: [SessionPlugin] });
```

Within a single host, a plugin can also wait for a dependency in its own
`onWillStart`, with [`resolvers.awaited()`](#resolvers): it is then ready only
once the dependency is.

```js
class MenuPlugin extends Plugin {
  session = usePlugin(SessionPlugin, { resolve: resolvers.awaited() });

  setup() {
    onWillStart(async () => {
      const session = await this.session;
      this.items = computeMenus(session.user);
    });
  }
}
```

In dev mode, Owl warns when a plugin depends on a plugin of the same host
whose `onWillStart` has not settled yet (unless it uses `awaited`).

## Plugin Hosts

Hosts are created by the app and by `providePlugins`, but they can be used
directly (e.g. in tests, or outside of components):

```js
const host = new PluginHost(app, new PluginSet().add(A), { config: { debug: true } });
await host.start();
const a = host.getPlugin(A);
host.destroy();
```

- `start()` starts the plugins of the set, and keeps watching it. It starts
  the ancestors first, and a child host waits for its parent to be ready.
  It returns `ready`.
- `ready`, `isReady()` and `whenReady()` tell whether the `onWillStart`
  callbacks of the plugins have settled (`isReady` and `whenReady` include
  the ancestors).
- `createChild(set?, { config })` creates a child host (with a new child set
  by default).
- `getPlugin(P, consumer?)` resolves a plugin according to its lifetime,
  `findPlugin(P)` returns the closest existing instance (or `null`), and
  `createPlugin(P, { owner, store })` creates an instance, whatever its
  lifetime.
- `createPlugins(keys)` creates the shared plugins among `keys` (if not
  created yet), and returns a promise resolved once the `onWillStart`
  callbacks of all the plugins created so far by the host have settled.
- `destroy()` destroys the plugins created by the host, a plugin before its
  dependencies. Child hosts are destroyed by their owner, not by their parent.

Each plugin created by a host gets its own scope (a `PluginScope`), to which
its hooks are attached.

A host starts the plugins of its whole set chain at once. `createPlugins` lets
a subclass start them in awaited steps instead. For example, a host starting
the sets of its chain one after the other, so that each set is set up once the
plugins of its ancestor sets are ready (e.g. translations loaded):

```js
class SequentialHost extends PluginHost {
  async start() {
    const sets = [];
    for (let set = this.set; set; set = set.parent) {
      sets.unshift(set);
    }
    for (const set of sets) {
      await this.createPlugins(set.ownPlugins());
    }
    return super.start();
  }
}

const host = new SequentialHost(app, legacyServices, { config });
await host.start();
await app.createRoot(WebClient, { pluginHost: host }).mount(document.body);
```

### Standalone hosts

`usePluginHost(plugins, options)` creates a new host from a plugin or a
component. It takes the same arguments as `providePlugins` (a list, a function
or a set, and `config` / `isolated` options): the new host is a child of the
current one (its plugins can use the current host's ones), or a root host with
`isolated`. It is started right away, and its creator waits for it to be ready
(its plugins may have async initialization).

Unlike `providePlugins`, it does not change the current host: its plugins are
accessed through the new host. The new host is destroyed with the component (or
plugin) creating it, and may be destroyed before with `host.destroy()`:

```js
class Editor extends Component {
  setup() {
    this.draftHost = usePluginHost([Draft, History], { config: { autosave: true } });
    this.history = this.draftHost.getPlugin(History);
  }

  closeDraft() {
    this.draftHost.destroy();
  }
}
```

Created by a plugin, a child host does not wait for the current host to be
ready (the current host waits for the plugin, which waits for the new host):
its plugins may be set up before the async plugins of the current host are
ready. To get a host that is neither started nor awaited, create it directly:
`useScope().pluginHost.createChild(set)` or `new PluginHost(app, set)`.

### Roots

A root created with `app.createRoot` uses the app's host (or the host given
with its `pluginHost` option, see [App](app.md)): the plugins provided to the
component (or plugin) creating it are not visible from it.
`useCreateRoot()` returns a function creating roots from the current scope
instead. It can be called at any time (e.g. in an event handler), until the
current scope is destroyed. A root uses:

- by default, the host of the current scope: it sees the plugins provided to
  it;
- with `plugins` or `config`, a new child host of the current one (`plugins`
  is a list, a function or a set, as for `providePlugins`);
- with `isolated`, a new root host.

```js
class Launcher extends Component {
  setup() {
    providePlugins([Theme]);
    this.createRoot = useCreateRoot();
  }

  openDialog(target) {
    const root = this.createRoot(DialogContent, {
      props: { title: "Hello" },
      plugins: [DialogPlugin], // can use Theme
    });
    root.mount(target);
    return () => root.destroy();
  }
}
```

A new host is started right away, the root waits for it before rendering, and
it is destroyed with its root. The roots still alive are destroyed with the
scope that created them. Like a [Portal](portal.md), a root created by a
component forwards its errors to it: they reach its `onError` handlers, then
its ancestors'. The errors of a root created by a plugin are handled by the
app.

## Lifecycle and Cleanup

Plugins follow a simple lifecycle:

1. The plugin is instantiated (its class fields, including `usePlugin` calls,
   are evaluated)
2. `setup()` is called (may register `onWillStart` for async init). Like a
   constructor, it is part of the creation: the plugin cannot be resolved
   until it returns (a component it mounts in `setup` would be a circular
   dependency, mount it in `onWillStart` instead)
3. The plugin is active and can be used
4. On destroy, cleanup runs in reverse order (LIFO): a plugin is destroyed
   before its dependencies

All reactive values (signals, computed, effects) created during `setup()` are
automatically cleaned up when the plugin is destroyed. For manual cleanup,
use `onWillDestroy()`:

```js
class WebSocketPlugin extends Plugin {
  setup() {
    this.ws = new WebSocket("wss://example.com");
    onWillDestroy(() => this.ws.close());
  }
}
```

The `useListener()`, `useEffect()`, `useImmediateEffect()` and `useOnChange()`
hooks also work inside plugins, with automatic cleanup on destroy:

```js
class KeyboardPlugin extends Plugin {
  lastKey = signal("");

  setup() {
    useListener(window, "keydown", (ev) => {
      this.lastKey.set(ev.key);
    });
  }
}
```
