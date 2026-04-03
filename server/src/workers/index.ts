/**
 * workers/index.ts
 *
 * Background Jobs Configuration via BullMQ.
 *
 * What a worker is:
 * Forms of code that run asynchronously in the background.
 *
 * Why this matters:
 * Request-response cycles (handling an API call) must be FAST.
 * If we recalculate 'trending score' for all questions while the user waits
 * for a page to load, their app will freeze. Instead, we offload heavy work
 * to background tasks running independently of user HTTP requests.
 */

import { Queue, Worker } from "bullmq";
import { redis } from "../lib/redis";
import { supabase } from "../lib/supabase";

// 1. Trending Queue Setup (Runs every 5 mins)
export const trendingQueue = new Queue("trending-updates", { connection: redis });

const trendingWorker = new Worker("trending-updates", async (job) => {
  console.log("[WORKER] Running trending score recalculation...");
  
  // Custom formula: (votes_last_hour * 2 + total_votes * 0.5) / hoursSincePosted^1.5
  // Note: For real-world use we'd either run a heavy raw SQL query via Supabase RPC
  // or fetch questions and update them. For this demo we'll use an RPC call.
  const { error } = await supabase.rpc("recalculate_trending_scores");
  if (error) throw error;
  
}, { connection: redis });

// 2. Dataset Generation Triggered automatically at 100 votes
export const datasetQueue = new Queue("dataset-gen", { connection: redis });

const datasetWorker = new Worker("dataset-gen", async (job) => {
  const { questionId } = job.data;
  console.log(`[WORKER] Generating public demographic dataset for question ${questionId}`);
  // Logic to aggregate votes by age group and region goes here...
}, { connection: redis });

// 3. Nightly cleanup job
export const cleanupQueue = new Queue("cleanup", { connection: redis });

const cleanupWorker = new Worker("cleanup", async (job) => {
  console.log("[WORKER] Running weekly/nightly question cleanup");
  // Logic to mark inactive questions goes here
}, { connection: redis });


// Initializer
export async function setupWorkers() {
  // Add schedule jobs
  await trendingQueue.add('CalculateTrending', {}, {
    repeat: { pattern: '*/5 * * * *' } // Every 5 minutes
  });

  await cleanupQueue.add('NightlyCleanup', {}, {
    repeat: { pattern: '0 3 * * *' } // 3 AM daily
  });

  console.log("[WORKER] All background workers initialized.");
}

// Graceful shutdown helper
export async function shutdownWorkers() {
  await Promise.all([
    trendingWorker.close(),
    datasetWorker.close(),
    cleanupWorker.close(),
    trendingQueue.close(),
    datasetQueue.close(),
    cleanupQueue.close()
  ]);
  console.log("[WORKER] All queues and workers cleanly shut down.");
}
