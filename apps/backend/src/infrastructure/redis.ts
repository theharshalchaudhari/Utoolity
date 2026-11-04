import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;
const required = process.env.REDIS_REQUIRED === "true";

export const redis = redisUrl
  ? createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy(retries) {
          return Math.min(retries * 250, 5_000);
        },
      },
    })
  : null;

if (redis) {
  redis.on("error", (error) => console.error("Redis client error:", error));
}

export async function connectRedis(): Promise<void> {
  if (!redis) {
    if (required || process.env.NODE_ENV === "production") {
      throw new Error("REDIS_URL is required for the configured backend runtime.");
    }
    return;
  }
  if (!redis.isOpen) await redis.connect();
}

export async function closeRedis(): Promise<void> {
  if (redis?.isOpen) await redis.quit();
}
