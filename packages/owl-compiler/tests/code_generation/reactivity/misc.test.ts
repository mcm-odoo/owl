import { snapshotTemplate } from "../../helpers";

test("components and useEffect", () => {
  snapshotTemplate(`<t t-out="this.current()"/>`);
});
