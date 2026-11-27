import { snapshotTemplate } from "../../helpers";

describe("shadow_dom", () => {
  test("ref", () => {
    snapshotTemplate(`<div t-ref="this.div" class="my-div"/>`);
  });
});
