import { FastifyInstance } from "fastify";
import { getRedis } from "../db.js";
import type { CarEntry } from "../types.js";

export default async function entriesRoutes(fastify: FastifyInstance) {
  fastify.get("/api/entries", async (request, reply) => {
    try {
      const redis = getRedis();
      const { category, sort_by, limit: limitStr } = request.query as Record<
        string,
        string | undefined
      >;
      const sortBy = sort_by ?? "ranking";
      const limit = Math.min(parseInt(limitStr ?? "100", 10) || 100, 500);

      // Get all entries from the hash
      const rawMap = await redis.hgetall("wec:entries");
      let entries: CarEntry[] = Object.values(rawMap).map((v) => JSON.parse(v));

      // Filter by category if specified
      if (category) {
        entries = entries.filter((e) => e.category === category.toUpperCase());
      }

      // Sort
      const allowed = new Set([
        "ranking",
        "categoryPosition",
        "lap",
        "pitstop",
      ]);
      const sortField = allowed.has(sortBy) ? (sortBy as keyof CarEntry) : "ranking" as keyof CarEntry;
      entries.sort((a, b) => {
        const av = a[sortField] ?? 0;
        const bv = b[sortField] ?? 0;
        return (av as number) - (bv as number);
      });

      // Limit
      entries = entries.slice(0, limit);

      // Extract distinct categories from the (now filtered) set
      const categories = [...new Set(entries.map((e) => e.category))];

      // Strip internal fields
      entries = entries.map(({ _last_updated, _ingested_at, ...rest }) => rest as CarEntry);

      return {
        count: entries.length,
        categories,
        entries,
      };
    } catch (err) {
      console.error("[api] /api/entries error:", err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.get<{ Params: { id: string } }>(
    "/api/entries/:id",
    async (request, reply) => {
      try {
        const redis = getRedis();
        const entryId = parseInt(request.params.id, 10);
        if (isNaN(entryId)) {
          return reply.code(400).send({ error: "Invalid entry ID" });
        }

        const raw = await redis.hget("wec:entries", String(entryId));
        if (!raw) {
          return reply.code(404).send({ error: "Entry not found" });
        }

        const entry = JSON.parse(raw);
        // Strip internal fields and drivers
        const { _last_updated, _ingested_at, drivers, ...rest } = entry;
        return rest;
      } catch (err) {
        console.error("[api] /api/entries/:id error:", err);
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );
}
