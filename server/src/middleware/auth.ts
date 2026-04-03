/**
 * middleware/auth.ts
 *
 * Authentication Verification Hook
 *
 * Why this matters:
 * Supabase handles the actual login process (email/password, OAuth), issuing a JWT.
 * When the mobile app wants to talk to our server, it sends this JWT in the Authorization header.
 * Our server MUST verify this token is valid, not forged, and not expired before trusting the user ID.
 * This is "request gatekeeping" — no random internet traffic reaches our database without a valid ticket.
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../lib/supabase";

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.split(" ")[1];

  // Verify the JWT with Supabase Auth
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    request.log.warn({ err: error }, "Authentication failed on protected route.");
    return reply.status(401).send({ error: "Invalid or expired token" });
  }

  // Attach the authenticated user to the request so route handlers can use it safely
  request.user = user;
}

// Augment the Fastify request type so TypeScript knows about our custom property
declare module "fastify" {
  interface FastifyRequest {
    user?: any; // Replace `any` with actual User type if fully typing
  }
}
