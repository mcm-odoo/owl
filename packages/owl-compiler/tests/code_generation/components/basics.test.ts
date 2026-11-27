import { snapshotTemplate } from "../../helpers";

describe("basics", () => {
  test("can mount a simple component", () => {
    snapshotTemplate(`<span>simple vnode</span>`);
  });

  test("cannot mount on a documentFragment", () => {
    snapshotTemplate(`<div>content</div>`);
  });

  test("can mount a simple component with props", () => {
    snapshotTemplate(`<span><t t-out="this.props.value"/></span>`);
  });

  test("can mount a component with just some text", () => {
    snapshotTemplate(`just text`);
  });

  test("can mount a simple component with multiple roots", () => {
    snapshotTemplate(`<span></span><div></div>`);
  });

  test("updating a component with t-foreach as root", () => {
    snapshotTemplate(`
        <t t-foreach="this.items" t-as="item" t-key="item">
          <t t-out="item"/>
        </t>`);
  });

  test("class component with dynamic text", () => {
    snapshotTemplate(`<span>My value: <t t-out="this.value"/></span>`);
  });

  test("Multi root component", () => {
    snapshotTemplate(`<span>1</span>text<span>2</span>`);
  });

  test("a component inside a component", () => {
    snapshotTemplate(`<span><Child/></span>`);
    snapshotTemplate(`<div>simple vnode</div>`);
  });

  test("a class component inside a class component, no external dom", () => {
    snapshotTemplate(`<Child/>`);
  });

  test("simple component with a dynamic text", () => {
    snapshotTemplate(`<div><t t-out="this.value" /></div>`);
  });

  test("simple component, proxy", () => {
    snapshotTemplate(`<div><t t-out="this.state.value" /></div>`);
  });

  test("two child components", () => {
    snapshotTemplate(`<Child/><Child/>`);
  });

  test("class parent, class child component with props", () => {
    snapshotTemplate(`<Child value="42" />`);
  });

  test("parent, child and grandchild", () => {
    snapshotTemplate(`<GrandChild />`);
    snapshotTemplate(`<div>hey</div>`);
  });

  test("zero or one child components", () => {
    snapshotTemplate(`<Child t-if="this.state.hasChild"/>`);
  });

  test("text after a conditional component", () => {
    snapshotTemplate(`
        <div>
          <Child t-if="this.state.hasChild"/>
          <span t-out="this.state.text"/>
        </div>`);
    snapshotTemplate(`<p>simple vnode</p>`);
  });

  test("can be clicked on and updated", () => {
    snapshotTemplate(`
      <div><t t-out="this.state.counter"/><button t-on-click="() => this.state.counter++">Inc</button></div>`);
  });

  test("rerendering a widget with a sub widget", () => {
    snapshotTemplate(`<Counter/>`);
  });

  test("can handle empty props", () => {
    snapshotTemplate(`<div><Child val=""/></div>`);
    snapshotTemplate(`<span><t t-out="this.props.val"/></span>`);
  });

  test("child can be updated", () => {
    snapshotTemplate(`<Child value="this.state.counter"/>`);
    snapshotTemplate(`<t t-out="this.props.value"/>`);
  });

  test("higher order components parent and child", () => {
    snapshotTemplate(`<Child child="this.state.child" />`);
    snapshotTemplate(`<ChildA t-if="this.props.child==='a'"/><ChildB t-else=""/>`);
    snapshotTemplate(`<div>a</div>`);
    snapshotTemplate(`<span>b</span>`);
  });

  test("three level of components with collapsing root nodes", () => {
    snapshotTemplate(`<div>2</div>`);
  });

  test("do not remove previously rendered dom if not necessary, variation", () => {
    snapshotTemplate(`<div><h1>h1</h1><span><t t-out="this.state.value"/></span></div>`);
  });

  test("reconciliation alg is not confused in some specific situation", () => {
    snapshotTemplate(`
        <div>
            <Child />
            <Child t-key="4"/>
        </div>
      `);
    snapshotTemplate(`<span>child</span>`);
  });

  test("same t-keys in two different places", () => {
    snapshotTemplate(`
        <div>
            <div><Child t-key="1" blip="'1'"/></div>
            <div><Child t-key="1" blip="'2'"/></div>
        </div>`);
    snapshotTemplate(`<span><t t-out="this.props.blip"/></span>`);
  });

  test("t-key on a component with t-if, and a sibling component", () => {
    snapshotTemplate(`
        <div>
          <Child t-if="false" t-key="'str'"/>
          <Child/>
        </div>`);
  });

  test("widget after a t-foreach", () => {
    snapshotTemplate(
      `<div><t t-foreach="Array(2)" t-as="elem" t-key="elem_index">txt</t><SomeComponent/></div>`
    );
  });

  test("t-if works with t-component", () => {
    snapshotTemplate(`<div><Child t-if="this.state.flag"/></div>`);
    snapshotTemplate(`<span>hey</span>`);
  });

  test("t-else works with t-component", () => {
    snapshotTemplate(`
        <div>
          <div t-if="this.state.flag">somediv</div>
          <Child t-else=""/>
        </div>`);
  });

  test("t-elif works with t-component", () => {
    snapshotTemplate(`
        <div>
          <div t-if="this.state.flag">somediv</div>
          <Child t-elif="!this.state.flag" />
        </div>`);
  });

  test("sub components between t-ifs", () => {
    snapshotTemplate(`
        <div>
          <h1 t-if="this.state.flag">hey</h1>
          <h2 t-else="">noo</h2>
          <span><Child/></span>
          <t t-if="this.state.flag"><span>test</span></t>
        </div>`);
  });

  test("list of two sub components inside other nodes", () => {
    snapshotTemplate(`
      <div>
          <div t-foreach="this.state.blips" t-as="blip" t-key="blip.id">
              <SubWidget />
              <SubWidget />
          </div>
      </div>`);
    snapshotTemplate(`<span>asdf</span>`);
  });

  test("updating widget immediately", () => {
    snapshotTemplate(`<Child flag="this.state.flag"/>`);
    snapshotTemplate(`<span>abc<t t-if="this.props.flag">def</t></span>`);
  });

  test("can inject values in tagged templates", () => {
    snapshotTemplate(`<t t-call="__template__999"/>`);
    snapshotTemplate(`<span><t t-out="this.state.n"/></span>`);
  });

  test("update props of component without concrete own node", () => {
    snapshotTemplate(`
        <div>
          <Child t-key="this.childProps.key" t-props="this.childProps"/>
        </div>`);
    snapshotTemplate(`
        <Custom
          t-key="this.props.subKey"
          key="this.props.key"
          subKey="this.props.subKey"/>`);
    snapshotTemplate(`
        <div class="widget-subkey">
          <t t-out="this.props.key"/>__<t t-out="this.props.subKey"/>
        </div>`);
  });

  test("component children doesn't leak (if case)", () => {
    snapshotTemplate(`<Child t-if="this.ifVar" />`);
  });

  test("component children doesn't leak (t-key case)", () => {
    snapshotTemplate(`<Child t-key="this.keyVar" />`);
  });

  test("GrandChild display is controlled by its GrandParent", () => {
    snapshotTemplate(`<t t-component="this.myComp" displayGrandChild="this.displayGrandChild"/>`);
    snapshotTemplate(`<GrandChild t-if="this.props.displayGrandChild" />`);
  });

  test("providePlugins in a root with a custom plugin manager extends it", () => {
    snapshotTemplate(`<t t-out="this.a.name"/> - <t t-out="this.b.name"/>`);
  });
});

describe("mount targets", () => {
  test("can mount a component (with position='first-child')", () => {
    snapshotTemplate(`<div>app</div>`);
  });
});

describe("support svg components", () => {
  test("add proper namespace to svg", () => {
    snapshotTemplate(`
        <svg>
            <GComp/>
        </svg>`);
    snapshotTemplate(`
        <g>
            <circle cx="50" cy="50" r="4" stroke="green" stroke-width="1" fill="yellow"/>
        </g>`);
  });
});

describe("t-out in components", () => {
  test("can render list of t-out ", () => {
    snapshotTemplate(`
        <div>
            <t t-foreach="this.state.items" t-as="item" t-key="item">
            <t t-out="item"/>
            </t>
        </div>`);
  });

  test("can switch the contents of two t-out repeatedly", () => {
    snapshotTemplate(`
        <t t-out="this.state.a"/>
        <t t-out="this.state.b"/>
      `);
  });

  test("t-out and updating falsy values, ", () => {
    snapshotTemplate(`<t t-out="this.state.a"/>`);
  });
});
