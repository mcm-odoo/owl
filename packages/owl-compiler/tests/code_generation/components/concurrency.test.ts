import { snapshotTemplate } from "../../helpers";

test("destroying/recreating a subwidget with different props (if start is not over)", () => {
  snapshotTemplate(`
        <div>
            <t t-if="this.state.val > 1"><Child val="this.state.val"/></t>
        </div>`);
  snapshotTemplate(`<span>child:<t t-out="this.props.val"/></span>`);
});

test("destroying/recreating a subcomponent, other scenario", () => {
  snapshotTemplate(`parent<Child t-if="this.state.hasChild"/>`);
  snapshotTemplate(`child`);
});

test("creating two async components, scenario 1", () => {
  snapshotTemplate(`
        <t t-if="this.state.flagA"><ChildA /></t>
        <t t-if="this.state.flagB"><ChildB /></t>`);
  snapshotTemplate(`<span><t t-out="this.getValue()"/></span>`);
});

test("creating two async components, scenario 2", () => {
  snapshotTemplate(`
          <div>
            <ChildA val="this.state.valA"/>
            <t t-if="this.state.flagB"><ChildB val="this.state.valB"/></t>
          </div>`);
  snapshotTemplate(`<span>a<t t-out="this.props.val"/></span>`);
  snapshotTemplate(`<span>b<t t-out="this.props.val"/></span>`);
});

test("update a sub-component twice in the same frame", () => {
  snapshotTemplate(`<div><ChildA val="this.state.valA"/></div>`);
});

test("update a sub-component twice in the same frame, 2", () => {
  snapshotTemplate(`<span><t t-out="this.val()"/></span>`);
});

test("properly behave when destroyed/unmounted while rendering ", () => {
  snapshotTemplate(`
        <div><t t-if="this.state.flag"><Child val="this.state.val"/></t></div>`);
  snapshotTemplate(`<div><SubChild val="this.props.val"/></div>`);
});

test("rendering component again in next microtick", () => {
  snapshotTemplate(`
          <div>
            <button t-on-click="this.onClick">Click</button>
            <t t-if="this.state.config.flag"><Child/></t>
          </div>`);
  snapshotTemplate(`<div>Child</div>`);
});

test("concurrent renderings scenario 1", () => {
  snapshotTemplate(`<div><ComponentB fromA="this.state.fromA"/></div>`);
  snapshotTemplate(`<p><ComponentC fromA="this.props.fromA" fromB="this.state.fromB" /></p>`);
  snapshotTemplate(`<span><t t-out="this.props.fromA"/><t t-out="this.someValue()"/></span>`);
});

test("concurrent renderings scenario 2", () => {
  snapshotTemplate(
    `<div><t t-out="this.state.fromA"/><ComponentB fromA="this.state.fromA"/></div>`
  );
  snapshotTemplate(`<span><t t-out="this.props.fromA"/><t t-out="this.props.fromB"/></span>`);
});

test("concurrent renderings scenario 3", () => {
  snapshotTemplate(`<p><ComponentC fromA="this.props.fromA" /></p>`);
  snapshotTemplate(`<span><ComponentD fromA="this.props.fromA" fromC="this.state.fromC" /></span>`);
  snapshotTemplate(`<i><t t-out="this.props.fromA"/><t t-out="this.someValue()"/></i>`);
});

test("concurrent renderings scenario 5", () => {
  snapshotTemplate(`<p><t t-out="this.someValue()" /></p>`);
});

test("concurrent renderings scenario 7", () => {
  snapshotTemplate(`<p><t t-out="this.props.fromA" /><t t-out="this.someValue()" /></p>`);
});

test("concurrent renderings scenario 8", () => {
  snapshotTemplate(`<p><t t-out="this.props.fromA" /><t t-out="this.state.fromB" /></p>`);
});

test("concurrent renderings scenario 9", () => {
  snapshotTemplate(`
          <div>
            <t t-out="this.state.fromA"/>
            <ComponentB fromA="this.state.fromA"/>
            <ComponentC fromA="this.state.fromA"/>
          </div>`);
  snapshotTemplate(`<b><t t-out="this.props.fromA"/></b>`);
  snapshotTemplate(`<p><ComponentD fromA="this.props.fromA" fromC="this.state.fromC" /></p>`);
  snapshotTemplate(`<span><t t-out="this.props.fromA"/><t t-out="this.props.fromC"/></span>`);
});

test("concurrent renderings scenario 10", () => {
  snapshotTemplate(`<div><ComponentB value="this.state.value"/></div>`);
  snapshotTemplate(`<p><ComponentC t-if="this.state.hasChild" value="this.props.value"/></p>`);
});

test("concurrent renderings scenario 11", () => {
  snapshotTemplate(`<div><Child val="this.state.valA"/></div>`);
  snapshotTemplate(`<span><t t-out="this.props.val"/>|<t t-out="this.val"/></span>`);
});

test("concurrent renderings scenario 12", () => {
  snapshotTemplate(`<div><Child val="this.val"/></div>`);
});

test("concurrent renderings scenario 13", () => {
  snapshotTemplate(`
          <div>
            <Child/>
            <Child t-if="this.state.bool"/>
          </div>`);
  snapshotTemplate(`<span><t t-out="this.state.val"/></span>`);
});

test("concurrent renderings scenario 14", () => {
  snapshotTemplate(`<p><B fromA="this.state.fromA"/></p>`);
  snapshotTemplate(`<p><C fromB="this.state.fromB" fromA="this.props.fromA"/></p>`);
  snapshotTemplate(`
       <p>
        <span t-out="this.props.fromA"/>
        <span t-out="this.props.fromB"/>
        <span t-out="this.state.fromC"/>
       </p>`);
});

test("concurrent renderings scenario 16", () => {
  snapshotTemplate(`<B fromA="this.state.fromA"/>`);
  snapshotTemplate(`<C fromB="this.state.fromB" fromA="this.props.fromA"/>`);
  snapshotTemplate(`
        <t t-out="this.props.fromA"/>:<t t-out="this.props.fromB"/>:<t t-out="this.state.fromC"/>:
        <D t-if="this.state.fromC === 13"/>`);
  snapshotTemplate(`D`);
});

test("calling render in destroy", () => {
  snapshotTemplate(`<B t-key="key" fromA="this.state"/>`);
  snapshotTemplate(`<C fromA="this.props.fromA"/>`);
  snapshotTemplate(`
      <div>
        <t t-out="this.props.fromA"/>
      </div>`);
});

test("changing state before first render does not trigger a render (with parent)", () => {
  snapshotTemplate(`<div><TestW t-if="this.state.flag"/></div>`);
});

test("two renderings initiated between willPatch and patched", () => {
  snapshotTemplate(
    `<div><Panel t-key="'panel_' + this.state.panel" val="this.state.panel" t-if="this.state.flag"/></div>`
  );
  snapshotTemplate(`<abc><t t-out="this.props.val"/><t t-out="this.mounted" /></abc>`);
});

test("parent and child rendered at exact same time", () => {
  snapshotTemplate(`<Child value="this.state.value"/>`);
});

test("delay willUpdateProps", () => {
  snapshotTemplate(`<t t-out="this.props.value"/>_<t t-out="this.state.int" />`);
});

test("delay willUpdateProps with rendering grandchild", () => {
  snapshotTemplate(`<Parent state="this.state"/>`);
  snapshotTemplate(`<DelayedChild value="this.props.state.value"/><ReactiveChild />`);
});

test("t-key on dom node having a component", () => {
  snapshotTemplate(`<div t-key="this.key"><t t-component="this.myComp" key="this.key" /></div>`);
  snapshotTemplate(`<t t-out="this.props.key" />`);
});

test("t-key on dynamic async component (toggler is never patched)", () => {
  snapshotTemplate(`<t t-component="this.myComp" t-key="this.key" key="this.key" />`);
  snapshotTemplate(`<div t-out="this.props.key" />`);
});

test("t-foreach with dynamic async component", () => {
  snapshotTemplate(`<t t-foreach="this.list" t-as="arr" t-key="arr_index">
        <t t-if="arr" t-component="this.myComp" key="arr[0]" />
      </t>`);
});

test("Cascading renders after microtaskTick", () => {
  snapshotTemplate(
    `<Child /> _ <t t-foreach="this.state" t-as="elem" t-key="elem.id" t-out="elem.id"/>`
  );
  snapshotTemplate(`
      <t t-foreach="this.state" t-as="elem" t-key="elem.id">
        <Element id="elem.id"/>
      </t>`);
  snapshotTemplate(`<t t-out="this.props.id" />`);
});

test("delayed rendering, but then initial rendering is cancelled by yet another render", () => {
  snapshotTemplate(`<B value="this.state.value"/>`);
  snapshotTemplate(`<C value="this.state.someValue + this.props.value"/>`);
  snapshotTemplate(`<D/><p><t t-out="this.props.value"/></p>`);
  snapshotTemplate(`<button t-on-click="this.increment"><t t-out="this.state.val"/></button>`);
});

test("delayed rendering, reusing fiber and stuff", () => {
  snapshotTemplate(`<t t-out="this.props.value"/><C /><t t-set="noop" t-value="this.notify()"/>`);
});

test("delayed rendering, then component is destroyed and  stuff", () => {
  snapshotTemplate(`<t t-out="this.props.value"/><t t-if="this.props.value lt 10"><C /></t>`);
});

test("delayed rendering, reusing fiber then component is destroyed and  stuff", () => {
  snapshotTemplate(`A<t t-if="this.state.value lt 15"><B value="this.state.value"/></t>`);
  snapshotTemplate(`<t t-out="this.props.value"/><C />`);
});

test("another scenario with delayed rendering", () => {
  snapshotTemplate(
    `A<t t-if="this.state.value lt 15"><B value="this.state.value"/></t><t t-set="noop" t-value="this.notify()"/>`
  );
});

test("delayed fiber does not get rendered if it was cancelled", () => {
  snapshotTemplate(`A<B/>`);
  snapshotTemplate(`B<C/>`);
  snapshotTemplate(`C<D/>`);
});

test("destroyed component causes other soon to be destroyed component to rerender, weird stuff happens", () => {
  snapshotTemplate(`
      A
      <t t-if="this.state.flag">
        <B value="this.state.valueB"/>
        <C value="this.state.valueC"/>
      </t>`);
  snapshotTemplate(`<t t-set="noop" t-value="this.notify()"/><t t-out="this.props.value"/>`);
  snapshotTemplate(`<t t-out="this.state.val + this.props.value"/>`);
});

test("delayed rendering, destruction, stuff happens", () => {
  snapshotTemplate(`A<B value="this.state.value"/>`);
  snapshotTemplate(
    `B<t t-if="this.state.hasChild"><C value="this.state.someValue + this.props.value"/></t>`
  );
  snapshotTemplate(`C<D/><p><t t-out="this.props.value"/></p>`);
  snapshotTemplate(`D<button t-on-click="this.increment"><t t-out="this.state.val"/></button>`);
});

test("renderings, destruction, patch, stuff, ... yet another variation", () => {
  snapshotTemplate(`A<B value="this.state.value"/><D/>`);
  snapshotTemplate(`B<t t-if="this.props.value === 33"><C/></t>`);
  snapshotTemplate(`D<p t-on-click="this.increment"><t t-out="this.state.val"/></p>`);
  snapshotTemplate(`C<span t-on-click="this.increment"><t t-out="this.state.val"/></span>`);
});

test("delayed render does not go through when t-component value changed", () => {
  snapshotTemplate(`A<t t-component="this.state.component"/>`);
  snapshotTemplate(`B<t t-out="this.state.val"/>`);
  snapshotTemplate(`C`);
});

test("cancelled components are destroyed immediately", () => {
  snapshotTemplate(`A<B t-if="this.state.flag"/>`);
});

test("component destroyed just after render", () => {
  snapshotTemplate(`<B/>`);
  snapshotTemplate(`B<t t-out="this.state.value"/>`);
});

test("sibling rendering: child without willStart renders before async sibling", () => {
  snapshotTemplate(`<div><ChildA/><ChildB/></div>`);
  snapshotTemplate(`<span t-out="this.log()"/>`);
});

test("slot content renders synchronously when child has no willStart", () => {
  snapshotTemplate(`<div><Child><p t-out="this.log()"/></Child><Sibling/></div>`);
});

test("Scheduler.processTasks can be patched after the app is created", () => {
  snapshotTemplate(`<t t-out="this.state.n"/>`);
});
