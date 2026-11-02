"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");

const REMOVE_DIRECTORIES = new Set([
  ".next",
  "node_modules",
  "dist",
  "build",
  ".turbo",
  "coverage",
  ".cache",
  ".parcel-cache",
  ".vite",
]);

const SKIP_DIRECTORIES = new Set([
  ".git",
]);

let deletedCount = 0;
let errorCount = 0;

function relativePath(target) {
  return path.relative(ROOT, target) || ".";
}

async function removeDirectory(target) {
  try {
    console.log(`[DELETE] ${relativePath(target)}`);

    await fs.promises.rm(target, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });

    deletedCount++;
  } catch (error) {
    errorCount++;
    console.error(
      `[ERROR] Could not delete ${relativePath(target)}: ${error.message}`
    );
  }
}

async function scan(directory) {
  let entries;

  try {
    entries = await fs.promises.readdir(directory, {
      withFileTypes: true,
    });
  } catch (error) {
    errorCount++;
    console.error(
      `[ERROR] Could not read ${relativePath(directory)}: ${error.message}`
    );
    return;
  }

  const tasks = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink() || !entry.isDirectory()) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (SKIP_DIRECTORIES.has(entry.name)) {
      continue;
    }

    if (REMOVE_DIRECTORIES.has(entry.name)) {
      tasks.push(removeDirectory(fullPath));
      continue;
    }

    tasks.push(scan(fullPath));
  }

  await Promise.all(tasks);
}

async function main() {
  const startTime = performance.now();

  console.log("\n========================================");
  console.log("  CLEANING GENERATED PROJECT FILES");
  console.log("========================================");
  console.log(`Root: ${ROOT}\n`);

  await scan(ROOT);

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);

  console.log("\n========================================");
  console.log(`Deleted directories: ${deletedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Completed in: ${duration}s`);
  console.log("========================================\n");

  if (errorCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("\n[FATAL]", error);
  process.exitCode = 1;
});