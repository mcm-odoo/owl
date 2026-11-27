import { snapshotTemplate } from "../helpers";

describe("properly support svg", () => {
  test("add proper namespace to svg", () => {
    snapshotTemplate(
      `<svg width="100px" height="90px"><circle cx="50" cy="50" r="4" stroke="green" stroke-width="1" fill="yellow"/> </svg>`
    );
  });

  test("add proper namespace to g tags", () => {
    snapshotTemplate(
      `<g><circle cx="50" cy="50" r="4" stroke="green" stroke-width="1" fill="yellow"/> </g>`
    );
  });

  test("namespace to g tags not added if already in svg namespace", () => {
    snapshotTemplate(`<svg><g/></svg>`);
  });

  test("namespace to svg tags added even if already in svg namespace", () => {
    snapshotTemplate(`<svg><svg/></svg>`);
  });

  test("svg namespace added to sub-blocks", () => {
    snapshotTemplate(`<svg><path t-if="path"/></svg>`);
  });

  test("svg namespace added to sub templates if root tag is path", () => {
    snapshotTemplate(`<t t-name="svg"><svg><t t-call="path"/></svg></t>`);
    snapshotTemplate(`<t t-name="path"><path/></t>`);
  });

  test("svg creates new block if it is within html", () => {
    snapshotTemplate(`
        <div>
          <svg>
            <polygon fill="#000000" points="0 0 4 4 8 0" transform="translate(5 7)"/>
          </svg>
        </div>
      `);
  });

  test("svg creates new block if it is within html -- 2", () => {
    snapshotTemplate(`
        <div>
          <svg>
            <polygon fill="#000000" points="0 0 4 4 8 0" transform="translate(5 7)"/>
            <path t-if="this.hasPath" />
          </svg>
        </div>
      `);
  });
});
