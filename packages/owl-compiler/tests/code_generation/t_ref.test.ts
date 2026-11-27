import { snapshotTemplate } from "../helpers";

describe("t-ref", () => {
  test("can get a ref on a node", () => {
    snapshotTemplate(`<div><span t-ref="myspan"/></div>`);
  });

  test("refs in a loop", () => {
    snapshotTemplate(`<div>
        <t t-foreach="items" t-as="item" t-key="item.id">
          <div t-ref="item.ref" t-key="item.id"><t t-out="item.id"/></div>
        </t>
      </div>`);
  });

  test("ref in a t-if", () => {
    snapshotTemplate(`
      <div>
        <t t-if="condition">
          <span t-ref="name"/>
        </t>
      </div>`);
  });

  test("two refs, one in a t-if", () => {
    snapshotTemplate(`
      <div>
        <t t-if="condition">
          <span t-ref="refs.name"/>
        </t>
        <p t-ref="refs.p"/>
      </div>`);
  });

  test("ref in a t-call", () => {
    snapshotTemplate(`<div>1<span t-ref="name"/>2</div>`);
  });
});
