import { snapshotTemplate } from "../helpers";

describe("t-if", () => {
  test("t-if in a div", () => {
    snapshotTemplate(`<div><t t-if="condition">ok</t></div>`);
  });

  test("t-if with empty content", () => {
    snapshotTemplate(`hello<t t-if="condition"/>`);
  });

  test("boolean value condition missing", () => {
    snapshotTemplate(`<span><t t-if="condition">fail</t></span>`);
  });

  test("just a t-if", () => {
    snapshotTemplate(`<t t-if="condition">ok</t>`);
  });

  test("a t-if with two inner nodes", () => {
    snapshotTemplate(`<t t-if="condition"><span>yip</span><div>yip</div></t>`);
  });

  test("div containing a t-if with two inner nodes", () => {
    snapshotTemplate(`<div><t t-if="condition"><span>yip</span><div>yip</div></t></div>`);
  });

  test("two consecutive t-if", () => {
    snapshotTemplate(`<t t-if="cond1">1</t><t t-if="cond2">2</t>`);
  });

  test("a t-if next to a div", () => {
    snapshotTemplate(`<div>foo</div><t t-if="cond">1</t>`);
  });

  test("two consecutive t-if in a div", () => {
    snapshotTemplate(`<div><t t-if="cond1">1</t><t t-if="cond2">2</t></div>`);
  });

  test("simple t-if/t-else", () => {
    snapshotTemplate(`<t t-if="condition">1</t><t t-else="">2</t>`);
  });

  test("simple t-if/t-else in a div", () => {
    snapshotTemplate(`<div><t t-if="condition">1</t><t t-else="">2</t></div>`);
  });

  test("t-if/t-else with more content", () => {
    snapshotTemplate(`<t t-if="condition"><t t-if="condition">asf</t></t><t t-else="">coucou</t>`);
  });

  test("boolean value condition elif", () => {
    snapshotTemplate(`
        <div>
          <t t-if="color == 'black'">black pearl</t>
          <t t-elif="color == 'yellow'">yellow submarine</t>
          <t t-elif="color == 'red'">red is dead</t>
          <t t-else="">beer</t>
        </div>`);
  });

  test("boolean value condition elif (no outside node)", () => {
    snapshotTemplate(`
          <t t-if="color == 'black'">black pearl</t>
          <t t-elif="color == 'yellow'">yellow submarine</t>
          <t t-elif="color == 'red'">red is dead</t>
          <t t-else="">beer</t>`);
  });

  test("boolean value condition else", () => {
    snapshotTemplate(`
        <div>
          <span>begin</span>
          <t t-if="condition">ok</t>
          <t t-else="">ok-else</t>
          <span>end</span>
        </div>`);
  });

  test("boolean value condition false else", () => {
    snapshotTemplate(`
        <div><span>begin</span><t t-if="condition">fail</t>
        <t t-else="">fail-else</t><span>end</span></div>`);
  });

  test("can use some boolean operators in expressions", () => {
    snapshotTemplate(`
        <div>
          <t t-if="cond1 and cond2">and</t>
          <t t-if="cond1 and cond3">nope</t>
          <t t-if="cond1 or cond3">or</t>
          <t t-if="cond3 or cond4">nope</t>
          <t t-if="m gt 3">mgt</t>
          <t t-if="n gt 3">ngt</t>
          <t t-if="m lt 3">mlt</t>
          <t t-if="n lt 3">nlt</t>
        </div>`);
  });

  test("t-out with t-if", () => {
    snapshotTemplate(`<div><t t-if="true" t-out="'x'"/></div>`);
  });

  test("t-out with t-elif", () => {
    snapshotTemplate(`<div><t t-if="false">abc</t><t t-else="" t-out="'x'"/></div>`);
  });

  test("t-set, then t-if", () => {
    snapshotTemplate(`
        <div>
          <t t-set="title" t-value="'test'"/>
          <t t-if="title"><t t-out="title"/></t>
        </div>`);
  });

  test("t-set, then t-if, part 2", () => {
    snapshotTemplate(`
        <div>
            <t t-set="y" t-value="true"/>
            <t t-set="x" t-value="y"/>
            <span t-if="x">COUCOU</span>
        </div>`);
  });

  test("t-set, then t-if, part 3", () => {
    snapshotTemplate(`
        <div>
          <t t-set="y" t-value="false"/>
          <t t-set="x" t-value="y"/>
          <span t-if="x">AAA</span>
          <span t-elif="!x">BBB</span>
        </div>`);
  });

  test("t-if in a t-if", () => {
    snapshotTemplate(`<div><t t-if="cond1"><span>1<t t-if="cond2">2</t></span></t></div>`);
  });

  test("t-if and t-else with two nodes", () => {
    snapshotTemplate(`<t t-if="condition">1</t><t t-else=""><span>a</span><span>b</span></t>`);
  });

  test("dynamic content after t-if with two children nodes", () => {
    snapshotTemplate(`<div><t t-if="condition"><p>1</p><p>2</p></t><t t-out="text"/></div>`);
  });

  test("two t-ifs next to each other", () => {
    snapshotTemplate(
      `<div><span t-if="condition"><t t-out="text"/></span><t t-if="condition"><p>1</p><p>2</p></t></div>`
    );
  });
});
