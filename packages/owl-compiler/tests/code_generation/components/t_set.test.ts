import { snapshotTemplate } from "../../helpers";

describe("t-set", () => {
  test("t-set outside modified in t-if", () => {
    snapshotTemplate(`
        <div>
          <t t-set="iter" t-value="0"/>
          <t t-set="flag" t-value="this.state.flag" />
          <t t-if="flag === 'if'">
            <t t-set="iter" t-value="2"/>
          </t>
          <t t-elif="flag === 'elif'">
            <t t-set="iter" t-value="3"/>
          </t>
          <t t-else="">
            <t t-set="iter" t-value="4"/>
          </t>
          <p><t t-out="iter"/></p>
        </div>`);
  });

  test("t-set in t-if", () => {
    snapshotTemplate(`
        <div>
          <t t-set="flag" t-value="this.state.flag" />
          <t t-if="flag === 'if'">
            <t t-set="iter" t-value="2"/>
          </t>
          <t t-elif="flag === 'elif'">
            <t t-set="iter" t-value="3"/>
          </t>
          <t t-else="">
            <t t-set="iter" t-value="4"/>
          </t>
          <p><t t-out="iter"/></p>
        </div>`);
  });

  test("t-set can't alter component even if key in component", () => {
    snapshotTemplate(`
        <div>
          <p><t t-out="this.iter"/></p>
          <t t-set="iter" t-value="5"/>
          <p><t t-out="this.iter"/></p>
          <p><t t-out="iter"/></p>
        </div>`);
  });

  test("slot setted value (with t-set) not accessible with t-out", () => {
    snapshotTemplate(`
        <div>
          <t t-set="iter" t-value="'source'"/>
          <p><t t-out="iter"/></p>
          <Childcomp>
            <t t-set="iter" t-value="'inCall'"/>
          </Childcomp>
          <p><t t-out="iter"/></p>
        </div>`);
  });

  test("t-set not altered by child comp", () => {
    snapshotTemplate(`
        <div>
          <t t-set="iter" t-value="'source'"/>
          <p><t t-out="iter"/></p>
          <Childcomp/>
          <p><t t-out="iter"/></p>
        </div>`);
    snapshotTemplate(`
        <div>
          <t t-out="this.iter"/>
          <t t-set="iter" t-value="'called'"/>
          <t t-out="this.iter"/>
          <t t-out="iter"/>
        </div>`);
  });

  test("t-set with something in body", () => {
    snapshotTemplate(`
        <div>
          <t t-set="v">
            <p>coucou</p>
          </t>
          <div><t t-out="v"/></div>
        </div>`);
  });

  test("t-set with a component in body", () => {
    snapshotTemplate(`
        <div>
          <t t-set="v">
            <Child/>
          </t>
          <div><t t-out="v"/></div>
        </div>`);
    snapshotTemplate(`Child`);
  });

  test("slots with an unused t-set with a component in body", () => {
    snapshotTemplate(`
            <Child>
              <t t-set="v">
                <Child/>
              </t>
              in slot
            </Child>`);
    snapshotTemplate(`Child <t t-call-slot="default"/>`);
  });

  test("slots with a t-set with a component in body", () => {
    snapshotTemplate(`
            <Child>
              <t t-set="v">
                <C/>
              </t>
              in slot
              <t t-out="v" />
            </Child>`);
  });

  test("slots with an t-set with a component in body", () => {
    snapshotTemplate(`
        <Blorg>
          <t t-set="v">
            <Child/>
            <div>coffee</div>
          </t>
          tea
          <t t-out="v"/>
        </Blorg>`);
    snapshotTemplate(`Blorg <t t-call-slot="default"/>`);
  });
});
