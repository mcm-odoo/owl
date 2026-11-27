import { snapshotTemplate } from "../helpers";

describe("loading templates", () => {
  test("can initialize qweb with a string", () => {
    snapshotTemplate(`<div t-name="hey">jupiler</div>`);
  });

  test("addTemplates does not modify its xml document in place", () => {
    snapshotTemplate(`<div t-name="hey"><t t-out="value"/></div>`);
  });

  test("can load a few templates from a xml string", () => {
    snapshotTemplate(`<ul t-name="main"><t t-call="items"/></ul>`);
    snapshotTemplate(`<t t-name="items"><li>ok</li><li>foo</li></t>`);
  });

  test("getTemplate: element returned", () => {
    snapshotTemplate(`<div>Hello World!</div>`);
  });

  test("getTemplate: undefined returned", () => {
    snapshotTemplate(`<div t-name="main">Hello World!</div>`);
  });
});

describe("template set without components", () => {
  test("renders a template whose components are not rendered", () => {
    snapshotTemplate(`<div><Child t-if="false"/>ok</div>`);
  });

  test("throws a clear error when rendering a component", () => {
    snapshotTemplate(`<div><Child/></div>`);
  });

  test("throws a clear error when rendering a signal prop", () => {
    snapshotTemplate(`<div><Child value.signal="1"/></div>`);
  });

  test("throws a clear error when rendering a slot", () => {
    snapshotTemplate(`<div><t t-call-slot="default"/></div>`);
  });
});
