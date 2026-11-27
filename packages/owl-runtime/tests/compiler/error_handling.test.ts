import { snapshotEverything, TestContext } from "../helpers";

snapshotEverything();

describe("error handling", () => {
  test("nice warning if no template with given name", () => {
    const context = new TestContext();
    expect(() => context.renderToString("invalidname")).toThrow("Missing template");
  });

  test("addTemplates throw if parser error", () => {
    const context = new TestContext();
    expect(() => {
      context.addTemplates("<templates><abc>></templates>");
    }).toThrow("Invalid XML in template");
  });
});
