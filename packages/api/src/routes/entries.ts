import { Router } from "express";
import { getDB } from "../db.js";
import type { CarEntry } from "../types.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const category = req.query.category as string | undefined;
    const sortBy = (req.query.sort_by as string) ?? "ranking";
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 500);

    const query: Record<string, unknown> = { _type: "entry" };
    if (category) query.category = category.toUpperCase();

    const allowed = new Set(["ranking", "categoryPosition", "lap", "pitstop"]);
    const sortField = allowed.has(sortBy) ? sortBy : "ranking";

    const entries = await db
      .collection<CarEntry>("entries")
      .find(query, {
        projection: { _id: 0, _type: 0, _last_updated: 0, _ingested_at: 0 },
        sort: { [sortField]: 1 },
        limit,
      })
      .toArray();

    const categories = await db
      .collection<CarEntry>("entries")
      .distinct("category", query);

    res.json({
      count: entries.length,
      categories,
      entries,
    });
  } catch (err) {
    console.error("[api] /api/entries error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const db = getDB();
    const entryId = parseInt(req.params.id, 10);
    if (isNaN(entryId)) {
      res.status(400).json({ error: "Invalid entry ID" });
      return;
    }

    const entry = await db
      .collection<CarEntry>("entries")
      .findOne(
        { id: entryId },
        { projection: { _id: 0, _type: 0, drivers: 0 } }
      );

    if (!entry) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }

    res.json(entry);
  } catch (err) {
    console.error("[api] /api/entries/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
