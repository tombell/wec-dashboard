import { FastifyInstance } from "fastify";
import { getRedis } from "../db.js";

export default async function sessionsRoutes(fastify: FastifyInstance) {
  fastify.get("/api/sessions", async (_request, reply) => {
    try {
      const redis = getRedis();
      const rawMap = await redis.hgetall("wec:sessions");

      const sessions = Object.values(rawMap)
        .map((v) => JSON.parse(v))
        .sort((a, b) => (b.last_seen as string).localeCompare(a.last_seen as string))
        .slice(0, 20);

      return { count: sessions.length, sessions };
    } catch (err) {
      console.error("[api] /api/sessions error:", err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}
