import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";
import { connectDB, closeDB } from "./db.js";
import currentRouter from "./routes/current.js";
import entriesRouter from "./routes/entries.js";
import sessionsRouter from "./routes/sessions.js";
import historyRouter from "./routes/history.js";

const PORT = parseInt(process.env.PORT ?? "8001", 10);

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use("/api", currentRouter);
app.use("/api/entries", entriesRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/history", historyRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", db: "wec-livetiming" });
});

// Serve built frontend as static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple paths for the frontend build
const possiblePaths = [
  resolve(__dirname, "..", "..", "app", "dist"),    // dev: packages/api/src -> packages/app/dist
  resolve(__dirname, "..", "app", "dist"),            // built: packages/api/dist -> packages/app/dist
  resolve(__dirname, "..", "..", "..", "app", "dist"),// fallback
];

let frontendPath: string | null = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
    frontendPath = p;
    break;
  }
}

if (frontendPath) {
  app.use(express.static(frontendPath));
  // SPA fallback: serve index.html for non-API routes
  app.get("*", (_req, res) => {
    res.sendFile(resolve(frontendPath!, "index.html"));
  });
  console.log(`[wec-api] Serving frontend from ${frontendPath}`);
} else {
  console.log("[wec-api] No static frontend found — API only");
  app.get("/", (_req, res) => {
    res.json({
      message: "WEC Live Timing API",
      docs: "/api/current, /api/entries, /api/sessions, /api/history",
    });
  });
}

// Start server
async function main() {
  try {
    await connectDB();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[wec-api] Listening on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("[wec-api] Failed to start:", err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n[wec-api] Shutting down...");
  await closeDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n[wec-api] Shutting down...");
  await closeDB();
  process.exit(0);
});

main();
