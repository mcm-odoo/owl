import { snapshotTemplate } from "../../helpers";

describe("t-key", () => {
  test("t-key on Component", () => {
    snapshotTemplate(`<Child t-key="this.key" key="this.key" />`);
  });

  test("t-key change on a component rendering an empty list", () => {
    snapshotTemplate(
      `<button>b</button><List t-key="this.key" items="this.items"/><span>end</span>`
    );
    snapshotTemplate(`
        <t t-foreach="this.props.items" t-as="item" t-key="item_index">
          <t t-out="item"/>
        </t>`);
  });

  test("t-key on Component as a function", () => {
    snapshotTemplate(`<span><Child t-key="this.key" key="this.key" /></span>`);
  });

  test("t-key on multiple Components", () => {
    snapshotTemplate(`<span>
        <Child t-key="this.key1" key="this.key1" />
        <Child t-key="this.key2" key="this.key2" />
      </span>`);
  });

  test("t-key on multiple Components with t-call 1", () => {
    snapshotTemplate(`<span>
        <t t-call="calledTemplate" key="this.key1" />
        <t t-call="calledTemplate" key="this.key2" />
      </span>`);
    snapshotTemplate(`<t t-name="calledTemplate">
            <Child t-key="key" key="key"/>
          </t>`);
  });

  test("t-key on multiple Components with t-call 2", () => {
    snapshotTemplate(`<span>
        <t t-call="calledTemplate" key1="this.key1" key2="this.key2" />
      </span>`);
    snapshotTemplate(`<t t-name="calledTemplate">
          <Child t-key="key1" key="key1"/><Child t-key="key2" key="key2"/>
          </t>`);
  });

  test("t-foreach with t-key switch component position", () => {
    snapshotTemplate(`<span>
        <t t-foreach="this.clist" t-as="c" t-key="c">
          <Child key="c + this.key1" t-key="this.key1"/>
        </t>
      </span>`);
  });
});
