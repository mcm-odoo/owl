import { snapshotTemplate } from "../../helpers";

describe("t-on", () => {
  test("t-on on destroyed components", () => {
    snapshotTemplate(`<div t-on-click="this.onClick"/>`);
  });

  test("t-on when first component child is an empty component", () => {
    snapshotTemplate(`
        <div t-on-click="this.push"><Child list="this.list" t-on-click="() => {}"/></div>
      `);
    snapshotTemplate(`
        <span t-foreach="this.props.list" t-as="c" t-key="c_index" t-out="c"/>
      `);
  });

  test("t-on expression in t-foreach", () => {
    snapshotTemplate(`
          <div>
            <div t-foreach="this.state.values" t-as="val" t-key="val">
              <t t-out="val_index"/>: <t t-out="val + ''"/>
              <button t-on-click="() => this.otherState.vals.push(val)">Expr</button>
            </div>
          </div>
        `);
  });

  test("t-on expression in t-foreach with t-set", () => {
    snapshotTemplate(`
          <div>
            <t t-set="bossa" t-value="'nova'"/>
            <div t-foreach="this.state.values" t-as="val" t-key="val">
              <t t-set="bossa" t-value="bossa + '_' + val_index" />
              <t t-out="val_index"/>: <t t-out="val + ''"/>
              <button t-on-click="() => this.otherState.vals.push(val + '_' + bossa)">Expr</button>
            </div>
          </div>
        `);
  });

  test("t-on method call in t-foreach", () => {
    snapshotTemplate(`
          <div>
            <div t-foreach="this.state.values" t-as="val" t-key="val">
              <t t-out="val_index"/>: <t t-out="val + ''"/>
              <button t-on-click="() => this.addVal(val)">meth call</button>
            </div>
          </div>
        `);
  });

  test("t-on expression captured in t-foreach", () => {
    snapshotTemplate(`
          <div>
            <t t-set="iter" t-value="0" />
            <div t-foreach="this.arr" t-as="val" t-key="val">
              <button t-on-click="() => this.otherState.vals.push(iter + '_' + iter)">expr</button>
              <t t-set="iter" t-value="iter + 1" />
            </div>
          </div>
        `);
  });

  test("t-on on components", () => {
    snapshotTemplate(`<Child t-on-click="this.increment" value="this.state.value"/>`);
    snapshotTemplate(`<button t-out="this.props.value"/>`);
  });

  test("t-on on components, variation", () => {
    snapshotTemplate(`
        <div>
          <span/>
          <Child t-on-click="this.increment" value="this.state.value"/>
          <p/>
        </div>`);
  });

  test("t-on on component next to t-on on div", () => {
    snapshotTemplate(`
        <div>
          <Child t-on-click="this.increment" value="this.state.value"/>
          <p t-on-click="this.decrement">dec</p>
        </div>`);
  });

  test("t-on on t-call-slots", () => {
    snapshotTemplate(`
        <Child>
          <p>something</p>
        </Child>`);
    snapshotTemplate(`
        [<t t-out="this.state.count"/>]
        <t t-call-slot="default" t-on-click="() => this.state.count++"/>`);
  });

  test("t-on on t-set-slots", () => {
    snapshotTemplate(`
        [<t t-out="this.state.count"/>]
        <Child>
          <t t-set-slot="myslot" t-on-click="() => this.state.count++">
            <p>something</p>
            <p>paragraph</p>
          </t>
        </Child>`);
    snapshotTemplate(`<t t-call-slot="myslot"/>`);
  });

  test("t-on on components, with 'prevent' modifier", () => {
    snapshotTemplate(`<Child t-on-click.prevent="this.increment" value="this.state.value"/>`);
  });

  test("t-on on slot, with 'prevent' modifier", () => {
    snapshotTemplate(`
        <Child>
          <button>button</button>
        </Child>`);
    snapshotTemplate(`<t t-call-slot="default" t-on-click.prevent="this.doSomething"/>`);
  });

  test("t-on on components and t-foreach", () => {
    snapshotTemplate(`
        <t t-foreach="['John', 'Raoul', 'Gérald']" t-as="name" t-key="name">
          <Child t-on-click="() => this.log(name)" value="name"/>
        </t>`);
  });

  test("t-on on components, with a handler update", () => {
    snapshotTemplate(`
          <t t-set="name" t-value="this.state.name"/>
          <Child value="name" t-on-click="() => this.log(name)"
        />`);
  });
});
