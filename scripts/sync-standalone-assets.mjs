import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const nextDir = path.join(root, ".next");
const standaloneDir = path.join(nextDir, "standalone");
const standaloneNextDir = path.join(standaloneDir, ".next");
const sourceStaticDir = path.join(nextDir, "static");
const targetStaticDir = path.join(standaloneNextDir, "static");
const sourcePublicDir = path.join(root, "public");
const targetPublicDir = path.join(standaloneDir, "public");

function ensureDir(directoryPath) {
  mkdirSync(directoryPath, { recursive: true });
}

function emptyDir(directoryPath) {
  if (!existsSync(directoryPath)) {
    return;
  }

  for (const entry of readdirSync(directoryPath)) {
    rmSync(path.join(directoryPath, entry), { recursive: true, force: true });
  }
}

if (!existsSync(standaloneDir)) {
  console.error("Standalone build nao encontrado. Rode `npm run build` primeiro.");
  process.exit(1);
}

ensureDir(targetStaticDir);
emptyDir(targetStaticDir);
for (const entry of readdirSync(sourceStaticDir)) {
  cpSync(path.join(sourceStaticDir, entry), path.join(targetStaticDir, entry), { recursive: true });
}

ensureDir(targetPublicDir);
emptyDir(targetPublicDir);
if (existsSync(sourcePublicDir)) {
  for (const entry of readdirSync(sourcePublicDir)) {
    cpSync(path.join(sourcePublicDir, entry), path.join(targetPublicDir, entry), { recursive: true });
  }
}

console.log("Standalone assets sincronizados.");
