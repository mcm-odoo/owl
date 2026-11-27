import { snapshotTemplate } from "../../helpers";

describe("basics", () => {
  test("no component catching error lead to full app destruction", () => {
    snapshotTemplate(`<div><ErrorComponent flag="this.state.flag"/></div>`);
    snapshotTemplate(`<div>hey<t t-out="this.props.flag and this.state.this.will.crash"/></div>`);
  });

  test("display a nice error if it cannot find component", () => {
    snapshotTemplate(`<SomeMispelledComponent />`);
  });

  test("display a nice error if a component is not a component", () => {
    snapshotTemplate(`<SomeComponent />`);
  });

  test("display a nice error if the components key is missing with subcomponents", () => {
    snapshotTemplate(`<div><MissingChild /></div>`);
  });

  test("a sync re-render error deep in the tree is only wrapped once", () => {
    snapshotTemplate(`<Parent flag="this.state.flag"/>`);
    snapshotTemplate(`<Child flag="this.props.flag"/>`);
    snapshotTemplate(`<div><t t-out="this.props.flag and this.state.this.will.crash"/></div>`);
  });

  test("simple catchError", () => {
    snapshotTemplate(`
        <div>
          <t t-if="this.error">Error</t>
          <t t-else="">
            <Boom />
          </t>
        </div>`);
    snapshotTemplate(`<div t-out="a.b.c"/>`);
  });

  test("render from above on error -- handler is not a Root or MountFiber", () => {
    snapshotTemplate(`<Parent />`);
    snapshotTemplate(`
        <div>
          <t t-if="this.error">Error</t>
          <t t-else="">
            <Boom onError.bind="this.handleError"/>
          </t>
        </div>`);
  });
});

describe("errors and promises", () => {
  test("a rendering error will reject the mount promise", () => {
    snapshotTemplate(`<div><t t-out="this.will.crash"/></div>`);
  });

  test("an error in mounted call will reject the mount promise", () => {
    snapshotTemplate(`<div>abc</div>`);
  });

  test("an error in willPatch call will reject the render promise", () => {
    snapshotTemplate(`<div><t t-out="this.val"/></div>`, { dev: true });
  });

  test("a rendering error will reject the render promise", () => {
    snapshotTemplate(`<div><t t-if="this.flag" t-out="this.will.crash"/></div>`);
  });

  test("a rendering error will reject the render promise (with sub components)", () => {
    snapshotTemplate(`<div><Child/><t t-out="x.y"/></div>`);
    snapshotTemplate(`<span></span>`);
  });

  test("errors in rerender", () => {
    snapshotTemplate(`<div t-out="this.state.a.b"/>`);
  });
});

describe("can catch errors", () => {
  test("can catch an error in a component render function", () => {
    snapshotTemplate(`
          <div>
            <ErrorBoundary><ErrorComponent flag="this.state.flag"/></ErrorBoundary>
          </div>`);
    snapshotTemplate(`
          <div>
            <t t-if="this.state.error">Error handled</t>
            <t t-else=""><t t-call-slot="default" /></t>
          </div>`);
  });

  test("can catch an error in onmounted", () => {
    snapshotTemplate(`Main<t t-if="this.state.ok" t-component="this.component"/>`);
    snapshotTemplate(`<div>Error!!!</div>`);
    snapshotTemplate(`<div>perfect</div>`);
  });

  test("calling a hook outside setup should crash", () => {
    snapshotTemplate(`<t t-out="this.state.value"/>`, { dev: true });
  });

  test("can catch an error in the initial call of a component render function (parent mounted)", () => {
    snapshotTemplate(`
          <div>
              <ErrorBoundary><ErrorComponent /></ErrorBoundary>
          </div>`);
    snapshotTemplate(`<div>hey<t t-out="this.state.this.will.crash"/></div>`);
  });

  test("can catch an error in the initial call of a component render function (parent updated)", () => {
    snapshotTemplate(`
          <div>
              <ErrorBoundary t-if="this.state.flag"><ErrorComponent /></ErrorBoundary>
          </div>`);
  });

  test("can catch an error in the constructor call of a component render function", () => {
    snapshotTemplate(`<div>Some text</div>`);
  });

  test("can catch an error in the constructor call of a component render function 2", () => {
    snapshotTemplate(`<div>
              <ErrorBoundary><ClassicCompoent/><ErrorComponent /></ErrorBoundary>
          </div>`);
    snapshotTemplate(`<div>classic</div>`);
  });

  test("can catch an error in the mounted call (in root component)", () => {
    snapshotTemplate(`<div>
       <t t-if="this.state.error">Error handled</t>
       <t t-else=""><ErrorComponent /></t>
      </div>`);
  });

  test("can catch an error in the mounted call (in child of child)", () => {
    snapshotTemplate(`<div><C/></div>`);
    snapshotTemplate(`<div>
       <t t-if="this.state.error">Error handled</t>
       <t t-else=""><Boom/></t>
      </div>`);
  });

  test("error in mounted on a component with a sibling (properly mounted)", () => {
    snapshotTemplate(`<div>
        <OK/>
        <ErrorBoundary><ErrorComponent /></ErrorBoundary>
      </div>`);
    snapshotTemplate(`OK`);
  });

  test("can catch an error in the willPatch call", () => {
    snapshotTemplate(`
          <div>
              <span><t t-out="this.state.message"/></span>
            <ErrorBoundary><ErrorComponent message="this.state.message" /></ErrorBoundary>
          </div>`);
    snapshotTemplate(`<div><t t-out="this.props.message"/></div>`);
  });

  test("catchError in catchError", () => {
    snapshotTemplate(`
        <div>
          <t t-if="this.error">Error</t>
          <t t-else="">
            <Child />
          </t>
        </div>`);
    snapshotTemplate(`
        <div>
          <Boom />
        </div>`);
  });

  test("onError in class inheritance is not called if no rethrown", () => {
    snapshotTemplate(`<Concrete />`);
    snapshotTemplate(`<div>
          <t t-if="!this.state.error">
            <t t-out="this.will.crash" />
          </t>
          <t t-else="">
            <t t-out="this.state.error"/>
          </t>
        </div>`);
  });

  test("catching error, rethrow, render parent  -- a main component loop implementation", () => {
    snapshotTemplate(`
        <t t-foreach="Object.values(this.state.cps)" t-as="cp" t-key="cp.id">
          <ErrorHandler onError="() => this.cleanUp(cp.id)">
              <t t-component="cp.Comp" />
            </ErrorHandler>
        </t>`);
    snapshotTemplate(`<t t-call-slot="default" />`);
    snapshotTemplate(`<ErrorComponent />`);
    snapshotTemplate(`<div>Sibling</div>`);
  });

  test("catching in child makes parent render", () => {
    snapshotTemplate(`
        <t t-foreach="Object.entries(this.elements)" t-as="elem" t-key="elem[0]">
          <Catch onError="(error) => this.onError(elem[0], error)">
            <t t-component="elem[1]" id="elem[0]" />
          </Catch>
        </t>
      `);
    snapshotTemplate(`<div t-out="'Child ' + this.props.id" />`);
  });

  test("an error in onWillDestroy", () => {
    snapshotTemplate(`
        <t t-out="this.state.value"/>
        <t t-if="this.state.hasChild"><Child/></t>`);
  });

  test("error in onMounted, graceful recovery", () => {
    snapshotTemplate(`<t t-component="this.component"/>`);
    snapshotTemplate(`parent<Child/><Boom/>`);
    snapshotTemplate(`abc`);
    snapshotTemplate(`boom`);
    snapshotTemplate(`def`);
  });

  test("error in onMounted, graceful recovery, variation", () => {
    snapshotTemplate(`R<t t-if="this.state.gogogo" t-component="this.component"/>`);
  });
});

describe("errors in onWillUpdateProps", () => {
  test("sync error in onWillUpdateProps is caught by parent onError", () => {
    snapshotTemplate(`<Child val="this.state.val"/>`, { dev: true });
  });
});
