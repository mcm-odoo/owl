import { snapshotTemplate } from "../helpers";

describe("white space handling", () => {
  test("white space only text nodes are condensed into a single space", () => {
    snapshotTemplate(`<div>  </div>`);
  });

  test("consecutives whitespaces are condensed into a single space", () => {
    snapshotTemplate(`<div>  abc  </div>`);
  });

  test("whitespace only text nodes with newlines are removed", () => {
    snapshotTemplate(`<div>
          <span>abc</span>
        </div>`);
  });

  test("nothing is done in pre tags", () => {
    snapshotTemplate(`<pre>   </pre>`);
    snapshotTemplate(`<pre>
          some text
        </pre>`);
    snapshotTemplate(`<pre>
          
        </pre>`);
  });

  test("pre inside a div with a new line", () => {
    snapshotTemplate(`<div><pre>SomeText</pre>
</div>`);
  });
});
