Create-user Edge Function
=========================

This Supabase Edge Function signs up a new user (via the Auth REST `signup` endpoint), which triggers Supabase's confirmation email flow, and then creates a default `preferences` row for the new user using the service role key.

Environment variables required when deploying in Supabase Functions:

- `SUPABASE_URL` — your Supabase project URL (e.g. https://xyz.supabase.co)
- `SUPABASE_ANON_KEY` — the public anon key (used to call the `signup` endpoint)
- `SUPABASE_SERVICE_ROLE_KEY` — the service role key (used to insert into `preferences`)

Request: POST JSON

{
  "email": "name@example.com",
  "password": "supersecret",
  "display_name": "Display Name"
}

Response: JSON with signup response from Supabase.
