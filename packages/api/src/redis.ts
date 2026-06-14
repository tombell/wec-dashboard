import Redis from "ioredis";

let redis: Redis | null = null;

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export function getRedis(): Redis {
  if (!redis) throw new Error("Redis not connected. Call connectRedis() first.");
  return redis;
}

export async function connectRedis(): Promise<void> {
  if (redis) return;
  redis = new Redis(REDIS_URL);
  console.log(`[wec-api] Connected to Redis at ${REDIS_URL.replace(/\/\/.*@/, "//****@")}`);
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    redis.disconnect();
    redis = null;
  }
}

/**
 * GET wec:current and parse as JSON.
 * Returns the full current state object or null.
 */
export async function getCurrentState<T = Record<string, unknown>>(): Promise<T | null> {
  const raw = await getRedis().get("wec:current");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.error("[redis] Failed to parse wec:current JSON");
    return null;
  }
}

/**
 * ZREVRANGE wec:sessions 0 19 WITHSCORES.
 * Returns the top 20 most recently seen sessions.
 */
export async function getSessions(limit = 20): Promise<Record<string, unknown>[]> {
  const results = await getRedis().zrevrange("wec:sessions", 0, limit - 1, "WITHSCORES");
  const sessions: Record<string, unknown>[] = [];
  // zrevrange with WITHSCORES returns [member1, score1, member2, score2, ...]
  for (let i = 0; i < results.length; i += 2) {
    const member = results[i];
    const score = results[i + 1];
    try {
      const parsed = JSON.parse(member);
      sessions.push(parsed);
    } catch {
      console.error("[redis] Failed to parse session member:", member);
    }
  }
  return sessions;
}

/**
 * LRANGE wec:snapshots:{sessionId} 0 limit-1.
 * Returns the most recent snapshots for a given session.
 */
export async function getSnapshots(sessionId: string | number, limit = 50): Promise<Record<string, unknown>[]> {
  const key = `wec:snapshots:${sessionId}`;
  const raw = await getRedis().lrange(key, 0, limit - 1);
  return raw
    .map((item) => {
      try {
        return JSON.parse(item) as Record<string, unknown>;
      } catch {
        console.error(`[redis] Failed to parse snapshot in ${key}`);
        return null;
      }
    })
    .filter((s): s is Record<string, unknown> => s !== null);
}
