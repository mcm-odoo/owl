import { snapshotTemplate } from "../../helpers";

describe("basics", () => {
  test("basic use", () => {
    snapshotTemplate(`<Child p="1"/>`);
    snapshotTemplate(`<span>child<t t-out="this.props.p"/></span>`);
  });

  test("sub widget is interactive", () => {
    snapshotTemplate(`
            <span>
                <button t-on-click="this.inc">click</button>child<t t-out="this.state.val"/>
            </span>`);
  });

  test("can select a sub widget ", () => {
    snapshotTemplate(`
            <t>
              <t t-if="this.state.options.flag"><Child /></t>
              <t t-if="!this.state.options.flag"><OtherChild /></t>
            </t>
          `);
    snapshotTemplate(`<span>CHILD 1</span>`);
    snapshotTemplate(`<div>CHILD 2</div>`);
  });

  test("can select a sub widget, part 2", () => {
    snapshotTemplate(`
            <t>
              <t t-if="this.state.flag"><Child /></t>
              <t t-if="!this.state.flag"><OtherChild /></t>
            </t>
          `);
  });

  test("top level sub widget with a parent", () => {
    snapshotTemplate(`<div><ComponentB/></div>`);
    snapshotTemplate(`<ComponentC />`);
    snapshotTemplate(`<span>Hello</span>`);
  });
});
