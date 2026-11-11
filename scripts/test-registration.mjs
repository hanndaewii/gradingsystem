// Live test of the registration flow: request an emailed code for an address,
// then report what the backend did.
//   node --env-file=.env scripts/test-registration.mjs [email]
import { createClient } from "@supabase/supabase-js";

const email = (process.argv[2] ?? "hanndaaewii@gmail.com").trim().toLowerCase();
const client = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`requesting a registration code for ${email}…`);
const { data, error } = await client.auth.signInWithOtp({
  email,
  options: { shouldCreateUser: true },
});

if (error) {
  console.log("✗ error:", error.message, `(status ${error.status ?? "?"})`);
  console.log("  → the project likely has no custom SMTP configured (Supabase's built-in mailer");
  console.log("    only sends to team members and is heavily rate-limited).");
  process.exit(1);
}
console.log("✓ code request accepted by Supabase Auth");
console.log("  message id:", data.messageId ?? "(none returned)");
console.log("  next: the 6-digit code arrives by email; paste it into the Register form.");
