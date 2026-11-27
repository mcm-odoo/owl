import { snapshotTemplate } from "../../helpers";

describe("app", () => {
  test("can configure an app with props", () => {
    snapshotTemplate(`<div t-out="this.props.value"/>`);
  });

  test("can mount app in an iframe", () => {
    snapshotTemplate(`<div class="my-div"/>`);
  });

  test("app: clear scheduler tasks on destroy", () => {
    snapshotTemplate(`A<t t-if="this.state.value"><B/></t>`);
    snapshotTemplate(`B`);
  });

  test("destroying one root does not mount another pending root", () => {
    snapshotTemplate(`<span>A</span>`);
    snapshotTemplate(`<span>B</span>`);
  });

  test("deprecated template methods forward to the app's template set", () => {
    snapshotTemplate(`<div>hello</div>`);
  });

  test("can load templates from an object name-string", () => {
    snapshotTemplate(`<div class="hello">hello</div>`);
  });

  test("can mix string and precompiled templates in the templates config", () => {
    snapshotTemplate(`<div class="from-string">hi</div>`);
  });

  test("can call processTask twice in a row without crashing", () => {
    snapshotTemplate(`parent<Child/>`);
  });

  test("can add functions to the bdom", () => {
    snapshotTemplate(`<div t-on-click="() => __globals__.plop('click')" class="my-div"/>`, {
      hasGlobalValues: true,
    });
  });
});
