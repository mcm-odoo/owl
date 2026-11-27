import { snapshotTemplate } from "../helpers";

test("changing an attribute with t-att-", () => {
  snapshotTemplate(`<div t-att-value="v"/>`);
});

test("dynamic input value: falsy values", () => {
  snapshotTemplate(`<input t-att-value="0"/>`);
  snapshotTemplate(`<input t-att-value="false"/>`);
  snapshotTemplate(`<input t-att-value="undefined"/>`);
  snapshotTemplate(`<input t-att-value="''"/>`);
});

test("updating property with falsy value", () => {
  snapshotTemplate(`<input t-att-value="v"></input>`);
});

test("input type= checkbox, with t-att-checked", () => {
  snapshotTemplate(`<input type="checkbox" t-att-checked="flag"/>`);
});

test("various boolean html attributes", () => {
  snapshotTemplate(`
      <div>
        <input type="checkbox" checked="checked"/>
        <input checked="checked"/>
        <div checked="checked"/>
        <div selected="selected"/>
        <option selected="selected" other="1"/>
        <input readonly="readonly"/>
        <button disabled="disabled"/>
      </div>
      `);
});

test("input with t-att-value", () => {
  snapshotTemplate(`<input  t-att-value="v"/>`);
});

test("input with t-att-value (patching with same value", () => {
  snapshotTemplate(`<input t-att-value="v"/>`);
});

test("input, type checkbox, with t-att-checked (patching with same value", () => {
  snapshotTemplate(`<input type="checkbox" t-att-checked="v"/>`);
});

test("input of type checkbox with t-att-indeterminate", () => {
  snapshotTemplate(`<input type="checkbox" t-att-indeterminate="v"/>`);
});

test("textarea with t-att-value", () => {
  snapshotTemplate(`<textarea t-att-value="v"/>`);
});

test("select with t-att-value", () => {
  snapshotTemplate(`
      <select t-att-value="value">
        <option value="potato">Potato</option>
        <option value="tomato">Tomato</option>
        <option value="onion">Onion</option>
      </select>`);
});

test("readonly and readOnly are both interpreted as the readOnly property", () => {
  snapshotTemplate(`<input readonly=""/>`);
  snapshotTemplate(`<input readOnly=""/>`);
  snapshotTemplate(`<input t-att-readonly="val"/>`);
  snapshotTemplate(`<input t-att-readOnly="val"/>`);
});
