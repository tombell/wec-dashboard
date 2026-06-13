import { FastifyInstance } from "fastify";
import { getDB } from "../db.js";
import type { CarEntry } from "../types.js";

export default async function entriesRoutes(fastify: FastifyInstance) {
  fastify.get("/api/entries", async (request, reply) => {
    try {
      const db = getDB();
      const { category, sort_by, limit: limitStr } = request.query as Record<
        string,
        string | undefined
      >;
      const sortBy = sort_by ?? "ranking";
      const limit = Math.min(parseInt(limitStr ?? "100", 10) || 100, 500);

      const query: Record<string, unknown> = { _type: "entry" };
      if (category) query.category = category.toUpperCase();

      const allowed = new Set([
        "ranking",
        "categoryPosition",
        "lap",
        "pitstop",
      ]);
      const sortField = allowed.has(sortBy) ? sortBy : "ranking";

      const entries = await db
        .collection<CarEntry>("entries")
        .find(query, {
          projection: {
            _id: 0,
            _type: 0,
            _last_updated: 0,
            _ingested_at: 0,
          },
          sort: { [sortField]: 1 },
          limit,
        })
        .toArray();

      const categories = await db
        .collection<CarEntry>("entries")
        .distinct("category", query);

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
        const db = getDB();
        const entryId = parseInt(request.params.id, 10);
        if (isNaN(entryId)) {
          return reply.code(400).send({ error: "Invalid entry ID" });
        }

        const entry = await db
          .collection<CarEntry>("entries")
          .findOne(
            { id: entryId },
            { projection: { _id: 0, _type: 0, drivers: 0 } },
          );

        if (!entry) {
          return reply.code(404).send({ error: "Entry not found" });
        }

        return entry;
      } catch (err) {
        console.error("[api] /api/entries/:id error:", err);
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );
}
