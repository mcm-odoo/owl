import { snapshotTemplate } from "../helpers";

describe("comments", () => {
  test("comments are ignored", () => {
    snapshotTemplate(`<div>hello <!-- comment-->owl</div>`);
  });

  test("only a comment", () => {
    snapshotTemplate(`<!-- comment-->`);
  });

  test("properly handle comments between t-if/t-else", () => {
    snapshotTemplate(`
        <div>
          <span t-if="true">true</span>
          <!-- comment-->
          <span t-else="">owl</span>
        </div>`);
  });
});
