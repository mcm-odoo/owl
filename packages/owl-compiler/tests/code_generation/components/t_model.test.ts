import { snapshotTemplate } from "../../helpers";

describe("t-model directive", () => {
  test("basic use, on an input", () => {
    snapshotTemplate(`
        <div>
          <input t-model="this.text"/>
          <span><t t-out="this.text()"/></span>
        </div>`);
  });

  test("t-model on an input with an undefined value", () => {
    snapshotTemplate(`<input t-model="this.text"/>`);
  });

  test("basic use, on an input with bracket expression", () => {
    snapshotTemplate(`
        <div>
          <input t-model="this.state['text']"/>
          <span><t t-out="this.state.text()"/></span>
        </div>`);
  });

  test("throws if invalid expression", () => {
    snapshotTemplate(`
        <div>
          <input t-model="this.state"/>
        </div>`);
  });

  test("basic use, on another key in component", () => {
    snapshotTemplate(`<div>
            <input t-model="this.some.text"/>
            <span><t t-out="this.some.text()"/></span>
        </div>`);
  });

  test("on an input, type=checkbox", () => {
    snapshotTemplate(`<div>
            <input type="checkbox" t-model="this.flag"/>
            <span>
                <t t-if="this.flag()">yes</t>
                <t t-else="">no</t>
            </span>
        </div>`);
  });

  test("on an textarea", () => {
    snapshotTemplate(`<div>
            <textarea t-model="this.text"/>
            <span><t t-out="this.text()"/></span>
        </div>`);
  });

  test("on an input type=radio", () => {
    snapshotTemplate(`<div>
            <input type="radio" id="one" value="One" t-model="this.choice"/>
            <input type="radio" id="two" value="Two" t-model="this.choice"/>
            <span>Choice: <t t-out="this.choice()"/></span>
        </div>`);
  });

  test("on an input type=radio, with initial value", () => {
    snapshotTemplate(`<div>
            <input type="radio" id="one" value="One" t-model="this.choice"/>
            <input type="radio" id="two" value="Two" t-model="this.choice"/>
        </div>`);
  });

  test("on a select", () => {
    snapshotTemplate(`<div>
            <select t-model="this.color">
                <option value="">Please select one</option>
                <option value="red">Red</option>
                <option value="blue">Blue</option>
            </select>
            <span>Choice: <t t-out="this.color()"/></span>
        </div>`);
  });

  test("on a select, initial state", () => {
    snapshotTemplate(`
        <div>
          <select t-model="this.color">
            <option value="">Please select one</option>
            <option value="red">Red</option>
            <option value="blue">Blue</option>
          </select>
        </div>
      `);
  });

  test("on a sub state key", () => {
    snapshotTemplate(`
        <div>
          <input t-model="this.state.something.text"/>
          <span><t t-out="this.state.something.text()"/></span>
        </div>
      `);
  });

  test("with expression having a changing key", () => {
    snapshotTemplate(`
        <div>
          <input t-model="this.state.something[this.key()]"/>
          <span><t t-out="this.state.something[this.key()]()"/></span>
        </div>
      `);
  });

  test(".lazy modifier", () => {
    snapshotTemplate(`
        <div>
            <input t-model.lazy="this.text"/>
            <span><t t-out="this.text()"/></span>
        </div>
      `);
  });

  test(".trim modifier", () => {
    snapshotTemplate(`
        <div>
          <input t-model.trim="this.text"/>
          <span><t t-out="this.text()"/></span>
        </div>
      `);
  });

  test(".number modifier", () => {
    snapshotTemplate(`
        <div>
          <input t-model.number="this.number"/>
          <span><t t-out="this.number()"/></span>
        </div>
      `);
  });

  test("in a t-foreach", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="this.things" t-as="thing" t-key="thing.id">
            <input type="checkbox" t-model="thing.f"/>
          </t>
        </div>
      `);
  });

  test("in a t-foreach, part 2", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="this.things" t-as="thing" t-key="thing_index">
            <input t-model="this.things[thing_index]"/>
          </t>
        </div>
      `);
  });

  test("in a t-foreach, part 3", () => {
    snapshotTemplate(`
        <div>
          <t t-foreach="this.names" t-as="name" t-key="name_index">
            <input t-model="this.values[name]"/>
          </t>
        </div>
      `);
  });

  test("two inputs in a div alternating with a t-if", () => {
    snapshotTemplate(`
        <div>
          <input class="a" t-if="this.flag()" t-model="this.text1"/>
          <input class="b" t-if="!this.flag()" t-model="this.text2"/>
        </div>
      `);
  });

  test("following a scope protecting directive (e.g. t-set)", () => {
    snapshotTemplate(`
        <div>
          <t t-set="admiral" t-value="'Bruno'"/>
          <input t-model="this.text"/>
        </div>
      `);
  });

  test("can also define t-on directive on same event, part 1", () => {
    snapshotTemplate(`
        <div>
          <input t-model="this.text" t-on-input="this.onInput"/>
        </div>
      `);
  });

  test("can also define t-on directive on same event, part 2", () => {
    snapshotTemplate(`
        <div>
          <input type="radio" id="one" value="One" t-model="this.choice" t-on-click="this.onClick"/>
          <input type="radio" id="two" value="Two" t-model="this.choice" t-on-click="this.onClick"/>
          <input type="radio" id="three" value="Three" t-model="this.choice" t-on-click="this.onClick"/>
        </div>
      `);
  });

  test("t-model on select with static options", () => {
    snapshotTemplate(`
        <div>
          <select t-model="this.model">
             <option value="a" t-out="'a'"/>
             <option value="b" t-out="'b'"/>
             <option value="c" t-out="'c'"/>
          </select>
        </div>
      `);
  });

  test("t-model with dynamic values on select options", () => {
    snapshotTemplate(`
        <div>
          <select t-model="this.model">
             <option t-att-value="this.options[0]" t-out="this.options[0]"/>
             <option t-att-value="this.options[1]" t-out="this.options[1]"/>
          </select>
        </div>
      `);
  });

  test("t-model with dynamic values on select options -- 2", () => {
    snapshotTemplate(`
        <div>
          <select t-model="this.model">
             <option t-att-value="this.options[0]" t-out="this.options[0]"/>
             <option t-attf-value="{{ this.options[1] }}" t-out="this.options[1]"/>
          </select>
        </div>
      `);
  });

  test("t-model with dynamic values on select options -- 3", () => {
    snapshotTemplate(`
        <div>
          <select t-model="this.model">
             <option t-att-value="this.options[0]" t-out="this.options[0]"/>
             <option value="b" t-out="this.options[1]"/>
          </select>
        </div>
      `);
  });

  test("t-model with dynamic values on select options in foreach", () => {
    snapshotTemplate(`
        <div>
          <select t-model="this.model">
            <t t-foreach="this.options" t-as="v" t-key="v">
                <option t-att-value="v" t-out="v"/>
            </t>
          </select>
        </div>
      `);
  });

  test("t-model with dynamic number values on select options in foreach", () => {
    snapshotTemplate(`
          <select t-model.number="this.value">
            <t t-foreach="this.options" t-as="o" t-key="o.value">
                <option t-att-value="o.value" t-out="o.value"/>
            </t>
          </select>
      `);
  });

  test("t-model is applied before t-on-input", () => {
    snapshotTemplate(`
        <div>
          <input t-model="this.state['text']" t-on-input="this.onInput"/>
        </div>
      `);
  });

  test("t-model with radio button group in t-foreach", () => {
    snapshotTemplate(`
        <div t-on-click="this.getData" id="get_data">
          <t t-foreach="this.options" t-as="opt" t-key="opt">
            <input type="radio" name="radio_group" t-model="this.group" t-att-value="opt" t-att-id="opt"/>
          </t>
        </div>
      `);
  });
});

describe("t-model.proxy directive", () => {
  test("basic use, on an input", () => {
    snapshotTemplate(`
        <div>
          <input t-model.proxy="this.state.text"/>
          <span><t t-out="this.state.text"/></span>
        </div>`);
  });

  test("on an input with bracket expression", () => {
    snapshotTemplate(`
        <div>
          <input t-model.proxy="this.state['text']"/>
          <span><t t-out="this.state.text"/></span>
        </div>`);
  });

  test("on a textarea", () => {
    snapshotTemplate(`<div>
            <textarea t-model.proxy="this.state.text"/>
            <span><t t-out="this.state.text"/></span>
        </div>`);
  });

  test("on an input, type=checkbox", () => {
    snapshotTemplate(`<div>
            <input type="checkbox" t-model.proxy="this.state.flag"/>
            <span>
                <t t-if="this.state.flag">yes</t>
                <t t-else="">no</t>
            </span>
        </div>`);
  });

  test("on an input type=radio", () => {
    snapshotTemplate(`<div>
            <input type="radio" id="one" value="One" t-model.proxy="this.state.choice"/>
            <input type="radio" id="two" value="Two" t-model.proxy="this.state.choice"/>
            <span>Choice: <t t-out="this.state.choice"/></span>
        </div>`);
  });

  test("on a select", () => {
    snapshotTemplate(`<div>
            <select t-model.proxy="this.state.color">
                <option value="">Please select one</option>
                <option value="red">Red</option>
                <option value="blue">Blue</option>
            </select>
            <span>Choice: <t t-out="this.state.color"/></span>
        </div>`);
  });

  test("with .trim modifier", () => {
    snapshotTemplate(`
        <div>
          <input t-model.proxy.trim="this.state.text"/>
          <span><t t-out="this.state.text"/></span>
        </div>`);
  });

  test("with .number modifier", () => {
    snapshotTemplate(`
        <div>
          <input t-model.proxy.number="this.state.num"/>
          <span><t t-out="this.state.num"/></span>
        </div>`);
  });

  test("with .lazy modifier", () => {
    snapshotTemplate(`
        <div>
          <input t-model.proxy.lazy="this.state.text"/>
          <span><t t-out="this.state.text"/></span>
        </div>`);
  });

  test("deeply nested path", () => {
    snapshotTemplate(`
        <div>
          <input t-model.proxy="this.state.a.b"/>
          <span><t t-out="this.state.a.b"/></span>
        </div>`);
  });
});
