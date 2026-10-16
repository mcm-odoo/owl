import {
  App,
  Component,
  createPluginKey,
  computed,
  mount,
  onError,
  onWillDestroy,
  onWillStart,
  Plugin,
  PluginSet,
  Portal,
  providePlugins,
  registrations,
  Resource,
  resolvers,
  signal,
  Suspense,
  types as t,
  useApp,
  useConfig,
  useCreateRoot,
  useEffect,
  usePlugin,
  usePluginHost,
  xml,
} from "../../src";
import {
  getConsoleOutput,
  makeDeferred,
  makeTestFixture,
  nextMicroTick,
  nextTick,
} from "../helpers";

let fixture: HTMLElement;

beforeEach(() => {
  fixture = makeTestFixture();
});

afterEach(() => {
  document.querySelectorAll("[data-test-portal]").forEach((el) => el.remove());
});

test("components use the plugins of the app's set", async () => {
  class A extends Plugin {
    value = "from plugin";
  }
  class Root extends Component {
    static template = xml`<t t-out="this.a.value"/>`;
    a = usePlugin(A);
  }
  await mount(Root, fixture, { plugins: new PluginSet().add(A) });
  expect(fixture.innerHTML).toBe("from plugin");
});

test("a component without plugin set can still use providePlugins", async () => {
  class A extends Plugin {
    value = "from plugin";
  }
  class Root extends Component {
    static template = xml`<t t-out="this.a.value"/>`;
    a: any;
    setup() {
      providePlugins((set) => set.add(A));
      this.a = usePlugin(A);
    }
  }
  await mount(Root, fixture);
  expect(fixture.innerHTML).toBe("from plugin");
});

test("mount waits for the app's plugins to be ready", async () => {
  const def = makeDeferred<string>();
  class A extends Plugin {
    value = "";
    setup() {
      onWillStart(async () => {
        this.value = await def;
      });
    }
  }
  class Root extends Component {
    static template = xml`<t t-out="this.a.value"/>`;
    a = usePlugin(A);
  }
  const app = new App({ plugins: new PluginSet().add(A) });
  const promise = app.createRoot(Root).mount(fixture);
  await nextTick();
  expect(fixture.innerHTML).toBe("");
  def.resolve("ready");
  await promise;
  expect(fixture.innerHTML).toBe("ready");
  app.destroy();
});

test("plugins read the app config", async () => {
  class A extends Plugin {
    value = useConfig("value");
  }
  class Root extends Component {
    static template = xml`<t t-out="this.a.value"/>`;
    a = usePlugin(A);
  }
  await mount(Root, fixture, { plugins: new PluginSet().add(A), config: { value: "config" } });
  expect(fixture.innerHTML).toBe("config");
});

test("usePlugin throws for a plugin outside the set", async () => {
  class A extends Plugin {}
  class Root extends Component {
    static template = xml`<div/>`;
    a = usePlugin(A);
  }
  await expect(mount(Root, fixture)).rejects.toThrow('Plugin "A" is not in the plugin set');
});

describe("providePlugins", () => {
  test("provides plugins to the component and its descendants", async () => {
    class A extends Plugin {
      value = "a";
    }
    class B extends Plugin {
      a = usePlugin(A);
      value = "b";
    }
    class Child extends Component {
      static template = xml`<t t-out="this.a.value + this.b.value"/>`;
      a = usePlugin(A);
      b = usePlugin(B);
    }
    class Root extends Component {
      static components = { Child };
      static template = xml`<Child/>`;
      setup() {
        providePlugins((set) => set.add(B));
      }
    }
    await mount(Root, fixture, { plugins: new PluginSet().add(A) });
    expect(fixture.innerHTML).toBe("ab");
  });

  test("accepts a list of plugins", async () => {
    class A extends Plugin {
      value = "a";
    }
    class B extends Plugin {
      a = usePlugin(A);
      value = "b";
    }
    class Root extends Component {
      static template = xml`<t t-out="this.b.a.value + this.b.value"/>`;
      b: any;
      setup() {
        providePlugins([B, A]);
        this.b = usePlugin(B);
      }
    }
    await mount(Root, fixture);
    expect(fixture.innerHTML).toBe("ab");
  });

  test("a list of plugins, isolated", async () => {
    class A extends Plugin {}
    class B extends Plugin {}
    let error: any = null;
    class Root extends Component {
      static template = xml`<div/>`;
      setup() {
        providePlugins([B], { isolated: true });
        usePlugin(B);
        try {
          usePlugin(A);
        } catch (e) {
          error = e;
        }
      }
    }
    await mount(Root, fixture, { plugins: new PluginSet().add(A) });
    expect(error.message).toBe('Plugin "A" is not in the plugin set');
  });

  test("accepts a set descending from the current one", async () => {
    class A extends Plugin {
      value = "a";
    }
    const appSet = new PluginSet();
    const childSet = appSet.createChild().add(A);
    class Root extends Component {
      static template = xml`<t t-out="this.a.value"/>`;
      a: any;
      setup() {
        providePlugins(childSet);
        this.a = usePlugin(A);
      }
    }
    await mount(Root, fixture, { plugins: appSet });
    expect(fixture.innerHTML).toBe("a");
  });

  test("plugins are destroyed with the component", async () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        onWillDestroy(() => steps.push("A destroyed"));
      }
    }
    class Child extends Component {
      static template = xml`<div/>`;
      setup() {
        providePlugins((set) => set.add(A));
      }
    }
    class Root extends Component {
      static components = { Child };
      static template = xml`<Child t-if="this.show()"/>`;
      show = signal(true);
    }
    const root = await mount(Root, fixture);
    expect(steps).toEqual([]);
    root.show.set(false);
    await nextTick();
    expect(steps).toEqual(["A destroyed"]);
  });

  test("the component waits for its plugins to be ready", async () => {
    const def = makeDeferred<string>();
    class A extends Plugin {
      value = "";
      setup() {
        onWillStart(async () => {
          this.value = await def;
        });
      }
    }
    class Child extends Component {
      static template = xml`<t t-out="this.a.value"/>`;
      a = usePlugin(A);
    }
    class Root extends Component {
      static components = { Child };
      static template = xml`<Child/>`;
      setup() {
        providePlugins((set) => set.add(A));
      }
    }
    const app = new App();
    const promise = app.createRoot(Root).mount(fixture);
    await nextTick();
    expect(fixture.innerHTML).toBe("");
    def.resolve("ready");
    await promise;
    expect(fixture.innerHTML).toBe("ready");
    app.destroy();
  });

  test("with a config, inheriting the app's one", async () => {
    class A extends Plugin {
      a = useConfig("a");
      b = useConfig("b");
    }
    class Root extends Component {
      static template = xml`<t t-out="this.p.a + this.p.b"/>`;
      p: any;
      setup() {
        providePlugins((set) => set.add(A), { config: { b: "child" } });
        this.p = usePlugin(A);
      }
    }
    await mount(Root, fixture, { config: { a: "app", b: "app" } });
    expect(fixture.innerHTML).toBe("appchild");
  });

  test("isolated: not linked to the current host", async () => {
    class A extends Plugin {
      value = "a";
    }
    class B extends Plugin {
      config = useConfig("value");
    }
    let error: any = null;
    class Root extends Component {
      static template = xml`<t t-out="this.b.config"/>`;
      b: any;
      setup() {
        providePlugins((set) => set.add(B), { isolated: true, config: { value: "own" } });
        this.b = usePlugin(B);
        try {
          usePlugin(A);
        } catch (e) {
          error = e;
        }
      }
    }
    await mount(Root, fixture, {
      plugins: new PluginSet().add(A),
      config: { value: "app", other: "app" },
    });
    expect(fixture.innerHTML).toBe("own");
    expect(error.message).toBe('Plugin "A" is not in the plugin set');
  });

  test("isolated: accepts any set, and does not inherit the config", async () => {
    class A extends Plugin {
      other = useConfig("other");
    }
    const otherSet = new PluginSet().add(A);
    class Root extends Component {
      static template = xml`<t t-out="this.a.other === undefined"/>`;
      a: any;
      setup() {
        providePlugins(otherSet, { isolated: true });
        this.a = usePlugin(A);
      }
    }
    await mount(Root, fixture, { plugins: new PluginSet(), config: { other: "app" } });
    expect(fixture.innerHTML).toBe("true");
  });

  test("isolated: destroyed with the component, which waits for it", async () => {
    const steps: string[] = [];
    const def = makeDeferred<string>();
    class A extends Plugin {
      value = "";
      setup() {
        onWillStart(async () => {
          this.value = await def;
        });
        onWillDestroy(() => steps.push("A destroyed"));
      }
    }
    class Child extends Component {
      static template = xml`<t t-out="this.a.value"/>`;
      a: any;
      setup() {
        providePlugins((set) => set.add(A), { isolated: true });
        this.a = usePlugin(A);
      }
    }
    class Root extends Component {
      static components = { Child };
      static template = xml`<Child t-if="this.show()"/>`;
      show = signal(true);
    }
    const app = new App();
    const promise = app.createRoot(Root).mount(fixture);
    await nextTick();
    expect(fixture.innerHTML).toBe("");
    def.resolve("ready");
    const root = await promise;
    expect(fixture.innerHTML).toBe("ready");
    root.show.set(false);
    await nextTick();
    expect(steps).toEqual(["A destroyed"]);
    app.destroy();
  });

  test("override a plugin for a subtree", async () => {
    class Dialog extends Plugin {
      kind = "desktop";
    }
    class MobileDialog extends Dialog {
      kind = "mobile";
    }
    class Child extends Component {
      static template = xml`<t t-out="this.dialog.kind"/>`;
      dialog = usePlugin(Dialog);
    }
    class Mobile extends Component {
      static components = { Child };
      static template = xml`<Child/>`;
      setup() {
        providePlugins((set) => set.add(Dialog, { use: registrations.create(MobileDialog) }));
      }
    }
    class Root extends Component {
      static components = { Child, Mobile };
      static template = xml`<Child/>|<Mobile/>`;
    }
    await mount(Root, fixture, { plugins: new PluginSet().add(Dialog) });
    expect(fixture.innerHTML).toBe("desktop|mobile");
  });
});

describe("lifetimes and resolvers in components", () => {
  test("perHost: one instance per providePlugins host", async () => {
    class A extends Plugin {}
    const instances: any[] = [];
    class Child extends Component {
      static template = xml`<div/>`;
      setup() {
        instances.push(usePlugin(A));
      }
    }
    class Provider extends Component {
      static components = { Child };
      static template = xml`<Child/><Child/>`;
      setup() {
        providePlugins();
      }
    }
    class Root extends Component {
      static components = { Provider };
      static template = xml`<Provider/><Provider/>`;
    }
    await mount(Root, fixture, { plugins: new PluginSet().add(A, { lifetime: "perHost" }) });
    expect(instances.length).toBe(4);
    expect(instances[0]).toBe(instances[1]);
    expect(instances[2]).toBe(instances[3]);
    expect(instances[0]).not.toBe(instances[2]);
  });

  test("perHost: a component waits for an instance created on demand", async () => {
    const def = makeDeferred<string>();
    class A extends Plugin {
      value = "";
      setup() {
        onWillStart(async () => {
          this.value = await def;
        });
      }
    }
    class Root extends Component {
      static template = xml`<t t-out="this.a.value"/>`;
      a = usePlugin(A);
    }
    const app = new App({ plugins: new PluginSet().add(A, { lifetime: "perHost" }) });
    const promise = app.createRoot(Root).mount(fixture);
    await nextTick();
    expect(fixture.innerHTML).toBe("");
    def.resolve("ready");
    await promise;
    expect(fixture.innerHTML).toBe("ready");
    app.destroy();
  });

  test("transient: owned by the component", async () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        onWillDestroy(() => steps.push("A destroyed"));
      }
    }
    class Child extends Component {
      static template = xml`<div/>`;
      a = usePlugin(A);
    }
    class Root extends Component {
      static components = { Child };
      static template = xml`<Child t-if="this.show()"/>`;
      show = signal(true);
    }
    const root = await mount(Root, fixture, {
      plugins: new PluginSet().add(A, { lifetime: "transient" }),
    });
    root.show.set(false);
    await nextTick();
    expect(steps).toEqual(["A destroyed"]);
  });

  test("optional resolver in a component", async () => {
    class A extends Plugin {}
    class Root extends Component {
      static template = xml`<t t-out="this.a === null"/>`;
      a = usePlugin(A, { resolve: resolvers.optional() });
    }
    await mount(Root, fixture);
    expect(fixture.innerHTML).toBe("true");
  });

  test("newHostInstance: the component waits for it, and destroys it", async () => {
    const steps: string[] = [];
    const def = makeDeferred<string>();
    class A extends Plugin {
      value = "";
      setup() {
        onWillStart(async () => {
          this.value = await def;
        });
        onWillDestroy(() => steps.push("A destroyed"));
      }
    }
    class Child extends Component {
      static template = xml`<t t-out="this.a.value"/>`;
      a = usePlugin(A, { resolve: resolvers.newHostInstance() });
    }
    class Root extends Component {
      static components = { Child };
      static template = xml`<Child t-if="this.show()"/>`;
      show = signal(true);
    }
    const app = new App({ plugins: new PluginSet().add(A) });
    const promise = app.createRoot(Root).mount(fixture);
    await nextTick();
    expect(fixture.innerHTML).toBe("");
    def.resolve("ready");
    const root = await promise;
    expect(fixture.innerHTML).toBe("ready");
    root.show.set(false);
    await nextTick();
    expect(steps).toEqual(["A destroyed"]);
    app.destroy();
  });
});

describe("lazy option and awaited resolver in components", () => {
  test("lazy: the plugin is created on first use", async () => {
    const steps: string[] = [];
    class A extends Plugin {
      value = "a";
      setup() {
        steps.push("A");
      }
    }
    class Root extends Component {
      static template = xml`<button t-on-click="() => this.show()" t-out="this.text()"/>`;
      a = usePlugin(A, { lazy: true });
      text = signal("");
      show() {
        this.text.set(this.a().value);
      }
    }
    await mount(Root, fixture, { plugins: new PluginSet().add(A, { lifetime: "perHost" }) });
    expect(steps).toEqual([]);
    fixture.querySelector("button")!.click();
    await nextTick();
    expect(steps).toEqual(["A"]);
    expect(fixture.innerHTML).toBe("<button>a</button>");
  });

  test("lazy + awaited: waits for the plugin, and is unusable once the component is destroyed", async () => {
    const def = makeDeferred<string>();
    class A extends Plugin {
      value = "";
      setup() {
        onWillStart(async () => {
          this.value = await def;
        });
      }
    }
    let child: any;
    class Child extends Component {
      static template = xml`<div/>`;
      a = usePlugin(A, { lazy: true, resolve: resolvers.awaited(resolvers.newInstance()) });
      unused = usePlugin(A, { lazy: true, resolve: resolvers.awaited(resolvers.newInstance()) });
      setup() {
        child = this;
      }
    }
    class Root extends Component {
      static components = { Child };
      static template = xml`<Child t-if="this.show()"/>`;
      show = signal(true);
    }
    const root = await mount(Root, fixture, {
      plugins: new PluginSet().add(A, { lifetime: "transient" }),
    });
    // resolves once ready
    const ready = child.a();
    def.resolve("ready");
    expect((await ready).value).toBe("ready");
    root.show.set(false);
    await nextTick();
    // a resolved getter returns its value, an unresolved one cannot resolve anymore
    expect((await child.a()).value).toBe("ready");
    expect(() => child.unused()).toThrow("Cannot run a callback in a destroyed scope");
  });
});

test("plugin keys: a value provided to a subtree", async () => {
  const ApiUrl = createPluginKey("apiUrl", t.string());
  class Child extends Component {
    static template = xml`<t t-out="this.url"/>`;
    url = usePlugin(ApiUrl);
  }
  class Section extends Component {
    static components = { Child };
    static template = xml`<Child/>`;
    setup() {
      providePlugins((set) => set.add(ApiUrl, { use: () => "/section" }));
    }
  }
  class Root extends Component {
    static components = { Child, Section };
    static template = xml`<Child/>|<Section/>`;
  }
  await mount(Root, fixture, { plugins: new PluginSet().add(ApiUrl, { use: () => "/api" }) });
  expect(fixture.innerHTML).toBe("/api|/section");
});

test("usePluginHost: a host created in a component, destroyed with it", async () => {
  const steps: string[] = [];
  class Rpc extends Plugin {
    value = "rpc";
  }
  class Draft extends Plugin {
    rpc = usePlugin(Rpc);
    setup() {
      onWillDestroy(() => steps.push("Draft destroyed"));
    }
  }
  let draftHost: any;
  class Editor extends Component {
    static template = xml`<t t-out="this.draft.rpc.value"/>`;
    draft: any;
    setup() {
      draftHost = usePluginHost([Draft]);
      this.draft = draftHost.getPlugin(Draft);
    }
  }
  class Root extends Component {
    static components = { Editor };
    static template = xml`<Editor t-if="this.show()"/>`;
    show = signal(true);
  }
  const root = await mount(Root, fixture, { plugins: [Rpc] });
  expect(fixture.innerHTML).toBe("rpc");
  root.show.set(false);
  await nextTick();
  expect(draftHost.isDestroyed()).toBe(true);
  expect(steps).toEqual(["Draft destroyed"]);
});

describe("createRoot: pluginHost option", () => {
  test("a root can use a child host of the app's one", async () => {
    const deferred = makeDeferred<void>();
    let loaded = "no";
    class Translation extends Plugin {
      setup() {
        onWillStart(async () => {
          await deferred;
          loaded = "yes";
        });
      }
    }
    class Service extends Plugin {
      // implicit dependency: the translations are loaded
      loaded = loaded;
    }
    class Root extends Component {
      static template = xml`<t t-out="this.service.loaded"/>`;
      service = usePlugin(Service);
    }
    const foundation = new PluginSet().add(Translation);
    const app = new App({ plugins: foundation });
    const host = app.pluginHost.createChild(foundation.createChild().add(Service));
    // the child host waits for the app's one. The root is created once it is
    // ready: creating it builds the component, which would create its plugins
    // on demand
    let started = false;
    host.start().then(() => (started = true));
    await nextTick();
    expect(started).toBe(false);
    deferred.resolve();
    await host.whenReady();
    await app.createRoot(Root, { pluginHost: host }).mount(fixture);
    expect(fixture.innerHTML).toBe("yes");
    app.destroy();
    host.destroy();
  });

  test("the host must belong to the app", () => {
    const app1 = new App();
    const app2 = new App();
    class Root extends Component {
      static template = xml`<div/>`;
    }
    expect(() => app1.createRoot(Root, { pluginHost: app2.pluginHost })).toThrow(
      "The plugin host of a root must belong to its app"
    );
  });
});

describe("sub-roots", () => {
  test("Portal: portaled content sees the plugins of its ancestors", async () => {
    const target = document.createElement("div");
    target.dataset.testPortal = "1";
    document.body.appendChild(target);
    class A extends Plugin {
      value = "from plugin";
    }
    class Inside extends Component {
      static template = xml`<span class="payload" t-out="this.a.value"/>`;
      a = usePlugin(A);
    }
    class Root extends Component {
      static components = { Portal, Inside };
      static template = xml`<Portal target="this.target"><Inside/></Portal>`;
      target = target;
      setup() {
        providePlugins((set) => set.add(A));
      }
    }
    const app = new App();
    await app.createRoot(Root).mount(fixture);
    await nextTick();
    expect(target.querySelector(".payload")!.textContent).toBe("from plugin");
    app.destroy();
  });

  test("Suspense: the default slot sees the plugins of its ancestors", async () => {
    class A extends Plugin {
      value = "from plugin";
    }
    class Inside extends Component {
      static template = xml`<span t-out="this.a.value"/>`;
      a = usePlugin(A);
    }
    class Root extends Component {
      static components = { Suspense, Inside };
      static template = xml`
        <Suspense>
          <t t-set-slot="fallback">loading...</t>
          <Inside/>
        </Suspense>`;
      setup() {
        providePlugins((set) => set.add(A));
      }
    }
    const app = new App();
    await app.createRoot(Root).mount(fixture);
    await nextTick();
    expect(fixture.innerHTML).toContain("<span>from plugin</span>");
    app.destroy();
  });
});

describe("ported from the previous plugin system", () => {
  test("plugins added to the app's set later start automatically", async () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        steps.push("A started");
      }
    }
    class Root extends Component {
      static template = xml``;
    }
    const plugins = new PluginSet();
    await mount(Root, fixture, { plugins });
    expect(steps.splice(0)).toEqual([]);
    plugins.add(A);
    await nextMicroTick();
    expect(steps.splice(0)).toEqual(["A started"]);
  });

  test("a plugin can get the current app", async () => {
    let appFromPlugin: any = null;
    class A extends Plugin {
      setup() {
        appFromPlugin = useApp();
      }
    }
    class Root extends Component {
      static template = xml`coucou`;
    }
    const app = new App({ plugins: new PluginSet().add(A) });
    await app.createRoot(Root).mount(fixture);
    expect(fixture.innerHTML).toBe("coucou");
    expect(appFromPlugin).toBe(app);
  });

  test("usePlugin in setup", async () => {
    class A extends Plugin {
      value = "value from plugin";
    }
    class Root extends Component {
      static template = xml`<t t-out="this.a.value"/>`;
      declare a: A;
      setup() {
        this.a = usePlugin(A);
      }
    }
    await mount(Root, fixture, { plugins: new PluginSet().add(A) });
    expect(fixture.innerHTML).toBe("value from plugin");
  });

  test("plugins provided at several levels", async () => {
    class A extends Plugin {
      value = "pA";
    }
    class B extends Plugin {
      value = "pB";
    }
    class Level3 extends Component {
      static template = xml`3: <t t-out="this.a.value"/> - <t t-out="this.b.value"/>`;
      a = usePlugin(A);
      b = usePlugin(B);
    }
    class Level2 extends Component {
      static template = xml`2: <t t-out="this.a.value"/> | <Level3/>`;
      static components = { Level3 };
      a = usePlugin(A);
      setup() {
        providePlugins((set) => set.add(B));
      }
    }
    class Level1 extends Component {
      static template = xml`1 | <Level2/>`;
      static components = { Level2 };
      setup() {
        providePlugins((set) => set.add(A));
      }
    }
    const app = new App();
    await app.createRoot(Level1).mount(fixture);
    expect(app.pluginHost.findPlugin(A)).toBe(null);
    expect(app.pluginHost.findPlugin(B)).toBe(null);
    expect(fixture.innerHTML).toBe("1 | 2: pA | 3: pA - pB");
  });

  test("config given by providePlugins", async () => {
    class A extends Plugin {
      inputA = useConfig("inputAlias", t.string());
    }
    class B extends Plugin {
      inputB = useConfig("otherInput", t.number());
    }
    class Root extends Component {
      static template = xml`<t t-out="this.a.inputA"/>-<t t-out="this.b.inputB"/>`;
      declare a: A;
      declare b: B;
      setup() {
        providePlugins((set) => set.add(A).add(B), {
          config: { inputAlias: "hamburger", otherInput: 123 },
        });
        this.a = usePlugin(A);
        this.b = usePlugin(B);
      }
    }
    await mount(Root, fixture);
    expect(fixture.innerHTML).toBe("hamburger-123");
  });

  test("config is validated in dev mode", async () => {
    class A extends Plugin {
      inputA = useConfig("input", t.string());
    }
    class Root extends Component {
      static template = xml`<t t-out="this.a.inputA"/>`;
      declare a: A;
      setup() {
        providePlugins((set) => set.add(A), { config: { input: 123 } });
        this.a = usePlugin(A);
      }
    }
    await expect(mount(Root, fixture, { dev: true })).rejects.toThrow(
      "Config does not match the type"
    );
    expect(getConsoleOutput()).toEqual([`info:Owl is running in 'dev' mode.`]);
  });

  test("optional config: value given, no value given, no config given", async () => {
    class A extends Plugin {
      inputA = useConfig("input", t.string().optional()) || "abc";
    }
    class Root extends Component {
      static template = xml`<t t-out="this.a.inputA"/>`;
      a = usePlugin(A);
    }
    const plugins = new PluginSet().add(A);
    await mount(Root, fixture, { plugins, test: true, config: { input: "def" } });
    expect(fixture.innerHTML).toBe("def");

    fixture.innerHTML = "";
    await mount(Root, fixture, { plugins, test: true, config: {} });
    expect(fixture.innerHTML).toBe("abc");

    fixture.innerHTML = "";
    await mount(Root, fixture, { plugins, test: true });
    expect(fixture.innerHTML).toBe("abc");
  });

  test("components can register resources", async () => {
    class A extends Plugin {
      colors = new Resource({ name: "colors", validation: t.string() });
      value = computed(() => this.colors.items().join("|"));
    }
    class Level2 extends Component {
      static template = xml`2: <t t-out="this.a.value()"/> `;
      a = usePlugin(A);
      setup() {
        this.a.colors.use("from lvl 2");
        expect(this.a.colors.items()).toEqual(["from lvl 1", "from lvl 2"]);
      }
    }
    class Level1 extends Component {
      static template = xml`1 | <Level2/>`;
      static components = { Level2 };
      setup() {
        const a = usePlugin(A);
        a.colors.use("from lvl 1");
        expect(a.colors.items()).toEqual(["from lvl 1"]);
      }
    }
    const app = new App({ plugins: new PluginSet().add(A) });
    const a = app.pluginHost.getPlugin(A);
    expect(a.colors.items()).toEqual([]);
    await app.createRoot(Level1).mount(fixture);
    expect(a.colors.items()).toEqual(["from lvl 1", "from lvl 2"]);
    expect(fixture.innerHTML).toBe("1 | 2: from lvl 1|from lvl 2 ");
  });

  test("components, plugins, useEffect", async () => {
    const value = signal("a");
    const derived = signal("a");
    class P extends Plugin {
      setup() {
        useEffect(() => {
          derived.set(value());
        });
        // this triggers the bug
        value();
      }
    }
    class R extends Component {
      static template = xml`
        <t t-out="this.value()"/>
        <t t-out="this.derived()"/>`;
      value = value;
      derived = derived;
    }
    await mount(R, fixture, { plugins: new PluginSet().add(P) });
    expect(fixture.innerHTML).toBe("aa");
    value.set("b");
    await nextTick();
    expect(fixture.innerHTML).toBe("bb");
    value.set("c");
    await nextTick();
    expect(fixture.innerHTML).toBe("cc");
  });

  test("components mounted by a plugin", async () => {
    class R2 extends Component {
      static template = xml`<t t-out="this.p.value"/>`;
      p = usePlugin(P);
    }
    class P extends Plugin {
      value = "def";
      setup() {
        const app = useApp();
        // setup is like a constructor: the plugin cannot be resolved (here by
        // R2) before it returns
        let root: ReturnType<typeof app.createRoot>;
        onWillStart(() => {
          root = app.createRoot(R2);
          root.mount(fixture);
        });
        onWillDestroy(() => {
          root.destroy();
        });
      }
    }
    class R extends Component {
      static template = xml`abc`;
    }
    await mount(R, fixture, { plugins: new PluginSet().add(P) });
    expect(fixture.innerHTML).toBe("defabc");
  });

  test("a provided plugin depending on an async plugin of the app waits for it", async () => {
    const rpc = makeDeferred<string>();
    const steps: string[] = [];
    class Foundation extends Plugin {
      data: string | null = null;
      setup() {
        onWillStart(async () => {
          this.data = await rpc;
        });
      }
    }
    class Feature extends Plugin {
      foundation = usePlugin(Foundation);
      setup() {
        steps.push(`feature:setup (data=${this.foundation.data})`);
      }
    }
    class Child extends Component {
      static template = xml`<span>child</span>`;
    }
    class Parent extends Component {
      static template = xml`<Child/>`;
      static components = { Child };
      setup() {
        providePlugins((set) => set.add(Feature));
      }
    }
    const app = new App({ plugins: new PluginSet().add(Foundation) });
    const mounted = app.createRoot(Parent).mount(fixture);
    await nextTick();
    // Feature's host waits for the app's one, which delays the component render
    expect(steps.splice(0)).toEqual([]);
    expect(fixture.innerHTML).toBe("");
    rpc.resolve("hello");
    await mounted;
    expect(steps.splice(0)).toEqual(["feature:setup (data=hello)"]);
    expect(fixture.innerHTML).toBe("<span>child</span>");
    app.destroy();
  });
});

describe("useCreateRoot", () => {
  class Theme extends Plugin {
    name = "light";
  }
  class Dialog extends Plugin {
    title = useConfig("title", t.string().optional("dialog"));
  }
  class Popup extends Component {
    static template = xml`<span><t t-out="this.theme?.name"/>|<t t-out="this.dialog?.title"/></span>`;
    theme = usePlugin(Theme, { resolve: resolvers.optional() });
    dialog = usePlugin(Dialog, { resolve: resolvers.optional() });
  }

  function makeLauncher() {
    let createRoot!: ReturnType<typeof useCreateRoot>;
    class Launcher extends Component {
      static template = xml`<div/>`;
      setup() {
        providePlugins([Theme]);
        createRoot = useCreateRoot();
      }
    }
    return { Launcher, createRoot: () => createRoot };
  }

  test("roots use the current host by default", async () => {
    const { Launcher, createRoot } = makeLauncher();
    await mount(Launcher, fixture);
    // called later, outside of setup
    const target = fixture.appendChild(document.createElement("div"));
    await createRoot()(Popup).mount(target);
    expect(target.innerHTML).toBe("<span>light|</span>");
  });

  test("roots with plugins use a new child host, destroyed with the root", async () => {
    const steps: string[] = [];
    class Tracked extends Dialog {
      setup() {
        onWillDestroy(() => steps.push("dialog destroyed"));
      }
    }
    const { Launcher, createRoot } = makeLauncher();
    await mount(Launcher, fixture);
    const target = fixture.appendChild(document.createElement("div"));
    const root = createRoot()(Popup, {
      plugins: (set) => set.add(Dialog, { use: registrations.create(Tracked) }),
      config: { title: "Hello" },
    });
    await root.mount(target);
    expect(target.innerHTML).toBe("<span>light|Hello</span>");
    root.destroy();
    expect(steps).toEqual(["dialog destroyed"]);
  });

  test("isolated roots do not see the current host", async () => {
    const { Launcher, createRoot } = makeLauncher();
    await mount(Launcher, fixture);
    const target = fixture.appendChild(document.createElement("div"));
    await createRoot()(Popup, { plugins: [Dialog], isolated: true }).mount(target);
    expect(target.innerHTML).toBe("<span>|dialog</span>");
  });

  test("a new host is awaited before the root renders", async () => {
    const deferred = makeDeferred<void>();
    class Slow extends Dialog {
      setup() {
        onWillStart(() => deferred);
      }
    }
    const { Launcher, createRoot } = makeLauncher();
    await mount(Launcher, fixture);
    const target = fixture.appendChild(document.createElement("div"));
    const mounted = createRoot()(Popup, {
      plugins: (set) => set.add(Dialog, { use: registrations.create(Slow) }),
    }).mount(target);
    await nextTick();
    expect(target.innerHTML).toBe("");
    deferred.resolve();
    await mounted;
    expect(target.innerHTML).toBe("<span>light|dialog</span>");
  });

  test("roots are destroyed with their creator, which cannot create roots anymore", async () => {
    const steps: string[] = [];
    class Tracked extends Dialog {
      setup() {
        onWillDestroy(() => steps.push("dialog destroyed"));
      }
    }
    const { Launcher, createRoot } = makeLauncher();
    const app = new App();
    await app.createRoot(Launcher).mount(fixture);
    const target = fixture.appendChild(document.createElement("div"));
    const root = createRoot()(Popup, {
      plugins: (set) => set.add(Dialog, { use: registrations.create(Tracked) }),
    });
    await root.mount(target);
    app.destroy();
    expect(root.destroyed).toBe(true);
    expect(steps).toEqual(["dialog destroyed"]);
    expect(() => createRoot()(Popup)).toThrow(
      'Cannot create root "Popup": its creator is destroyed'
    );
  });

  test("errors are forwarded to the creator", async () => {
    const steps: string[] = [];
    const fail = signal(false);
    class Failing extends Component {
      static template = xml`<span t-if="this.fail()" t-out="this.boom()"/>`;
      fail = fail;
      boom() {
        throw new Error("boom");
      }
    }
    let createRoot!: ReturnType<typeof useCreateRoot>;
    class Launcher extends Component {
      static template = xml`<div/>`;
      setup() {
        createRoot = useCreateRoot();
      }
    }
    class Parent extends Component {
      static template = xml`<Launcher/>`;
      static components = { Launcher };
      setup() {
        onError((error) => steps.push(`caught: ${error.message}`));
      }
    }
    const app = new App();
    await app.createRoot(Parent).mount(fixture);
    const target = fixture.appendChild(document.createElement("div"));
    await createRoot(Failing).mount(target);
    fail.set(true);
    await nextTick();
    // caught by an ancestor of the creator: the app is still alive
    expect(steps).toEqual(["caught: boom"]);
    expect(app.destroyed).toBeFalsy();
    app.destroy();
  });

  test("can be used in a plugin", async () => {
    class Overlay extends Plugin {
      createRoot = useCreateRoot();
    }
    class Root extends Component {
      static template = xml`<div/>`;
    }
    const app = new App({ plugins: [Theme, Overlay] });
    await app.createRoot(Root).mount(fixture);
    const target = fixture.appendChild(document.createElement("div"));
    await app.pluginHost.getPlugin(Overlay).createRoot(Popup).mount(target);
    expect(target.innerHTML).toBe("<span>light|</span>");
    app.destroy();
  });
});
