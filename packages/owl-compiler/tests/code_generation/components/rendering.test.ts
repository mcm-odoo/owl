import { snapshotTemplate } from "../../helpers";

describe("rendering semantics", () => {
  test("can render a parent without rendering child", () => {
    snapshotTemplate(`
        <t t-out="this.state.value"/>
        <Child/>
      `);
  });

  test("can force a render to update sub tree", () => {
    snapshotTemplate(`
        <t t-out="this.state.value"/>
        <Child/>
        <t t-set="noop" t-value="this.notify()"/>
      `);
    snapshotTemplate(`<t t-set="noop" t-value="this.notify()"/>child`);
  });

  test("render with deep=true followed by render with deep=false work as expected", () => {
    snapshotTemplate(`parent<t t-out="this.state.value"/><Child/>`);
    snapshotTemplate(`child<t t-out="this.state.getValue()"/>`);
  });

  test("props are proxy", () => {
    snapshotTemplate(`
        <Child a="this.state"/>
      `);
    snapshotTemplate(`<t t-out="this.props.a.b"/>`);
  });

  test("props are proxy (nested prop)", () => {
    snapshotTemplate(`<t t-out="this.props.a.b.c"/>`);
  });

  test("works as expected for dynamic number of props", () => {
    snapshotTemplate(`
        <Child t-props="this.state"/>
      `);
    snapshotTemplate(`<t t-out="Object.keys(this.props).length"/>`);
  });

  test("rendering is atomic (for one subtree)", () => {
    snapshotTemplate(`<t t-out="this.state.obj.val"/><B obj="this.state.obj"/>`);
    snapshotTemplate(`<C obj="this.props.obj"/>`);
    snapshotTemplate(`<t t-out="this.props.obj.val"/>`);
  });
});

test("force render in case of existing render", () => {
  snapshotTemplate(`<B val="this.state.val"/>`);
  snapshotTemplate(`<C/><t t-out="this.props.val"/>`);
});

describe("render loop detection", () => {
  test("throws a clear error instead of freezing on a render loop (#1968)", () => {
    snapshotTemplate(`<Child value="this.value()" inc="this.inc"/>`, { dev: true });
  });

  test("wide re-render under an uncommitted root is not a render loop", () => {
    snapshotTemplate(
      `
        <t t-foreach="this.ids" t-as="i" t-key="i"><Child/></t>
        <AsyncChild/>`,
      { dev: true }
    );
    snapshotTemplate(`<t t-out="this.shared()"/>`, { dev: true });
    snapshotTemplate(`async`, { dev: true });
  });

  test("updates from separate tasks while commits are on hold are not a render loop (#2062)", () => {
    snapshotTemplate(`<t t-out="this.n()"/>`, { dev: true });
  });
});
