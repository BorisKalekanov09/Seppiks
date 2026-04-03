/**
 * lib/supabase.ts
 *
 * Provides a highly privileged Supabase client for the server.
 * The server connects using the SERVICE ROLE KEY. This bypasses
 * Row Level Security (RLS) entirely, giving the server admin access
 * to the database. This allows it to increment vote counts safely,
 * process background jobs, and verify JWT tokens sent by users,
 * while users themselves only have limited access via the mobile app.
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
