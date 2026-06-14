import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";
import { connectRedis, closeRedis } from "./redis.js";
import currentRoutes from "./routes/current.js";
import entriesRoutes from "./routes/entries.js";
import sessionsRoutes from "./routes/sessions.js";
import historyRoutes from "./routes/history.js";

const PORT = parseInt(process.env.PORT ?? "8001", 10);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: false,
});

// CORS
await fastify.register(cors, {
  origin: true,
});

// API routes
await fastify.register(currentRoutes);
await fastify.register(entriesRoutes);
await fastify.register(sessionsRoutes);
await fastify.register(historyRoutes);

// Health check
fastify.get("/api/health", async () => {
  return { status: "ok", db: "redis" };
});

// Serve built frontend
const possiblePaths = [
  resolve(__dirname, "..", "..", "app", "dist"),
  resolve(__dirname, "..", "app", "dist"),
  resolve(__dirname, "..", "..", "..", "app", "dist"),
];

let frontendPath: string | null = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
    frontendPath = p;
    break;
  }
}

if (frontendPath) {
  await fastify.register(fastifyStatic, {
    root: frontendPath,
    prefix: "/",
  });

  // SPA fallback: serve index.html for any non-API route
  fastify.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith("/api/")) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.sendFile("index.html");
  });

  console.log(`[wec-api] Serving frontend from ${frontendPath}`);
} else {
  console.log("[wec-api] No static frontend found — API only");
  fastify.get("/", async () => {
    return {
      message: "WEC Live Timing API",
      docs: "/api/current, /api/entries, /api/sessions, /api/history",
    };
  });
}

// Start
async function main() {
  try {
    await connectRedis();
    await fastify.listen({ host: "0.0.0.0", port: PORT });
    console.log(`[wec-api] Listening on http://0.0.0.0:${PORT}`);
  } catch (err) {
    console.error("[wec-api] Failed to start:", err);
    await closeRedis();
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async () => {
  console.log("\n[wec-api] Shutting down...");
  await fastify.close();
  await closeRedis();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main();
