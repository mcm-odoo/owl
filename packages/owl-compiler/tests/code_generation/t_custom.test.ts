import { snapshotTemplate } from "../helpers";

describe("t-custom", () => {
  test("can use t-custom directive on a node", () => {
    snapshotTemplate(`<div t-custom-plop="this.click" class="my-div"/>`, {
      customDirectives: {
        plop: (node: Element, value: string) => node.setAttribute("t-on-click", value),
      },
    });
  });

  test("can use t-custom directive with modifiers on a node", () => {
    snapshotTemplate(`<div t-custom-plop.mouse.stop="this.click" class="my-div"/>`, {
      customDirectives: {
        plop: (node: Element, value: string) => node.setAttribute("t-on-click", value),
      },
    });
  });
});
