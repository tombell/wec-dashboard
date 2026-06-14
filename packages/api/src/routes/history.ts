import { FastifyInstance } from "fastify";
import { getRedis } from "../db.js";

export default async function historyRoutes(fastify: FastifyInstance) {
  fastify.get("/api/history", async (request, reply) => {
    try {
      const redis = getRedis();
      const { session_id: sessionIdStr, limit: limitStr } = request.query as Record<
        string,
        string | undefined
      >;
      const sessionId = sessionIdStr
        ? parseInt(sessionIdStr, 10)
        : undefined;
      const limit = Math.min(parseInt(limitStr ?? "50", 10) || 50, 200);

      // If session ID provided, get snapshots for that session
      // Otherwise, get all session IDs and pull the latest snapshots from each
      let snapshots: Record<string, unknown>[];

      if (sessionId !== undefined) {
        const raw = await redis.lrange(`wec:snapshots:${sessionId}`, 0, limit - 1);
        snapshots = raw.map((s) => JSON.parse(s));
      } else {
        // No session filter — get the latest snapshot from each known session
        const rawSessions = await redis.hgetall("wec:sessions");
        const sessionIds = Object.keys(rawSessions).map(Number).sort((a, b) => b - a).slice(0, 10);
        snapshots = [];
        for (const sid of sessionIds) {
          const raw = await redis.lindex(`wec:snapshots:${sid}`, 0);
          if (raw) {
            const snap = JSON.parse(raw);
            snap._session_id = sid;
            snapshots.push(snap);
          }
        }
        // Sort by poll descending, limit
        snapshots.sort((a, b) => (b.poll as number) - (a.poll as number));
        snapshots = snapshots.slice(0, limit);
      }

      return { count: snapshots.length, snapshots };
    } catch (err) {
      console.error("[api] /api/history error:", err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}
