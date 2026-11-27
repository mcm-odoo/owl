import { snapshotTemplate } from "../helpers";

describe("simple templates, mostly static", () => {
  test("simple string", () => {
    snapshotTemplate(`hello vdom`);
  });

  test("simple string in t tag", () => {
    snapshotTemplate(`<t>hello vdom</t>`);
  });

  test("empty string", () => {
    snapshotTemplate(``);
  });

  test("empty div", () => {
    snapshotTemplate(`<div></div>`);
  });

  test("div with content", () => {
    snapshotTemplate(`<div>foo</div>`);
  });

  test("multiple root nodes", () => {
    snapshotTemplate(`<div>foo</div><span>hey</span>`);
  });

  test("dynamic text value", () => {
    snapshotTemplate(`<t><t t-out="text"/></t>`);
  });

  test("two t-outs next to each other", () => {
    snapshotTemplate(`<t><t t-out="text1"/><t t-out="text2"/></t>`);
    snapshotTemplate(`<t t-out="text1"/><t t-out="text2"/>`);
  });

  test("two t-outs next to each other, in a div", () => {
    snapshotTemplate(`<div><t t-out="text1"/><t t-out="text2"/></div>`);
  });

  test("static text and dynamic text", () => {
    snapshotTemplate(`<t>hello <t t-out="text"/></t>`);
  });

  test("static text and dynamic text (no t tag)", () => {
    snapshotTemplate(`hello <t t-out="text"/>`);
  });

  test("t-out in dom node", () => {
    snapshotTemplate(`<div><t t-out="text"/></div>`);
  });

  test("dom node with t-out", () => {
    snapshotTemplate(`<div t-out="text" />`);
    snapshotTemplate(`<div t-out="text"></div>`);
  });

  test("t-out in dom node, variations", () => {
    snapshotTemplate(`<div>hello <t t-out="text"/></div>`);
    snapshotTemplate(`<div>hello <t t-out="text"/> world</div>`);
  });

  test("div with a class attribute", () => {
    snapshotTemplate(`<div class="abc">foo</div>`);
  });

  test("div with a class attribute with a quote", () => {
    snapshotTemplate(`<div class="a'bc">word</div>`);
  });

  test("div with an arbitrary attribute with a quote", () => {
    snapshotTemplate(`<div abc="a'bc">word</div>`);
  });

  test("div with an empty class attribute", () => {
    snapshotTemplate(`<div class="">word</div>`);
  });

  test("div with a span child node", () => {
    snapshotTemplate(`<div><span>word</span></div>`);
  });

  test("can render a table row", () => {
    snapshotTemplate(`<tr><td>cell</td></tr>`);
  });

  test("inline template string in t-out", () => {
    snapshotTemplate(`<t><t t-out="\`text\`"/></t>`);
  });

  test("inline template string with content in t-out", () => {
    snapshotTemplate(`<t><t t-set="v" t-value="1"/><t t-out="\`text\${v}\`"/></t>`);
  });

  test("inline template string with variable in context", () => {
    snapshotTemplate(`<t><t t-out="\`text \${v}\`"/></t>`);
  });

  test("template with t tag with multiple content", () => {
    snapshotTemplate(`<div><t>Loading<t t-if="false"/></t></div>`);
  });

  test("template with multiple t tag with multiple content", () => {
    snapshotTemplate(`
      <div>
        <t t-out="a"/>
        <t>
          <t t-out="b"/>
          <t>Loading<t t-out="c"/></t>
        </t>
      </div>`);
  });

  test("text node with backslash at top level", () => {
    snapshotTemplate(`\\`);
  });

  test("text node with backtick at top-level", () => {
    snapshotTemplate(`\``);
  });

  test("text node with interpolation sigil at top level", () => {
    snapshotTemplate(`\${very cool}`);
  });
});
