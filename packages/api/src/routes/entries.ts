import { FastifyInstance } from "fastify";

import { getCurrentState } from "../redis.js";

export default async function entriesRoutes(fastify: FastifyInstance) {
  fastify.get("/api/entries", async (request, reply) => {
    try {
      const {
        category,
        sort_by,
        limit: limitStr,
      } = request.query as Record<string, string | undefined>;
      const sortBy = sort_by ?? "ranking";
      const limit = Math.min(parseInt(limitStr ?? "100", 10) || 100, 500);

      const state = await getCurrentState<{
        entries: Record<string, unknown>[];
      }>();

      if (!state || !state.entries) {
        return { count: 0, categories: [], entries: [] };
      }

      let entries = state.entries;

      // Filter by category if provided
      if (category) {
        const cat = category.toUpperCase();
        entries = entries.filter((e) => (e.category as string)?.toUpperCase() === cat);
      }

      // Collect distinct categories
      const categories = [...new Set(state.entries.map((e) => e.category as string))].filter(
        Boolean,
      );

      // Sort by requested field
      const allowed = new Set(["ranking", "categoryPosition", "lap", "pitstop"]);
      const sortField = allowed.has(sortBy) ? sortBy : "ranking";
      entries = [...entries].toSorted((a, b) => {
        const va = (a[sortField] as number) ?? 0;
        const vb = (b[sortField] as number) ?? 0;
        return va - vb;
      });

      // Apply limit
      entries = entries.slice(0, limit);

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

  fastify.get<{ Params: { id: string } }>("/api/entries/:id", async (request, reply) => {
    try {
      const entryId = parseInt(request.params.id, 10);
      if (isNaN(entryId)) {
        return reply.code(400).send({ error: "Invalid entry ID" });
      }

      const state = await getCurrentState<{
        entries: Record<string, unknown>[];
      }>();

      if (!state || !state.entries) {
        return reply.code(404).send({ error: "Entry not found" });
      }

      const entry = state.entries.find((e) => (e.id as number) === entryId);

      if (!entry) {
        return reply.code(404).send({ error: "Entry not found" });
      }

      return entry;
    } catch (err) {
      console.error("[api] /api/entries/:id error:", err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}
