import Redis from "ioredis";

import type { RawData } from "./types.js";

const DATA_URL = "https://storage.googleapis.com/ecm-prod/live/WEC/data.json";
const POLL_INTERVAL_MS = 3_000;
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

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

function isLive(data: RawData | null): boolean {
  if (!data) return false;
  const entries = data.entries ?? [];
  const params = data.params ?? {};
  return entries.length >= 10 && params.sessionId != null;
}

async function main() {
  console.log(`[ingestor] Connecting to Redis at ${REDIS_URL}`);
  const redis = new Redis(REDIS_URL);
  redis.on("error", (err) => console.error("[ingestor] Redis error:", err.message));
  await redis.ping();
  console.log("[ingestor] Connected to Redis");

  console.log(`[ingestor] Polling ${DATA_URL} every ${POLL_INTERVAL_MS}ms`);

  let consecutiveStale = 0;

  while (running) {
    const data = await fetchData();
    pollCount++;

    if (data && isLive(data)) {
      consecutiveStale = 0;
      const now = new Date().toISOString();
      const { params, entries } = data;

      // Dedup: skip if params unchanged (happens between poll cycles)
      const paramsJson = JSON.stringify(data.params, Object.keys(data.params).toSorted());
      if (paramsJson === lastParamsJson && pollCount > 5) continue;
      lastParamsJson = paramsJson;

      // 1. Current state (latest blob)
      const state = { updated_at: now, poll: pollCount, params, entries };
      await redis.set("wec:current", JSON.stringify(state));

      // 2. Per-car entries — removed: they live inside wec:current as the entries array

      // 3. Session snapshot
      const sessionId = params.sessionId;
      if (sessionId != null) {
        const snapshot = { ingested_at: now, poll: pollCount, params, entries };
        const snapshotKey = `wec:snapshots:${sessionId}`;
        await redis.lpush(snapshotKey, JSON.stringify(snapshot));
        await redis.ltrim(snapshotKey, 0, 199);

        // 4. Session metadata
        const existingFirstSeen = await redis.hget("wec:sessions:first_seen", String(sessionId));
        const firstSeen = existingFirstSeen ?? now;
        if (!existingFirstSeen) {
          await redis.hset("wec:sessions:first_seen", String(sessionId), now);
        }
        const sessionMember = JSON.stringify({
          session_id: sessionId,
          event_name: params.sessionName ?? "unknown",
          first_seen: firstSeen,
          last_seen: now,
        });
        await redis.zadd("wec:sessions", Date.now(), sessionMember);
      }

      const elapsed = params.elapsedTime ?? 0;
      console.log(
        `[ingestor] Snapshot ${pollCount} | ${params.sessionName ?? "Race"} | ${entries.length} cars | ${elapsedStr(elapsed)} elapsed`,
      );
    } else {
      consecutiveStale++;
      if (consecutiveStale === 1) {
        console.log("[ingestor] No live session. Idle polling...");
      }
    }

    // Sleep in 100ms increments so we can catch signals
    for (let i = 0; i < 30 && running; i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  await redis.quit();
  console.log(`[ingestor] Stopped. ${pollCount} polls.`);
}

main().catch((err) => {
  console.error("[ingestor] Fatal error:", err);
  process.exit(1);
});
