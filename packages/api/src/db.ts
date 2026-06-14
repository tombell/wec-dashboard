// Re-export everything from redis.ts for backward compatibility.
// Direct imports should use ../redis.js instead.
export {
  getRedis,
  connectRedis,
  closeRedis,
  getCurrentState,
  getSessions,
  getSnapshots,
} from "./redis.js";
