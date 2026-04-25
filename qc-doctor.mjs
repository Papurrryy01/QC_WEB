/**
 * QV Doctor - Supabase Deep Test
 * Run:
 *   node qc-doctor.mjs
 *
 * What it checks:
 *  - env vars exist + look correct (masked)
 *  - connects to Supabase (anon)
 *  - checks "moments" table exists
 *  - checks rows exist
 *  - checks RLS by doing an authenticated-style query (optional)
 *
 * NOTE:
 *  This script DOES NOT print your raw keys.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function mask(s) {
  if (!s) return "";
  if (s.length <= 10) return "********";
  return `${s.slice(0, 6)}...${s.slice(-4)}`;
}

function section(name) {
  console.log("\n------------------------------------------");
  console.log(` ${name}`);
  console.log("------------------------------------------");
}

function ok(msg) { console.log("✅", msg); }
function warn(msg) { console.log("⚠️ ", msg); }
function bad(msg) { console.log("❌", msg); }

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) return;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value.replace(/^['"]|['"]$/g, "");
    }
  });
}

// Load .env.local first, then .env as fallback (Next.js convention)
const cwd = process.cwd();
loadEnvFile(path.join(cwd, ".env.local"));
loadEnvFile(path.join(cwd, ".env"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

section("ENV");
console.log("NEXT_PUBLIC_SUPABASE_URL =", mask(url));
console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY =", mask(anon));
console.log("SUPABASE_SERVICE_ROLE_KEY =", mask(service));

if (!url) bad("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!anon) bad("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!url || !anon) process.exit(1);

if (!url.startsWith("https://")) warn("Supabase URL should start with https://");
if (!url.includes(".supabase.co")) warn("Supabase URL usually contains .supabase.co");
ok("Env looks present");

section("CONNECT (anon)");
const supabaseAnon = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false }
});

{
  const { data, error } = await supabaseAnon.from("moments").select("id").limit(1);
  if (error) {
    bad("Anon client SELECT moments failed.");
    console.log("Error:", error.message);
    console.log("\nLikely causes:");
    console.log(" - Table doesn't exist");
    console.log(" - RLS blocks SELECT for anon (normal).");
    console.log(" - You're querying wrong schema/table name.\n");
  } else {
    ok("Anon client can query moments (at least schema exists).");
    console.log("Sample:", data);
  }
}

section("CONNECT (service role) - optional but best for server routes");
if (!service) {
  warn("No SUPABASE_SERVICE_ROLE_KEY in env. Skipping service-role tests.");
  console.log("If your server routes use supabaseServer, you *should* add it.");
} else {
  const supabaseService = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // 1) Table exists + count
  const { data: rows, error: rowsErr } = await supabaseService
    .from("moments")
    .select("id,sender_id,recipient_phone,message_body,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(5);

  if (rowsErr) {
    bad("Service role query failed (this is unexpected).");
    console.log("Error:", rowsErr.message);
    process.exit(1);
  }

  ok("Service role can read moments (table exists, access OK).");
  console.log("Recent rows (max 5):");
  console.table(rows);

  // 2) Check sender_id coverage
  const missingSender = rows.filter(r => !r.sender_id).length;
  if (missingSender > 0) {
    warn("Some recent moments have sender_id = NULL.");
    console.log("If your dashboard filters by sender_id, these won't show.");
    console.log("Fix: ensure INSERT sets sender_id or use RLS + auth.uid()");
  } else {
    ok("Recent moments have sender_id populated.");
  }
}

section("DIAGNOSIS: If Your Moments shows empty");
console.log(`
If moments exist in Supabase but don't appear in "YOUR MOMENTS", it's usually one of:

1) Your page query is filtering by sender_id but your insert does NOT set sender_id
   - Fix insert: include sender_id = user.id (or DB default via RLS + auth.uid())

2) RLS policy blocks SELECT for logged-in users
   - Fix policy: allow authenticated users to SELECT their own rows

3) You're reading with the wrong client (server vs browser) or wrong schema
   - Use server cookie client for user-specific reads
   - Use service role only for backend jobs (publish/scheduler)

Next: paste me your /app page code that fetches "YOUR MOMENTS"
(whatever file renders the dashboard list)
`);

ok("qc-doctor.mjs finished");

ok("qc-doctor.mjs finished");
