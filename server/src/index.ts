/**
 * index.ts
 *
 * Entrypoint for the Seppiks Fastify Backend Server.
 * Configures the app, sets up Sentry for observability, loads plugins natively,
 * handles graceful shutdown, and binds to the specified port.
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import * as Sentry from "@sentry/node";

import { env } from "./lib/env";
import rateLimitPlugin from "./plugins/rate-limit";
import { questionRoutes } from "./routes/questions";
import { setupWorkers, shutdownWorkers } from "./workers/index";

// Initialization
const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' }
    }
  }
});

// Sentry Observability Configuration
// Why this matters: Instead of crashing or dumping raw SQL logs to the user,
// all unhandled errors are safely captured to our Sentry dashboard.
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
  });
}

// Global Error Handler
fastify.setErrorHandler((error, request, reply) => {
  // Capture to sentry, injecting the current user context if available
  if (env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (request.user) {
        scope.setUser({ id: request.user.id });
      }
      Sentry.captureException(error);
    });
  }

  request.log.error(error);

  // Send generic error message to client. NEVER expose raw db errors.
  reply.status(500).send({
    error: "Internal Server Error",
    message: "An unexpected error occurred. Our team has been notified.",
  });
});

async function start() {
  try {
    // 1. Security & Core Plugins
    await fastify.register(helmet);
    await fastify.register(cors, {
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
    });

    // 2. Rate Limiter (Redis)
    await fastify.register(rateLimitPlugin);

    // 3. API Routes
    await fastify.register(questionRoutes, { prefix: "/api/questions" });

    // 4. Background Workers Configuration
    await setupWorkers();

    // 5. Start Server
    await fastify.listen({ port: env.PORT, host: env.HOST });
    fastify.log.info(`[SERVER] Started and listening on http://${env.HOST}:${env.PORT}`);
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful Shutdown Handlers
// Why this matters: Abrupt kills interrupt in-flight database transactions and corrupt active worker jobs.
const shutdown = async (signal: string) => {
  fastify.log.info(`[SERVER] Received ${signal}. Shutting down gracefully...`);
  try {
    // Stop accepting new requests & close active db connections if there are any
    await fastify.close();
    
    // Drain active worker queues
    await shutdownWorkers();
    
    fastify.log.info("[SERVER] Closed all connections securely. Exiting.");
    process.exit(0);
  } catch (err) {
    fastify.log.error({ err }, "[SERVER] Error during shutdown.");
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
