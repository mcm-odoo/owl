import { snapshotTemplate } from "../helpers";

describe("t-key", () => {
  test("can use t-key directive on a node", () => {
    snapshotTemplate(`<div t-key="beer.id"><t t-out="beer.name"/></div>`);
  });

  test("can use t-key directive on a node as a function", () => {
    snapshotTemplate(`<div t-key="getKey(beer)"><t t-out="beer.name"/></div>`);
  });

  test("t-key directive in a list", () => {
    snapshotTemplate(`<ul>
        <li t-foreach="beers" t-as="beer" t-key="beer.id"><t t-out="beer.name"/></li>
       </ul>`);
  });

  test("t-key on sub dom node pushes a child block in its parent", () => {
    snapshotTemplate(`
      <div>
        <t t-if="hasSpan"><span /></t>
        <div t-key="key"><h1 /></div>
      </div>
    `);
    snapshotTemplate(`
        <div t-key="key"><h1 /></div>
    `);
  });

  test("t-key: interaction with t-out", () => {
    snapshotTemplate(`<p t-key="key" t-out="text"/>`);
  });
});
