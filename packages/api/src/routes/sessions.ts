import { Router } from "express";
import { getDB } from "../db.js";

const router = Router();

interface SessionDoc {
  session_id: number;
  event_name: string;
  first_seen: string;
  last_seen: string;
}

router.get("/", async (_req, res) => {
  try {
    const db = getDB();
    const sessions = await db
      .collection<SessionDoc>("sessions")
      .find({}, { projection: { _id: 0 } })
      .sort({ last_seen: -1 })
      .limit(20)
      .toArray();

    res.json({ count: sessions.length, sessions });
  } catch (err) {
    console.error("[api] /api/sessions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
