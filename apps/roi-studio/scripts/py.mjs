#!/usr/bin/env node
// Runs its arguments with ROI Studio's Python so pnpm/turbo scripts work on
// every platform: the local .venv when present, otherwise python on PATH.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const candidates = [
  join(root, ".venv", "Scripts", "python.exe"),
  join(root, ".venv", "bin", "python3"),
  join(root, ".venv", "bin", "python"),
].filter((path) => existsSync(path));
candidates.push(...(process.platform === "win32" ? ["python", "py"] : ["python3", "python"]));

const args = process.argv.slice(2);
for (const python of candidates) {
  const result = spawnSync(python, args, { cwd: root, stdio: "inherit" });
  if (result.error?.code === "ENOENT") continue;
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

console.error(
  "ROI Studio: no Python interpreter found. Install Python 3.9+ and run `pnpm --filter roi-studio setup`.",
);
process.exit(1);
