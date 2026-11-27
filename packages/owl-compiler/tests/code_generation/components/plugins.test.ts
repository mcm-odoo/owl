import { snapshotTemplate } from "../../helpers";

test("basic use", () => {
  snapshotTemplate(`<t t-out="this.a.value"/>`);
});

test("a global plugin can import the current app", () => {
  snapshotTemplate(`coucou`);
});

test("components can start plugins", () => {
  snapshotTemplate(`<t t-out="this.a.value"/> - <t t-out="this.b.value"/>`);
});

test("components start plugins at their level", () => {
  snapshotTemplate(`1 | <Level2/>`);
  snapshotTemplate(`2: <t t-out="this.a.value"/> | <Level3/>`);
  snapshotTemplate(`3: <t t-out="this.a.value"/> - <t t-out="this.b.value"/>`);
});

test("components can give config to plugins", () => {
  snapshotTemplate(`<t t-out="this.a.inputA"/>-<t t-out="this.b.inputB"/>`);
});

test("plugin config are validated", () => {
  snapshotTemplate(`<t t-out="this.a.inputA"/>`, { dev: true });
});

test("shadow plugin", () => {
  snapshotTemplate(`<t t-out="this.a.value"/> | <Level2/>`);
  snapshotTemplate(`<Level3/>`);
});

test("components can register resources", () => {
  snapshotTemplate(`2: <t t-out="this.a.value()"/> `);
});

test("components, plugins, useEffect", () => {
  snapshotTemplate(`
      <t t-out="this.value()"/>
      <t t-out="this.derived()"/>`);
});

test("components mounted by plugin", () => {
  snapshotTemplate(`<t t-out="this.p.value"/>`);
});
