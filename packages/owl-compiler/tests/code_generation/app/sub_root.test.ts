import { snapshotTemplate } from "../../helpers";

describe("subroot", () => {
  test("can mount subroot", () => {
    snapshotTemplate(`<div>main app</div>`);
    snapshotTemplate(`<div>sub root</div>`);
  });

  test("can create a root in a setup function, then use a hook", () => {
    snapshotTemplate(`a`);
    snapshotTemplate(`c`);
  });
});

test("destroy a subroot while another component is mounted in main app", () => {
  snapshotTemplate(`
        <t t-if="this.state.flag"><ChildB/></t>
        <t t-else=""><ChildA/></t>
        `);
  snapshotTemplate(`a<div t-ref="this.ref"></div>`);
  snapshotTemplate(`b`);
});
