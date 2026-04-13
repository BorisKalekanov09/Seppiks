/**
 * workers/index.ts
 *
 * Background jobs have been moved to Supabase Edge Functions.
 * - Trending score recalculation → deploy as a scheduled Edge Function
 * - Nightly cleanup             → deploy as a scheduled Edge Function
 * - Dataset generation          → deploy as an on-demand Edge Function
 *
 * These stubs allow the server to start without Redis/BullMQ.
 */

export async function setupWorkers(): Promise<void> {
  console.log('[WORKERS] Background jobs run via Supabase Edge Functions — no local workers needed.');
}

export async function shutdownWorkers(): Promise<void> {
  // Nothing to shut down
}
