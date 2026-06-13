import { MongoClient, type Db } from "mongodb";
import type { RawData } from "./types.js";

const DATA_URL = "https://storage.googleapis.com/ecm-prod/live/WEC/data.json";
const POLL_INTERVAL_MS = 3_000;
const MONGO_URI = process.env.MONGO_CONNECTION_STRING ?? "mongodb://localhost:27017";
const DB_NAME = "wec-livetiming";

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

async function storeSnapshot(db: Db, data: RawData): Promise<void> {
  // Dedup: skip if params unchanged (happens between poll cycles)
  const paramsJson = JSON.stringify(data.params, Object.keys(data.params).sort());
  if (paramsJson === lastParamsJson && pollCount > 5) return;
  lastParamsJson = paramsJson;

  const now = new Date().toISOString();
  const { params, entries } = data;

  // 1. Raw snapshot
  await db.collection("snapshots").insertOne({
    ingested_at: now,
    poll: pollCount,
    params,
    entries,
  });

  // 2. Current state
  await db.collection("current_state").updateOne(
    { _type: "latest" },
    {
      $set: {
        _type: "latest",
        updated_at: now,
        poll: pollCount,
        params,
        entries,
      },
    },
    { upsert: true },
  );

  // 3. Per-car entries
  if (entries.length > 0) {
    const bulkOps = entries.map((entry) => ({
      updateOne: {
        filter: { _type: "entry", id: entry.id },
        update: {
          $set: {
            ...entry,
            _last_updated: now,
            _ingested_at: now,
          },
        },
        upsert: true,
      },
    }));
    await db.collection("entries").bulkWrite(bulkOps);
  }

  // 4. Session log
  const sessionId = params.sessionId;
  if (sessionId != null) {
    await db.collection("sessions").updateOne(
      { session_id: sessionId },
      {
        $set: {
          session_id: sessionId,
          event_name: params.sessionName ?? "unknown",
          last_seen: now,
          last_params: params,
        },
        $setOnInsert: { first_seen: now },
      },
      { upsert: true },
    );
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
  console.log(`[ingestor] Connecting to MongoDB at ${MONGO_URI}`);
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);

    // Ensure indexes
    await db.collection("snapshots").createIndexes([
      { key: { ingested_at: -1 } },
      { key: { poll: 1 } },
    ]);
    await db.collection("entries").createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { ranking: 1 } },
      { key: { category: 1, categoryPosition: 1 } },
    ]);
    await db.collection("sessions").createIndexes([
      { key: { session_id: 1 }, unique: true },
    ]);

    console.log(`[ingestor] Polling ${DATA_URL} every ${POLL_INTERVAL_MS}ms into DB '${DB_NAME}'`);

    let consecutiveStale = 0;

    while (running) {
      const data = await fetchData();
      pollCount++;

      if (data) {
        if (isLive(data)) {
          await storeSnapshot(db, data);
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
  } finally {
    await client.close();
    console.log(`[ingestor] Stopped. ${pollCount} polls.`);
  }
}

main().catch((err) => {
  console.error("[ingestor] Fatal error:", err);
  process.exit(1);
});
