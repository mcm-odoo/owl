import { snapshotTemplate } from "../../helpers";

describe("list of components", () => {
  test("simple list", () => {
    snapshotTemplate(`
            <t t-foreach="this.state.elems" t-as="elem" t-key="elem.id">
                <Child value="elem.value"/>
            </t>`);
  });

  test("components in a node in a t-foreach ", () => {
    snapshotTemplate(`
              <div>
                  <ul>
                      <t t-foreach="this.items" t-as="item" t-key="'li_'+item">
                          <li>
                              <Child item="item"/>
                          </li>
                      </t>
                  </ul>
              </div>`);
    snapshotTemplate(`<div><t t-out="this.props.item"/></div>`);
  });

  test("reconciliation alg works for t-foreach in t-foreach", () => {
    snapshotTemplate(`
        <div>
            <t t-foreach="this.state.s" t-as="section" t-key="section_index">
                <t t-foreach="section.blips" t-as="blip" t-key="blip_index">
                  <Child blip="blip"/>
                </t>
            </t>
        </div>`);
    snapshotTemplate(`<div><t t-out="this.props.blip"/></div>`);
  });

  test("reconciliation alg works for t-foreach in t-foreach, 2", () => {
    snapshotTemplate(`
        <div>
          <p t-foreach="this.state.rows" t-as="row" t-key="row">
            <p t-foreach="this.state.cols" t-as="col" t-key="col">
                <Child row="row" col="col"/>
              </p>
            </p>
        </div>`);
    snapshotTemplate(`<div><t t-out="this.props.row + '_' + this.props.col"/></div>`);
  });

  test("sub components rendered in a loop", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="this.state.numbers" t-as="number" t-key="number" >
            <Child n="number"/>
          </t>
        </div>`);
    snapshotTemplate(`<p><t t-out="this.props.n"/></p>`);
  });

  test("sub components with some state rendered in a loop", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="this.state.numbers" t-as="number" t-key="number">
            <Child/>
          </t>
        </div>`);
    snapshotTemplate(`<p><t t-out="this.state.n"/></p>`);
  });

  test("list of sub components inside other nodes", () => {
    snapshotTemplate(`
      <div>
          <div t-foreach="this.state.blips" t-as="blip" t-key="blip.id">
              <SubComponent />
          </div>
      </div>`);
  });

  test("t-foreach with t-component, and update", () => {
    snapshotTemplate(`
          <div>
            <t t-foreach="Array(2)" t-as="n" t-key="n_index">
              <Child val="n_index"/>
            </t>
          </div>`);
    snapshotTemplate(`
          <span>
            <t t-out="this.state.val"/>
            <t t-out="this.props.val"/>
          </span>`);
  });

  test("switch component position", () => {
    snapshotTemplate(`<span>
        <t t-foreach="this.clist" t-as="c" t-key="c">
          <Child key="c"/>
        </t>
      </span>`);
  });

  test("crash on duplicate key in dev mode", () => {
    snapshotTemplate(
      `
        <t t-foreach="[1, 2]" t-as="item" t-key="'child'">
          <Child/>
        </t>
      `,
      { dev: true }
    );
  });

  test("crash when using object as keys that serialize to the same string", () => {
    snapshotTemplate(
      `
        <t t-foreach="[{}, {}]" t-as="item" t-key="item">
          <Child/>
        </t>
      `,
      { dev: true }
    );
  });

  test("order is correct when slots are not of same type", () => {
    snapshotTemplate(`
        <Child>
          <t t-set-slot="a" active="!this.state.active"><div t-if="!this.state.active">A</div></t>
          <t t-set-slot="b" active="true">B</t>
          <t t-set-slot="c" active="this.state.active">C</t>
        </Child>
      `);
    snapshotTemplate(`
          <t t-foreach="this.slotNames" t-as="slotName" t-key="slotName" t-call-slot="{{ slotName }}"/>
      `);
  });
});
