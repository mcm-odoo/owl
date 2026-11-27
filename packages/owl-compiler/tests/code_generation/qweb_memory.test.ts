import { snapshotTemplate } from "../helpers";

describe("memory", () => {
  test("t-foreach does not leak stuff in global scope", () => {
    snapshotTemplate(
      `<p><t t-foreach="[3, 2, 1]" t-as="item" t-key="item_index"><t t-out="item"/></t></p>`
    );
  });
});
