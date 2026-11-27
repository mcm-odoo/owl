import { snapshotTemplate } from "../../helpers";

describe("basics", () => {
  test("reads the named prop", () => {
    snapshotTemplate(`<div><Child value="42"/></div>`);
  });

  test("default value when prop is absent", () => {
    snapshotTemplate(`<span><t t-out="this.label"/></span>`);
  });

  test("provided value takes precedence over default", () => {
    snapshotTemplate(`<div><Child label="'hello'"/></div>`);
  });

  test("multiple prop fields in same component", () => {
    snapshotTemplate(`<div><Child a="'x'" b="2"/></div>`);
    snapshotTemplate(`<span><t t-out="this.a"/>/<t t-out="this.b"/></span>`);
  });

  test("can be mixed with useProps()", () => {
    snapshotTemplate(`<div><Child main="7" extra="'side'"/></div>`);
    snapshotTemplate(`<span><t t-out="this.all.extra"/>/<t t-out="this.main"/></span>`);
  });

  test("type argument is optional (accepts any value)", () => {
    snapshotTemplate(`<div><Child value="'anything'"/></div>`, { dev: true });
  });

  test("prop accepts instanceOf type", () => {
    snapshotTemplate(`<div><Child todo="this.myTodo"/></div>`);
    snapshotTemplate(`<span><t t-out="this.todo.name"/></span>`);
  });
});

describe("dev mode", () => {
  test("validates initial type on mount (child component)", () => {
    snapshotTemplate(`<Child value="'not-a-number'"/>`, { dev: true });
  });

  test("throws if prop reference changes on re-render", () => {
    snapshotTemplate(`<Child todo="this.state.todo"/>`, { dev: true });
  });

  test("does not throw if signal reference is stable across re-renders", () => {
    snapshotTemplate(`<Child todo="this.todoSig"/>`, { dev: true });
  });

  test("default value skips validation when prop is absent", () => {
    snapshotTemplate(`<div t-out="this.label"/>`, { dev: true });
  });
});
