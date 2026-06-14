import { FastifyInstance } from "fastify";
import { getSessions } from "../redis.js";

export default async function sessionsRoutes(fastify: FastifyInstance) {
  fastify.get("/api/sessions", async (_request, reply) => {
    try {
      const sessions = await getSessions(20);

      return { count: sessions.length, sessions };
    } catch (err) {
      console.error("[api] /api/sessions error:", err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}
