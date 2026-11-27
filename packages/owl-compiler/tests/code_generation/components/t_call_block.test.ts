import { snapshotTemplate } from "../../helpers";

describe("t-call-block", () => {
  test("simple t-call-block with static text", () => {
    snapshotTemplate(`<div><t t-call-block="this.myBlock()"/></div>`);
  });
});
