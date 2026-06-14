import { Redis } from "ioredis";
import type { RawData } from "./types.js";

const DATA_URL = "https://storage.googleapis.com/ecm-prod/live/WEC/data.json";
const POLL_INTERVAL_MS = 3_000;
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

const REDIS_KEY_CURRENT = "wec:current";
const REDIS_KEY_SNAPSHOTS_PREFIX = "wec:snapshots:";

let running = true;
let pollCount = 0;
let lastParamsJson = "";

function handleSignal() {
  running = false;
}

process.on("SIGINT", handleSignal);
process.on("SIGTERM", handleSignal);

async function fetchData(): Promise<RawData | null> {
  try {
    const resp = await fetch(DATA_URL, { signal: AbortSignal.timeout(10_000) });
    if (!resp.ok) {
      console.warn(`[ingestor] Fetch failed: HTTP ${resp.status}`);
      return null;
    }
    return (await resp.json()) as RawData;
  } catch (err) {
    console.warn("[ingestor] Fetch failed:", (err as Error).message);
    return null;
  }
}

function elapsedStr(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function storeSnapshot(redis: Redis, data: RawData): Promise<void> {
  // Dedup: skip if params unchanged (happens between poll cycles)
  const paramsJson = JSON.stringify(data.params, Object.keys(data.params).sort());
  if (paramsJson === lastParamsJson && pollCount > 5) return;
  lastParamsJson = paramsJson;

  const now = new Date().toISOString();
  const { params, entries } = data;

  // 1. Current state (latest blob) — replaces current_state upsert
  const currentState = {
    _type: "latest",
    updated_at: now,
    poll: pollCount,
    params,
    entries,
  };
  await redis.set(REDIS_KEY_CURRENT, JSON.stringify(currentState));

  // 2. Per-car entries (hash) — replaces entries collection
  const pipeline = redis.pipeline();
  for (const entry of entries) {
    pipeline.hset(
      "wec:entries",
      String(entry.id),
      JSON.stringify({
        ...entry,
        _last_updated: now,
        _ingested_at: now,
      }),
    );
  }
  if (entries.length > 0) {
    await pipeline.exec();
  }

  // 3. Session snapshot (list, prepend) — replaces snapshots insert
  const sessionId = params.sessionId;
  if (sessionId != null) {
    const snapshot = { ingested_at: now, poll: pollCount, params, entries };
    await redis.lpush(`${REDIS_KEY_SNAPSHOTS_PREFIX}${sessionId}`, JSON.stringify(snapshot));
    // Trim to keep only last 500 snapshots per session
    await redis.ltrim(`${REDIS_KEY_SNAPSHOTS_PREFIX}${sessionId}`, 0, 499);

    // 4. Session metadata (hash) — replaces sessions upsert
    await redis.hset("wec:sessions", String(sessionId), JSON.stringify({
      session_id: sessionId,
      event_name: params.sessionName ?? "unknown",
      first_seen: now,
      last_seen: now,
      last_params: params,
    }));
  }

  const elapsed = params.elapsedTime ?? 0;
  console.log(
    `[ingestor] Snapshot ${pollCount} | ${params.sessionName ?? "Race"} | ${entries.length} cars | ${elapsedStr(elapsed)} elapsed`,
  );
}

function isLive(data: RawData | null): boolean {
  if (!data) return false;
  const entries = data.entries ?? [];
  const params = data.params ?? {};
  return entries.length >= 10 && params.sessionId != null;
}

async function main() {
  console.log(`[ingestor] Connecting to Redis at ${REDIS_URL}`);
  const redis = new Redis(REDIS_URL);

  redis.on("error", (err) => {
    console.error("[ingestor] Redis error:", err.message);
  });

  await redis.ping();
  console.log(`[ingestor] Polling ${DATA_URL} every ${POLL_INTERVAL_MS}ms`);

  let consecutiveStale = 0;

  while (running) {
    const data = await fetchData();
    pollCount++;

    if (data) {
      if (isLive(data)) {
        await storeSnapshot(redis, data);
        consecutiveStale = 0;
      } else {
        consecutiveStale++;
        if (consecutiveStale === 1) {
          console.log("[ingestor] No live session. Idle polling...");
        }
      }
    } else {
      consecutiveStale++;
    }

    // Sleep in 100ms increments so we can catch signals
    for (let i = 0; i < 30 && running; i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  redis.disconnect();
  console.log(`[ingestor] Stopped. ${pollCount} polls.`);
}

main().catch((err) => {
  console.error("[ingestor] Fatal error:", err);
  process.exit(1);
});
