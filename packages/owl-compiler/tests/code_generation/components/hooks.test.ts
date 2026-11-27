import { snapshotTemplate } from "../../helpers";

describe("hooks", () => {
  test("two different call to willPatch/patched should work", () => {
    snapshotTemplate(`<div>hey<t t-out="this.state.value"/></div>`);
  });

  describe("autofocus hook", () => {
    test("simple input", () => {
      snapshotTemplate(`
            <div>
                <input/>
                <input t-ref="this.input"/>
            </div>`);
    });

    test("input in a t-if", () => {
      snapshotTemplate(`
            <div>
                <input/>
                <t t-if="this.state.flag"><input t-ref="this.input"/></t>
            </div>`);
    });
  });

  test("can use onWillStart, onWillUpdateProps", () => {
    snapshotTemplate(`<MyComponent value="this.state.value"/>`);
  });

  test("onWillUpdateProps receives nextProps", () => {
    snapshotTemplate(`<Child value="this.value()"/>`);
  });

  test("useListener", () => {
    snapshotTemplate(`<MyComponent t-if="this.state.flag"/>`);
  });

  test("useListener work with references", () => {
    snapshotTemplate(`<span t-ref="this.span"><t t-out="this.value()"/></span>`);
  });

  test("useListener ignores the event that created its component", () => {
    snapshotTemplate(`
        <button t-on-click="() => this.show.set(true)">open</button>
        <Child t-if="this.show()"/>`);
    snapshotTemplate(`<div>child</div>`);
  });

  test("useListener ignores the event that created its component, from another useListener", () => {
    snapshotTemplate(`<Child t-if="this.show()"/>`);
  });

  test("useListener still receives an event dispatched while it is being attached", () => {
    snapshotTemplate(`
        <button t-on-click="() => this.show.set(true)">open</button>
        <MyComponent t-if="this.show()"/>`);
  });

  describe("useEffect hook", () => {
    test("effect can depend on stuff in dom", () => {
      snapshotTemplate(`
          <t t-if="this.state.value">
            <div t-ref="this.ref"/>
          </t>`);
    });
  });
});
