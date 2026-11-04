const net = require("node:net");
const { spawn, spawnSync } = require("node:child_process");
const process = require("node:process");

const host = process.env.REDIS_HOST || "127.0.0.1";
const port = Number(process.env.REDIS_PORT || 6379);
const timeoutMs = 15_000;

function canConnect() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (available) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(available);
    };
    socket.setTimeout(700);
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForRedis() {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await canConnect()) return true;
    await sleep(300);
  }
  return false;
}

function tryStartMemurai() {
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "if (Get-Service -Name 'Memurai' -ErrorAction SilentlyContinue) { Start-Service -Name 'Memurai' -ErrorAction Stop; exit 0 } else { exit 3 }",
    ],
    { stdio: "ignore", windowsHide: true },
  );
  return !result.error && result.status === 0;
}

function tryStartRedisInWsl() {
  const result = spawnSync(
    "wsl.exe",
    [
      "sh",
      "-lc",
      "command -v redis-server >/dev/null 2>&1 || exit 3; redis-server --port " +
        String(port) +
        " --bind 127.0.0.1 --daemonize yes",
    ],
    { stdio: "ignore", windowsHide: true, timeout: 10_000 },
  );
  return !result.error && result.status === 0;
}

function tryStartRedisBinary() {
  // Windows Redis-compatible builds may not support --daemonize, so detach the process.
  const args = ["--port", String(port), "--bind", host];
  if (process.platform !== "win32") args.push("--daemonize", "yes");

  return new Promise((resolve) => {
    const child = spawn("redis-server", args, {
      stdio: "ignore",
      windowsHide: true,
      detached: process.platform === "win32",
    });

    // Handle ENOENT and other startup errors explicitly instead of crashing Node.
    child.once("error", () => resolve(false));
    child.once("spawn", () => {
      if (process.platform === "win32") child.unref();
      resolve(true);
    });
  });
}

async function main() {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("REDIS_PORT must be an integer between 1 and 65535.");
  }

  if (await canConnect()) {
    console.info(`Redis is already available at ${host}:${port}`);
    return;
  }

  let started = false;

  if (process.platform === "win32") {
    // Prefer a managed Windows service, then a Redis-compatible executable, then WSL.
    started = tryStartMemurai();

    if (!started) {
      started = await tryStartRedisBinary();
    }

    if (!started) {
      started = tryStartRedisInWsl();
    }
  } else {
    // Prefer the systemd-managed service on Linux; otherwise start redis-server directly.
    if (process.platform === "linux") {
      const service = spawnSync("systemctl", ["start", "redis-server"], {
        stdio: "ignore",
      });
      started = !service.error && service.status === 0;
    }

    if (!started) {
      started = await tryStartRedisBinary();
    }
  }

  if (!started) {
    console.warn(
      process.platform === "win32"
        ? "Redis is unavailable. Continuing without the optional cache. To enable it, install Memurai, a compatible redis-server executable, or Redis inside WSL. Docker is not used."
        : "Redis is unavailable. Continuing without the optional cache. On Ubuntu, install it with 'sudo apt install redis-server' and enable it with 'sudo systemctl enable --now redis-server'. Docker is not used.",
    );
    return;
  }

  if (!(await waitForRedis())) {
    console.warn(
      `Redis did not become available at ${host}:${port} within ${timeoutMs}ms. Continuing without the optional cache.`,
    );
    return;
  }

  console.info(`Redis is ready at ${host}:${port}`);
}

main().catch((error) => {
  console.error("Failed to start Redis:", error);
  process.exitCode = 1;
});
