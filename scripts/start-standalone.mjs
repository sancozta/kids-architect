import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const serverPath = path.join(root, ".next", "standalone", "server.js");

if (!existsSync(serverPath)) {
  console.error("Servidor standalone nao encontrado. Rode `npm run build` antes de iniciar.");
  process.exit(1);
}

const syncResult = spawn(process.execPath, [path.join(root, "scripts", "sync-standalone-assets.mjs")], {
  cwd: root,
  stdio: "inherit",
});

syncResult.on("exit", (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  const child = spawn(process.execPath, [serverPath], {
    cwd: path.dirname(serverPath),
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: process.env.PORT ?? "3000",
    },
  });

  child.on("exit", (childCode) => {
    process.exit(childCode ?? 0);
  });
});
