import { snapshotTemplate } from "../../helpers";

describe("event handling", () => {
  test("handler receive the event as argument", () => {
    snapshotTemplate(`<span t-on-click="this.inc"><Child/><t t-out="this.state.value"/></span>`);
  });

  test("Invalid handler throws an error", () => {
    snapshotTemplate(`<button t-on-click="this.dosomething">click</button>`);
  });

  test("support for callable expression in event handler", () => {
    snapshotTemplate(`
      <div><t t-out="this.state.value"/><input type="text" t-on-input="this.obj.onInput"/></div>`);
  });

  test("t-on with handler bound to dynamic argument on a t-foreach", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="this.items" t-as="item" t-key="item">
            <div class="item" t-on-click="ev => this.onClick(item, ev)"/>
          </t>
        </div>`);
  });

  test("objects from scope are properly captured by t-on", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="this.items" t-as="item" t-key="item">
            <div class="item" t-on-click="ev => this.onClick(item.val, ev)"/>
          </t>
        </div>`);
  });

  test("handler is not called if component is destroyed", () => {
    snapshotTemplate(`<span t-on-click="this.click"/>`);
  });

  test("input blur event is not called if component is destroyed", () => {
    snapshotTemplate(`
      <div>
        <t t-if="this.state.cond"><Child/></t>
        <textarea/>
      </div>`);
    snapshotTemplate(`<input t-on-blur="this.blur"/>`);
  });

  test("handler works when app is mounted in an iframe", () => {
    snapshotTemplate(`<span t-on-click="this.inc">click me</span>`);
  });

  test("unnamed slot should call the event only once", () => {
    snapshotTemplate(`
        <Child t-on-click="this.inc">
          <t t-set-slot="named">
            <div class="named" />
          </t>
          <div class="default unnamed" />
        </Child>
      `);
    snapshotTemplate(`<t t-call-slot="named"/><t t-call-slot="default" />`);
  });
});
