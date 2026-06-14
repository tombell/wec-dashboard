import { FastifyInstance } from "fastify";
import { getDB } from "../db.js";

export default async function historyRoutes(fastify: FastifyInstance) {
  fastify.get("/api/history", async (request, reply) => {
    try {
      const db = getDB();
      const { session_id: sessionIdStr, limit: limitStr } = request.query as Record<
        string,
        string | undefined
      >;
      const sessionId = sessionIdStr
        ? parseInt(sessionIdStr, 10)
        : undefined;
      const limit = Math.min(parseInt(limitStr ?? "50", 10) || 50, 200);

      const query: Record<string, unknown> = {};
      if (sessionId !== undefined) {
        query["params.sessionId"] = sessionId;
      }

      const snapshots = await db
        .collection("snapshots")
        .find(query, { projection: { _id: 0 } })
        .sort({ poll: -1 })
        .limit(limit)
        .toArray();

      return { count: snapshots.length, snapshots };
    } catch (err) {
      console.error("[api] /api/history error:", err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}
