import { snapshotTemplate } from "../../helpers";

describe("reactivity in lifecycle", () => {
  test("an external proxy object should be tracked", () => {
    snapshotTemplate(`<div>
        <t t-out="this.obj1.value"/>
        <TestSubComponent/>
      </div>`);
    snapshotTemplate(`<div>
        <t t-out="this.obj2.value"/>
      </div>`);
  });

  test("can use a state hook", () => {
    snapshotTemplate(`<div><t t-out="this.counter.value"/></div>`);
  });

  test("can use a state hook 2", () => {
    snapshotTemplate(
      `<t t-set="noop" t-value="this.notify()"/><div><t t-out="this.state.a"/></div>`
    );
  });

  test("can use a state hook on Map", () => {
    snapshotTemplate(`<div><t t-out="this.counter.get('value')"/></div>`);
  });

  test("state changes in willUnmount do not trigger rerender", () => {
    snapshotTemplate(`
          <t t-set="noop" t-value="this.notify()"/>
          <span><t t-out="this.props.val"/><t t-out="this.state.n"/></span>
        `);
  });

  test("change state while mounting component", () => {
    snapshotTemplate(`
          <t t-set="noop" t-value="this.notify()"/>
          <div><t t-out="this.state.val"/></div>
        `);
  });

  test("Child component doesn't render when state they depend on changes but their parent is about to unmount them", () => {
    snapshotTemplate(`<Child t-if="this.state.renderChild" state="this.state"/>`);
    snapshotTemplate(`<t t-out="this.props.state.content.a"/>`);
  });

  test("Component is automatically subscribed to proxy object received as prop", () => {
    snapshotTemplate(
      `<t t-set="noop" t-value="this.notify()"/><Child obj="this.obj" proxyObj="this.proxyObj"/>`
    );
    snapshotTemplate(`
          <t t-set="noop" t-value="this.notify()"/>
          <t t-out="this.props.obj.a"/><t t-out="this.props.proxyObj.b"/>`);
  });

  test("child re-renders when shared atom changes while parent has an in-flight fiber", () => {
    snapshotTemplate(
      `<Child bv="this.b()"/>parent:a=<t t-out="this.a()"/>:b=<t t-out="this.b()"/>`
    );
    snapshotTemplate(
      `<t t-set="_" t-value="this.notify()"/>child:bv=<t t-out="this.props.bv"/>:a=<t t-out="this.a()"/>`
    );
  });
});

describe("components and computed", () => {
  test("Child is not rerender when reactive is computed", () => {
    snapshotTemplate(`<t t-out="this.c()"/><Child/>`);
  });

  test("simple component and computed value", () => {
    snapshotTemplate(`
            <t t-out="this.value++"/>
            <t t-out="this.c()"/>
        `);
  });
});

test("reading reactive state in setup should work as expected", () => {
  snapshotTemplate(`<t t-out="this.c()"/>`);
});

describe("reactive cleanup on component destruction", () => {
  test("destroying a component with computed cleans up signal observers", () => {
    snapshotTemplate(`<div><Child t-if="this.show()" selected="this.selectedId"/></div>`);
    snapshotTemplate(`<span t-out="this.isSelected()"/>`);
  });

  test("destroying multiple children with computeds cleans up all signal observers", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="this.rows()" t-as="row" t-key="row">
            <Row id="row" selected="this.selectedId"/>
          </t>
        </div>`);
  });

  test("benchmark-like scenario: signal.Array rows with computed isSelected", () => {
    snapshotTemplate(`
        <table><tbody>
          <t t-foreach="this.rows()" t-as="row" t-key="row.id">
            <TableRow row="row" selected="this.selectedId"/>
          </t>
        </tbody></table>`);
    snapshotTemplate(`
        <tr t-att-class="this.isSelected() ? 'danger' : ''">
          <td t-out="this.p.row.id"/>
          <td><a t-out="this.p.row.label()"/></td>
        </tr>`);
  });
});

describe("computed with equals in components", () => {
  test("a recompute with a shallow-equal result does not re-render", () => {
    snapshotTemplate(`
        <ul>
          <t t-out="this.track()"/>
          <t t-foreach="this.visible()" t-as="todo" t-key="todo.id">
            <li t-out="todo.text"/>
          </t>
        </ul>`);
  });
});
