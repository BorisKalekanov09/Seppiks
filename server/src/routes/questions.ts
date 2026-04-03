/**
 * routes/questions.ts
 *
 * Defines the main API endpoints that the mobile app interacts with.
 * Incorporates request gatekeeping, input validation, rate limiting, and business logic.
 */

import { FastifyPluginAsync } from "fastify";
import { supabase } from "../lib/supabase";
import { requireAuth } from "../middleware/auth";
import { sanitizeText, validateQuestionInput, validateCommentInput } from "../middleware/validation";
import { datasetQueue } from "../workers/index";

export const questionRoutes: FastifyPluginAsync = async (fastify) => {

  // Global rate limit for feed requests (120 req / minute)
  const feedLimiter = {
    config: {
      rateLimit: {
        max: 120,
        timeWindow: "1 minute",
      },
    },
  };

  // GET /feed
  // Only fetching, no auth required, but rate limited.
  fastify.get("/feed", feedLimiter, async (request, reply) => {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      request.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch feed" });
    }

    return data;
  });

  // POST /questions
  // Create a new question. Gatekept via authorization.
  fastify.post("/questions", {
    preHandler: [requireAuth],
    config: {
      rateLimit: { max: 5, timeWindow: "1 hour" }
    }
  }, async (request, reply) => {
    const body = request.body as { text?: string; category?: string };
    
    const text = sanitizeText(body.text || "");
    const category = sanitizeText(body.category || "");

    try {
      validateQuestionInput(text, category);
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }

    const { data, error } = await supabase
      .from("questions")
      .insert({
        text,
        category,
        author_id: request.user.id
      })
      .select()
      .single();

    if (error) {
      request.log.error(error);
      return reply.status(500).send({ error: "Failed to create question" });
    }

    return data;
  });

  // POST /questions/:id/vote
  // Cast a vote. Gatekept, rate limited, validates input, atomic increment.
  fastify.post("/:id/vote", {
    preHandler: [requireAuth],
    config: {
        rateLimit: { max: 60, timeWindow: "1 minute" }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { vote } = request.body as { vote: 0 | 1 };

    if (vote !== 0 && vote !== 1) {
      return reply.status(400).send({ error: "Invalid vote" });
    }

    // Attempt to insert the vote.
    // The DB constraint (unique user_id, question_id) enforces the biz rule:
    // "a user can only vote once per question".
    const { error: voteError } = await supabase
      .from("votes")
      .insert({ user_id: request.user.id, question_id: id, vote });

    if (voteError) {
      if (voteError.code === "23505") { // Postgres unique violation code
        return reply.status(409).send({ error: "You have already voted on this question" });
      }
      request.log.error(voteError);
      return reply.status(500).send({ error: "Internal Server Error" });
    }

    // Atomic increment via stored procedure to prevent race conditions
    const field = vote === 1 ? "yes_count" : "no_count";
    const { error: incError } = await supabase.rpc("increment_vote", {
        q_id: id,
        vote_field: field
    });

    if (incError) {
      request.log.error(incError);
      return reply.status(500).send({ error: "Failed to update vote counts" });
    }

    // Check if we reached 100 votes to trigger the dataset generation worker
    const { data: qData } = await supabase
        .from("questions")
        .select("yes_count, no_count")
        .eq("id", id)
        .single();
    
    if (qData) {
        const totalVotes = qData.yes_count + qData.no_count;
        if (totalVotes === 100) {
            // Trigger background job asynchronously
            await datasetQueue.add('GenerateDataset', { questionId: id });
        }
    }

    return { success: true };
  });

  // POST /questions/:id/comments
  // Add a comment. Rate limited, Auth required, input sanitization logic.
  fastify.post("/:id/comments", {
    preHandler: [requireAuth],
    config: {
      rateLimit: { max: 30, timeWindow: "1 hour" }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { content } = request.body as { content: string };

    const sanitizedContent = sanitizeText(content || "");

    try {
        validateCommentInput(sanitizedContent);
    } catch (e: any) {
        return reply.status(400).send({ error: e.message });
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        question_id: id,
        user_id: request.user.id,
        content: sanitizedContent
      })
      .select()
      .single();
    
    if (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Failed to post comment" });
    }

    return data;
  });

};
