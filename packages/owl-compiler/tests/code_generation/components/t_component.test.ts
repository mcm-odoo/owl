import { snapshotTemplate } from "../../helpers";

describe("t-component", () => {
  test("t-component works in simple case", () => {
    snapshotTemplate(`<t t-component="this.Child"/>`);
  });

  test("switching dynamic component", () => {
    snapshotTemplate(`<div>child a</div>`);
    snapshotTemplate(`child b`);
  });

  test("can switch between dynamic components without the need for a t-key", () => {
    snapshotTemplate(`
        <div>
            <t t-component="this.constructor.components[this.state.child]"/>
        </div>`);
    snapshotTemplate(`<span>child a</span>`);
    snapshotTemplate(`<span>child b</span>`);
  });

  test("can use dynamic components (the class) if given", () => {
    snapshotTemplate(`<t t-component="this.myComponent" t-key="this.state.child"/>`);
  });

  test("can use dynamic components (the class) if given (with different root tagname)", () => {
    snapshotTemplate(`<div>child b</div>`);
  });

  test("modifying a sub widget", () => {
    snapshotTemplate(`<div><t t-component="this.Counter"/></div>`);
  });
});
