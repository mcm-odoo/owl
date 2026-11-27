import { snapshotTemplate } from "../helpers";

describe("t-call (template calling)", () => {
  test("basic caller", () => {
    snapshotTemplate(`<div><t t-call="_basic-callee"/></div>`);
    snapshotTemplate(`<span>ok</span>`);
  });

  test("basic caller, no parent node", () => {
    snapshotTemplate(`<t t-call="_basic-callee"/>`);
  });

  test("t-out inside t-call, with t-set outside", () => {
    snapshotTemplate(`<div><t t-set="v">Hi</t><t t-call="sub"/></div>`);
    snapshotTemplate(`<span t-out="v"/>`);
  });

  test("t-call with t-if", () => {
    snapshotTemplate(`<div><t t-if="flag" t-call="sub"/></div>`);
  });

  test("with unused body", () => {
    snapshotTemplate(`<t t-call="sub">WHEEE</t>`);
    snapshotTemplate(`<div>ok</div>`);
  });

  test("with unused setbody", () => {
    snapshotTemplate(`<t t-call="sub"><t t-set="qux" t-value="3"/></t>`);
  });

  test("with used body", () => {
    snapshotTemplate(`<t t-call="sub">ok</t>`);
    snapshotTemplate(`<h1><t t-out="0"/></h1>`);
  });

  test("values set in body are in call context", () => {
    snapshotTemplate(`<span><t t-call="sub" foo="'ok'"><t t-set="foo" t-value="'ko'"/></t></span>`);
    snapshotTemplate(`<t t-out="foo"/>`);
  });

  test("inherit context", () => {
    snapshotTemplate(
      `<div><t t-set="foo" t-value="1"/><t t-set="bar" t-value="2"/><t t-call="sub" bar="bar"/></div>`
    );
    snapshotTemplate(`<t t-out="foo"/><t t-out="bar"/>`);
  });

  test("scoped parameters", () => {
    snapshotTemplate(`
        <div>
          <t t-call="sub">
            <t t-set="foo" t-value="42"/>
          </t>
          <t t-out="foo"/>
        </div>`);
    snapshotTemplate(`<t>ok</t>`);
  });

  test("scoped parameters, part 2", () => {
    snapshotTemplate(`
        <div>
          <t t-set="foo" t-value="11"/>
          <t t-call="sub" foo="43">
            <t t-set="foo" t-value="42"/>
            <t t-out="foo"/>
          </t>
          <t t-out="foo"/>
        </div>`);
    snapshotTemplate(`<t t-out="foo"/><t t-out="0"/>`);
  });

  test("call with several sub nodes on same line", () => {
    snapshotTemplate(`
        <div>
          <t t-call="sub">
            <span>hey</span> <span>yay</span>
          </t>
        </div>`);
    snapshotTemplate(`
        <div>
          <t t-out="0"/>
        </div>`);
  });

  test("cascading t-call t-out='0'", () => {
    snapshotTemplate(`
        <div>
          <t t-call="subTemplate">
            <span>hey</span> <span>yay</span>
          </t>
        </div>`);
    snapshotTemplate(`
        <div>
          <t t-call="subSubTemplate">
            <span>cascade 0</span>
            <t t-out="0"/>
          </t>
        </div>`);
    snapshotTemplate(`
        <div>
          <t t-call="finalTemplate">
            <span>cascade 1</span>
            <t t-out="0"/>
          </t>
        </div>`);
    snapshotTemplate(`
        <div>
          <span>cascade 2</span>
          <t t-out="0"/>
        </div>`);
  });

  test("cascading t-call t-out='0', without external divs", () => {
    snapshotTemplate(`
          <t t-call="subTemplate">
            <span>hey</span> <span>yay</span>
          </t>`);
    snapshotTemplate(`
          <t t-call="subSubTemplate">
            <span>cascade 0</span>
            <t t-out="0"/>
          </t>`);
    snapshotTemplate(`
          <t t-call="finalTemplate">
            <span>cascade 1</span>
            <t t-out="0"/>
          </t>`);
    snapshotTemplate(`
          <span>cascade 2</span>
          <t t-out="0"/>`);
  });

  test("recursive template, part 1", () => {
    snapshotTemplate(`
        <div>
          <span>hey</span>
          <t t-if="false">
            <t t-call="recursive"/>
          </t>
        </div>`);
  });

  test("recursive template, part 2", () => {
    snapshotTemplate(`
        <div>
          <t t-call="nodeTemplate" node="root"/>
        </div>`);
    snapshotTemplate(`
        <div>
          <p><t t-out="node.val"/></p>
          <t t-foreach="node.children or []" t-as="subtree" t-key="subtree_index">
              <t t-call="nodeTemplate" node="subtree"/>
          </t>
        </div>`);
  });

  test("recursive template, part 3", () => {
    snapshotTemplate(`
        <div>
          <p><t t-out="node.val"/></p>
          <t t-foreach="node.children or []" t-as="subtree" t-key="subtree_index">
            <t t-call="nodeTemplate" node="subtree"/>
        </t>
        </div>`);
  });

  test("recursive template, part 4: with t-set recursive index", () => {
    snapshotTemplate(`
        <div>
          <t t-call="nodeTemplate" recursive_idx="1" node="root"/>
        </div>`);
    snapshotTemplate(`
        <div>
          <t t-set="recursive_idx" t-value="recursive_idx + 1"/>
          <p><t t-out="node.val"/> <t t-out="recursive_idx"/></p>
          <t t-foreach="node.children or []" t-as="subtree" t-key="subtree_index">
            <t t-call="nodeTemplate" node="subtree" recursive_idx="recursive_idx"/>
          </t>
        </div>`);
  });

  test("t-call, conditional and t-set in t-call body", () => {
    snapshotTemplate(`
        <div>
          <t t-set="v1" t-value="'elif'"/>
          <t t-if="v1 === 'if'" t-call="callee1" />
          <t t-elif="v1 === 'elif'" t-call="callee2" >
            <t t-set="v" t-value="'success'" />
          </t>
        </div>`);
    snapshotTemplate(`<div>callee2 <t t-out="v"/></div>`);
  });

  test("t-call with t-set inside and outside", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="list" t-as="v" t-key="v_index">
            <t t-set="val" t-value="v.val"/>
            <t t-call="sub" val3="val*3"/>
          </t>
        </div>`);
    snapshotTemplate(`
        <t>
          <span t-out="val3"/>
        </t>`);
  });

  test("t-call with t-set inside and outside. 2", () => {
    snapshotTemplate(
      `<p><t t-set="w" t-value="'fromwrapper'"/><t t-call="main" w="w" list="list"/></p>`
    );
    snapshotTemplate(`
        <div>
          <t t-foreach="list" t-as="v" t-key="v_index">
            <t t-set="val" t-value="v.val"/>
            <t t-call="sub" val3="val*3" w="w"/>
          </t>
        </div>`);
    snapshotTemplate(`
        <t>
          <span t-out="val3"/>
          <t t-out="w"/>
        </t>`);
  });

  test("t-call with t-set inside and body text content", () => {
    snapshotTemplate(`
        <div>
          <t t-set="val">yip yip</t>
          <t t-call="sub" val="val">
          </t>
        </div>`);
    snapshotTemplate(`<p><t t-out="val"/></p>`);
  });

  test("t-call with body content as root of a template", () => {
    snapshotTemplate(`<t><t t-call="antony"><p>antony</p></t></t>`);
    snapshotTemplate(`<foo><t t-out="0"/></foo>`);
  });

  test("root t-call with body: t-if true", () => {
    snapshotTemplate(`<t t-call="subTemplate"><t t-if="true">zero</t></t>`);
    snapshotTemplate(`sub`);
  });

  test("root t-call with body: t-if false", () => {
    snapshotTemplate(`<t t-call="subTemplate"><t t-if="false">zero</t></t>`);
  });

  test("root t-call with body: t-out with default", () => {
    snapshotTemplate(`<t t-call="subTemplate"><t t-out="nothing">default</t></t>`);
  });

  test("root t-call with body: t-foreach", () => {
    snapshotTemplate(`<t t-call="subTemplate">
      <t t-foreach="[1]" t-as="i" t-key="i">1</t>
    </t>`);
  });

  test("dynamic t-call", () => {
    snapshotTemplate(`<div><t t-call="{{template}}" val="val"/></div>`);
    snapshotTemplate(`<foo><t t-out="val"/></foo>`);
    snapshotTemplate(`<bar><t t-out="val"/></bar>`);
  });

  test("t-call-context", () => {
    snapshotTemplate(`<t t-call="sub" t-call-context="obj"/>`);
    snapshotTemplate(`<span><t t-out="this.value"/></span>`);
  });

  test("t-call-context and value in body", () => {
    snapshotTemplate(`
      <t t-call="sub" t-call-context="obj">
        <t t-set="value2" t-value="aaron" />
      </t>`);
    snapshotTemplate(`<span><t t-out="this.value1"/><t t-out="this.value2"/></span>`);
  });

  test("nested t-calls with magic variable 0", () => {
    snapshotTemplate(`
        <t t-call="child">
            <t t-call="grandchild">
                <p>Some content...</p>
            </t>
        </t>`);
    snapshotTemplate(`<t t-out="0"/>`);
    snapshotTemplate(`grandchild<t t-out="0"/>`);
  });

  test("t-call with attributes", () => {
    snapshotTemplate(`<t t-call="sub" v1="val1" v2="val2"/>`);
    snapshotTemplate(`<span><t t-out="v1"/><t t-out="v2"/></span>`);
  });

  test("t-call with attributes and t-call-context", () => {
    snapshotTemplate(`<t t-call="sub" t-call-context="obj" v1="val1" v2="val2"/>`);
    snapshotTemplate(
      `<span><t t-out="v1"/><t t-out="v2"/><t t-out="this.v3"/><t t-out="this.v4"/></span>`
    );
  });

  test("t-call with attributes and t-out='0'", () => {
    snapshotTemplate(`<t t-call="sub" v_2="1">Hello</t>`);
    snapshotTemplate(`<span><t t-out="v_2"/><t t-out="0"/></span>`);
  });

  test("t-call and translation contexts", () => {
    snapshotTemplate(
      `<t t-call="sub" title="'title'" t-translation-context-title="pt" t-translation-context="fr">game</t>`,
      {
        translateFn: (expr: string, translationCtx: string) =>
          (
            ({ fr: { game: "jeu" }, pt: { title: "titulo" } }) as Record<
              string,
              Record<string, string>
            >
          )[translationCtx]?.[expr] || expr,
      }
    );
    snapshotTemplate(`<span title="title"><t t-out="title"/><t t-out="0"/></span>`, {
      translateFn: (expr: string, translationCtx: string) =>
        (
          ({ fr: { game: "jeu" }, pt: { title: "titulo" } }) as Record<
            string,
            Record<string, string>
          >
        )[translationCtx]?.[expr] || expr,
    });
  });

  test("t-call and translation contexts, variation", () => {
    snapshotTemplate(
      `<t t-call="sub" title.translate="title" t-translation-context-title.translate="pt" t-translation-context="fr">game</t>`,
      {
        translateFn: (expr: string, translationCtx: string) =>
          (
            ({ fr: { game: "jeu" }, pt: { title: "titulo" } }) as Record<
              string,
              Record<string, string>
            >
          )[translationCtx]?.[expr] || expr,
      }
    );
  });
});
