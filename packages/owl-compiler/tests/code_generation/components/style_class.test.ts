import { snapshotTemplate } from "../../helpers";

describe("style and class handling", () => {
  test("can set style and class inside component", () => {
    snapshotTemplate(`
          <div style="font-weight:bold;" class="some-class">world</div>
        `);
  });

  test("can set class on sub component, as prop", () => {
    snapshotTemplate(`<Child class="'some-class'" />`);
    snapshotTemplate(`<div t-att-class="this.props.class">child</div>`);
  });

  test("no class is set is child ignores it", () => {
    snapshotTemplate(`<Child class="'hey'"/>`);
  });

  test("empty class attribute is not added on widget root el", () => {
    snapshotTemplate(`<div><Child class=""/></div>`);
    snapshotTemplate(`<span t-att-class="this.props.class"/>`);
  });

  test("can set more than one class on sub component", () => {
    snapshotTemplate(`<Child class="'a  b'" />`);
  });

  test("component class and parent class combine together", () => {
    snapshotTemplate(`<Child class="'from parent'" />`);
    snapshotTemplate(`<div class="child" t-att-class="this.props.class">child</div>`);
  });

  test("can set class on sub sub component", () => {
    snapshotTemplate(`<Child class="'fromparent'" />`);
    snapshotTemplate(`<ChildChild class="(this.props.class || '') + ' fromchild'" />`);
    snapshotTemplate(`<div t-att-class="this.props.class">childchild</div>`);
  });

  test("can set class on multi root component", () => {
    snapshotTemplate(`<div>a</div><span t-att-class="this.props.class">b</span>`);
  });

  test("class on sub component, which is switched to another", () => {
    snapshotTemplate(`<Child class="'someclass'" child="this.state.child" />`);
    snapshotTemplate(
      `<ChildA class="this.props.class" t-if="this.props.child==='a'"/><ChildB class="this.props.class" t-else=""/>`
    );
    snapshotTemplate(`<div t-att-class="this.props.class">a</div>`);
    snapshotTemplate(`<span t-att-class="this.props.class">b</span>`);
  });

  test("class with extra whitespaces", () => {
    snapshotTemplate(`<Child class="'a  b c   d'"/>`);
    snapshotTemplate(`<div t-att-class="this.props.class"/>`);
  });

  test("class with extra whitespaces (variation)", () => {
    snapshotTemplate(`<p><Child class="'a  b c   d'"/></p>`);
  });

  test("t-att-class is properly added/removed on widget root el (v2)", () => {
    snapshotTemplate(`
        <div>
          <Child class="{ b: this.state.b }" />
        </div>`);
    snapshotTemplate(`<span class="c" t-att-class="{ d: this.state.d, ...this.props.class }"/>`);
  });

  test("t-att-class is properly added/removed on widget root el (v3)", () => {
    snapshotTemplate(`<Child class="{ a: true, b: this.state.b }"/>`);
  });

  test("class on components do not interfere with user defined classes", () => {
    snapshotTemplate(`<div t-att-class="{ c: this.state.c }" />`);
  });

  test("style is properly added on widget root el", () => {
    snapshotTemplate(`<Child style="'font-weight: bold;'"/>`);
    snapshotTemplate(`<div t-att-style="this.props.style"/>`);
  });

  test("dynamic t-att-style is properly added and updated on widget root el", () => {
    snapshotTemplate(`<Child style="this.state.style"/>`);
    snapshotTemplate(`<div t-att-style="{ 'font-size': '20px', ...this.props.style }"/>`);
  });

  test("component static style and dynamic t-att-style combine together", () => {
    snapshotTemplate(`<div style="color: red;" t-att-style="this.props.style">child</div>`);
  });

  test("static style and dynamic t-att-style with object combine together", () => {
    snapshotTemplate(`<Child style="{ fontSize: this.state.size }" />`);
    snapshotTemplate(
      `<div style="color: red;" t-att-style="{ fontWeight: 'bold', ...this.props.style }">child</div>`
    );
  });

  test("t-att-style with string value", () => {
    snapshotTemplate(`<div t-att-style="this.state.style" />`);
  });

  test("longhand override is preserved when a preceding shorthand changes", () => {
    snapshotTemplate(`<div t-att-style="this.getStyle()" />`);
  });

  test("t-att-style is cleared when interpolated prop becomes undefined", () => {
    snapshotTemplate(`<span t-att-style="this.getStyle()">text</span>`);
  });

  test("error in subcomponent with class", () => {
    snapshotTemplate(`<Child class="'a'"/>`);
    snapshotTemplate(`<div t-att-class="this.props.class" t-out="this.will.crash"/>`);
  });
});
