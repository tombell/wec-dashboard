import { Redis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let redis: Redis | null = null;

export async function connectDB(): Promise<Redis> {
  if (redis) return redis;
  redis = new Redis(REDIS_URL);
  redis.on("error", (err) => {
    console.error("[wec-api] Redis error:", err.message);
  });
  await redis.ping();
  console.log(`[wec-api] Connected to Redis at ${REDIS_URL}`);
  return redis;
}

export function getRedis(): Redis {
  if (!redis) throw new Error("Redis not connected. Call connectDB() first.");
  return redis;
}

export async function closeDB(): Promise<void> {
  if (redis) {
    redis.disconnect();
    redis = null;
  }
}
