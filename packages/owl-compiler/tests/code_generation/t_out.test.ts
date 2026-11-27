import { snapshotTemplate } from "../helpers";

describe("t-out", () => {
  test("literal", () => {
    snapshotTemplate(`<span><t t-out="'ok'"/></span>`);
  });

  test("number literal", () => {
    snapshotTemplate(`<span><t t-out="1"/></span>`);
  });

  test("literal, no outside html element", () => {
    snapshotTemplate(`<t t-out="'ok'"/>`);
  });

  test("variable", () => {
    snapshotTemplate(`<span><t t-out="var"/></span>`);
  });

  test("t-out with the 0 number", () => {
    snapshotTemplate(`<t t-out="var"/>`);
  });

  test("t-out with the 0 number, in a p", () => {
    snapshotTemplate(`<p><t t-out="var"/></p>`);
  });

  test("not escaping", () => {
    snapshotTemplate(`<div><t t-out="var"/></div>`);
  });

  test("t-out and another sibling node", () => {
    snapshotTemplate(`<span><span>hello</span><t t-out="var"/></span>`);
  });

  test("t-out on a node with a body, as a default", () => {
    snapshotTemplate(`<span t-out="var">nope</span>`);
  });

  test("t-out with a <t/> in body", () => {
    snapshotTemplate(`<t t-out="var"><t></t></t>`);
  });

  test("t-out with just a t-set t-value in body", () => {
    snapshotTemplate(`<t t-out="var"><t t-set="a" t-value="1" /></t>`);
  });

  test("t-out on a node with a dom node in body, as a default", () => {
    snapshotTemplate(`<span t-out="var"><div>nope</div></span>`);
  });

  test("multiple calls to t-out", () => {
    snapshotTemplate(`
        <div>
          <t t-call="sub">
            <span>coucou</span>
          </t>
        </div>`);
    snapshotTemplate(`
        <div>
          <t t-out="0"/>
          <div>Greeter</div>
          <t t-out="0"/>
        </div>`);
  });

  test("t-out escaped", () => {
    snapshotTemplate(`<span t-out="var" />`);
  });

  test("t-out bdom", () => {
    snapshotTemplate(`<div><t t-set="var"><ol>set</ol></t><span t-out="var" /></div>`);
  });

  test("t-out switch markup on bdom", () => {
    snapshotTemplate(`<div>
      <t t-set="bdom"><ol>set</ol></t>
      <t t-if="hasBdom">
        <span t-out="bdom" />
      </t>
      <t t-else="">
        <span t-out="var" />
      </t>
    </div>`);
  });

  test("t-out 0", () => {
    snapshotTemplate(`<div><t t-call="_basic-callee"><div>zero</div></t></div>`);
    snapshotTemplate(`<div><t t-out="0" /></div>`);
  });

  test("t-out with arbitrary object", () => {
    snapshotTemplate(`<div t-out="var" />`);
  });
});
