import { FastifyInstance } from "fastify";
import { getSnapshots } from "../redis.js";

export default async function historyRoutes(fastify: FastifyInstance) {
  fastify.get("/api/history", async (request, reply) => {
    try {
      const { session_id: sessionIdStr, limit: limitStr } = request.query as Record<
        string,
        string | undefined
      >;
      const sessionId = sessionIdStr
        ? parseInt(sessionIdStr, 10)
        : undefined;
      const limit = Math.min(parseInt(limitStr ?? "50", 10) || 50, 200);

      if (sessionId === undefined || isNaN(sessionId)) {
        return reply.code(400).send({ error: "session_id query parameter is required" });
      }

      const snapshots = await getSnapshots(sessionId, limit);

      return { count: snapshots.length, snapshots };
    } catch (err) {
      console.error("[api] /api/history error:", err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}
