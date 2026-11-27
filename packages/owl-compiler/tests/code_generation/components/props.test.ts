import { snapshotTemplate } from "../../helpers";

describe("basics", () => {
  test("explicit object prop", () => {
    snapshotTemplate(`<div><Child value="this.state.val"/></div>`);
    snapshotTemplate(`<span><t t-out="this.state.someval"/></span>`);
  });

  test("prop names can contain -", () => {
    snapshotTemplate(`<Child prop-name="7"/>`);
    snapshotTemplate(`<div><t t-out="this.props['prop-name']"/></div>`);
  });

  test("accept ES6-like syntax for props (with getters)", () => {
    snapshotTemplate(`<div><Child greetings="this.greetings"/></div>`);
    snapshotTemplate(`<span><t t-out="this.props.greetings"/></span>`);
  });

  test("t-set works ", () => {
    snapshotTemplate(`
            <div>
                <t t-set="val" t-value="42"/>
                <Child val="val"/>
            </div>`);
  });

  test("t-set with a body expression can be used as textual prop", () => {
    snapshotTemplate(`
        <div>
          <t t-set="abc">42</t>
          <Child val="abc"/>
        </div>`);
  });

  test("t-set with a body expression can be passed in props, and then t-out", () => {
    snapshotTemplate(`
        <div>
          <t t-set="abc"><p>43</p></t>
          <Child val="abc"/>
        </div>`);
  });

  test("arrow functions as prop correctly capture their scope", () => {
    snapshotTemplate(`
        <t t-foreach="this.items" t-as="item" t-key="item.val">
          <Child onClick="(ev) => this.onClick(item.val, ev)"/>
        </t>
      `);
    snapshotTemplate(`<button t-on-click="this.props.onClick"/>`);
  });

  test("arrow function props do not leak synthetic keys into useProps()", () => {
    snapshotTemplate(`<span><t t-out="this.props.onClick"/></span>`);
  });

  test("support prop names that aren't valid bare object property names", () => {
    snapshotTemplate(`<Child some-dashed-prop="5"/>`);
  });

  test("template string in prop", () => {
    snapshotTemplate(`<Child propName="\`1\${this.someVal}3\`"/>`);
  });
});

test("can bind function prop with bind suffix", () => {
  snapshotTemplate(`<Child doSomething.bind="this.doSomething"/>`);
});

test("do not crash when binding anonymous function prop with bind suffix", () => {
  snapshotTemplate(`<Child doSomething.bind="(val) => this.doSomething(val)"/>`);
});

test("bound functions is not referentially equal after update", () => {
  snapshotTemplate(`<Child val="this.state.val" fn.bind="this.someFunction"/>`);
  snapshotTemplate(`<t t-out="this.props.val"/>`);
});

test("bound functions are considered 'alike'", () => {
  snapshotTemplate(`
      <t t-out="this.state.val"/>
      <Child fn.bind="this.someFunction"/>`);
});

test("can use .translate suffix", () => {
  snapshotTemplate(`<Child message.translate="some message"/>`);
  snapshotTemplate(`<t t-out="this.props.message"/>`);
});

test(".translate props are translated", () => {
  snapshotTemplate(`<Child message.translate="some message"/>`, {
    translateFn: () => "translated message",
  });
});

test(".alike suffix in a simple case", () => {
  snapshotTemplate(`
      <t t-out="this.state.counter"/>
      <Child fn.alike="() => 1"/>`);
  snapshotTemplate(`<t t-out="this.props.fn()"/>`);
});

test(".alike suffix in a list", () => {
  snapshotTemplate(`
      <t t-foreach="this.state.elems" t-as="elem" t-key="elem.id">
        <Todo todo="elem" toggle.alike="() => this.toggle(elem.id)"/>
      </t>`);
  snapshotTemplate(`
      <button t-on-click="this.props.toggle">
        <t t-out="this.props.todo.id"/><t t-if="this.props.todo.isChecked">V</t>
      </button>`);
});

test("arrow function props re-render when captured variable changes", () => {
  snapshotTemplate(`
      <t t-foreach="this.state.elems" t-as="elem" t-key="elem.id">
        <Todo todo="elem" toggle="() => this.toggle(elem.id)"/>
      </t>`);
});

test("schema defaults and signal-driven props", () => {
  snapshotTemplate(`<Child height="this.height()" width="this.width()"/>`);
  snapshotTemplate(`<t t-out="this.props.width"/> / <t t-out="this.props.height"/>`);
});

test("default props don't cause spurious updates with t-props", () => {
  snapshotTemplate(`
      <div t-on-click="this.increment">tick: <t t-out="this.v()"/></div>
      <Child t-props="this.makeProps()"/>
    `);
  snapshotTemplate(`<t t-out="this.props.b"/>`);
});

test(".signal suffix promotes a plain value to a signal", () => {
  snapshotTemplate(`<Child count.signal="this.state.val"/>`, { dev: true });
  snapshotTemplate(`<t t-out="this.props.count()"/>`, { dev: true });
});

test(".signal suffix: signal reference is stable across updates", () => {
  snapshotTemplate(`<Child count.signal="this.state.val" tick="this.state.tick"/>`);
  snapshotTemplate(`<t t-out="this.props.count()"/><t t-out="this.props.tick"/>`);
});

test(".signal suffix works in a t-foreach loop", () => {
  snapshotTemplate(`
      <t t-foreach="this.state.items" t-as="item" t-key="item.id">
        <Item value.signal="item.n"/>
      </t>`);
  snapshotTemplate(`<span><t t-out="this.props.value()"/></span>`);
});

describe("reactive props (issue #1908)", () => {
  test("effect observing a prop reacts to both in-place mutation and value swap", () => {
    snapshotTemplate(`<div><Test o="this.obj()"/></div>`);
    snapshotTemplate(`<span t-out="this.props.o.val"/>`);
  });

  test("a prop read only in an effect (not the template) still reacts to a value swap", () => {
    snapshotTemplate(`<span>hi</span>`);
  });

  test("making props reactive does not introduce extra renders", () => {
    snapshotTemplate(`<span t-out="this.tick()"/>`);
  });

  test("useProps() tracks new and deleted keys from t-props", () => {
    snapshotTemplate(`<Child t-props="this.childProps()"/>`);
    snapshotTemplate(`<span><t t-out="this.label()"/></span>`);
  });
});
