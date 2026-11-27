import { snapshotTemplate } from "../../helpers";

describe("props validation", () => {
  test("validation is only done in dev mode", () => {
    snapshotTemplate(`<div><SubComp /></div>`, { dev: true });
  });

  test("validate simple types", () => {
    snapshotTemplate(`<div><SubComp p="this.p"/></div>`, { dev: true });
  });

  test("props are validated in dev mode (code snapshot)", () => {
    snapshotTemplate(`<div><Child message="1"/></div>`, { dev: true });
  });

  test("default values are applied before validating props at update", () => {
    snapshotTemplate(`<div><SubComp p="this.state.p"/></div>`, { dev: true });
    snapshotTemplate(`<div><t t-out="this.props.p"/></div>`, { dev: true });
  });

  test("additional props are allowed (array)", () => {
    snapshotTemplate(`<Child message="'m'" otherProp="'o'"/>`, { dev: true });
  });

  test("can validate through slots", () => {
    snapshotTemplate(`<Wrapper><Child /></Wrapper>`, { dev: true });
  });

  test("can use custom class as type", () => {
    snapshotTemplate(`<Child customObj="this.customObj" />`, { dev: true });
    snapshotTemplate(`<t t-out="this.props.customObj.val"/>`, { dev: true });
  });
});

describe("schema defaults", () => {
  test("schema defaults work next to optional props", () => {
    snapshotTemplate(`<div><t t-out="this.props.p"/>|<t t-out="this.props.q"/></div>`, {
      dev: true,
    });
  });

  test("falsy default values are applied", () => {
    snapshotTemplate(`<span><t t-if="this.props.p">hey</t><t t-if="!this.props.q">hey</t></span>`, {
      dev: true,
    });
  });

  test("factory defaults are resolved once per component instance", () => {
    snapshotTemplate(`<div><SubComp/><SubComp/></div>`, { dev: true });
    snapshotTemplate(`<div><t t-out="this.props.p.length"/></div>`, { dev: true });
  });
});

describe("schema.toShape()", () => {
  test("an object schema drives props via toShape()", () => {
    snapshotTemplate(`<div><SubComp title="'hello'"/></div>`, { dev: true });
    snapshotTemplate(`<div><t t-out="this.props.title"/></div>`, { dev: true });
  });

  test("a composed (t.and) schema drives props via toShape()", () => {
    snapshotTemplate(`<Notification message="'hello'" title="'DEBUG'"/>`, { dev: true });
    snapshotTemplate(`<h1/>`, { dev: true });
  });

  test("a schema's props still rejects invalid values", () => {
    snapshotTemplate(`<div><SubComp count="'not a number'"/></div>`, { dev: true });
  });

  test("a schema's props reports genuinely missing required keys", () => {
    snapshotTemplate(`<div><SubComp a="'x'"/></div>`, { dev: true });
  });

  test("applyDefaults completes nested defaults from the same schema", () => {
    snapshotTemplate(`<Notification message="'hi'" buttons="[{ name: 'ok' }]"/>`, { dev: true });
  });
});
