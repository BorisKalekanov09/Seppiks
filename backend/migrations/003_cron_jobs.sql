-- migrations/003_cron_jobs.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- Every 5 minutes: recalculate trending scores
SELECT cron.schedule('trending-scores', '*/5 * * * *', $$
  SELECT public.calculate_trending_score();
$$);

-- Every day at 2am UTC: deactivate stale questions
SELECT cron.schedule('deactivate-stale', '0 2 * * *', $$
  UPDATE public.questions
  SET status = 'inactive'
  WHERE status = 'approved'
    AND created_at < now() - interval '30 days'
    AND id NOT IN (
      SELECT question_id FROM public.votes
      WHERE created_at > now() - interval '7 days'
    );
$$);

-- Every 10 minutes: trigger dataset queue processor
SELECT cron.schedule('process-dataset-queue', '*/10 * * * *', $$
  SELECT http_post(
    'https://' || current_setting('app.edge_function_base_url') || '/process-dataset-queue',
    '{}'::jsonb,
    'application/json',
    jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
  );
$$);
