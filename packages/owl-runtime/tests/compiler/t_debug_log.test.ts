import { renderToString, getConsoleOutput } from "../helpers";

// -----------------------------------------------------------------------------
// debugging
// -----------------------------------------------------------------------------

describe("debugging", () => {
  test("t-log", () => {
    const template = `<div>
            <t t-set="foo" t-value="42"/>
            <t t-log="foo + 3"/>
          </div>`;
    renderToString(template);
    expect(getConsoleOutput()).toEqual(["log:45"]);
  });

  test("t-log: interaction with t-set", () => {
    const template = `
      <t>
        <t t-log="foo" t-set="foo" t-value="42"/>
        <t t-log="bar" t-set="bar" t-value="49"/>
        <span t-out="foo + bar"/>
      </t>
    `;
    renderToString(template);
    expect(getConsoleOutput()).toEqual(["log:undefined", "log:undefined"]);
  });

  test("t-debug: interaction with t-set", () => {
    const template = `
      <t>
        <t t-debug="" t-set="foo" t-value="42"/>
        <t t-debug="" t-set="bar" t-value="49"/>
        <span t-out="foo + bar"/>
      </t>
    `;
    renderToString(template);
  });
});
