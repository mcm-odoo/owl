import { snapshotTemplate } from "../helpers";

describe("attributes", () => {
  test("static attributes", () => {
    snapshotTemplate(`<div foo="a" bar="b" baz="c"/>`);
  });

  test("static attributes with backslash or backtick", () => {
    snapshotTemplate(`<div foo="\\a" bar="\\n" baz="\`"/>`);
  });

  test("two classes", () => {
    snapshotTemplate(`<div class="a b"/>`);
  });

  test("static attributes with dashes", () => {
    snapshotTemplate(`<div aria-label="Close"/>`);
  });

  test("static attributes with backticks", () => {
    snapshotTemplate(`<div foo="\`bar\`"></div>`);
  });

  test("static attributes on void elements", () => {
    snapshotTemplate(`<img src="/test.skip.jpg" alt="Test"/>`);
  });

  test("dynamic attributes", () => {
    snapshotTemplate(`<div t-att-foo="'bar'"/>`);
  });

  test("dynamic attributes with backticks", () => {
    snapshotTemplate(`<div t-att-foo="\`bar\`"/>`);
  });

  test("two dynamic attributes", () => {
    snapshotTemplate(`<div t-att-foo="'bar'" t-att-bar="'foo'"/>`);
  });

  test("dynamic class attribute", () => {
    snapshotTemplate(`<div t-att-class="c"/>`);
  });

  test("dynamic undefined generic attribute", () => {
    snapshotTemplate(`<div t-att-thing="c"/>`);
  });

  test("dynamic attribute with a dash", () => {
    snapshotTemplate(`<div t-att-data-action-id="id"/>`);
  });

  test("dynamic formatted attributes with a dash", () => {
    snapshotTemplate(`<div t-attf-aria-label="Some text {{id}}"/>`);
  });

  test("fixed variable", () => {
    snapshotTemplate(`<div t-att-foo="value"/>`);
  });

  test("dynamic class attribute evaluating to 0", () => {
    snapshotTemplate(`<div t-att-class="value"/>`);
  });

  test("tuple literal", () => {
    snapshotTemplate(`<div t-att="['foo', 'bar']"/>`);
  });

  test("tuple variable", () => {
    snapshotTemplate(`<div t-att="value"/>`);
  });

  test("format literal", () => {
    snapshotTemplate(`<div t-attf-foo="bar"/>`);
  });

  test("format value", () => {
    snapshotTemplate(`<div t-attf-foo="b{{value}}r"/>`);
  });

  test("string interpolation, alternate syntax", () => {
    snapshotTemplate(`<div t-attf-foo="b#{value}r"/>`);
  });

  test("t-attf-class", () => {
    snapshotTemplate(`<div t-attf-class="hello"/>`);
  });

  test("t-attf-class with multiple classes", () => {
    snapshotTemplate(`<div t-attf-class="hello {{word}}"/>`);
  });

  test("t-attf-class with multiple classes separated by multiple spaces", () => {
    snapshotTemplate(`<div t-attf-class="hello  {{word}}"/>`);
  });

  test("t-attf-class should combine with class", () => {
    snapshotTemplate(`<div class="hello" t-attf-class="world"/>`);
  });

  test("from variables set previously", () => {
    snapshotTemplate(`<div><t t-set="abc" t-value="'def'"/><span t-att-class="abc"/></div>`);
  });

  test("from variables set previously (no external node)", () => {
    snapshotTemplate(`
      <t t-set="abc" t-value="'def'"/>
      <span t-att-class="abc"/>`);
  });

  test("from object variables set previously", () => {
    snapshotTemplate(`
      <div>
        <t t-set="o" t-value="{a:'b'}"/>
        <span t-att-class="o.a"/>
      </div>`);
  });

  test("format expression", () => {
    snapshotTemplate(`<div t-attf-foo="{{value + 37}}"/>`);
  });

  test("format multiple", () => {
    snapshotTemplate(`<div t-attf-foo="a {{value1}} is {{value2}} of {{value3}} ]"/>`);
  });

  test("various escapes", () => {
    snapshotTemplate(`
      <div foo="&lt;foo"
        t-att-bar="bar"
        t-attf-baz="&lt;{{baz}}&gt;"
        t-att="qux"/>`);
  });

  test("various escapes 2", () => {
    snapshotTemplate(`<div> &lt; </div>`);
  });

  test("t-att-class and class should combine together", () => {
    snapshotTemplate(`<div class="hello" t-att-class="value"/>`);
  });

  test("class and t-att-class should combine together", () => {
    snapshotTemplate(`<div t-att-class="value" class="hello" />`);
  });

  test("class and t-attf-class with ternary operation", () => {
    snapshotTemplate(`<div class="hello" t-attf-class="{{value ? 'world' : ''}}"/>`);
  });

  test("t-att-class with object", () => {
    snapshotTemplate(`<div class="static" t-att-class="{a: b, c: d, e: f}"/>`);
    snapshotTemplate(`<div t-att-class="{' a ': value}" />`);
    snapshotTemplate(`<div t-att-class="{' ': value}" />`);
  });

  test("t-att-class with multiple classes", () => {
    snapshotTemplate(`<div t-att-class="{'a b c': value}" />`);
    snapshotTemplate(`<div t-att-class="{['a b c']: value}" />`);
    snapshotTemplate(`<div t-att-class="{'a  b  c': value}" />`);
  });

  test("t-att-class with multiple classes, some of which are duplicate", () => {
    snapshotTemplate(`<div t-att-class="{'a b c': value, 'a b d': !value}" />`);
  });

  test("changing a class with t-att-class", () => {
    snapshotTemplate(`<div t-att-class="v"/>`);
  });

  test("changing a class with t-att-class (preexisting class", () => {
    snapshotTemplate(`<div class="hoy" t-att-class="v"/>`);
  });

  test("updating classes (with obj notation)", () => {
    snapshotTemplate(`<div class="hoy" t-att-class="{'a b': condition}"/>`);
  });

  test("various combinations of class, t-att-class, and t-att", () => {
    snapshotTemplate(`<div t-att="{ class: 'a' }" class="c">content</div>`);
    snapshotTemplate(
      `<div t-att="{ class: 'a' }" t-att-class="{'b': true}" class="c">content</div>`
    );
    snapshotTemplate(
      `<div t-att="{ class: 'a' }" class="c" t-att-class="{'b': true}">content</div>`
    );
    snapshotTemplate(
      `<div class="c" t-att="{ class: 'a' }" t-att-class="{'b': true}">content</div>`
    );
    snapshotTemplate(
      `<div class="c" t-att-class="{'b': true}" t-att="{ class: 'a' }">content</div>`
    );
    snapshotTemplate(`<div class="c" t-att-class="{'b': true}">content</div>`);
    snapshotTemplate(`<div class="c" t-attf-class="{{'b'}}">content</div>`);
    snapshotTemplate(`<div t-att="{ class: 'a' }" t-att-class="{'b': true}">content</div>`);
  });
});
