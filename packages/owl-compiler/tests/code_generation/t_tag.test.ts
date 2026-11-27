import { snapshotTemplate } from "../helpers";

describe("qweb t-tag", () => {
  test("simple usecases", () => {
    snapshotTemplate(`<t t-tag="'div'"></t>`);
    snapshotTemplate(`<t t-tag="tag">text</t>`);
  });

  test("with multiple child nodes", () => {
    snapshotTemplate(`
      <t t-tag="tag">
          pear
          <span>apple</span>
          strawberry
      </t>`);
  });

  test("with multiple attributes", () => {
    snapshotTemplate(`<t t-tag="tag" class="blueberry" taste="raspberry">gooseberry</t>`);
  });

  test("can fallback if falsy tag", () => {
    snapshotTemplate(`<fallback t-tag="tag"/>`);
  });

  test("with multiple t-tag in same template", () => {
    snapshotTemplate(`<t t-tag="outer"><t t-tag="inner">baz</t></t>`);
  });

  test("with multiple t-tag in same template, part 2", () => {
    snapshotTemplate(`<t t-tag="brother">bar</t><t t-tag="brother">baz</t>`);
  });

  test("can update", () => {
    snapshotTemplate(`<t t-tag="tag"></t>`);
  });
});
