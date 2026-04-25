#!/usr/bin/env bash
set -euo pipefail

# ==========================================
# QV Doctor - Quick Diagnostics Script
# Usage:
#   chmod +x qc-doctor.sh
#   ./qc-doctor.sh
# ==========================================

ROOT_DIR="$(pwd)"
WEB_DIR="$ROOT_DIR"

echo ""
echo "=========================================="
echo " QV DOCTOR (Next.js + Supabase) "
echo "=========================================="
echo "Working dir: $WEB_DIR"
echo ""

# ---------- Helpers ----------
mask() {
  local s="${1:-}"
  if [ -z "$s" ]; then echo ""; return; fi
  local len="${#s}"
  if [ "$len" -le 10 ]; then echo "********"; return; fi
  echo "${s:0:6}...${s:len-4:4}"
}

section() {
  echo ""
  echo "------------------------------------------"
  echo " $1"
  echo "------------------------------------------"
}

ok() { echo "✅ $1"; }
warn() { echo "⚠️  $1"; }
bad() { echo "❌ $1"; }

# ---------- Check: Node / npm ----------
section "Node / npm"
node -v >/dev/null 2>&1 && ok "Node installed: $(node -v)" || { bad "Node not found"; exit 1; }
npm -v >/dev/null 2>&1 && ok "npm installed: $(npm -v)" || { bad "npm not found"; exit 1; }

# ---------- Check: files ----------
section "Project Files"
[ -f "$WEB_DIR/package.json" ] && ok "package.json exists" || { bad "package.json missing (run inside /web)"; exit 1; }
[ -d "$WEB_DIR/app" ] && ok "app/ directory exists" || warn "app/ directory missing (Next App Router?)"
[ -f "$WEB_DIR/next.config.ts" ] || warn "next.config.ts not found (ok if using next.config.js)"
[ -f "$WEB_DIR/.env.local" ] && ok ".env.local exists" || warn ".env.local missing (you need it for Supabase)"

# ---------- Load env (safe) ----------
section "Environment Variables (.env.local)"
if [ -f "$WEB_DIR/.env.local" ]; then
  # export variables from .env.local (simple parser)
  set -a
  source "$WEB_DIR/.env.local" || true
  set +a

  echo "NEXT_PUBLIC_SUPABASE_URL=$(mask "${NEXT_PUBLIC_SUPABASE_URL:-}")"
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$(mask "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}")"
  echo "SUPABASE_SERVICE_ROLE_KEY=$(mask "${SUPABASE_SERVICE_ROLE_KEY:-}")"

  [ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ] && ok "NEXT_PUBLIC_SUPABASE_URL set" || bad "NEXT_PUBLIC_SUPABASE_URL missing"
  [ -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ] && ok "NEXT_PUBLIC_SUPABASE_ANON_KEY set" || bad "NEXT_PUBLIC_SUPABASE_ANON_KEY missing"

  # service role optional depending on your server usage
  if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
    ok "SUPABASE_SERVICE_ROLE_KEY set (server-side)"
  else
    warn "SUPABASE_SERVICE_ROLE_KEY not set (ok unless your server routes need it)"
  fi
else
  bad ".env.local missing - create it in /web"
fi

# ---------- Check: dependencies ----------
section "Dependencies"
if [ -d "$WEB_DIR/node_modules" ]; then
  ok "node_modules exists"
else
  warn "node_modules missing -> running npm install..."
  npm install
  ok "npm install done"
fi

# Verify packages that are commonly missing
npm ls @supabase/supabase-js >/dev/null 2>&1 && ok "@supabase/supabase-js installed" || { warn "@supabase/supabase-js missing -> installing"; npm i @supabase/supabase-js; ok "installed"; }

# ---------- Check: server running ----------
section "Local Server Check"
LOCAL_URL="http://localhost:3000"
HEALTH="$LOCAL_URL/api/health"

echo "Testing: $HEALTH"
if curl -sS "$HEALTH" | head -c 200 >/dev/null 2>&1; then
  ok "Server responds on /api/health"
else
  warn "Server not responding on /api/health"
  echo ""
  echo "👉 Start it in another terminal:"
  echo "   npm run dev"
  echo ""
fi

# ---------- Route existence checks ----------
section "Route Structure (App Router)"
echo "Looking for key routes:"

[ -f "$WEB_DIR/app/api/health/route.ts" ] && ok "app/api/health/route.ts found" || warn "Missing app/api/health/route.ts"
[ -f "$WEB_DIR/app/api/moments/route.ts" ] && ok "app/api/moments/route.ts found" || warn "Missing app/api/moments/route.ts"
[ -f "$WEB_DIR/app/api/moments/[id]/publish/route.ts" ] && ok "app/api/moments/[id]/publish/route.ts found" || warn "Missing app/api/moments/[id]/publish/route.ts"

[ -f "$WEB_DIR/app/m/[public_id]/page.tsx" ] && ok "app/m/[public_id]/page.tsx found" || warn "Missing app/m/[public_id]/page.tsx (public reveal page)"

# ---------- Quick moment list expectation ----------
section "Moments List Expectation"
echo "If Your Moments list is empty but rows exist in Supabase, common causes:"
echo "  1) sender_id is NULL on inserted rows"
echo "  2) RLS blocks SELECT for authenticated users"
echo "  3) You query by sender_id but you're not inserting sender_id"
echo "  4) Using service role in client (shouldn't), or using anon on server incorrectly"
echo ""

# ---------- Next steps ----------
section "NEXT ACTIONS"
echo "Run the Node Supabase deep test next:"
echo "  node qc-doctor.mjs"
echo ""
echo "If node qc-doctor.mjs fails, paste its full output to me."
echo ""
