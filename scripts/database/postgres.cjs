"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { spawnSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "../..");
const envCandidates = [
  path.join(rootDir, "apps", "backend", ".env"),
  path.join(rootDir, ".env"),
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const result = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value;
  }
  return result;
}

function cleanInput(value) {
  let result = String(value ?? "").trim();
  if (result.length >= 2) {
    const first = result[0];
    const last = result[result.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'") || (first === "`" && last === "`")) {
      result = result.slice(1, -1).trim();
    }
  }
  return result;
}

function resolveSqlPath(input) {
  const cleaned = cleanInput(input);
  if (!cleaned) throw new Error("No SQL file path was provided.");
  const absolutePath = path.resolve(rootDir, cleaned);
  if (!fs.existsSync(absolutePath)) {
    throw new Error("SQL file not found: " + absolutePath);
  }
  if (!fs.statSync(absolutePath).isFile()) {
    throw new Error("The supplied path is not a file: " + absolutePath);
  }
  if (!/\.sql$/i.test(absolutePath)) {
    throw new Error("The file must have a .sql extension.");
  }
  return absolutePath;
}

function getDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  for (const envFile of envCandidates) {
    const value = parseEnvFile(envFile).DATABASE_URL;
    if (value?.trim()) return value.trim();
  }
  return "";
}

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

async function main() {
  const sqlInput = process.argv.slice(2).join(" ");
  const input = sqlInput || await ask("Enter SQL file path (Windows or Linux path):\n> ");
  await runSql(input);
}

async function runSql(input) {
  const sqlPath = resolveSqlPath(input);
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL was not found. Set it in your environment or add it to apps/backend/.env."
    );
  }

  console.log("\nSQL file: " + sqlPath);
  console.log("Database URL: configured (credentials hidden)");
  if (/reset_database\.sql$/i.test(sqlPath)) {
    console.warn("\nWARNING: This looks like a database reset script. It may delete data.");
    const answer = (await ask("Are you sure you want to run this reset script? Type y to continue or n to cancel [y/N]: ")).toLowerCase();
    if (answer !== "y" && answer !== "yes") {
      console.log("Reset cancelled. No SQL was executed.");
      return;
    }
  }

  const result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlPath], {
    stdio: "inherit",
    windowsHide: true,
  });

  if (result.error) {
    throw new Error(
      result.error.code === "ENOENT"
        ? "Could not find psql. Install PostgreSQL command-line tools and ensure psql is on PATH."
        : result.error.message
    );
  }
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    return;
  }
  console.log("\nSQL script completed successfully.");
}

main().catch((error) => {
  console.error("\nERROR: " + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
