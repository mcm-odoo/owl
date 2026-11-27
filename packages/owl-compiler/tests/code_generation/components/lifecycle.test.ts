import { snapshotTemplate } from "../../helpers";

describe("lifecycle hooks", () => {
  test("basic checks for a component", () => {
    snapshotTemplate(`<span>test</span>`);
  });

  test("various hooks are called on subsubcomponents, in proper order", () => {
    snapshotTemplate(`<div><ChildChild /></div>`);
  });

  test("willPatch, patched hook are called on subsubcomponents, in proper order", () => {
    snapshotTemplate(`
        <div><Child n="this.state.n"/></div>
      `);
    snapshotTemplate(`
        <div><ChildChild n="this.props.n"/></div>
      `);
    snapshotTemplate(`
        <div><t t-out="this.props.n"/></div>
      `);
  });

  test("willStart, mounted on subwidget rendered after main is mounted in some other position", () => {
    snapshotTemplate(`
        <div>
          <t t-if="this.state.ok">
            <Child />
          </t>
          <t t-else="">
            <div/>
          </t>
        </div>`);
  });

  test("components are unmounted destroyed if no longer in DOM", () => {
    snapshotTemplate(`<t t-if="this.state.ok"><Child /></t>`);
  });

  test("components are unmounted and destroyed if no longer in DOM, even after updateprops", () => {
    snapshotTemplate(`
          <div t-if="this.state.flag">
            <Child n="this.state.n"/>
          </div>
      `);
    snapshotTemplate(`<span><t t-out="this.props.n"/></span>`);
  });

  test("willUpdateProps hook is called", () => {
    snapshotTemplate(`<Child n="this.state.n"/>`);
  });

  test("patched hook is called after updating State", () => {
    snapshotTemplate(`<div><t t-out="this.state.a"/></div>`);
  });

  test("patched hook is called after updateProps", () => {
    snapshotTemplate(`<div><Child a="this.state.a"/></div>`);
  });

  test("sub widget (inside sub node): hooks are correctly called", () => {
    snapshotTemplate(`<Child t-if="this.state.flag"/>`);
  });

  test("component semantics", () => {
    snapshotTemplate(`<div>A<B /><C /></div>`);
    snapshotTemplate(`<div>B</div>`);
    snapshotTemplate(`
        <div>C<D />
          <E t-if="this.state.flag" />
          <F t-else="!this.state.flag" />
        </div>`);
    snapshotTemplate(`<div>D</div>`);
    snapshotTemplate(`<div>E</div>`);
    snapshotTemplate(`<div>F</div>`);
  });

  test("render in mounted", () => {
    snapshotTemplate(`<span t-out="this.patched"/>`);
  });

  test("lifecycle callbacks are bound to component", () => {
    snapshotTemplate(`<Test rev="this.rev" />`);
    snapshotTemplate(`<t t-out="this.props.rev" />`);
  });

  test("destroy new children before being mountged", () => {
    snapshotTemplate(
      `before<Child t-if="this.state.flag"/>after<t t-set="noop" t-value="this.notify()"/>`
    );
  });
});
