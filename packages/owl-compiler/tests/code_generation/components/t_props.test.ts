import { snapshotTemplate } from "../../helpers";

describe("t-props", () => {
  test("t-props only", () => {
    snapshotTemplate(`<div><div><Comp t-props="this.state"/></div></div>`);
    snapshotTemplate(`<div><t t-out="this.props.a"/></div>`);
  });

  test("t-props and other props", () => {
    snapshotTemplate(`<div><div><Comp t-props="this.state1" a="this.a"/></div></div>`);
    snapshotTemplate(`<div><t t-out="this.props.a"/><t t-out="this.props.b"/></div>`);
  });

  test("basic use", () => {
    snapshotTemplate(`
          <div>
              <Child t-props="this.some.obj"/>
          </div>
        `);
    snapshotTemplate(`
          <span>
              <t t-out="this.props.a + this.props.b"/>
          </span>
        `);
  });

  test("t-props with props", () => {
    snapshotTemplate(`
          <div>
              <Child t-props="this.childProps" a="1" b="2" />
          </div>
        `);
  });

  test("child receives a copy of the t-props object, not the original", () => {
    snapshotTemplate(`<Child t-props="this.childProps"/>`);
  });
});
