import {
  createPluginKey,
  getScope,
  onWillDestroy,
  onWillStart,
  Plugin,
  PluginHost,
  PluginScope,
  PluginSet,
  registrations,
  resolvers,
  signal,
  types,
  useConfig,
  useEffect,
  usePlugin,
  usePluginHost,
} from "../src";
import { waitScheduler } from "./helpers";

/** Waits for all pending microtasks (promise chains of any length) */
function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

describe("PluginSet", () => {
  test("only contains definitions, does not start plugins", () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        steps.push("A");
      }
    }
    const set = new PluginSet().add(A);
    expect(set.has(A)).toBe(true);
    expect(set.plugins()).toEqual([A]);
    expect(steps).toEqual([]);
  });

  test("child sets see their ancestors' definitions", () => {
    class A extends Plugin {}
    class B extends Plugin {}
    const parent = new PluginSet().add(A);
    const child = parent.createChild().add(B);
    expect(child.has(A)).toBe(true);
    expect(child.hasOwn(A)).toBe(false);
    expect(child.plugins()).toEqual([A, B]);
    expect(parent.has(B)).toBe(false);
  });
});

describe("PluginSet.merge", () => {
  test("merges the definitions of several sets into a new one", () => {
    class A extends Plugin {}
    class B extends Plugin {}
    class C extends Plugin {}
    const set1 = new PluginSet().add(A);
    const set2 = new PluginSet().add(B, { lifetime: "perHost" });
    const set3 = new PluginSet().add(C, { lifetime: "transient" });
    const merged = PluginSet.merge(set1, set2, set3);
    expect(merged.parent).toBe(null);
    expect(merged.plugins()).toEqual([A, B, C]);
    expect(merged.lifetimeOf(A)).toBe("shared");
    expect(merged.lifetimeOf(B)).toBe("perHost");
    expect(merged.lifetimeOf(C)).toBe("transient");
  });

  test("includes the definitions of the ancestors, with their closest lifetime", () => {
    class A extends Plugin {}
    class B extends Plugin {}
    const parent = new PluginSet().add(A).add(B);
    const child = parent.createChild().add(A, { lifetime: "perHost" });
    const merged = PluginSet.merge(child);
    expect(merged.plugins()).toEqual([A, B]);
    expect(merged.lifetimeOf(A)).toBe("perHost");
  });

  test("is a snapshot", () => {
    class A extends Plugin {}
    class B extends Plugin {}
    const set = new PluginSet().add(A);
    const merged = PluginSet.merge(set);
    set.add(B);
    merged.delete(A);
    expect(merged.plugins()).toEqual([]);
    expect(set.plugins()).toEqual([A, B]);
  });

  test("throws if a plugin is in several sets", () => {
    class A extends Plugin {}
    const set1 = new PluginSet().add(A);
    const set2 = new PluginSet().add(A);
    expect(() => PluginSet.merge(set1, set2)).toThrow('Plugin "A" is already in the set');
  });

  test("a definition shared by several sets (common ancestor) is merged once", () => {
    class A extends Plugin {}
    class B extends Plugin {}
    class C extends Plugin {}
    const parent = new PluginSet().add(A);
    const merged = PluginSet.merge(parent.createChild().add(B), parent.createChild().add(C));
    expect(merged.plugins()).toEqual([A, B, C]);
    // but redefined in a child: two definitions
    const child = parent.createChild().add(A, { lifetime: "perHost" });
    expect(() => PluginSet.merge(parent, child)).toThrow('Plugin "A" is already in the set');
  });
});

describe("PluginHost", () => {
  test("starts the plugins of its set", async () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        steps.push("A");
      }
    }
    const host = new PluginHost({}, new PluginSet().add(A));
    await host.start();
    expect(steps).toEqual(["A"]);
    expect(host.getPlugin(A)).toBeInstanceOf(A);
  });

  test("starts plugins added to the set later", async () => {
    class A extends Plugin {}
    class B extends Plugin {}
    const set = new PluginSet().add(A);
    const host = new PluginHost({}, set);
    await host.start();
    set.add(B);
    await waitScheduler();
    expect((host as any).instances.has(B)).toBe(true);
  });

  test("usePlugin starts dependencies first, whatever the order in the set", async () => {
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
    const host = new PluginHost({}, new PluginSet().add(B).add(A));
    await host.start();
    expect(steps).toEqual(["A", "B"]);
    expect(host.getPlugin(B).a).toBe(host.getPlugin(A));
  });

  test("usePlugin throws for a plugin outside the set", async () => {
    class A extends Plugin {}
    class B extends Plugin {
      a = usePlugin(A);
    }
    const host = new PluginHost({}, new PluginSet().add(B));
    expect(() => host.start()).toThrow('Plugin "A" is not in the plugin set');
  });

  test("circular dependencies are detected", async () => {
    class A extends Plugin {
      b = usePlugin(B);
    }
    class B extends Plugin {
      a = usePlugin(A);
    }
    const host = new PluginHost({}, new PluginSet().add(A).add(B));
    expect(() => host.start()).toThrow("Circular plugin dependency: A -> B -> A");
  });

  test("child host only starts its own definitions, and delegates the others", async () => {
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
    const set = new PluginSet().add(A);
    const host = new PluginHost({}, set);
    await host.start();
    const childHost = host.createChild(set.createChild().add(B));
    await childHost.start();
    expect(steps).toEqual(["A", "B"]);
    expect(childHost.getPlugin(B).a).toBe(host.getPlugin(A));
  });

  test("a child set can redefine a plugin to get its own instance", async () => {
    class A extends Plugin {}
    const set = new PluginSet().add(A);
    const host = new PluginHost({}, set);
    await host.start();
    const childHost = host.createChild(set.createChild().add(A));
    await childHost.start();
    expect(childHost.getPlugin(A)).not.toBe(host.getPlugin(A));
  });

  test("ready waits for willStart callbacks", async () => {
    let resolve!: () => void;
    class A extends Plugin {
      setup() {
        onWillStart(() => new Promise<void>((r) => (resolve = r)));
      }
    }
    const host = new PluginHost({}, new PluginSet().add(A));
    let isReady = false;
    host.start().then(() => (isReady = true));
    await waitScheduler();
    expect(isReady).toBe(false);
    resolve();
    await flushPromises();
    expect(isReady).toBe(true);
  });

  test("a child host starts its plugins once its parent is ready", async () => {
    const steps: string[] = [];
    let resolve!: () => void;
    class A extends Plugin {
      setup() {
        onWillStart(() => new Promise<void>((r) => (resolve = r)));
      }
    }
    class B extends Plugin {
      a = usePlugin(A);
      setup() {
        steps.push("B");
      }
    }
    const set = new PluginSet().add(A);
    const host = new PluginHost({}, set);
    host.start();
    const childHost = host.createChild(set.createChild().add(B));
    const childReady = childHost.start();
    await waitScheduler();
    expect(steps).toEqual([]);
    resolve();
    await childReady;
    expect(steps).toEqual(["B"]);
  });

  test("a child host destroyed before its parent is ready never starts", async () => {
    const steps: string[] = [];
    let resolve!: () => void;
    class A extends Plugin {
      setup() {
        onWillStart(() => new Promise<void>((r) => (resolve = r)));
      }
    }
    class B extends Plugin {
      setup() {
        steps.push("B");
      }
    }
    const set = new PluginSet().add(A);
    const host = new PluginHost({}, set);
    host.start();
    const childHost = host.createChild(set.createChild().add(B));
    childHost.start();
    childHost.destroy();
    resolve();
    await waitScheduler();
    await waitScheduler();
    expect(steps).toEqual([]);
  });

  test("ready waits for willStart callbacks of plugins added later", async () => {
    let resolve!: () => void;
    class A extends Plugin {
      setup() {
        onWillStart(() => new Promise<void>((r) => (resolve = r)));
      }
    }
    const set = new PluginSet();
    const host = new PluginHost({}, set);
    await host.start();
    set.add(A);
    await waitScheduler();
    let isReady = false;
    host.ready.then(() => (isReady = true));
    await waitScheduler();
    expect(isReady).toBe(false);
    resolve();
    await flushPromises();
    expect(isReady).toBe(true);
  });

  test("stops watching the set when destroyed", async () => {
    class A extends Plugin {}
    const set = new PluginSet();
    const host = new PluginHost({}, set);
    await host.start();
    host.destroy();
    set.add(A);
    await waitScheduler();
    expect((host as any).instances.size).toBe(0);
  });
});

describe("lifetimes", () => {
  test("shared: one instance, used by child hosts", async () => {
    class A extends Plugin {}
    class B extends Plugin {
      a = usePlugin(A);
    }
    const set = new PluginSet().add(A);
    const host = new PluginHost({}, set);
    await host.start();
    const childHost = host.createChild(set.createChild().add(B));
    await childHost.start();
    expect(childHost.getPlugin(B).a).toBe(host.getPlugin(A));
  });

  test("perHost: not created just because it is in the set", async () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        steps.push("A");
      }
    }
    const host = new PluginHost({}, new PluginSet().add(A, { lifetime: "perHost" }));
    await host.start();
    expect(steps).toEqual([]);
  });

  test("perHost: one instance per host, created when a plugin depends on it", async () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        steps.push("A");
      }
    }
    class B extends Plugin {
      a = usePlugin(A);
    }
    class C extends Plugin {
      a = usePlugin(A);
    }
    const set = new PluginSet().add(B).add(A, { lifetime: "perHost" });
    const host = new PluginHost({}, set);
    await host.start();
    expect(steps).toEqual(["A"]);
    const childHost = host.createChild(set.createChild().add(C));
    await childHost.start();
    expect(steps).toEqual(["A", "A"]);
    const b = childHost.getPlugin(B);
    const c = childHost.getPlugin(C);
    expect(b.a).toBe(host.getPlugin(A));
    expect(c.a).not.toBe(b.a);
    expect(c.a).toBe(childHost.getPlugin(A));
  });

  test("perHost: willStart delays the ready of the host creating it", async () => {
    let resolve!: () => void;
    class A extends Plugin {
      setup() {
        onWillStart(() => new Promise<void>((r) => (resolve = r)));
      }
    }
    class B extends Plugin {
      a = usePlugin(A);
    }
    const host = new PluginHost({}, new PluginSet().add(B).add(A, { lifetime: "perHost" }));
    let isReady = false;
    host.start().then(() => (isReady = true));
    await waitScheduler();
    expect(isReady).toBe(false);
    resolve();
    await flushPromises();
    expect(isReady).toBe(true);
  });

  test("perHost: must be in the set", async () => {
    class A extends Plugin {}
    class B extends Plugin {
      a = usePlugin(A);
    }
    const host = new PluginHost({}, new PluginSet().add(B));
    expect(() => host.start()).toThrow('Plugin "A" is not in the plugin set');
  });

  test("transient: a new instance on every usePlugin, owned by the caller", async () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        steps.push("A");
        onWillDestroy(() => steps.push("A destroyed"));
      }
    }
    class B extends Plugin {
      a1 = usePlugin(A);
      a2 = usePlugin(A);
    }
    const host = new PluginHost({}, new PluginSet().add(B).add(A, { lifetime: "transient" }));
    await host.start();
    const b = host.getPlugin(B);
    expect(b.a1).toBeInstanceOf(A);
    expect(b.a1).not.toBe(b.a2);
    expect(steps).toEqual(["A", "A"]);
    host.destroy();
    expect(steps).toEqual(["A", "A", "A destroyed", "A destroyed"]);
  });

  test("transient: not created just because it is in the set", async () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        steps.push("A");
      }
    }
    const host = new PluginHost({}, new PluginSet().add(A, { lifetime: "transient" }));
    await host.start();
    expect(steps).toEqual([]);
  });

  test("transient: must be in the set", async () => {
    class A extends Plugin {}
    class B extends Plugin {
      a = usePlugin(A);
    }
    const host = new PluginHost({}, new PluginSet().add(B));
    expect(() => host.start()).toThrow('Plugin "A" is not in the plugin set');
  });

  test("a plugin cannot be resolved during its own setup", async () => {
    class A extends Plugin {
      setup() {
        // e.g. a component it mounts, which uses it
        host.getPlugin(A);
      }
    }
    const host = new PluginHost({}, new PluginSet().add(A));
    expect(() => host.start()).toThrow("Circular plugin dependency: A -> A");
  });

  test("transient: circular dependencies are detected", async () => {
    class A extends Plugin {
      a = usePlugin(A);
    }
    const host = new PluginHost({}, new PluginSet().add(A, { lifetime: "transient" }));
    await host.start();
    expect(() => host.getPlugin(A)).toThrow("Circular plugin dependency: A -> A");
  });

  test("a child set can redefine a plugin with another lifetime", async () => {
    class A extends Plugin {}
    class B extends Plugin {
      a = usePlugin(A);
    }
    const set = new PluginSet().add(A);
    const host = new PluginHost({}, set);
    await host.start();
    const childSet = set.createChild().add(A, { lifetime: "transient" }).add(B);
    const childHost = host.createChild(childSet);
    await childHost.start();
    const a = childHost.getPlugin(B).a;
    expect(a).not.toBe(host.getPlugin(A));
    expect(childHost.getPlugin(A)).not.toBe(a);
  });

  test("adding a plugin already in the set throws, whatever its definition", () => {
    class A extends Plugin {}
    const set = new PluginSet().add(A);
    expect(() => set.add(A)).toThrow('Plugin "A" is already in the set');
    expect(() => set.add(A, { lifetime: "perHost" })).toThrow('Plugin "A" is already in the set');
    // a child set can redefine it
    set.createChild().add(A, { lifetime: "perHost" });
  });
});

describe("resolvers", () => {
  test("optional: the existing instance, or null", async () => {
    class A extends Plugin {}
    class B extends Plugin {}
    class C extends Plugin {
      a = usePlugin(A, { resolve: resolvers.optional() });
      b = usePlugin(B, { resolve: resolvers.optional() });
    }
    const set = new PluginSet().add(A).add(B, { lifetime: "perHost" });
    const host = new PluginHost({}, set);
    await host.start();
    const childHost = host.createChild(set.createChild().add(C));
    await childHost.start();
    const c = childHost.getPlugin(C);
    expect(c.a).toBe(host.getPlugin(A));
    // B is in the set, but not created
    expect(c.b).toBe(null);
  });

  test("optional: a plugin defined later in the set is not created yet", async () => {
    class A extends Plugin {}
    class B extends Plugin {
      a = usePlugin(A, { resolve: resolvers.optional() });
    }
    const host = new PluginHost({}, new PluginSet().add(B).add(A));
    await host.start();
    expect(host.getPlugin(B).a).toBe(null);
  });

  test("newInstance: a new instance owned by the consumer, whatever the lifetime", async () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        onWillDestroy(() => steps.push("A destroyed"));
      }
    }
    class B extends Plugin {
      a = usePlugin(A, { resolve: resolvers.newInstance() });
    }
    const host = new PluginHost({}, new PluginSet().add(A).add(B));
    await host.start();
    const b = host.getPlugin(B);
    expect(b.a).toBeInstanceOf(A);
    expect(b.a).not.toBe(host.getPlugin(A));
    host.destroy();
    expect(steps).toEqual(["A destroyed", "A destroyed"]);
  });

  test("newHostInstance: a new instance in a child host, with its own per host dependencies", async () => {
    const steps: string[] = [];
    class Dep extends Plugin {}
    class Shared extends Plugin {}
    class A extends Plugin {
      dep = usePlugin(Dep);
      shared = usePlugin(Shared);
      setup() {
        onWillDestroy(() => steps.push("A destroyed"));
      }
    }
    class B extends Plugin {
      a = usePlugin(A, { resolve: resolvers.newHostInstance() });
      dep = usePlugin(Dep);
    }
    const set = new PluginSet()
      .add(Shared)
      .add(Dep, { lifetime: "perHost" })
      .add(A, { lifetime: "perHost" })
      .add(B);
    const host = new PluginHost({}, set);
    await host.start();
    const b = host.getPlugin(B);
    expect(b.a).toBeInstanceOf(A);
    expect(host.findPlugin(A)).toBe(null);
    expect(b.a.dep).not.toBe(b.dep);
    expect(b.a.shared).toBe(host.getPlugin(Shared));
    host.destroy();
    expect(steps).toEqual(["A destroyed"]);
  });

  test("newHostInstance: with a config for the child host", async () => {
    class Dep extends Plugin {
      value = useConfig("value");
    }
    class A extends Plugin {
      dep = usePlugin(Dep);
      value = useConfig("value");
      other = useConfig("other");
    }
    class B extends Plugin {
      a = usePlugin(A, { resolve: resolvers.newHostInstance({ config: { value: "child" } }) });
    }
    const set = new PluginSet()
      .add(Dep, { lifetime: "perHost" })
      .add(A, { lifetime: "perHost" })
      .add(B);
    const host = new PluginHost({}, set, { config: { value: "parent", other: "inherited" } });
    await host.start();
    const a = host.getPlugin(B).a;
    expect(a).toMatchObject({ value: "child", other: "inherited" });
    expect(a.dep.value).toBe("child");
  });

  test("newHostInstance: willStart delays the consumer", async () => {
    let resolve!: () => void;
    class A extends Plugin {
      setup() {
        onWillStart(() => new Promise<void>((r) => (resolve = r)));
      }
    }
    class B extends Plugin {
      a = usePlugin(A, { resolve: resolvers.newHostInstance() });
    }
    const host = new PluginHost({}, new PluginSet().add(A, { lifetime: "perHost" }).add(B));
    let isReady = false;
    host.start().then(() => (isReady = true));
    await waitScheduler();
    expect(isReady).toBe(false);
    resolve();
    await flushPromises();
    expect(isReady).toBe(true);
  });

  test("reuse: the existing instance in the host chain, or a new one in the current host", async () => {
    class A extends Plugin {}
    class B extends Plugin {
      a = usePlugin(A, { resolve: resolvers.reuseInstance() });
    }
    class C extends Plugin {
      a = usePlugin(A, { resolve: resolvers.reuseInstance() });
    }
    const set = new PluginSet().add(A, { lifetime: "perHost" });
    const host = new PluginHost({}, set);
    await host.start();
    const childSet = set.createChild().add(B);
    const childHost = host.createChild(childSet);
    await childHost.start();
    // none in the chain: created in the child host
    const a = childHost.getPlugin(B).a;
    expect(host.findPlugin(A)).toBe(null);
    expect(childHost.findPlugin(A)).toBe(a);
    // found in the chain
    childSet.add(C);
    await waitScheduler();
    expect(childHost.getPlugin(C).a).toBe(a);
  });

  test("resolvers run with the consumer as the active scope", async () => {
    const steps: string[] = [];
    class A extends Plugin {}
    class B extends Plugin {
      a = usePlugin(A, {
        resolve: (ctx) => {
          steps.push(String(getScope() === ctx.scope));
          onWillDestroy(() => steps.push("B scope destroyed"));
          return ctx.get();
        },
      });
    }
    const host = new PluginHost({}, new PluginSet().add(A).add(B));
    await host.start();
    host.destroy();
    expect(steps).toEqual(["true", "B scope destroyed"]);
  });

  test("factories and resolvers receive the same helpers, not the host", async () => {
    let factoryKeys: string[] = [];
    let resolverKeys: string[] = [];
    class A extends Plugin {}
    class B extends Plugin {
      a = usePlugin(A, {
        resolve: (ctx) => {
          resolverKeys = Object.keys(ctx);
          return ctx.create(A, { owner: "scope" });
        },
      });
    }
    const set = new PluginSet().add(A).add(B, {
      use: (ctx) => {
        factoryKeys = Object.keys(ctx);
        return ctx.instantiate(B);
      },
    });
    const host = new PluginHost({}, set);
    await host.start();
    const helpers = ["config", "create", "createChild", "find", "get", "key", "parent", "scope"];
    expect(resolverKeys.sort()).toEqual(helpers);
    expect(factoryKeys.sort()).toEqual([...helpers, "instantiate"].sort());
    expect(host.getPlugin(B).a).not.toBe(host.getPlugin(A));
  });

  test("a factory can create instances owned by the new plugin", async () => {
    const steps: string[] = [];
    class Dep extends Plugin {
      setup() {
        onWillDestroy(() => steps.push("Dep destroyed"));
      }
    }
    class A extends Plugin {
      dep!: Dep;
      setup() {
        onWillDestroy(() => steps.push("A destroyed"));
      }
    }
    const set = new PluginSet().add(Dep).add(A, {
      use: ({ scope, create, instantiate }) => {
        const dep = create(Dep);
        const a = instantiate(A);
        a.dep = dep;
        expect(getScope()).toBe(scope);
        return a;
      },
    });
    const host = new PluginHost({}, set);
    await host.start();
    // a new instance, not the one of the host
    expect(host.getPlugin(A).dep).not.toBe(host.getPlugin(Dep));
    host.destroy();
    // the scope of A (A, then the Dep it owns), then the one of the shared Dep
    expect(steps).toEqual(["A destroyed", "Dep destroyed", "Dep destroyed"]);
  });

  test("in a factory, the default key is the plugin being created", async () => {
    class A extends Plugin {}
    const set = new PluginSet().add(A, { use: ({ get }) => get() });
    const host = new PluginHost({}, set);
    expect(() => host.start()).toThrow("Circular plugin dependency: A -> A");
  });

  test("custom resolvers", async () => {
    class A extends Plugin {}
    class B extends Plugin {
      a = usePlugin(A, { resolve: (ctx) => ctx.parent?.find() ?? null });
    }
    const set = new PluginSet().add(A);
    const host = new PluginHost({}, set);
    await host.start();
    const childHost = host.createChild(set.createChild().add(A).add(B));
    await childHost.start();
    expect(childHost.getPlugin(B).a).toBe(host.getPlugin(A));
    expect(childHost.getPlugin(B).a).not.toBe(childHost.getPlugin(A));
  });
});

test("usePlugin types depend on the resolver", () => {
  class A extends Plugin {
    value = 1;
  }
  // type-level only: never instantiated
  class B extends Plugin {
    a = usePlugin(A);
    optionalA = usePlugin(A, { resolve: resolvers.optional() });
    newA = usePlugin(A, { resolve: resolvers.newInstance() });
    hostA = usePlugin(A, { resolve: resolvers.newHostInstance() });
    lazyA = usePlugin(A, { lazy: true });
    lazyOptionalA = usePlugin(A, { lazy: true, resolve: resolvers.optional() });
    lazyAwaitedA = usePlugin(A, { lazy: true, resolve: resolvers.awaited() });
    awaitedA = usePlugin(A, { resolve: resolvers.awaited() });
    awaitedNewA = usePlugin(A, { resolve: resolvers.awaited(resolvers.newInstance()) });
    notLazyA = usePlugin(A, { lazy: false });
    customA = usePlugin(A, { resolve: (ctx) => (ctx.find() ? "found" : 0) });
    check() {
      const n: number = this.a.value + this.newA.value + this.hostA.value + this.lazyA().value;
      // @ts-expect-error may be null
      this.optionalA.value;
      // @ts-expect-error may be null
      this.lazyOptionalA().value;
      const maybe: number | undefined = this.optionalA?.value ?? this.lazyOptionalA()?.value;
      const p: Promise<number> = this.lazyAwaitedA().then((a) => a.value);
      const p2: Promise<number> = this.awaitedA.then((a) => a.value);
      const p3: Promise<number> = this.awaitedNewA.then((a) => a.value);
      const n4: number = this.notLazyA.value;
      const c: string | number = this.customA;
      // @ts-expect-error a getter, not an instance
      this.lazyA.value;
      return [n, maybe, p, p2, p3, n4, c];
    }
  }
  expect(B).toBeDefined();
});

describe("lazy option", () => {
  test("resolves on the first call, then returns the same value", async () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        steps.push("A");
      }
    }
    class B extends Plugin {
      a = usePlugin(A, { lazy: true });
    }
    const host = new PluginHost({}, new PluginSet().add(A, { lifetime: "perHost" }).add(B));
    await host.start();
    const b = host.getPlugin(B);
    expect(steps).toEqual([]);
    const a = b.a();
    expect(steps).toEqual(["A"]);
    expect(a).toBe(host.getPlugin(A));
    expect(b.a()).toBe(a);
    expect(steps).toEqual(["A"]);
  });

  test("breaks dependency cycles, whatever the order in the set", async () => {
    class A extends Plugin {
      b = usePlugin(B);
    }
    class B extends Plugin {
      a = usePlugin(A, { lazy: true });
    }
    for (const set of [new PluginSet().add(A).add(B), new PluginSet().add(B).add(A)]) {
      const host = new PluginHost({}, set);
      await host.start();
      expect(host.getPlugin(B).a()).toBe(host.getPlugin(A));
      expect(host.getPlugin(A).b).toBe(host.getPlugin(B));
    }
  });

  test("with a resolver", async () => {
    class A extends Plugin {}
    class B extends Plugin {
      optionalA = usePlugin(A, { lazy: true, resolve: resolvers.optional() });
      newA = usePlugin(A, { lazy: true, resolve: resolvers.newInstance() });
    }
    const host = new PluginHost({}, new PluginSet().add(A, { lifetime: "perHost" }).add(B));
    await host.start();
    const b = host.getPlugin(B);
    expect(b.optionalA()).toBe(null);
    expect(b.newA()).toBeInstanceOf(A);
    expect(b.newA()).not.toBe(host.getPlugin(A));
  });

  test("hooks registered on the consumer when resolving are run", async () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        onWillStart(() => {
          steps.push("A willStart");
        });
        onWillDestroy(() => steps.push("A destroyed"));
      }
    }
    class B extends Plugin {
      a = usePlugin(A, { lazy: true, resolve: resolvers.newInstance() });
    }
    const host = new PluginHost({}, new PluginSet().add(A).add(B));
    await host.start();
    // the shared A is started by the host
    expect(steps.splice(0)).toEqual(["A willStart"]);
    host.getPlugin(B).a();
    // the one owned by B, created after B has started
    expect(steps.splice(0)).toEqual(["A willStart"]);
    host.destroy();
    expect(steps).toEqual(["A destroyed", "A destroyed"]);
  });

  test("the getter throws if the consumer is destroyed", async () => {
    class A extends Plugin {}
    class B extends Plugin {
      a = usePlugin(A, { lazy: true });
    }
    const host = new PluginHost({}, new PluginSet().add(A).add(B));
    await host.start();
    const b = host.getPlugin(B);
    host.destroy();
    expect(() => b.a()).toThrow("Cannot run a callback in a destroyed scope");
  });
});

describe("awaited resolver", () => {
  test("waits for a plugin of the same host, in an onWillStart", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let resolve!: () => void;
    class A extends Plugin {
      data = "";
      setup() {
        onWillStart(async () => {
          await new Promise<void>((r) => (resolve = r));
          this.data = "data";
        });
      }
    }
    class B extends Plugin {
      a = usePlugin(A, { resolve: resolvers.awaited() });
      value = "";
      setup() {
        onWillStart(async () => {
          this.value = `from ${(await this.a).data}`;
        });
      }
    }
    // dev mode: no warning, B waits for A
    const host = new PluginHost({ dev: true }, new PluginSet().add(B).add(A));
    let isReady = false;
    host.start().then(() => (isReady = true));
    await flushPromises();
    expect(isReady).toBe(false);
    resolve();
    await flushPromises();
    expect(isReady).toBe(true);
    expect(host.getPlugin(B).value).toBe("from data");
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  test("lazy: waits for the plugin created on the first call", async () => {
    let resolve!: () => void;
    class A extends Plugin {
      value = "";
      setup() {
        onWillStart(async () => {
          await new Promise<void>((r) => (resolve = r));
          this.value = "ready";
        });
      }
    }
    class B extends Plugin {
      a = usePlugin(A, { lazy: true, resolve: resolvers.awaited() });
    }
    const host = new PluginHost({}, new PluginSet().add(A, { lifetime: "perHost" }).add(B));
    await host.start();
    let value = "";
    host
      .getPlugin(B)
      .a()
      .then((a) => (value = a.value));
    await flushPromises();
    expect(value).toBe("");
    resolve();
    await flushPromises();
    expect(value).toBe("ready");
  });

  test("waits for what the inner resolver registered (new host)", async () => {
    let resolve!: () => void;
    class Dep extends Plugin {
      value = "";
      setup() {
        onWillStart(async () => {
          await new Promise<void>((r) => (resolve = r));
          this.value = "ready";
        });
      }
    }
    class A extends Plugin {
      dep = usePlugin(Dep);
    }
    class B extends Plugin {
      a = usePlugin(A, { lazy: true, resolve: resolvers.awaited(resolvers.newHostInstance()) });
    }
    const set = new PluginSet()
      .add(Dep, { lifetime: "perHost" })
      .add(A, { lifetime: "perHost" })
      .add(B);
    const host = new PluginHost({}, set);
    await host.start();
    let value = "";
    host
      .getPlugin(B)
      .a()
      .then((a) => (value = a.dep.value));
    await flushPromises();
    expect(value).toBe("");
    resolve();
    await flushPromises();
    expect(value).toBe("ready");
  });

  test("not lazy: the consumer still waits for what the inner resolver registered", async () => {
    let resolve!: () => void;
    class A extends Plugin {
      setup() {
        onWillStart(() => new Promise<void>((r) => (resolve = r)));
      }
    }
    class B extends Plugin {
      a = usePlugin(A, { resolve: resolvers.awaited(resolvers.newInstance()) });
    }
    const host = new PluginHost({}, new PluginSet().add(A, { lifetime: "transient" }).add(B));
    let isReady = false;
    host.start().then(() => (isReady = true));
    await flushPromises();
    expect(isReady).toBe(false);
    resolve();
    await flushPromises();
    expect(isReady).toBe(true);
  });

  test("rejects with the willStart error", async () => {
    class A extends Plugin {
      setup() {
        onWillStart(() => Promise.reject(new Error("boom")));
      }
    }
    class B extends Plugin {
      a = usePlugin(A, { lazy: true, resolve: resolvers.awaited(resolvers.newInstance()) });
    }
    const host = new PluginHost({}, new PluginSet().add(A, { lifetime: "transient" }).add(B));
    await host.start();
    await expect(host.getPlugin(B).a()).rejects.toThrow("boom");
  });

  test("aborts if the consumer is destroyed while waiting", async () => {
    let resolve!: () => void;
    class A extends Plugin {
      setup() {
        onWillStart(() => new Promise<void>((r) => (resolve = r)));
      }
    }
    class B extends Plugin {
      a = usePlugin(A, { lazy: true, resolve: resolvers.awaited() });
    }
    const set = new PluginSet().add(A, { lifetime: "perHost" }).add(B);
    const host = new PluginHost({}, set);
    await host.start();
    const promise = host.getPlugin(B).a();
    host.destroy();
    resolve();
    await expect(promise).rejects.toThrow("The operation was aborted");
  });
});

describe("createChild", () => {
  test("creates a child host with the same app, and a new child set by default", () => {
    class A extends Plugin {}
    const app = {};
    const set = new PluginSet().add(A);
    const host = new PluginHost(app, set);
    const childHost = host.createChild();
    expect(childHost.app).toBe(app);
    expect(childHost.parent).toBe(host);
    expect(childHost.set.parent).toBe(set);
    expect(childHost.set.has(A)).toBe(true);
  });

  test("the given set must descend from the host's set", () => {
    const host = new PluginHost({}, new PluginSet());
    expect(() => host.createChild(new PluginSet())).toThrow(
      "The plugin set of a host must descend from its parent host's set"
    );
  });
});

describe("starting order", () => {
  test("starting a child host starts its parent first", async () => {
    const steps: string[] = [];
    let resolve!: () => void;
    class A extends Plugin {
      setup() {
        steps.push("A");
        onWillStart(() => new Promise<void>((r) => (resolve = r)));
      }
    }
    class Unused extends Plugin {
      setup() {
        steps.push("Unused");
      }
    }
    class B extends Plugin {
      a = usePlugin(A);
      setup() {
        steps.push("B");
      }
    }
    const set = new PluginSet().add(A).add(Unused);
    const host = new PluginHost({}, set);
    const childHost = host.createChild(set.createChild().add(B));
    let isChildReady = false;
    childHost.start().then(() => (isChildReady = true));
    expect(steps).toEqual(["A", "Unused"]);
    await waitScheduler();
    expect(isChildReady).toBe(false);
    resolve();
    await childHost.ready;
    expect(steps).toEqual(["A", "Unused", "B"]);
  });

  test("starts the whole ancestor chain", () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        steps.push("A");
      }
    }
    const set = new PluginSet().add(A);
    const host = new PluginHost({}, set);
    const childSet = set.createChild();
    const childHost = host.createChild(childSet);
    const grandChildHost = childHost.createChild(childSet.createChild());
    grandChildHost.start();
    expect(steps).toEqual(["A"]);
  });

  test("starting a parent after its child does nothing more", async () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        steps.push("A");
      }
    }
    const set = new PluginSet().add(A);
    const host = new PluginHost({}, set);
    const childHost = host.createChild(set.createChild());
    await childHost.start();
    await host.start();
    expect(steps).toEqual(["A"]);
  });
});

describe("plugin scopes", () => {
  test("each plugin has its own scope, linked to its host", async () => {
    const scopes: any[] = [];
    class A extends Plugin {
      setup() {
        scopes.push(getScope());
      }
    }
    class B extends Plugin {
      setup() {
        scopes.push(getScope());
      }
    }
    const host = new PluginHost({}, new PluginSet().add(A).add(B));
    await host.start();
    expect(scopes[0]).toBeInstanceOf(PluginScope);
    expect(scopes[1]).toBeInstanceOf(PluginScope);
    expect(scopes[0]).not.toBe(scopes[1]);
    expect(scopes[0].pluginHost).toBe(host);
  });

  test("plugins are destroyed before their dependencies", async () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        onWillDestroy(() => steps.push("A destroyed"));
      }
    }
    class B extends Plugin {
      a = usePlugin(A);
      setup() {
        onWillDestroy(() => steps.push("B destroyed"));
      }
    }
    class C extends Plugin {
      b = usePlugin(B);
      setup() {
        onWillDestroy(() => steps.push("C destroyed"));
      }
    }
    const host = new PluginHost({}, new PluginSet().add(C).add(A).add(B));
    await host.start();
    host.destroy();
    expect(steps).toEqual(["C destroyed", "B destroyed", "A destroyed"]);
  });

  test("effects of a plugin are disposed with the host", async () => {
    const steps: string[] = [];
    const s = signal(1);
    class A extends Plugin {
      setup() {
        useEffect(() => {
          steps.push(`effect ${s()}`);
        });
      }
    }
    const host = new PluginHost({}, new PluginSet().add(A));
    await host.start();
    host.destroy();
    s.set(2);
    await waitScheduler();
    expect(steps).toEqual(["effect 1"]);
  });

  test("a plugin failing in setup releases its scope", async () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        onWillDestroy(() => steps.push("A destroyed"));
        throw new Error("boom");
      }
    }
    const host = new PluginHost({}, new PluginSet().add(A));
    expect(() => host.start()).toThrow("boom");
    expect(steps).toEqual(["A destroyed"]);
    expect(host.findPlugin(A)).toBe(null);
  });

  test("cannot create plugins in a destroyed host", async () => {
    class A extends Plugin {}
    const host = new PluginHost({}, new PluginSet().add(A, { lifetime: "perHost" }));
    await host.start();
    host.destroy();
    expect(() => host.getPlugin(A)).toThrow('Cannot create plugin "A" in a destroyed host');
  });
});

describe("config", () => {
  test("plugins read the config of their host", async () => {
    class A extends Plugin {
      value = useConfig("value");
    }
    const host = new PluginHost({}, new PluginSet().add(A), { config: { value: 1 } });
    await host.start();
    expect(host.getPlugin(A).value).toBe(1);
  });

  test("child hosts inherit the config, and can override keys", async () => {
    class A extends Plugin {
      a = useConfig("a");
      b = useConfig("b");
    }
    const set = new PluginSet().add(A, { lifetime: "perHost" });
    const host = new PluginHost({}, set, { config: { a: 1, b: { x: 1, y: 1 } } });
    await host.start();
    const childHost = host.createChild(set.createChild(), { config: { b: { x: 2 } } });
    await childHost.start();
    expect(host.getPlugin(A)).toMatchObject({ a: 1, b: { x: 1, y: 1 } });
    // top level override only: b is replaced, not merged
    expect(childHost.getPlugin(A)).toMatchObject({ a: 1, b: { x: 2 } });
  });

  test("a shared plugin reads the config of the host owning it", async () => {
    class A extends Plugin {
      value = useConfig("value");
    }
    class B extends Plugin {
      a = usePlugin(A);
      value = useConfig("value");
    }
    const set = new PluginSet().add(A);
    const host = new PluginHost({}, set, { config: { value: "parent" } });
    const childHost = host.createChild(set.createChild().add(B), { config: { value: "child" } });
    await childHost.start();
    const b = childHost.getPlugin(B);
    expect(b.value).toBe("child");
    expect(b.a.value).toBe("parent");
  });

  test("default values", async () => {
    class A extends Plugin {
      defaulted = useConfig("defaulted", types.string().optional("default"));
      given = useConfig("given", types.string().optional("unused"));
    }
    const host = new PluginHost({}, new PluginSet().add(A), { config: { given: "given" } });
    await host.start();
    expect(host.getPlugin(A)).toMatchObject({ defaulted: "default", given: "given" });
  });

  test("values are validated in dev mode", () => {
    class A extends Plugin {
      value = useConfig("value", types.number());
    }
    const set = new PluginSet().add(A);
    const host = new PluginHost({ dev: true }, set, { config: { value: "not a number" } });
    expect(() => host.start()).toThrow("Config does not match the type");
    // not validated outside dev mode
    const prodHost = new PluginHost({}, set, { config: { value: "not a number" } });
    prodHost.start();
    expect(prodHost.getPlugin(A).value).toBe("not a number");
  });

  test("inherited values are validated too", async () => {
    class A extends Plugin {
      value = useConfig("value", types.number());
    }
    const set = new PluginSet();
    const host = new PluginHost({ dev: true }, set, { config: { value: "not a number" } });
    const childHost = host.createChild(set.createChild().add(A));
    // the parent is ready: the child host starts synchronously
    expect(() => childHost.start()).toThrow("Config does not match the type");
  });

  test("can only be called from a plugin", () => {
    expect(() => useConfig("value")).toThrow();
  });
});

describe("overrides", () => {
  test("another class can be registered under a plugin key", async () => {
    class ORM extends Plugin {
      name = "orm";
    }
    class MockORM extends ORM {
      name = "mock";
    }
    class B extends Plugin {
      orm = usePlugin(ORM);
    }
    const host = new PluginHost(
      {},
      new PluginSet().add(ORM, { use: registrations.create(MockORM) }).add(B)
    );
    await host.start();
    expect(host.getPlugin(B).orm).toBeInstanceOf(MockORM);
    expect(host.getPlugin(B).orm.name).toBe("mock");
    expect(host.getPlugin(ORM)).toBe(host.getPlugin(B).orm);
  });

  test("an abstract class can be used as a key", async () => {
    abstract class Storage extends Plugin {
      abstract get(key: string): string;
    }
    class MemoryStorage extends Storage {
      get(key: string) {
        return `memory:${key}`;
      }
    }
    class B extends Plugin {
      storage = usePlugin(Storage);
    }
    const host = new PluginHost(
      {},
      new PluginSet().add(Storage, { use: registrations.create(MemoryStorage) }).add(B)
    );
    await host.start();
    expect(host.getPlugin(B).storage.get("a")).toBe("memory:a");
  });

  test("a child set can override a plugin for its host", async () => {
    class Dialog extends Plugin {}
    class MobileDialog extends Dialog {}
    class B extends Plugin {
      dialog = usePlugin(Dialog);
    }
    const set = new PluginSet().add(Dialog);
    const host = new PluginHost({}, set);
    const childHost = host.createChild(
      set
        .createChild()
        .add(Dialog, { use: registrations.create(MobileDialog) })
        .add(B)
    );
    await childHost.start();
    expect(host.getPlugin(Dialog)).not.toBeInstanceOf(MobileDialog);
    expect(childHost.getPlugin(B).dialog).toBeInstanceOf(MobileDialog);
  });

  test("merge keeps the overrides", async () => {
    class A extends Plugin {}
    class B extends A {}
    const set = new PluginSet().add(A, { use: registrations.create(B) });
    const merged = PluginSet.merge(set);
    expect(merged.definitionOf(A)).toEqual(set.definitionOf(A));
    const host = new PluginHost({}, merged);
    await host.start();
    expect(host.getPlugin(A)).toBeInstanceOf(B);
  });

  test("alias: two keys share the same instance", async () => {
    abstract class Logger extends Plugin {
      abstract log(message: string): string;
    }
    class ConsoleLogger extends Logger {
      log(message: string) {
        return `console: ${message}`;
      }
    }
    class B extends Plugin {
      logger = usePlugin(Logger);
      consoleLogger = usePlugin(ConsoleLogger);
    }
    const set = new PluginSet()
      .add(ConsoleLogger)
      .add(Logger, { use: registrations.alias(ConsoleLogger) })
      .add(B);
    const host = new PluginHost({}, set);
    await host.start();
    const b = host.getPlugin(B);
    expect(b.logger).toBe(b.consoleLogger);
    expect(b.logger.log("a")).toBe("console: a");
  });

  test("alias: follows the lifetime of the aliased key", async () => {
    class Impl extends Plugin {}
    class Key extends Plugin {}
    const set = new PluginSet()
      .add(Impl, { lifetime: "perHost" })
      .add(Key, { lifetime: "perHost", use: registrations.alias(Impl) });
    const host = new PluginHost({}, set);
    await host.start();
    const childHost = host.createChild();
    await childHost.start();
    expect(host.getPlugin(Key)).toBe(host.getPlugin(Impl));
    expect(childHost.getPlugin(Key)).toBe(childHost.getPlugin(Impl));
    expect(childHost.getPlugin(Key)).not.toBe(host.getPlugin(Key));
  });

  test("alias: the aliased instance is not set up again", async () => {
    const steps: string[] = [];
    class Impl extends Plugin {
      setup() {
        steps.push("Impl setup");
      }
    }
    class Key extends Plugin {}
    const set = new PluginSet().add(Impl).add(Key, { use: registrations.alias(Impl) });
    const host = new PluginHost({}, set);
    await host.start();
    expect(host.getPlugin(Key)).toBe(host.getPlugin(Impl));
    expect(steps).toEqual(["Impl setup"]);
  });

  test("reuseInstance: reuses the instance of a parent host", async () => {
    const steps: string[] = [];
    class Dialog extends Plugin {
      setup() {
        steps.push("Dialog setup");
      }
    }
    const set = new PluginSet().add(Dialog);
    const host = new PluginHost({}, set);
    await host.start();
    // redefined in a child set: the parent's instance is reused
    const childHost = host.createChild(
      set.createChild().add(Dialog, { use: registrations.reuseInstance() })
    );
    await childHost.start();
    expect(childHost.getPlugin(Dialog)).toBe(host.getPlugin(Dialog));
    expect(steps).toEqual(["Dialog setup"]);
  });

  test("reuseInstance: creates an instance if there is none", async () => {
    class Dialog extends Plugin {}
    class MobileDialog extends Dialog {}
    const set = new PluginSet().add(Dialog, {
      lifetime: "perHost",
      use: registrations.reuseInstance(registrations.create(MobileDialog)),
    });
    const host = new PluginHost({}, set);
    await host.start();
    const childHost = host.createChild();
    await childHost.start();
    // the child host asks first: none in the chain, created there
    const dialog = childHost.getPlugin(Dialog);
    expect(dialog).toBeInstanceOf(MobileDialog);
    // the parent host has none either: it creates its own
    expect(host.getPlugin(Dialog)).not.toBe(dialog);
    // a grand child host reuses the closest one
    const grandChildHost = childHost.createChild();
    await grandChildHost.start();
    expect(grandChildHost.getPlugin(Dialog)).toBe(dialog);
  });

  test("reuseInstance: perHost, but shared when an ancestor has one", async () => {
    class Cache extends Plugin {}
    const set = new PluginSet().add(Cache, {
      lifetime: "perHost",
      use: registrations.reuseInstance(),
    });
    const host = new PluginHost({}, set);
    await host.start();
    const cache = host.getPlugin(Cache);
    const childHost = host.createChild();
    await childHost.start();
    expect(childHost.getPlugin(Cache)).toBe(cache);
  });

  test("reuseInstance with a plugin key", async () => {
    const ApiUrl = createPluginKey<string>("apiUrl");
    const set = new PluginSet().add(ApiUrl, { use: () => "/api" });
    const host = new PluginHost({}, set);
    await host.start();
    const childSet = set.createChild().add(ApiUrl, {
      lifetime: "perHost",
      use: registrations.reuseInstance(() => "/other"),
    });
    const childHost = host.createChild(childSet);
    await childHost.start();
    expect(childHost.getPlugin(ApiUrl)).toBe("/api");
    // no instance to reuse, and no fallback
    const Other = createPluginKey<string>("other");
    const isolated = new PluginHost(
      {},
      new PluginSet().add(Other, { use: registrations.reuseInstance() })
    );
    expect(() => isolated.start()).toThrow(
      'Plugin key "other" has no instance to reuse, and no fallback factory'
    );
  });

  test("alias to itself is a circular dependency", () => {
    class A extends Plugin {}
    const host = new PluginHost({}, new PluginSet().add(A, { use: registrations.alias(A) }));
    expect(() => host.start()).toThrow("Circular plugin dependency: A -> A");
  });

  test("a factory can build a non Plugin object with the interface of the key", async () => {
    const steps: string[] = [];
    abstract class Bus extends Plugin {
      abstract send(message: string): void;
    }
    class B extends Plugin {
      bus = usePlugin(Bus);
      setup() {
        this.bus.send("hello");
      }
    }
    const set = new PluginSet()
      .add(Bus, {
        use: () => {
          onWillDestroy(() => steps.push("bus closed"));
          return { send: (message: string) => steps.push(`sent ${message}`) };
        },
      })
      .add(B);
    const host = new PluginHost({}, set);
    await host.start();
    expect(steps.splice(0)).toEqual(["sent hello"]);
    expect(host.getPlugin(Bus)).not.toBeInstanceOf(Bus);
    host.destroy();
    expect(steps).toEqual(["bus closed"]);
  });

  test("the host does not set up what a factory returns: the factory does", async () => {
    const steps: string[] = [];
    class A extends Plugin {
      value = 0;
    }
    const set = new PluginSet().add(A, {
      use: () => ({
        value: 0,
        setup() {
          steps.push("setup");
        },
      }),
    });
    const host = new PluginHost({}, set);
    await host.start();
    expect(steps).toEqual([]);
    expect(host.getPlugin(A).value).toBe(0);
  });

  test("a non Plugin object must have the interface of the key", () => {
    class A extends Plugin {
      value = 0;
      read() {
        return this.value;
      }
    }
    class WithPrivate extends Plugin {
      #secret = 1;
      get secret() {
        return this.#secret;
      }
    }
    // type-level only
    const check = () => {
      new PluginSet()
        .add(A, { use: () => ({ value: 1, read: () => 1 }) })
        // @ts-expect-error read is missing
        .add(A, { use: () => ({ value: 1 }) })
        // only the public interface matters: consumers never see private members
        .add(WithPrivate, { use: () => ({ secret: 1 }) });
    };
    expect(check).toBeDefined();
  });

  test("custom factory, run with the scope of the new plugin", async () => {
    const steps: string[] = [];
    class Storage extends Plugin {}
    class MemoryStorage extends Storage {
      setup() {
        steps.push("MemoryStorage setup");
        onWillDestroy(() => steps.push("MemoryStorage destroyed"));
      }
    }
    const set = new PluginSet().add(Storage, {
      use: ({ config, key, instantiate }) => {
        steps.push(`creating ${key.name}`);
        onWillDestroy(() => steps.push("Storage destroyed"));
        return config.test ? instantiate(MemoryStorage) : instantiate(Storage);
      },
    });
    const host = new PluginHost({}, set, { config: { test: true } });
    await host.start();
    expect(host.getPlugin(Storage)).toBeInstanceOf(MemoryStorage);
    expect(steps.splice(0)).toEqual(["creating Storage", "MemoryStorage setup"]);
    host.destroy();
    expect(steps).toEqual(["MemoryStorage destroyed", "Storage destroyed"]);
  });

  test("a factory instantiating a plugin with `new` does not set it up", async () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        steps.push("setup");
      }
    }
    const set = new PluginSet().add(A, { use: () => new A() });
    const host = new PluginHost({}, set);
    await host.start();
    expect(host.getPlugin(A)).toBeInstanceOf(A);
    expect(steps).toEqual([]);
  });
});

describe("errors", () => {
  test("framework errors mention the plugins being created", () => {
    class Missing extends Plugin {}
    class A extends Plugin {
      m = usePlugin(Missing);
    }
    class B extends Plugin {
      a = usePlugin(A);
    }
    const host = new PluginHost({}, new PluginSet().add(B).add(A));
    expect(() => host.start()).toThrow(
      'Plugin "Missing" is not in the plugin set (while creating B -> A)'
    );
  });

  test("errors thrown by plugins are rethrown as is", () => {
    const error = new Error("boom");
    class A extends Plugin {
      setup() {
        throw error;
      }
    }
    class B extends Plugin {
      a = usePlugin(A);
    }
    const host = new PluginHost({}, new PluginSet().add(B).add(A));
    let thrown: any;
    try {
      host.start();
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBe(error);
  });

  test("usePlugin outside a scope with a host", () => {
    class A extends Plugin {}
    expect(() => usePlugin(A)).toThrow("No active scope");
  });

  test("dev mode: warns when depending on a plugin of the same host still starting", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    class A extends Plugin {
      setup() {
        onWillStart(() => new Promise(() => {}));
      }
    }
    class B extends Plugin {
      a = usePlugin(A);
    }
    const host = new PluginHost({ dev: true }, new PluginSet().add(A).add(B));
    host.start();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain(
      'Plugin "B" depends on "A", whose onWillStart has not settled yet'
    );
    warn.mockRestore();
  });

  test("dev mode: no warning when the dependency is in a parent host", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let resolve!: () => void;
    class A extends Plugin {
      setup() {
        onWillStart(() => new Promise<void>((r) => (resolve = r)));
      }
    }
    class B extends Plugin {
      a = usePlugin(A);
    }
    const set = new PluginSet().add(A);
    const host = new PluginHost({ dev: true }, set);
    const childHost = host.createChild(set.createChild().add(B));
    const ready = childHost.start();
    resolve();
    await ready;
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("readiness", () => {
  test("isReady and whenReady include the ancestors", async () => {
    let resolve!: () => void;
    class A extends Plugin {
      setup() {
        onWillStart(() => new Promise<void>((r) => (resolve = r)));
      }
    }
    const set = new PluginSet().add(A, { lifetime: "perHost" });
    const host = new PluginHost({}, set);
    await host.start();
    const childHost = host.createChild();
    await childHost.start();
    expect(childHost.isReady()).toBe(true);
    // created on demand in the parent: the child is not ready anymore
    host.getPlugin(A);
    expect(host.isReady()).toBe(false);
    expect(childHost.isReady()).toBe(false);
    let isReady = false;
    childHost.whenReady().then(() => (isReady = true));
    await flushPromises();
    expect(isReady).toBe(false);
    resolve();
    await flushPromises();
    expect(isReady).toBe(true);
    expect(childHost.isReady()).toBe(true);
  });

  test("a failing willStart keeps the host from being ready", async () => {
    class A extends Plugin {
      setup() {
        onWillStart(() => Promise.reject(new Error("boom")));
      }
    }
    const host = new PluginHost({}, new PluginSet().add(A));
    await expect(host.start()).rejects.toThrow("boom");
    expect(host.isReady()).toBe(false);
  });

  test("a child of a ready parent starts synchronously", async () => {
    const steps: string[] = [];
    class A extends Plugin {
      setup() {
        steps.push("A");
      }
    }
    const host = new PluginHost({}, new PluginSet());
    await host.start();
    const childHost = host.createChild();
    childHost.set.add(A);
    childHost.start();
    expect(steps).toEqual(["A"]);
    expect(childHost.isReady()).toBe(true);
  });
});

describe("plugin keys (createPluginKey)", () => {
  test("a key for a value that is not a plugin", async () => {
    const ApiUrl = createPluginKey("apiUrl", types.string());
    class Orm extends Plugin {
      url = usePlugin(ApiUrl);
    }
    const host = new PluginHost({}, new PluginSet().add(ApiUrl, { use: () => "/api" }).add(Orm));
    await host.start();
    expect(host.getPlugin(Orm).url).toBe("/api");
    expect(host.getPlugin(ApiUrl)).toBe("/api");
  });

  test("falsy values", async () => {
    const Count = createPluginKey<number>("count");
    const Flag = createPluginKey<boolean>("flag");
    const steps: string[] = [];
    const host = new PluginHost(
      {},
      new PluginSet()
        .add(Count, {
          use: () => {
            steps.push("count");
            return 0;
          },
        })
        .add(Flag, { use: () => false })
    );
    await host.start();
    expect(host.getPlugin(Count)).toBe(0);
    expect(host.getPlugin(Flag)).toBe(false);
    expect(host.findPlugin(Count)).toBe(0);
    // created once
    expect(steps).toEqual(["count"]);
  });

  test("two keys with the same name are different keys", async () => {
    const Key1 = createPluginKey<string>("key");
    const Key2 = createPluginKey<string>("key");
    const set = new PluginSet().add(Key1, { use: () => "1" }).add(Key2, { use: () => "2" });
    const host = new PluginHost({}, set);
    await host.start();
    expect(host.getPlugin(Key1)).toBe("1");
    expect(host.getPlugin(Key2)).toBe("2");
  });

  test("a factory is required", () => {
    const Key = createPluginKey<string>("key");
    // @ts-expect-error use is required
    expect(() => new PluginSet().add(Key)).toThrow('Plugin key "key" needs a factory (use option)');
  });

  test("lifetimes, overrides, aliases and resolvers work with keys", async () => {
    const Formatter = createPluginKey("formatter", types.function());
    const Alias = createPluginKey("alias", types.function());
    const Missing = createPluginKey<string>("missing");
    class B extends Plugin {
      format = usePlugin(Formatter);
      alias = usePlugin(Alias);
      missing = usePlugin(Missing, { resolve: resolvers.optional() });
      lazyFormat = usePlugin(Formatter, { lazy: true });
    }
    const set = new PluginSet()
      .add(Formatter, { lifetime: "perHost", use: () => (v: string) => `[${v}]` })
      .add(Alias, { use: registrations.alias(Formatter) })
      .add(B);
    const host = new PluginHost({}, set);
    await host.start();
    const b = host.getPlugin(B);
    expect(b.format("a")).toBe("[a]");
    expect(b.alias).toBe(b.format);
    expect(b.missing).toBe(null);
    expect(b.lazyFormat()).toBe(b.format);
    // overridden in a child set
    const childHost = host.createChild(
      set.createChild().add(Formatter, { use: () => (v: string) => `<${v}>` })
    );
    await childHost.start();
    expect((childHost.getPlugin(Formatter) as (v: string) => string)("a")).toBe("<a>");
  });

  test("errors use the name of the key", () => {
    const Key = createPluginKey<string>("myKey");
    class A extends Plugin {
      key = usePlugin(Key);
    }
    const host = new PluginHost({}, new PluginSet().add(A));
    expect(() => host.start()).toThrow(
      'Plugin "myKey" is not in the plugin set (while creating A)'
    );
  });

  test("types", () => {
    const Str = createPluginKey("str", types.string());
    const Obj = createPluginKey("obj", types.object({ log: types.function() }));
    const Explicit = createPluginKey<number[]>("explicit");
    // type-level only
    class B extends Plugin {
      str = usePlugin(Str);
      obj = usePlugin(Obj);
      explicit = usePlugin(Explicit);
      optional = usePlugin(Str, { resolve: resolvers.optional() });
      check() {
        const s: string = this.str;
        const n: number = this.explicit[0];
        this.obj.log;
        // @ts-expect-error may be null
        this.optional.length;
        // @ts-expect-error not a number
        const wrong: number = this.str;
        return [s, n, wrong];
      }
    }
    const check = () => {
      new PluginSet()
        .add(Str, { use: () => "a" })
        // @ts-expect-error not a string
        .add(Str, { use: () => 1 });
    };
    expect([B, check]).toBeDefined();
  });
});

describe("createPlugins", () => {
  test("creates the shared plugins, and waits for the plugins created so far", async () => {
    const steps: string[] = [];
    let resolve!: () => void;
    class A extends Plugin {
      setup() {
        steps.push("A");
        onWillStart(() => new Promise<void>((r) => (resolve = r)));
      }
    }
    class B extends Plugin {
      setup() {
        steps.push("B");
      }
    }
    class T extends Plugin {
      setup() {
        steps.push("T");
      }
    }
    const host = new PluginHost(
      {},
      new PluginSet().add(A).add(B).add(T, { lifetime: "transient" })
    );
    let settled = false;
    host.createPlugins([A, T]).then(() => (settled = true));
    expect(steps).toEqual(["A"]);
    // not ready: not started
    expect(host.isReady()).toBe(false);
    await flushPromises();
    expect(settled).toBe(false);
    resolve();
    await flushPromises();
    expect(settled).toBe(true);
    await host.start();
    expect(steps).toEqual(["A", "B"]);
  });

  test("a subclass can start the sets of its chain in sequence", async () => {
    const steps: string[] = [];
    const delay = () => new Promise<void>((r) => setTimeout(r, 1));
    class SequentialHost extends PluginHost {
      async start() {
        const sets: PluginSet[] = [];
        for (let set: PluginSet | null = this.set; set; set = set.parent) {
          sets.unshift(set);
        }
        for (const set of sets) {
          await this.createPlugins(set.ownPlugins());
        }
        return super.start();
      }
    }
    let loaded = false;
    class Translation extends Plugin {
      setup() {
        onWillStart(async () => {
          await delay();
          loaded = true;
        });
      }
    }
    class Service extends Plugin {
      // implicit dependency
      setup() {
        steps.push(`Service (loaded: ${loaded})`);
      }
    }
    const foundation = new PluginSet().add(Translation);
    const host = new SequentialHost({}, foundation.createChild().add(Service));
    await host.start();
    expect(steps).toEqual(["Service (loaded: true)"]);
    expect(host.isReady()).toBe(true);
  });
});

describe("usePluginHost", () => {
  test("creates and starts a child host, without changing the current one", async () => {
    const steps: string[] = [];
    class Rpc extends Plugin {}
    class Draft extends Plugin {
      rpc = usePlugin(Rpc);
      setup() {
        steps.push("Draft");
      }
    }
    class Editor extends Plugin {
      draftHost = usePluginHost([Draft], { config: { autosave: true } });
      setup() {
        // the current host is unchanged
        expect(() => usePlugin(Draft)).toThrow('Plugin "Draft" is not in the plugin set');
      }
    }
    const host = new PluginHost({}, new PluginSet().add(Rpc).add(Editor), {
      config: { debug: true },
    });
    await host.start();
    const draftHost = host.getPlugin(Editor).draftHost;
    expect(steps).toEqual(["Draft"]);
    expect(draftHost.parent).toBe(host);
    expect(draftHost.getPlugin(Draft).rpc).toBe(host.getPlugin(Rpc));
    expect(draftHost.config).toMatchObject({ debug: true, autosave: true });
  });

  test("isolated: a root host, not linked to the current one", async () => {
    class Rpc extends Plugin {}
    class Draft extends Plugin {}
    class Editor extends Plugin {
      draftHost = usePluginHost((set) => set.add(Draft, { lifetime: "perHost" }), {
        isolated: true,
        config: { own: 1 },
      });
    }
    const host = new PluginHost({}, new PluginSet().add(Rpc).add(Editor), {
      config: { debug: true },
    });
    await host.start();
    const draftHost = host.getPlugin(Editor).draftHost;
    expect(draftHost.parent).toBe(null);
    expect(draftHost.getPlugin(Draft)).toBeInstanceOf(Draft);
    expect(() => draftHost.getPlugin(Rpc)).toThrow('Plugin "Rpc" is not in the plugin set');
    expect(draftHost.config.debug).toBeUndefined();
    expect(draftHost.config.own).toBe(1);
  });

  test("destroyed with the current scope", async () => {
    const steps: string[] = [];
    class Draft extends Plugin {
      setup() {
        onWillDestroy(() => steps.push("Draft destroyed"));
      }
    }
    class Editor extends Plugin {
      draftHost = usePluginHost([Draft]);
      setup() {
        onWillDestroy(() => steps.push("Editor destroyed"));
      }
    }
    const host = new PluginHost({}, new PluginSet().add(Editor));
    await host.start();
    const draftHost = host.getPlugin(Editor).draftHost;
    host.destroy();
    expect(draftHost.isDestroyed()).toBe(true);
    // registered first: destroyed after the callbacks of its creator's setup
    expect(steps).toEqual(["Editor destroyed", "Draft destroyed"]);
  });

  test("can be destroyed before the current scope", async () => {
    const steps: string[] = [];
    class Draft extends Plugin {
      setup() {
        onWillDestroy(() => steps.push("Draft destroyed"));
      }
    }
    class Editor extends Plugin {
      draftHost = usePluginHost([Draft]);
    }
    const host = new PluginHost({}, new PluginSet().add(Editor));
    await host.start();
    host.getPlugin(Editor).draftHost.destroy();
    expect(steps).toEqual(["Draft destroyed"]);
    host.destroy();
    expect(steps).toEqual(["Draft destroyed"]);
  });

  test("accepts a set", async () => {
    class Draft extends Plugin {}
    const draftSet = new PluginSet().add(Draft);
    class Editor extends Plugin {
      draftHost = usePluginHost(draftSet, { isolated: true });
    }
    const host = new PluginHost({}, new PluginSet().add(Editor));
    await host.start();
    expect(host.getPlugin(Editor).draftHost.set).toBe(draftSet);
  });

  test("the current scope waits for it", async () => {
    let resolve!: () => void;
    class Draft extends Plugin {
      setup() {
        onWillStart(() => new Promise<void>((r) => (resolve = r)));
      }
    }
    class Editor extends Plugin {
      draftHost = usePluginHost([Draft], { isolated: true });
    }
    const host = new PluginHost({}, new PluginSet().add(Editor));
    let started = false;
    host.start().then(() => (started = true));
    await flushPromises();
    expect(started).toBe(false);
    resolve();
    await flushPromises();
    expect(started).toBe(true);
    expect(host.getPlugin(Editor).draftHost.isReady()).toBe(true);
  });

  test("created by a plugin, a child host does not wait for the current one", async () => {
    // the current host waits for the plugin, which waits for the child host:
    // the child host cannot wait for the current one
    const steps: string[] = [];
    let resolve!: () => void;
    class Rpc extends Plugin {
      setup() {
        onWillStart(() => new Promise<void>((r) => (resolve = r)));
      }
    }
    class Draft extends Plugin {
      rpc = usePlugin(Rpc);
      setup() {
        steps.push("Draft");
      }
    }
    class Editor extends Plugin {
      rpc = usePlugin(Rpc);
      draftHost = usePluginHost([Draft]);
    }
    const host = new PluginHost({}, new PluginSet().add(Rpc).add(Editor));
    const started = host.start();
    expect(steps).toEqual(["Draft"]);
    resolve();
    await started;
    expect(host.isReady()).toBe(true);
  });

  test("needs a scope", () => {
    expect(() => usePluginHost([])).toThrow("No active scope");
  });
});
