import { Router } from "express";
import { getDB } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const sessionId = req.query.session_id
      ? parseInt(req.query.session_id as string, 10)
      : undefined;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 200);

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

    res.json({ count: snapshots.length, snapshots });
  } catch (err) {
    console.error("[api] /api/history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
