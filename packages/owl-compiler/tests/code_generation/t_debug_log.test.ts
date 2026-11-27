import { getConsoleOutput, snapshotTemplate } from "../helpers";

describe("debugging", () => {
  test("t-debug", () => {
    snapshotTemplate(`<div t-debug=""><t t-if="true"><span t-debug="">hey</span></t></div>`);
    expect(getConsoleOutput()).toHaveLength(1);
  });

  test("t-debug on sub template", () => {
    snapshotTemplate(`<p t-debug="">coucou</p>`);
    snapshotTemplate(`<div><t t-call="sub"/></div>`);
    expect(getConsoleOutput()).toHaveLength(1);
  });

  test("t-log", () => {
    snapshotTemplate(`<div>
            <t t-set="foo" t-value="42"/>
            <t t-log="foo + 3"/>
          </div>`);
  });

  test("t-log: interaction with t-set", () => {
    snapshotTemplate(`
      <t>
        <t t-log="foo" t-set="foo" t-value="42"/>
        <t t-log="bar" t-set="bar" t-value="49"/>
        <span t-out="foo + bar"/>
      </t>
    `);
  });

  test("t-debug: interaction with t-set", () => {
    snapshotTemplate(`
      <t>
        <t t-debug="" t-set="foo" t-value="42"/>
        <t t-debug="" t-set="bar" t-value="49"/>
        <span t-out="foo + bar"/>
      </t>
    `);
  });
});
