import { snapshotTemplate } from "../helpers";

describe("t-on", () => {
  test("can bind event handler", () => {
    snapshotTemplate(`<button t-on-click="add">Click</button>`);
  });

  test("can bind two event handlers", () => {
    snapshotTemplate(`
        <button t-on-click="handleClick" t-on-dblclick="handleDblClick">Click</button>`);
  });

  test("can bind handlers with arguments", () => {
    snapshotTemplate(`<button t-on-click="() => add(5)">Click</button>`);
  });

  test("can bind handlers with object arguments", () => {
    snapshotTemplate(`<button t-on-click="() => add({val: 5})">Click</button>`);
  });

  test("can bind handlers with empty  object", () => {
    snapshotTemplate(`<button t-on-click="() => doSomething({})">Click</button>`);
  });

  test("can bind handlers with empty object (with non empty inner string)", () => {
    snapshotTemplate(`<button t-on-click="() => doSomething({ })">Click</button>`);
    snapshotTemplate(`
        <ul>
          <li t-foreach="['someval']" t-as="action" t-key="action_index">
            <a t-on-click="() => activate(action)">link</a>
          </li>
        </ul>`);
  });

  test("handler is bound to proper owner, part 2", () => {
    snapshotTemplate(`
        <t t-foreach="[1]" t-as="value" t-key="value">
          <button t-on-click="add">Click</button>
        </t>`);
  });

  test("handler is bound to proper owner, part 3", () => {
    snapshotTemplate(`<t t-call="sub"/>`);
  });

  test("handler is bound to proper owner, part 4", () => {
    snapshotTemplate(`
        <t t-foreach="[1]" t-as="value" t-key="value">
          <t t-call="sub"/>
        </t>`);
    snapshotTemplate(`<button t-on-click="this.add">Click</button>`);
  });

  test("t-on with inline statement", () => {
    snapshotTemplate(`<button t-on-click="() => state.counter++">Click</button>`);
  });

  test("t-on with inline statement (function call)", () => {
    snapshotTemplate(`<button t-on-click="() => state.incrementCounter(2)">Click</button>`);
  });

  test("t-on with inline statement, part 2", () => {
    snapshotTemplate(`<button t-on-click="() => state.flag = !state.flag">Toggle</button>`);
  });

  test("t-on with inline statement, part 3", () => {
    snapshotTemplate(`<button t-on-click="() => state.n = someFunction(3)">Toggle</button>`);
  });

  test("t-on with t-call", () => {
    snapshotTemplate(`<div><t t-call="sub"/></div>`);
    snapshotTemplate(`<p t-on-click="update">lucas</p>`);
  });

  test("t-on, with arguments and t-call", () => {
    snapshotTemplate(`<p t-on-click="() => this.update(value)">lucas</p>`);
  });

  describe("t-on modifiers (native listener)", () => {
    test("basic support for native listener", () => {
      snapshotTemplate(`<div class="myClass" t-on-click="divClicked">
        <button t-on-click="btnClicked">Button</button>
      </div>`);
    });

    test("t-on with prevent and/or stop modifiers", () => {
      snapshotTemplate(`<div>
      <button t-on-click.prevent="onClickPrevented">Button 1</button>
      <button t-on-click.stop="onClickStopped">Button 2</button>
      <button t-on-click.prevent.stop="onClickPreventedAndStopped">Button 3</button>
      </div>`);
    });

    test("t-on with self modifier", () => {
      snapshotTemplate(`<div>
        <button t-on-click="onClick"><span>Button</span></button>
        <button t-on-click.self="onClickSelf"><span>Button</span></button>
      </div>`);
    });

    test("t-on with self and prevent modifiers (order matters)", () => {
      snapshotTemplate(`<div>
        <button t-on-click.self.prevent="onClick"><span>Button</span></button>
      </div>`);
    });

    test("t-on with prevent and self modifiers (order matters)", () => {
      snapshotTemplate(`<div>
        <button t-on-click.prevent.self="onClick"><span>Button</span></button>
      </div>`);
    });

    test("t-on with prevent modifier in t-foreach", () => {
      snapshotTemplate(`<div>
        <t t-foreach="projects" t-as="project" t-key="project">
          <a href="#" t-on-click.prevent="ev => onEdit(project.id, ev)">
            Edit <t t-out="project.name"/>
          </a>
        </t>
      </div>`);
    });

    test("t-on with empty handler (only modifiers)", () => {
      snapshotTemplate(`<div>
        <button t-on-click.prevent="">Button</button>
      </div>`);
    });

    test("t-on combined with t-out", () => {
      snapshotTemplate(`<div><button t-on-click="onClick" t-out="html"/></div>`);
    });

    test("t-on with .capture modifier", () => {
      snapshotTemplate(`<div t-on-click.capture="onCapture">
        <button t-on-click="doSomething">Button</button>
      </div>`);
    });

    test("t-on with .passive modifier", () => {
      snapshotTemplate(`<button t-on-click.passive="this.onClick">Button</button>`);
    });

    test("t-on with .passive and .capture modifiers", () => {
      snapshotTemplate(`<div t-on-click.passive.capture="this.onClick">
        <button>Button</button>
      </div>`);
    });
  });

  describe("t-on modifiers (synthetic listener)", () => {
    test("basic support for synthetic", () => {
      snapshotTemplate(`<div t-on-click.synthetic="divClicked">
        <button t-on-click.synthetic="btnClicked">Button</button>
      </div>`);
    });
  });
});
