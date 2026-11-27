import { snapshotTemplate } from "../../helpers";

describe("Reactivity: proxy", () => {
  test("very simple use, with initial value", () => {
    snapshotTemplate(`<div><t t-out="this.contextObj.value"/></div>`);
  });

  test("two components can subscribe to same context", () => {
    snapshotTemplate(`<div><Child /><Child /></div>`);
    snapshotTemplate(`<span><t t-out="this.contextObj.value"/></span>`);
  });

  test("two independent components on different levels are updated in parallel", () => {
    snapshotTemplate(`<div><Child /><Parent /></div>`);
  });

  test("one components can subscribe twice to same context", () => {
    snapshotTemplate(
      `<div><t t-set="noop" t-value="this.notify()"/><t t-out="this.contextObj1.a"/><t t-out="this.contextObj2.b"/></div>`
    );
  });

  test("parent and children subscribed to same context", () => {
    snapshotTemplate(
      `<t t-set="noop" t-value="this.notify()"/><div><Child /><t t-out="this.contextObj.b"/></div>`
    );
    snapshotTemplate(
      `<span><t t-set="noop" t-value="this.notify()"/><t t-out="this.contextObj.a"/></span>`
    );
  });

  test("destroyed component is inactive", () => {
    snapshotTemplate(`<span><t t-out="this.contextObj.a"/></span>`);
  });

  test("useless atoms should be deleted", () => {
    snapshotTemplate(`
          <div>
            <t t-set="noop" t-value="this.notify()"/>
            <t t-foreach="Object.keys(this.state)" t-as="id" t-key="id">
              <Quantity id="id"/>
            </t>
            Total: <t t-out="this.total"/>
            Count: <t t-out="Object.keys(this.state).length"/>
          </div>`);
    snapshotTemplate(
      `<t t-set="noop" t-value="this.notify()"/><div><t t-out="this.state.quantity"/></div>`
    );
  });
});
