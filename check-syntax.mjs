import { readFileSync } from "node:fs";
import { transform } from "esbuild";

const files = ["src/Portal/Admin/12BulkData.jsx", "src/utils/bulkParser.js"];
let failed = false;
for (const f of files) {
  const code = readFileSync(f, "utf8");
  try {
    await transform(code, { jsx: "automatic" });
    console.log(f + ": OK");
  } catch (e) {
    console.log(f + ": ERROR " + e.message);
    failed = true;
  }
}
if (failed) process.exitCode = 1;

