import { snapshotTemplate } from "../../helpers";

describe("refs", () => {
  test("basic use", () => {
    snapshotTemplate(`<div t-ref="this.button"/>`);
  });

  test("basic use with signal.ref", () => {
    snapshotTemplate(`<input t-ref="this.input"/>`);
  });

  test("refs are properly bound in slots", () => {
    snapshotTemplate(`
            <div>
              <span class="counter"><t t-out="this.state.val"/></span>
              <Dialog>
                <t t-set-slot="footer"><button t-ref="this.button" t-on-click="this.doSomething">do something</button></t>
              </Dialog>
            </div>
          `);
    snapshotTemplate(`<span><t t-call-slot="footer"/></span>`);
  });

  test("use 2 refs in a t-if/t-else situation", () => {
    snapshotTemplate(`
        <t t-if="this.state.value">
          <div t-ref="this.ref1"/>
        </t>
        <t t-else="">
          <span t-ref="this.ref2"/>
        </t>`);
  });

  test("ref is unset when t-if goes to false after unrelated render", () => {
    snapshotTemplate(
      `<div t-if="this.state.show" t-att-class="this.state.class" t-ref="this.ref"/>`
    );
  });

  test("refs and recursive templates", () => {
    snapshotTemplate(`
        <p t-ref="this.root">
          <t t-out="this.props.tree.value"/>
          <t t-if="this.props.tree.child"><Test tree="this.props.tree.child"/></t>
        </p>`);
  });

  test("refs and t-key", () => {
    snapshotTemplate(`
        <button t-on-click="() => this.state.renderId++" />
        <p t-ref="this.root" t-key="this.state.renderId"/>`);
  });

  test("ref is set by child component", () => {
    snapshotTemplate(`<Child ref="this.ref"/>`);
    snapshotTemplate(`<div id="ref" t-ref="this.props.ref"/>`);
  });

  test("resource can be used for multi ref", () => {
    snapshotTemplate(`
        <t t-foreach="this.items()" t-as="item" t-key="item">
          <p t-ref="this.refs" t-attf-id="item-{{item}}"/>
        </t>
      `);
  });

  test("ref shared between t-if and t-else, plain", () => {
    snapshotTemplate(`
        <t t-if="this.cond()">
          <div class="ifbranch" t-ref="this.ref"/>
        </t>
        <t t-else="">
          <div class="elsebranch" t-ref="this.ref"/>
        </t>`);
  });

  test("ref shared between t-if and t-else, t-else has a slotted component", () => {
    snapshotTemplate(`
        <t t-if="this.cond()">
          <div class="ifbranch" t-ref="this.ref"/>
        </t>
        <t t-else="">
          <SlotCp>
            <div class="elsebranch" t-ref="this.ref"/>
          </SlotCp>
        </t>`);
  });

  test("ref in slot is unset when the slot host is removed", () => {
    snapshotTemplate(`
        <t t-if="this.visible()">
          <Wrapper>
            <div class="slotted" t-ref="this.myRef">Coucou</div>
          </Wrapper>
        </t>`);
  });

  test("ref in slot is unset across a t-if nested inside the slot content", () => {
    snapshotTemplate(`
        <t t-if="this.visible()">
          <Wrapper>
            <t t-if="this.inner()"><span t-ref="this.myRef">hi</span></t>
          </Wrapper>
        </t>`);
    snapshotTemplate(`<section><t t-call-slot="default"/></section>`);
  });

  test("ref in slot is unset when forwarded through a nested component", () => {
    snapshotTemplate(`
        <t t-if="this.visible()">
          <Wrapper><b t-ref="this.myRef">x</b></Wrapper>
        </t>`);
    snapshotTemplate(`<div><Inner><t t-call-slot="default"/></Inner></div>`);
    snapshotTemplate(`<i><t t-call-slot="default"/></i>`);
  });

  test("ref in slot is unset when the host removes it in place (host survives)", () => {
    snapshotTemplate(`<Wrapper><span class="slotted" t-ref="this.myRef">hi</span></Wrapper>`);
    snapshotTemplate(`<div t-if="this.show()"><t t-call-slot="default"/></div>`);
  });

  test("ref in slot is unset when an intermediate host is removed in place", () => {
    snapshotTemplate(
      `<div t-if="this.show()"><Inner><span t-ref="this.myRef">x</span></Inner></div>`
    );
  });

  test("ref is unset even when a sub-root is destroyed re-entrantly mid-removal", () => {
    snapshotTemplate(`<p>sub</p>`, { dev: true });
    snapshotTemplate(
      `<t t-if="this.show()"><Wrapper><span t-ref="this.myRef">hi</span></Wrapper></t>`
    );
  });

  test("ref is unset only once its element is detached", () => {
    snapshotTemplate(`<div><span t-if="this.show()" t-ref="this.myRef"/></div>`);
  });

  test("a listener firing during the removal still sees its ref", () => {
    snapshotTemplate(`<div><input t-if="this.show()" t-ref="this.input"/></div>`);
  });
});
