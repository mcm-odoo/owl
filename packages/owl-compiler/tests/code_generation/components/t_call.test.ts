import { snapshotTemplate } from "../../helpers";

describe("t-call", () => {
  test("dynamic t-call", () => {
    snapshotTemplate(`
          <t t-call="{{this.current.template}}">
            owl
          </t>`);
    snapshotTemplate(`<t t-name="bar">bar</t>`);
  });

  test("sub components in two t-calls", () => {
    snapshotTemplate(`
          <t t-if="this.state.val===1">
            <t t-call="sub"/>
          </t>
          <div t-else=""><t t-call="sub"/></div>`);
  });

  test("handlers are properly bound through a t-call", () => {
    snapshotTemplate(`
        <div><t t-call="__template__999"/><t t-out="this.counter"/></div>`);
    snapshotTemplate(`<p t-on-click="this.update">lucas</p>`);
  });

  test("handlers are properly bound through a dynamic t-call", () => {
    snapshotTemplate(`
        <div><t t-call="{{'__template__999'}}"/><t t-out="this.counter"/></div>`);
    snapshotTemplate(`<p t-on-click="() => this.update()">lucas</p>`);
  });

  test("parent is set within t-call", () => {
    snapshotTemplate(`<div><t t-call="__template__999"/></div>`);
    snapshotTemplate(`<span>lucas</span>`);
  });

  test("t-call in t-foreach and children component", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="['a', 'b', 'c']" t-as="val" t-key="val">
            <t t-call="__template__999"/>
          </t>
        </div>`);
    snapshotTemplate(`<Child val="val"/>`);
  });

  test("handlers with arguments are properly bound through a t-call", () => {
    snapshotTemplate(`<p t-on-click="() => this.update(this.a)">lucas</p>`);
  });

  test("dynamic t-call: key is propagated", () => {
    snapshotTemplate(`<Child /><t t-call="{{ this.sub }}"/>`);
    snapshotTemplate(`<div t-att-id="this.id" />`);
  });

  test("recursive t-call binding this -- static t-call", () => {
    snapshotTemplate(`
          <div><t t-call="recursive" level="0"/></div>
      `);
    snapshotTemplate(`
        <t t-if="level &lt; 2" >
          <div t-on-click.stop="this.onClicked.bind(this)" t-out="level" />
          <t t-call="recursive" level="level + 1" />
        </t>
    `);
  });

  test("t-call with t-call-context, simple use", () => {
    snapshotTemplate(`
          <t t-call="someTemplate" t-call-context="this.subctx"/>`);
    snapshotTemplate(`<t t-name="someTemplate"><t t-out="this.aab"/><t t-out="this.lpe"/></t>`);
  });

  test("t-call with t-call-context and subcomponent", () => {
    snapshotTemplate(`<t t-name="someTemplate">
            <Child name="this.aab"/>
            <Child name="this.lpe"/>
          </t>`);
    snapshotTemplate(`child<t t-out="this.props.name"/>`);
  });

  test("t-call-context: ComponentNode is not looked up in the context", () => {
    snapshotTemplate(`
          <t t-call="someTemplate" t-call-context="{method: function(){}, myRef: this.myRef, myRef2: this.myRef2}"/>`);
    snapshotTemplate(`<t t-name="someTemplate">
            <div t-ref="this.myRef">outside slot</div>
            <Child prop.bind="this.method">
              <div t-ref="this.myRef2">I'm the default slot</div>
              <t t-set="test" t-value="3"/>
              <div t-out="test"/>
            </Child>
          </t>`);
  });

  test("t-call-context: slots don't make component available again when context is captured", () => {
    snapshotTemplate(`<t t-call="template" t-call-context="{}"/>`, { dev: true });
    snapshotTemplate(
      `<t t-name="template">
            <t t-set="dummy" t-value="0"/>
            <Child>
              <t t-out="Object.keys(this)"/>
            </Child>
          </t>`,
      { dev: true }
    );
  });

  test("t-call-context: this is not available inside t-call-context", () => {
    snapshotTemplate(`<t t-call="someTemplate" t-call-context="{}"/>`);
    snapshotTemplate(`<t t-name="someTemplate">
            <t t-out="Object.keys(this)"/>
          </t>`);
  });

  test("dynamic t-call with same sub component", () => {
    snapshotTemplate(`
        <t t-out="this.current.template"/>
        <t t-call="{{this.current.template}}"/>`);
  });

  test("t-call and t-out", () => {
    snapshotTemplate(`<t t-call="a"/>`);
  });

  test("t-set inside t-call are not evaluated before being rendered", () => {
    snapshotTemplate(`
        <t t-call="a">
          <t t-out="v"/>
          coucou
          <t t-set="v" t-value="this.f()"/>
          <t t-out="v"/>
        </t>`);
  });

  test("body content is not evaluated if callee does not use t-out='0'", () => {
    snapshotTemplate(`
        <t t-call="noZero">
          <t t-out="this.sideEffect()"/>
        </t>`);
    snapshotTemplate(`<t t-name="noZero"><span>no zero here</span></t>`);
  });
});
