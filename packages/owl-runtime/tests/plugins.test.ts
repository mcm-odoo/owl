import { Atom, atomSymbol } from "@odoo/owl-core";
import { describe, expect, test } from "vitest";
import {
  App,
  Component,
  computed,
  effect,
  mount,
  onWillDestroy,
  onWillStart,
  Plugin,
  PluginHost,
  PluginSet,
  providePlugins,
  Resource,
  signal,
  types as t,
  useConfig,
  useListener,
  usePlugin,
  xml,
} from "../src";
import { makeDeferred, makeTestFixture, nextTick, waitScheduler } from "./helpers";

// Most of the plugin system is tested in owl-core (plugin_manager.test.ts):
// these tests are about its integration with the app and components.

describe("basic features", () => {
  test("plugins of the app are started and destroyed with it", () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        steps.push("setup");
        onWillDestroy(() => steps.push("destroy"));
      }
    }
    const app = new App({ plugins: new PluginSet().add(A) });
    expect(steps.splice(0)).toEqual(["setup"]);
    app.destroy();
    expect(steps.splice(0)).toEqual(["destroy"]);
  });

  test("plugins of the app can be given as a list", () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        steps.push("A");
      }
    }
    class B extends Plugin {
      a = usePlugin(A);
      setup() {
        steps.push("B");
      }
    }
    const app = new App({ plugins: [B, A] });
    expect(steps).toEqual(["A", "B"]);
    expect(app.pluginHost.getPlugin(B).a).toBe(app.pluginHost.getPlugin(A));
    app.destroy();
  });

  test("plugin fn cannot be called outside Plugin and Component", () => {
    class A extends Plugin {}
    expect(() => usePlugin(A)).toThrow(`No active scope`);
  });

  test("config can be given from app", () => {
    const steps: string[] = [];
    class A extends Plugin {
      input = useConfig("input");
      defaulted = useConfig("defaulted", t.string().optional("default"));
      setup(): void {
        steps.push(`A - ${this.input} - ${this.defaulted}`);
      }
    }
    const app = new App({ plugins: new PluginSet().add(A), config: { input: "hello" } });
    expect(steps.splice(0)).toEqual(["A - hello - default"]);
    app.destroy();
  });

  test("config default can be declared in the type (.optional(value))", () => {
    const steps: string[] = [];
    class A extends Plugin {
      defaulted = useConfig("defaulted", t.string().optional("default"));
      given = useConfig("given", t.string().optional("unused"));
      setup(): void {
        steps.push(`A - ${this.defaulted} - ${this.given}`);
      }
    }
    const app = new App({ plugins: new PluginSet().add(A), config: { given: "hello" } });
    expect(steps.splice(0)).toEqual(["A - default - hello"]);
    app.destroy();
  });

  test("can use useListener in a plugin", () => {
    let n: number = 0;
    const bus = new EventTarget();
    class A extends Plugin {
      setup() {
        useListener(bus, "blip", () => n++);
        expect(n).toBe(0);
        bus.dispatchEvent(new Event("blip"));
        expect(n).toBe(1);
      }
    }
    const host = new PluginHost(new App(), new PluginSet().add(A));
    host.start();
    expect(n).toBe(1);
    bus.dispatchEvent(new Event("blip"));
    expect(n).toBe(2);
    host.destroy();
    expect(n).toBe(2);
    bus.dispatchEvent(new Event("blip"));
    expect(n).toBe(2);
  });

  test("destroying a plugin with computed cleans up signal observers", () => {
    const selectedId = signal(0);
    const selectedIdAtom: Atom = (selectedId as any)[atomSymbol];
    class A extends Plugin {
      isSelected = computed(() => selectedId() === 42);
    }
    const host = new PluginHost(new App(), new PluginSet().add(A));
    host.start();
    const a = host.getPlugin(A);
    // Evaluate the computed to establish subscriptions
    a.isSelected();
    expect(selectedIdAtom.observers.size).toBe(1);
    host.destroy();
    // After destruction, the computed should be cleaned up from selectedId's observers
    expect(selectedIdAtom.observers.size).toBe(0);
  });
});

describe("hosts provided by components", () => {
  test("a destroyed provided host is not retained by its parent", async () => {
    const steps: string[] = [];
    class P extends Plugin {
      setup() {
        steps.push("setup P");
        onWillDestroy(() => steps.push("destroy P"));
      }
    }
    class Child extends Component {
      static template = xml`child`;
      setup() {
        providePlugins((set) => set.add(P));
      }
    }
    class Root extends Component {
      static components = { Child };
      static template = xml`<Child t-if="this.show()"/>`;
      show = signal(true);
    }
    const fixture = makeTestFixture();
    const app = new App();
    const component = (await app.createRoot(Root).mount(fixture)) as Root;
    expect(steps.splice(0)).toEqual(["setup P"]);
    for (let i = 0; i < 3; i++) {
      component.show.set(false);
      await nextTick();
      expect(steps.splice(0)).toEqual(["destroy P"]);
      component.show.set(true);
      await nextTick();
      expect(steps.splice(0)).toEqual(["setup P"]);
    }
    // the app's host keeps no reference to the hosts of its descendants
    expect((app.pluginHost as any).scopes).toHaveLength(0);
    app.destroy();
    expect(steps.splice(0)).toEqual(["destroy P"]);
  });
});

describe("plugins and resources", () => {
  test("can define a resource type", () => {
    class A extends Plugin {
      colors = new Resource({ name: "colors", validation: t.string() });
    }
    class B extends Plugin {
      a = usePlugin(A);
      setup() {
        this.a.colors.add("red");
      }
    }
    class C extends Plugin {
      setup() {
        usePlugin(A).colors.use("green").use("blue");
      }
    }
    const host = new PluginHost(new App(), new PluginSet().add(A).add(B).add(C));
    host.start();
    expect(host.getPlugin(A).colors.items()).toEqual(["red", "green", "blue"]);
  });

  test("resources from child plugins are available in parent plugins", () => {
    class A extends Plugin {
      colors = new Resource({ name: "colors", validation: t.string() });
    }
    class B extends Plugin {
      setup() {
        usePlugin(A).colors.use("red");
      }
    }
    class C extends Plugin {
      setup() {
        usePlugin(A).colors.use("green").use("blue");
      }
    }
    const set = new PluginSet().add(A).add(B);
    const host = new PluginHost(new App(), set);
    host.start();
    const a = host.getPlugin(A);
    expect(a.colors.items()).toEqual(["red"]);
    const childHost = host.createChild(set.createChild().add(C));
    childHost.start();
    expect(a.colors.items()).toEqual(["red", "green", "blue"]);
    childHost.destroy();
    expect(a.colors.items()).toEqual(["red"]);
  });

  test("resources are derived values, can be seen from effect", async () => {
    class A extends Plugin {
      colors = new Resource({ name: "colors", validation: t.string() });
    }
    class B extends Plugin {
      setup() {
        usePlugin(A).colors.use("red");
      }
    }
    class C extends Plugin {
      setup() {
        usePlugin(A).colors.use("green").use("blue");
      }
    }
    const set = new PluginSet().add(A).add(B);
    const host = new PluginHost(new App(), set);
    host.start();
    const a = host.getPlugin(A);
    const steps: string[] = [];
    effect(() => {
      steps.push(a.colors.items().join(","));
    });
    expect(steps.splice(0)).toEqual(["red"]);
    const childHost = host.createChild(set.createChild().add(C));
    childHost.start();
    expect(steps.splice(0)).toEqual([]);
    await waitScheduler();
    expect(steps.splice(0)).toEqual(["red,green,blue"]);
    childHost.destroy();
    expect(steps.splice(0)).toEqual([]);
    await waitScheduler();
    expect(steps.splice(0)).toEqual(["red"]);
  });
});

describe("onWillStart in plugins", () => {
  test("plugin onWillStart delays app mount", async () => {
    const rpc = makeDeferred<string>();
    class AsyncPlugin extends Plugin {
      data: string | null = null;
      setup() {
        onWillStart(async () => {
          this.data = await rpc;
        });
      }
    }
    class Root extends Component {
      static template = xml`<span>ok</span>`;
      p = usePlugin(AsyncPlugin);
    }
    const fixture = makeTestFixture();
    const app = new App({ plugins: new PluginSet().add(AsyncPlugin) });
    const mounted = app.createRoot(Root).mount(fixture);
    await nextTick();
    expect(fixture.innerHTML).toBe("");
    rpc.resolve("hello");
    const instance = await mounted;
    expect(instance.p.data).toBe("hello");
    expect(fixture.innerHTML).toBe("<span>ok</span>");
    app.destroy();
  });

  test("mount waits for the plugins before building the root", async () => {
    // The root reads, in its field initializer, state loaded by an async plugin
    const rpc = makeDeferred<void>();
    class DataPlugin extends Plugin {
      state = signal<string | null>(null);
      setup() {
        onWillStart(() => rpc.then(() => this.state.set("some state")));
      }
    }
    class Root extends Component {
      static template = xml`<t t-out="this.length"/>`;
      length = usePlugin(DataPlugin).state()!.length;
    }
    const fixture = makeTestFixture();
    const mounted = mount(Root, fixture, { plugins: new PluginSet().add(DataPlugin) });
    await nextTick();
    expect(fixture.innerHTML).toBe("");
    rpc.resolve();
    await mounted;
    expect(fixture.innerHTML).toBe("10");
  });

  test("multiple plugin willStarts run in parallel", async () => {
    const rpc1 = makeDeferred<number>();
    const rpc2 = makeDeferred<number>();
    const started: string[] = [];
    class A extends Plugin {
      setup() {
        onWillStart(async () => {
          started.push("a:start");
          await rpc1;
        });
      }
    }
    class B extends Plugin {
      setup() {
        onWillStart(async () => {
          started.push("b:start");
          await rpc2;
        });
      }
    }
    const app = new App({ plugins: new PluginSet().add(A).add(B) });
    expect(started).toEqual(["a:start", "b:start"]);
    expect(app.pluginHost.isReady()).toBe(false);
    rpc1.resolve(1);
    rpc2.resolve(2);
    await app.pluginHost.ready;
    expect(app.pluginHost.isReady()).toBe(true);
    app.destroy();
  });

  test("plugin onWillStart rejection rejects mount", async () => {
    class Broken extends Plugin {
      setup() {
        onWillStart(async () => {
          throw new Error("boom");
        });
      }
    }
    class Root extends Component {
      static template = xml``;
    }
    const fixture = makeTestFixture();
    const app = new App({ plugins: new PluginSet().add(Broken) });
    await expect(app.createRoot(Root).mount(fixture)).rejects.toMatchObject({
      message: "boom",
    });
    app.destroy();
  });

  test("abortSignal passed to plugin willStart aborts on destroy", async () => {
    let captured: AbortSignal | undefined;
    const rpc = makeDeferred<number>();
    class SlowPlugin extends Plugin {
      setup() {
        onWillStart(async ({ abortSignal }) => {
          captured = abortSignal;
          await rpc;
        });
      }
    }
    const app = new App({ plugins: new PluginSet().add(SlowPlugin) });
    expect(captured!.aborted).toBe(false);
    app.destroy();
    expect(captured!.aborted).toBe(true);
    // Let the pending willStart resolve to avoid leaking its promise.
    rpc.resolve(0);
  });

  test("providePlugins defers owning component render", async () => {
    const rpc = makeDeferred<number>();
    let valueAtChildSetup = -1;
    class AsyncPlugin extends Plugin {
      value = 0;
      setup() {
        onWillStart(async () => {
          this.value = await rpc;
        });
      }
    }
    class Child extends Component {
      static template = xml`<span>child</span>`;
      p = usePlugin(AsyncPlugin);
      setup() {
        valueAtChildSetup = this.p.value;
      }
    }
    class Parent extends Component {
      static template = xml`<Child/>`;
      static components = { Child };
      setup() {
        providePlugins((set) => set.add(AsyncPlugin));
      }
    }
    const fixture = makeTestFixture();
    const app = new App();
    const mounted = app.createRoot(Parent).mount(fixture);
    await nextTick();
    expect(valueAtChildSetup).toBe(-1);
    expect(fixture.innerHTML).toBe("");
    rpc.resolve(42);
    await mounted;
    expect(valueAtChildSetup).toBe(42);
    expect(fixture.innerHTML).toBe("<span>child</span>");
    app.destroy();
  });
});
