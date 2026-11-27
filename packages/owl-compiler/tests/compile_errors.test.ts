import { compile, parseXML } from "../src";

// -----------------------------------------------------------------------------
// Errors thrown when compiling a template
// -----------------------------------------------------------------------------

describe("compile errors", () => {
  test("invalid xml", () => {
    expect(() => compile("<div>")).toThrow("Invalid XML in template");
  });

  test("invalid xml in a templates document", () => {
    expect(() => parseXML("<templates><abc>></templates>")).toThrow("Invalid XML in template");
  });

  test("unknown directive", () => {
    expect(() => compile(`<div t-best-beer="rochefort 10">test</div>`)).toThrow(
      "Unknown QWeb directive: 't-best-beer'"
    );
  });

  test("t-on without event name", () => {
    expect(() => compile(`<div t-on="somemethod"></div>`)).toThrow(
      "Missing event name with t-on directive"
    );
  });

  test("t-on with an unknown modifier", () => {
    expect(() => compile(`<div t-on-click.somemodifier="onClick" />`)).toThrow(
      "Unknown event modifier: 'somemodifier'"
    );
  });

  test("t-call on a non t node", () => {
    expect(() => compile(`<div t-call="sub"/>`)).toThrow(
      "Directive 't-call' can only be used on <t> nodes (used on a <div>)"
    );
  });

  test("t-component on a non t node", () => {
    expect(() => compile(`<div><div t-component="this.uChild"/></div>`)).toThrow(
      "Directive 't-component' can only be used on <t> nodes (used on a <div>)"
    );
  });

  test("prop with an unknown suffix", () => {
    expect(() => compile(`<Child val.somesuffix="this.state.val"/>`)).toThrow(
      "Invalid prop suffix: somesuffix"
    );
  });

  test("generated code that is not valid javascript", () => {
    expect(() => compile(`<div t-att-class="a b">test</div>`))
      .toThrow(`Failed to compile anonymous template: Unexpected identifier 'ctx'

generated code:
function(app, bdom, helpers) {
  let { text, createBlock, list, multi, html, toggler } = bdom;
  
  let block1 = createBlock(\`<div block-attribute-0="class">test</div>\`);
  
  return function template(ctx, node, key = "") {
    let attr1 = ctx['a']ctx['b'];
    return block1([attr1]);
  }
}`);
  });

  test("named template in the error message", () => {
    expect(() =>
      compile(`<div t-att-class="a b">test</div>`, { name: "main", hasGlobalValues: false })
    ).toThrow(`Failed to compile template "main"`);
  });
});

describe("blacklisted tags and attributes", () => {
  test("template with block-text tag", () => {
    expect(() => compile(`<div><block-text-0/>hello</div>`)).toThrow(
      "Invalid tag name: 'block-text-0'"
    );
  });

  test("template with block-handler tag", () => {
    expect(() => compile(`<div block-handler-0="click">hello</div>`)).toThrow(
      "Invalid attribute: 'block-handler-0'"
    );
  });
});
