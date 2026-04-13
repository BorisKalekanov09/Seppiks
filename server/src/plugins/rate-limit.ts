/**
 * plugins/rate-limit.ts
 *
 * In-memory rate limiting (no Redis required).
 * For production at scale, swap back to Redis-backed limiting.
 */

import fp from "fastify-plugin";
import fastifyRateLimit from "@fastify/rate-limit";

export default fp(async (fastify) => {
  await fastify.register(fastifyRateLimit, {
    // No redis option → falls back to in-memory store
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Rate limit exceeded. Try again in ${context.after} seconds.`,
      retryAfter: context.after,
    }),
  });
});
