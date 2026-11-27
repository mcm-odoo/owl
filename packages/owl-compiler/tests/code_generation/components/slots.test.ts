import { snapshotTemplate } from "../../helpers";

describe("slots", () => {
  test("simple default slot", () => {
    snapshotTemplate(`<Child>some text</Child>`);
    snapshotTemplate(`<span><t t-call-slot="default"/></span>`);
  });

  test("t-set-slot=default has priority over rest of the content", () => {
    snapshotTemplate(`<Child>
        some text
        <t t-set-slot="default">some other text</t>
      </Child>`);
  });

  test("simple slot with slot scope", () => {
    snapshotTemplate(`
        <Child>
          <t t-set-slot="slotName" t-slot-scope="slotScope">
            <t t-if="slotScope.bool">some text</t>
            <t t-else="slotScope.bool">other text</t>
          </t>
        </Child>`);
    snapshotTemplate(`<span><t t-call-slot="slotName" bool="this.state.bool"/></span>`);
  });

  test("slot with slot scope and t-props", () => {
    snapshotTemplate(`
        <Child>
          <t t-set-slot="slotName" t-slot-scope="info">
            <p t-out="info.a"/>
            <p t-out="info.b"/>
          </t>
        </Child>`);
    snapshotTemplate(`
        <t t-call-slot="slotName" t-props="this.info"/>`);
  });

  test("simple dynamic slot with slot scope", () => {
    snapshotTemplate(`<span><t t-call-slot="{{ 'slotName' }}" bool="this.state.bool"/></span>`);
  });

  test("simple named and empty slot", () => {
    snapshotTemplate(`<Child>some text<t t-set-slot="myEmptySlot" /></Child>`);
    snapshotTemplate(`<span><t t-call-slot="default" /><t t-call-slot="myEmptySlot"/></span>`);
  });

  test("simple named and empty slot -- 2", () => {
    snapshotTemplate(`<Child><t t-set-slot="myEmptySlot" myProp="'myProp text'" /></Child>`);
    snapshotTemplate(`<span><t t-call-slot="myEmptySlot">default empty</t></span>`);
  });

  test("can use .translate suffix on slot props", () => {
    snapshotTemplate(`<Child><t t-set-slot="default" message.translate="some message"/></Child>`);
    snapshotTemplate(`<t t-out="this.props.slots.default.message"/>`);
  });

  test(".translate slot props are translated", () => {
    snapshotTemplate(`<Child><t t-set-slot="default" message.translate="some message"/></Child>`, {
      translateFn: () => "translated message",
    });
  });

  test("default slot with slot scope: shorthand syntax", () => {
    snapshotTemplate(`
        <Child t-slot-scope="slotScope">
          <t t-if="slotScope.bool">some text</t>
          <t t-else="slotScope.bool">other text</t>
        </Child>`);
    snapshotTemplate(`<span><t t-call-slot="default" bool="this.state.bool"/></span>`);
  });

  test("simple default slot with params", () => {
    snapshotTemplate(`
        <Child>
          <t t-if="slotScope.bool">some text</t>
          <t t-else="slotScope.bool">other text</t>
        </Child>`);
  });

  test("simple default slot with params and bound function", () => {
    snapshotTemplate(`
        <Child t-slot-scope="slotScope"><t t-out="slotScope.fn()"/></Child>`);
    snapshotTemplate(`<t t-call-slot="default" fn.bind="this.getValue"/>`);
  });

  test("default slot with params with - in it", () => {
    snapshotTemplate(`
        <Child t-slot-scope="slotScope"><t t-out="slotScope['some-value']"/></Child>`);
    snapshotTemplate(`<t t-call-slot="default" some-value="this.state.value"/>`);
  });

  test("fun: two calls to the same slot", () => {
    snapshotTemplate(`<t t-call-slot="default"/><t t-call-slot="default"/>`);
  });

  test("slot content is bound to caller", () => {
    snapshotTemplate(`<Child><button t-on-click="this.inc">some text</button></Child>`);
  });

  test("slot content is bound to caller (variation)", () => {
    snapshotTemplate(`
        <Child>
          <t t-set="var" t-value="1"/>
          <button t-on-click="() => this.inc()">some text</button>
        </Child>`);
  });

  test("can define and call slots", () => {
    snapshotTemplate(`
        <div>
          <Dialog>
            <t t-set-slot="header"><span>header</span></t>
            <t t-set-slot="footer"><span>footer</span></t>
          </Dialog>
        </div>`);
    snapshotTemplate(`
        <div>
          <div><t t-call-slot="header"/></div>
          <div><t t-call-slot="footer"/></div>
        </div>`);
  });

  test("can define and call slots with params", () => {
    snapshotTemplate(`
        <div>
          <Dialog>
            <t t-set-slot="header" param="this.var"><span>header</span></t>
            <t t-set-slot="footer" param="'5'"><span>footer</span></t>
          </Dialog>
        </div>`);
    snapshotTemplate(`
        <div>
          <t t-out="this.props.slots['header'].param"/>
          <div><t t-call-slot="header"/></div>
          <t t-out="this.props.slots['footer'].param"/>
          <div><t t-call-slot="footer"/></div>
        </div>`);
  });

  test("can define and call slots with bound params", () => {
    snapshotTemplate(`
          <Child>
            <t t-set-slot="abc" getValue.bind="this.getValue">abc</t>
          </Child>`);
    snapshotTemplate(`
        <t t-call-slot="abc"/>
        <t t-out="this.props.slots['abc'].getValue()"/>`);
  });

  test("no named slot content => just no children", () => {
    snapshotTemplate(`<Dialog/>`);
    snapshotTemplate(`<span><t t-call-slot="header"/></span>`);
  });

  test("named slots can define a default content", () => {
    snapshotTemplate(`<div><Dialog/></div>`);
    snapshotTemplate(`
            <span>
              <t t-call-slot="header">default content</t>
            </span>`);
  });

  test("can define a default content", () => {
    snapshotTemplate(`
          <span>
            <t t-call-slot="default">default content</t>
          </span>`);
  });

  test("default content is not rendered if slot is provided", () => {
    snapshotTemplate(`<div><Dialog>hey</Dialog></div>`);
  });

  test("default content is not rendered if named slot is provided", () => {
    snapshotTemplate(`<div><Dialog><t t-set-slot="header">hey</t></Dialog></div>`);
  });

  test("slots are properly bound to correct component", () => {
    snapshotTemplate(`
        <t t-call-slot="default">
          <t t-set="var" t-value="1"/>
          <button t-on-click="() => this.increment()">
            <t t-out="this.state.value"/>
          </button>
        </t>`);
  });

  test("slots are rendered with proper context", () => {
    snapshotTemplate(`
          <div>
            <span class="counter"><t t-out="this.state.val"/></span>
            <Dialog>
              <t t-set-slot="footer">
                <button t-on-click="this.doSomething">do something</button>
              </t>
            </Dialog>
          </div>`);
  });

  test("slots are rendered with proper context, part 2", () => {
    snapshotTemplate(`
          <div>
            <u><li t-foreach="this.state.users" t-as="user" t-key="user.id">
                <Link to="'/user/' + user.id">User <t t-out="user.name"/></Link>
            </li></u>
          </div>`);
    snapshotTemplate(`
            <a t-att-href="this.props.to">
              <t t-call-slot="default"/>
            </a>`);
  });

  test("slots are rendered with proper context, part 3", () => {
    snapshotTemplate(`
          <div>
            <u><li t-foreach="this.state.users" t-as="user" t-key="user.id" >
                <t t-set="userdescr" t-value="'User ' + user.name"/>
                <Link to="'/user/' + user.id"><t t-out="userdescr"/></Link>
            </li></u>
          </div>`);
  });

  test("slots are rendered with proper context, part 4", () => {
    snapshotTemplate(`
          <div>
            <t t-set="userdescr" t-value="'User ' + this.state.user.name"/>
            <Link to="'/user/' + this.state.user.id"><t t-out="userdescr"/></Link>
          </div>`);
  });

  test("content is the default slot", () => {
    snapshotTemplate(`
          <div>
            <Dialog>
              <span>sts rocks</span>
            </Dialog>
          </div>`);
  });

  test("content is the default slot (variation)", () => {
    snapshotTemplate(`
            <Dialog>
              <span>sts rocks</span>
            </Dialog>`);
  });

  test("default slot work with text nodes", () => {
    snapshotTemplate(`
          <div>
            <Dialog>sts rocks</Dialog>
          </div>`);
  });

  test("default slot work with text nodes (variation)", () => {
    snapshotTemplate(`<Dialog>sts rocks</Dialog>`);
  });

  test("multiple roots are allowed in a named slot", () => {
    snapshotTemplate(`
          <div>
            <Dialog>
              <t t-set-slot="content">
                  <span>sts</span>
                  <span>rocks</span>
              </t>
            </Dialog>
          </div>`);
    snapshotTemplate(`<div><t t-call-slot="content"/></div>`);
  });

  test("multiple roots are allowed in a default slot", () => {
    snapshotTemplate(`
          <div>
            <Dialog>
              <span>sts</span>
              <span>rocks</span>
            </Dialog>
          </div>`);
  });

  test("missing slots are ignored", () => {
    snapshotTemplate(`
          <span>
            <t t-call-slot="default"/>
            <span>some content</span>
            <t t-call-slot="footer"/>
          </span>`);
  });

  test("t-debug on a t-set-slot (defining a slot)", () => {
    snapshotTemplate(`
          <div>
            <Dialog><t t-set-slot="content" t-debug="">abc</t></Dialog>
          </div>`);
    snapshotTemplate(`<span><t t-call-slot="content"/></span>`);
  });

  test("slot preserves properly parented relationship", () => {
    snapshotTemplate(`
        <div>
          <Child>
            <GrandChild/>
          </Child>
        </div>`);
    snapshotTemplate(`Grand Child`);
  });

  test("slot preserves properly parented relationship, even through t-call", () => {
    snapshotTemplate(`
          <div>
            <Child>
              <t t-call="sub"/>
            </Child>
          </div>`);
  });

  test("t-slot scope context", () => {
    snapshotTemplate(`
        <Dialog>
            <button>The Button</button>
        </Dialog>`);
    snapshotTemplate(`
        <Wrapper>
          <div t-on-click="this.onClick">
            <t t-call-slot="default" />
          </div>
        </Wrapper>
      `);
  });

  test("t-slot in recursive templates", () => {
    snapshotTemplate(`
          <Wrapper>
            <t t-out="name or this.name" />
            <t t-foreach="items or this.items" t-as="item" t-key="item.name">
                <t t-if="!item.children.length">
                <t t-out="item.name" />
                </t>
                <t t-else="" t-call="_test_recursive_template" name="item.name" items="item.children">
                </t>
            </t>
        </Wrapper>`);
    snapshotTemplate(`
          <wrapper>
            <t t-call-slot="default"/>
          </wrapper>`);
  });

  test("t-slot within dynamic t-call", () => {
    snapshotTemplate(`
      <div>
        <Slotted>
          <t t-call="{{ this.tcallTemplate }}"/>
        </Slotted>
      </div>`);
    snapshotTemplate(`<div class="slotted"><t t-call-slot="default" /></div>`);
    snapshotTemplate(`<t t-name="sometemplate">
            <div class="slot"><Child/></div>
          </t>`);
    snapshotTemplate(`<div class="child"/>`);
  });

  test("slots in t-foreach in t-foreach", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="this.tree" t-as="node1" t-key="node1.key">
            <div t-out="node1.value" />
            <ul>
              <t t-foreach="node1.nodes" t-as="node2" t-key="node2.key">
                <Child>
                  <li t-out="node1.value" />
                </Child>
              </t>
            </ul>
          </t>
        </div>`);
  });

  test("default slot next to named slot, with default content", () => {
    snapshotTemplate(`
        <div>
          <Dialog>
            <t t-set-slot="footer">
              Overridden footer
            </t>
          </Dialog>
        </div>
      `);
    snapshotTemplate(`
        <div class="Dialog">
          <div class="content">
            <t t-call-slot="default">
              Default content
            </t>
          </div>
          <div class="footer">
            <t t-call-slot="footer">
              Default footer
            </t>
          </div>
        </div>
      `);
  });

  test("dynamic t-call-slot call", () => {
    snapshotTemplate(`
        <div>
          <Toggler>
            <t t-set-slot="slot1"><p>slot1</p><span>content</span></t>
            <t t-set-slot="slot2"><h1>slot2</h1></t>
          </Toggler>
        </div>`);
    snapshotTemplate(
      `<button t-on-click="this.toggle"><t t-call-slot="{{this.current.slot}}"/></button>`
    );
  });

  test("dynamic t-call-slot call with default", () => {
    snapshotTemplate(`
        <button t-on-click="this.toggle">
          <t t-call-slot="{{this.current.slot}}">
            owl
          </t>
        </button>`);
  });

  test("slot are properly rendered if inner props are changed", () => {
    snapshotTemplate(`
        <div>
          <button t-on-click="this.inc">Inc[<t t-out="this.state.val"/>]</button>
          <GenericComponent>
            <SomeComponent val="this.state.val"/>
          </GenericComponent>
        </div>`);
    snapshotTemplate(`
        <div>
          SC:<t t-out="this.props.val"/>
        </div>`);
  });

  test("slots and wrapper components", () => {
    snapshotTemplate(`<Link>hey</Link>`);
    snapshotTemplate(`
          <a href="abc">
              <t t-call-slot="default"/>
          </a>`);
  });

  test("template can just return a slot", () => {
    snapshotTemplate(`
          <div>
              <SlotComponent><Child value="this.state.value"/></SlotComponent>
          </div>`);
  });

  test("multiple slots containing components", () => {
    snapshotTemplate(`
          <B>
            <t t-set-slot="s1"><C val="1"/></t>
            <t t-set-slot="s2"><C val="2"/></t>
          </B>`);
    snapshotTemplate(`<div><t t-call-slot="s1"/><t t-call-slot="s2"/></div>`);
  });

  test("slots in t-foreach and re-rendering", () => {
    snapshotTemplate(`
          <div>
            <t t-foreach="Array(2)" t-as="n" t-key="n_index">
              <Child><t t-out="n_index"/></Child>
            </t>
          </div>`);
    snapshotTemplate(`<span><t t-out="this.state.val"/><t t-call-slot="default"/></span>`);
  });

  test("slots in t-foreach with t-set and re-rendering", () => {
    snapshotTemplate(`
          <div>
            <t t-foreach="Array(2)" t-as="n" t-key="n_index">
              <t t-set="dummy" t-value="n_index"/>
              <Child><t t-out="dummy"/></Child>
            </t>
          </div>`);
  });

  test("nested slots in same template", () => {
    snapshotTemplate(`
          <span id="parent">
            <Child>
              <Child2>
                <Child3/>
              </Child2>
            </Child>
          </span>`);
    snapshotTemplate(`
          <span id="c1">
            <div>
              <t t-call-slot="default"/>
            </div>
          </span>`);
    snapshotTemplate(`
          <span id="c2">
            <t t-call-slot="default"/>
          </span>`);
    snapshotTemplate(`
          <span>Child 3</span>`);
  });

  test("t-slot nested within another slot", () => {
    snapshotTemplate(`
          <span id="c1">
            <Dialog>
              <Child3/>
            </Dialog>
          </span>`);
    snapshotTemplate(`
          <span id="c2">
            <Modal>
              <Portal>
                <t t-call-slot="default"/>
              </Portal>
             </Modal>
          </span>`);
    snapshotTemplate(`<span id="modal"><t t-call-slot="default"/></span>`);
    snapshotTemplate(`<span id="portal"><t t-call-slot="default"/></span>`);
  });

  test("slots in slots, with vars", () => {
    snapshotTemplate(`
          <div>
            <t t-set="test" t-value="this.state.name"/>
            <A>
              <p>hey<t t-out="test"/></p>
            </A>
          </div>`);
    snapshotTemplate(`
          <div>
            <B>
              <t t-call-slot="default"/>
            </B>
          </div>`);
  });

  test("t-set t-value in a slot", () => {
    snapshotTemplate(`
        <div>
          <Dialog>
            <t t-set="rainbow" t-value="'dash'"/>
            <t t-out="rainbow"/>
          </Dialog>
        </div>`);
  });

  test("slot and t-out", () => {
    snapshotTemplate(`<div><Dialog><t t-out="'toph'"/></Dialog></div>`);
  });

  test("slot and t-call", () => {
    snapshotTemplate(`<div><Dialog><t t-call="__template__999"/></Dialog></div>`);
    snapshotTemplate(`<p>sokka</p>`);
  });

  test("nested slots: evaluation context and parented relationship", () => {
    snapshotTemplate(`<Child><Slot val="this.state.val"/></Child>`);
    snapshotTemplate(`
          <GrandChild>
            <t t-call-slot="default"/>
          </GrandChild>`);
  });

  test("named slot inside slot", () => {
    snapshotTemplate(`
        <div>
          <Child>
            <t t-set-slot="brol">
              <p>A<t t-out="this.value"/></p>
            </t>
            <Child>
              <t t-set-slot="brol">
                <p>B<t t-out="this.value"/></p>
              </t>
            </Child>
          </Child>
        </div>`);
    snapshotTemplate(`
        <div>
          <t t-call-slot="brol"/>
          <t t-call-slot="default"/>
        </div>`);
  });

  test("named slots inside slot, again", () => {
    snapshotTemplate(`
        <div>
          <Child>
            <t t-set-slot="brol1">
              <p>A<t t-out="this.value"/></p>
            </t>
            <Child>
              <t t-set-slot="brol2">
                <p>B<t t-out="this.value"/></p>
              </t>
            </Child>
          </Child>
        </div>`);
    snapshotTemplate(`
        <child>
          <t t-call-slot="brol1">default1</t>
          <t t-call-slot="brol2">default2</t>
          <t t-call-slot="default"/>
        </child>`);
  });

  test("named slot inside named slot in t-component", () => {
    snapshotTemplate(`
        <Child>
          <t t-set-slot="brol">
            outer
            <t t-component="this.Child">
              <t t-set-slot="brol">
                <t t-out="this.value"/>
              </t>
            </t>
          </t>
        </Child>`);
    snapshotTemplate(`<t t-call-slot="brol"/>`);
  });

  test("can render node with t-ref and Component in same slot", () => {
    snapshotTemplate(`<Child><div t-ref="this.ref"/><Child/></Child>`);
  });

  test("can use t-call in default-content of t-slot", () => {
    snapshotTemplate(`<t t-call-slot="default"><t t-call="__template__999"/></t>`);
  });

  test("can use component in default-content of t-slot", () => {
    snapshotTemplate(`<t t-call-slot="default"><GrandChild/></t>`);
  });

  test("slot content has different key from other content -- static slot", () => {
    snapshotTemplate(`
         <SlotDisplay>
           <Child parent="'Parent'" />
         </SlotDisplay>`);
    snapshotTemplate(`<Child parent="'SlotDisplay'" /><t t-call-slot="default" />`);
    snapshotTemplate(`<div t-out="this.props.parent" />`);
  });

  test("slot content has different key from other content -- dynamic slot", () => {
    snapshotTemplate(`<Child parent="'SlotDisplay'" /><t t-call-slot="{{ this.slotName }}" />`);
  });

  test("mix of slots, t-call, t-call with body, and giving own props child", () => {
    snapshotTemplate(`<P/>`);
    snapshotTemplate(`<button t-on-click="this.inc">inc</button><A number="this.state.number"/>`);
    snapshotTemplate(`<B>[A]<t t-call="__template__1002"/></B>`);
    snapshotTemplate(`[B]<C slots="this.props.slots" />`);
    snapshotTemplate(`[C]<t t-call-slot="default" />`);
    snapshotTemplate(`[sub1]
      <t t-set="dummy" t-value="this.validate"/>
      <t t-call="__template__1001" v="this.props.number"/>
      `);
    snapshotTemplate(`[sub2<t t-out="v"/>]`);
  });

  test("slot in multiple locations", () => {
    snapshotTemplate(`
         <Slotter location="this.state.location">
          hello <Child/>
         </Slotter>`);
    snapshotTemplate(`
          <t t-if="this.props.location === 1">
            <p><t t-call-slot="default"/></p>
          </t>
          <t t-if="this.props.location === 2">
            <t t-call-slot="default"/>
          </t>
      `);
  });

  test("dynamic slot in multiple locations", () => {
    snapshotTemplate(`
         <Slotter location="this.state.location">
          <t t-set-slot="coffee">hello <Child/></t>
         </Slotter>`);
    snapshotTemplate(`
          <t t-if="this.props.location === 1">
            <p><t t-call-slot="{{'coffee'}}"/></p>
          </t>
          <t t-if="this.props.location === 2">
            <t t-call-slot="{{'coffee'}}"/>
          </t>
      `);
  });

  test("slot in t-foreach locations", () => {
    snapshotTemplate(`
         <Slotter list="this.state.list">
          hello <Child/>
         </Slotter>`);
    snapshotTemplate(`
          <t t-foreach="this.props.list" t-as="elem" t-key="elem_index">
            <p><t t-out="elem"/><t t-call-slot="default"/></p>
          </t>
      `);
  });
});
