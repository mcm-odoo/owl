import { snapshotTemplate } from "../../helpers";

describe("components in t-out", () => {
  test("simple list", () => {
    snapshotTemplate(`
                <t t-foreach="[1,2]" t-as="n" t-key="n">
                  <t t-set="blabla">
                    <Child />
                  </t>
                  <t t-out="blabla"/>
                </t>`);
  });
});
