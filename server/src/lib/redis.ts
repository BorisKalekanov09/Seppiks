/**
 * lib/redis.ts
 *
 * Configures the Redis connection used by both caching/rate limiting
 * and the BullMQ background workers.
 */

import Redis from "ioredis";
import { env } from "./env";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

redis.on("error", (err) => {
  console.error("[REDIS] Connection Error:", err);
});

redis.on("connect", () => {
  console.log("[REDIS] Connected successfully.");
});
