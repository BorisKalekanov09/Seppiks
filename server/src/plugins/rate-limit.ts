/**
 * plugins/rate-limit.ts
 *
 * Configures Redis-backed rate limiting.
 * Why this matters:
 * Without rate limiting, a single user or bot could spam the server
 * with millions of requests, crashing the database (DDoS attack) or
 * skewing question votes using automated scripts.
 */

import fp from "fastify-plugin";
import fastifyRateLimit from "@fastify/rate-limit";
import { redis } from "../lib/redis";

export default fp(async (fastify) => {
  await fastify.register(fastifyRateLimit, {
    redis,
    // Custom error response structure
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Rate limit exceeded. Try again in ${context.after} seconds.`,
      retryAfter: context.after,
    }),
  });
});
