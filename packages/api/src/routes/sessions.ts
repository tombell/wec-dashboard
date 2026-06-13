import { FastifyInstance } from "fastify";
import { getDB } from "../db.js";

interface SessionDoc {
  session_id: number;
  event_name: string;
  first_seen: string;
  last_seen: string;
}

export default async function sessionsRoutes(fastify: FastifyInstance) {
  fastify.get("/api/sessions", async (_request, reply) => {
    try {
      const db = getDB();
      const sessions = await db
        .collection<SessionDoc>("sessions")
        .find({}, { projection: { _id: 0 } })
        .sort({ last_seen: -1 })
        .limit(20)
        .toArray();

      return { count: sessions.length, sessions };
    } catch (err) {
      console.error("[api] /api/sessions error:", err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}
