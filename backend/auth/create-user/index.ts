// Supabase Edge Function (Deno) — Create user + trigger confirmation email + create default prefs
// Expects JSON body: { email: string, password: string, display_name?: string }

// Allow local TypeScript to compile: declare ambient Deno when running in editors/builds.
declare const Deno: any;

const SUPABASE_URL = (typeof Deno !== 'undefined' ? Deno.env.get('SUPABASE_URL') : process.env.SUPABASE_URL) ||
  ((typeof Deno !== 'undefined') ? Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') : process.env.NEXT_PUBLIC_SUPABASE_URL);
const SUPABASE_ANON_KEY = (typeof Deno !== 'undefined' ? Deno.env.get('SUPABASE_ANON_KEY') : process.env.SUPABASE_ANON_KEY) ||
  ((typeof Deno !== 'undefined') ? Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const SERVICE_ROLE_KEY = (typeof Deno !== 'undefined' ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') : process.env.SUPABASE_SERVICE_ROLE_KEY) ||
  ((typeof Deno !== 'undefined') ? Deno.env.get('SERVICE_ROLE_KEY') : process.env.SERVICE_ROLE_KEY);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
  console.warn('Missing one or more required SUPABASE_* environment variables');
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { email, password, display_name } = body ?? {};
  if (!email || !password) {
    return new Response('Missing email or password', { status: 400 });
  }

  // 1) Use the public signup endpoint to create the user and let Supabase send the confirmation email
  const signupResp = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ email, password, data: { display_name } }),
  });

  const signupText = await signupResp.text();
  if (!signupResp.ok) {
    return new Response(signupText, { status: signupResp.status });
  }

  let signupJson: any;
  try {
    signupJson = JSON.parse(signupText);
  } catch (err) {
    signupJson = { message: signupText };
  }

  // If signup created a user, attempt to create a default preferences row using the service role key.
  const user = signupJson.user ?? null;
  if (user && user.id) {
    try {
      // Create a default preferences record for the new user. If the DB trigger already created a profile,
      // this will simply create the preferences row. If it fails (unique violation), we ignore the error.
      const prefsResp = await fetch(`${SUPABASE_URL}/rest/v1/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ user_id: user.id, categories: [], content_type: 'fun' }),
      });

      if (!prefsResp.ok) {
        // Log but don't fail the entire request — signup succeeded and confirmation email has been sent.
        const errText = await prefsResp.text();
        console.warn('Failed creating default preferences:', errText);
      }
    } catch (err) {
      console.warn('Error creating preferences:', err);
    }
  }

  return new Response(JSON.stringify({ ok: true, signup: signupJson }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
