import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const sourceRoot = path.join(
  projectRoot,
  "node_modules",
  "cesium",
  "Build",
  "Cesium"
);
const targetRoot = path.join(projectRoot, "public", "Cesium");
const directories = ["Workers", "ThirdParty", "Assets", "Widgets"];
const files = ["Cesium.js", "Cesium.js.map", "Cesium.d.ts"];

if (!existsSync(sourceRoot)) {
  throw new Error(`Cesium build output not found at ${sourceRoot}`);
}

rmSync(targetRoot, { force: true, recursive: true });
mkdirSync(targetRoot, { recursive: true });

for (const directory of directories) {
  cpSync(path.join(sourceRoot, directory), path.join(targetRoot, directory), {
    recursive: true,
  });
}

for (const file of files) {
  const sourcePath = path.join(sourceRoot, file);
  if (existsSync(sourcePath)) {
    cpSync(sourcePath, path.join(targetRoot, file));
  }
}

console.log(`Copied Cesium assets to ${targetRoot}`);