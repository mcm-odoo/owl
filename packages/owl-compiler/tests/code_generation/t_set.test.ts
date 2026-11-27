import { snapshotTemplate } from "../helpers";

describe("t-set", () => {
  test("set from attribute literal", () => {
    snapshotTemplate(`<div><t t-set="value" t-value="'ok'"/><t t-out="value"/></div>`);
  });

  test("t-set does not modify render context existing key values", () => {
    snapshotTemplate(`<div><t t-set="value" t-value="35"/><t t-out="value"/></div>`);
  });

  test("set from attribute literal (no outside div)", () => {
    snapshotTemplate(`<t><t t-set="value" t-value="'ok'"/><t t-out="value"/></t>`);
  });

  test("t-set and t-if", () => {
    snapshotTemplate(`
        <div>
          <t t-set="v" t-value="value"/>
          <t t-if="v === 'ok'">grimbergen</t>
        </div>`);
  });

  test("t-set, multiple t-ifs, and a specific configuration", () => {
    snapshotTemplate(`
      <p>
        <div>
          <t t-if="flag" t-set="bouh" t-value="2"/>
          <span>First div</span>
        </div>
        <div>
          <t t-if="!flag">Second</t>
        </div>
      </p>`);
  });

  test("set from body literal", () => {
    snapshotTemplate(`<t><t t-set="value">ok</t><t t-out="value"/></t>`);
  });

  test("body with backslash at top level", () => {
    snapshotTemplate(`<t t-set="value">\\</t><t t-out="value"/>`);
  });

  test("body with backtick at top-level", () => {
    snapshotTemplate(`<t t-set="value">\`</t><t t-out="value"/>`);
  });

  test("body with interpolation sigil at top level", () => {
    snapshotTemplate(`<t t-set="value">\${very cool}</t><t t-out="value"/>`);
  });

  test("set from body literal (with t-if/t-else", () => {
    snapshotTemplate(`
      <t>
        <t t-set="value">
          <t t-if="condition">true</t>
          <t t-else="">false</t>
        </t>
        <t t-out="value"/>
      </t>`);
  });

  test("set from attribute lookup", () => {
    snapshotTemplate(`<div><t t-set="stuff" t-value="value"/><t t-out="stuff"/></div>`);
  });

  test("t-set evaluates an expression only once", () => {
    snapshotTemplate(`
        <div >
          <t t-set="v" t-value="value + ' artois'"/>
          <t t-out="v"/>
          <t t-out="v"/>
        </div>`);
  });

  test("set from body lookup", () => {
    snapshotTemplate(`<div><t t-set="stuff"><t t-out="value"/></t><t t-out="stuff"/></div>`);
  });

  test("set from empty body", () => {
    snapshotTemplate(`<div><t t-set="stuff"/><t t-out="stuff"/></div>`);
  });

  test("value priority", () => {
    snapshotTemplate(`<div><t t-set="value" t-value="1">2</t><t t-out="value"/></div>`);
  });

  test("value priority (with non text body", () => {
    snapshotTemplate(
      `<div><t t-set="value" t-value="1"><span>2</span></t><t t-out="value"/></div>`
    );
  });

  test("evaluate value expression", () => {
    snapshotTemplate(`<div><t t-set="value" t-value="1 + 2"/><t t-out="value"/></div>`);
  });

  test("t-set should reuse variable if possible", () => {
    snapshotTemplate(`
        <div>
          <t t-set="v" t-value="1"/>
          <div t-foreach="list" t-as="elem" t-key="elem_index">
              <span>v<t t-out="v"/></span>
              <t t-set="v" t-value="elem"/>
          </div>
        </div>`);
  });

  test("t-set with content and sub t-out", () => {
    snapshotTemplate(`
        <div>
          <t t-set="setvar"><t t-out="beep"/> boop</t>
          <t t-out="setvar"/>
        </div>`);
  });

  test("evaluate value expression, part 2", () => {
    snapshotTemplate(`<div><t t-set="value" t-value="somevariable + 2"/><t t-out="value"/></div>`);
  });

  test("t-set, t-if, and mix of expression/body lookup, 1", () => {
    snapshotTemplate(`
        <div>
          <t t-if="flag" t-set="ourvar">1</t>
          <t t-else="" t-set="ourvar" t-value="0"></t>
          <t t-out="ourvar"/>
        </div>`);
  });

  test("t-set, t-if, and mix of expression/body lookup, 2", () => {
    snapshotTemplate(`
        <div>
          <t t-if="flag" t-set="ourvar" t-value="1"></t>
          <t t-else="" t-set="ourvar">0</t>
          <t t-out="ourvar"/>
        </div>`);
  });

  test("t-set, t-if, and mix of expression/body lookup, 3", () => {
    snapshotTemplate(`
          <t t-if="flag" t-set="ourvar" t-value="1"></t>
          <t t-else="" t-set="ourvar">0</t>
          <t t-out="ourvar"/>`);
  });

  test("t-set body is evaluated immediately", () => {
    snapshotTemplate(`
        <div>
          <t t-set="v1" t-value="'before'"/>
          <t t-set="v2">
            <span><t t-out="v1"/></span>
          </t>
          <t t-set="v1" t-value="'after'"/>
          <t t-out="v2"/>
        </div>`);
  });

  test("t-set with t-value (falsy) and body", () => {
    snapshotTemplate(`
        <div>
          <t t-set="v3" t-value="false"/>
          <t t-set="v1" t-value="'before'"/>
          <t t-set="v2" t-value="v3">
            <span><t t-out="v1"/></span>
          </t>
          <t t-set="v1" t-value="'after'"/>
          <t t-set="v3" t-value="true"/>
          <t t-out="v2"/>
        </div>`);
  });

  test("t-set with t-value (truthy) and body", () => {
    snapshotTemplate(`
        <div>
          <t t-set="v3" t-value="'Truthy'"/>
          <t t-set="v1" t-value="'before'"/>
          <t t-set="v2" t-value="v3">
            <span><t t-out="v1"/></span>
          </t>
          <t t-set="v1" t-value="'after'"/>
          <t t-set="v3" t-value="false"/>
          <t t-out="v2"/>
        </div>`);
  });

  test("t-set outside modified in t-foreach", () => {
    snapshotTemplate(`
      <div>
        <t t-set="iter" t-value="0"/>
        <t t-foreach="['a','b']" t-as="val" t-key="val">
          <p>InLoop: <t t-out="iter"/></p>
          <t t-set="iter" t-value="iter + 1"/>
        </t>
        <p>EndLoop: <t t-out="iter"/></p>
      </div>
    `);
  });

  test("t-set outside modified in t-foreach increment-after operator", () => {
    snapshotTemplate(`
      <div>
        <t t-set="iter" t-value="0"/>
        <t t-foreach="['a','b']" t-as="val" t-key="val">
          <p>InLoop: <t t-out="iter"/></p>
          <t t-set="iter" t-value="iter++"/>
        </t>
        <p>EndLoop: <t t-out="iter"/></p>
      </div>
    `);
  });

  test("t-set outside modified in t-foreach increment-before operator", () => {
    snapshotTemplate(`
      <div>
        <t t-set="iter" t-value="0"/>
        <t t-foreach="['a','b']" t-as="val" t-key="val">
          <p>InLoop: <t t-out="iter"/></p>
          <t t-set="iter" t-value="++iter"/>
        </t>
        <p>EndLoop: <t t-out="iter"/></p>
      </div>
    `);
  });

  test("t-set can't alter from within callee", () => {
    snapshotTemplate(`
      <div>
        <t t-set="iter" t-value="'source'"/>
        <p><t t-out="iter"/></p>
        <t t-call="sub"/>
        <p><t t-out="iter"/></p>
      </div>
    `);
    snapshotTemplate(
      `<div><t t-out="iter"/><t t-set="iter" t-value="'called'"/><t t-out="iter"/></div>`
    );
  });

  test("t-set can't alter in t-call body", () => {
    snapshotTemplate(`
      <div>
        <t t-set="iter" t-value="'source'"/>
        <p><t t-out="iter"/></p>
        <t t-call="sub">
          <t t-set="iter" t-value="'inCall'"/>
        </t>
        <p><t t-out="iter"/></p>
      </div>
    `);
  });

  test("t-set after a dom element is executed before event handlers", () => {
    snapshotTemplate(`
        <t t-set="val" t-value="1"/>
        <button t-on-click="() => this.logValue(val)">log</button>
        <t t-set="val" t-value="2"/>`);
  });
});
