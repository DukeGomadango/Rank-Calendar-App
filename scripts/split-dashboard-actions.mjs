import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const actionsPath = path.join(
  root,
  "src/app/(dashboard)/dashboard/actions.ts"
);
const outDir = path.join(root, "src/app/(dashboard)/dashboard/actions");

const lines = fs.readFileSync(actionsPath, "utf8").split(/\r?\n/);
function slice(a, b) {
  return lines.slice(a - 1, b).join("\n");
}

const schedBody = slice(118, 507);
const entryBody =
  slice(36, 116) +
  "\n\n" +
  slice(513, 703) +
  "\n\n" +
  slice(708, 728) +
  "\n\n" +
  slice(733, 764);
const rankBody = slice(767, 790) + "\n\n" + slice(795, 860);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "_sched_body.txt"), schedBody);
fs.writeFileSync(path.join(outDir, "_entry_body.txt"), entryBody);
fs.writeFileSync(path.join(outDir, "_rank_body.txt"), rankBody);
console.log("written", schedBody.length, entryBody.length, rankBody.length);
