import { snapshotTemplate } from "../helpers";

describe("t-foreach", () => {
  test("simple iteration", () => {
    snapshotTemplate(`<t t-foreach="[3, 2, 1]" t-as="item" t-key="item"><t t-out="item"/></t>`);
  });

  test("simple iteration with two nodes inside", () => {
    snapshotTemplate(`
      <t t-foreach="[3, 2, 1]" t-as="item" t-key="item">
        <span>a<t t-out="item"/></span>
        <span>b<t t-out="item"/></span>
      </t>`);
  });

  test("t-key on t-foreach", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="things" t-as="thing" t-key="thing">
            <span/>
          </t>
        </div>`);
  });

  test("simple iteration (in a node)", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="[3, 2, 1]" t-as="item" t-key="item"><t t-out="item"/></t>
        </div>`);
  });

  test("iterate on items", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="[3, 2, 1]" t-as="item" t-key="item">
            [<t t-out="item_index"/>: <t t-out="item"/> <t t-out="item_value"/>]
          </t>
        </div>`);
  });

  test("iterate on items (on a element node)", () => {
    snapshotTemplate(`
        <div>
          <span t-foreach="[1, 2]" t-as="item" t-key="item"><t t-out="item"/></span>
        </div>`);
  });

  test("iterate, position", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="Array(5)" t-as="elem" t-key="elem">
            -<t t-if="elem_first"> first</t><t t-if="elem_last"> last</t> (<t t-out="elem_index"/>)
          </t>
        </div>`);
  });

  test("iterate, dict param", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="value" t-as="item" t-key="item_index">
            [<t t-out="item_index"/>: <t t-out="item"/> <t t-out="item_value"/>]
          </t>
        </div>`);
  });

  test("iterate, Map param", () => {
    snapshotTemplate(`
      <t t-foreach="value" t-as="item" t-key="item_index">
        [<t t-out="item_index"/>: <t t-out="item"/> <t t-out="item_value"/>]
      </t>`);
  });

  test("iterate, string param", () => {
    snapshotTemplate(`
      <t t-foreach="'abc'" t-as="item" t-key="item_index">
        [<t t-out="item_index"/>: <t t-out="item"/> <t t-out="item_value"/>]
      </t>`);
  });

  test("iterate, iterable param", () => {
    snapshotTemplate(`
      <t t-foreach="map.values()" t-as="item" t-key="item_index">
        [<t t-out="item_index"/>: <t t-out="item"/> <t t-out="item_value"/>]
      </t>`);
  });

  test("iterate, generator param", () => {
    snapshotTemplate(`
      <t t-foreach="gen()" t-as="item" t-key="item_index">
        [<t t-out="item_index"/>: <t t-out="item"/> <t t-out="item_value"/>]
      </t>`);
  });

  test("does not pollute the rendering context", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="[1]" t-as="item" t-key="item"><t t-out="item"/></t>
        </div>`);
  });

  test("t-foreach in t-foreach", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="numbers" t-as="number" t-key="number">
            <t t-foreach="letters" t-as="letter" t-key="letter">
              [<t t-out="number"/><t t-out="letter"/>]
            </t>
          </t>
        </div>`);
  });

  test("t-call without body in t-foreach in t-foreach", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="numbers" t-as="a" t-key="a">
            <t t-foreach="letters" t-as="b" t-key="b">
              <t t-call="sub" />
            </t>
            <span t-out="c"/>
          </t>
          <span>[<t t-out="a" />][<t t-out="b" />][<t t-out="c" />]</span>
        </div>`);
    snapshotTemplate(`
        <t>
          <t t-set="c" t-value="'x' + '_' + a + '_'+ b" />
          [<t t-out="a" />]
          [<t t-out="b" />]
          [<t t-out="c" />]
        </t>`);
  });

  test("t-call with body in t-foreach in t-foreach", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="numbers" t-as="a" t-key="a">
            <t t-foreach="letters" t-as="b"  t-key="b">
              <t t-call="sub" c="'x' + '_' + a + '_'+ b" />
            </t>
            <span t-out="c"/>
          </t>
          <span>[<t t-out="a" />][<t t-out="b" />][<t t-out="c" />]</span>
        </div>`);
    snapshotTemplate(`
        <t>
          [<t t-out="a" />]
          [<t t-out="b" />]
          [<t t-out="c" />]
        </t>`);
  });

  test("throws error if invalid loop expression", () => {
    snapshotTemplate(
      `<div><t t-foreach="abc" t-as="item" t-key="item"><span t-key="item_index"/></t></div>`
    );
  });

  test("t-foreach with t-if inside", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="elems" t-as="elem" t-key="elem.id">
            <span t-if="elem.id &lt; 3"><t t-out="elem.text"/></span>
          </t>
        </div>`);
  });

  test("t-foreach with t-if inside (no external node)", () => {
    snapshotTemplate(`
          <t t-foreach="elems" t-as="elem" t-key="elem.id">
            <span t-if="elem.id &lt; 3"><t t-out="elem.text"/></span>
          </t>`);
  });
});

test("t-foreach with loops and multiple t-set", () => {
  snapshotTemplate(`
    <t t-set="a" t-value="0"/>
    <t t-foreach="[1, 2]" t-as="i" t-key="i">
        <t t-set="a" t-value="a + 10"/>
        <t t-set="b" t-value="0"/>
        <t t-foreach="[1, 2]" t-as="j"  t-key="j">
            <t t-set="a" t-value="a + 1"/>
            <t t-set="b" t-value="b + 1"/>
            |InnerLoop:<t t-out="a"/>,<t t-out="b"/>|
        </t>
        |OuterLoop:<t t-out="a"/>,<t t-out="b"/>|
    </t>
    After:<t t-out="a"/>,<t t-out="b"/>`);
});
