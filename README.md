# QC Web

Premium scheduled moment delivery web app (Next.js + TypeScript + Tailwind).

## Prerequisites

- Node.js 20+ (recommended)
- npm 10+
- Optional local Python venv (if you already use it in this repo workflow)

## Local Development (Exact Terminal Steps)

From `/Users/carlosvera/Documents/QC-app`:

```bash
cd /Users/carlosvera/Documents/QC-app
source .venv/bin/activate
cd web
npm install
NEXT_TELEMETRY_DISABLED=1 npm run dev -- --webpack -H 127.0.0.1 -p 3000
```

Open:

- `http://127.0.0.1:3000`
- Experience anchor: `http://127.0.0.1:3000/#experience`
- Features anchor: `http://127.0.0.1:3000/#features`

## Django Delivery Backend (Professor Requirement)

This repo includes a separate Django service at `web/django_backend/` that can send published moments via SMS.

Quick start:

```bash
cd /Users/carlosvera/Documents/QC-app/web/django_backend
python3 -m pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py runserver 127.0.0.1:8001
```

Then in `web/.env.local`:

```bash
DJANGO_API_BASE_URL=http://127.0.0.1:8001
# Optional but recommended:
DJANGO_API_TOKEN=change_me
```

Implementation details: `web/django_backend/README.md`.

## If Port 3000 Is Busy

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
kill -9 <PID>
```

Then run dev server again.

## Common Commands

```bash
# Lint
npx eslint app/LandingClient.tsx app/components/landing/start-point --max-warnings=0

# Production build
npm run build

# Production start
npm run start
```

## Key File Map (Purpose)

### App shell and landing

- `app/page.tsx`: Landing route entry, mounts `LandingClient`.
- `app/LandingClient.tsx`: Main landing page structure (hero, experience, features, builder, waitlist CTA).
- `app/globals.css`: Global design tokens and shared styles.
- `app/layout.tsx`: Root layout and metadata.

### Start-point builder (branching interaction)

- `app/components/landing/start-point/StartPointSection.tsx`: UI layer for cards, drag/drop, canvas, connectors.
- `app/components/landing/start-point/useBranchingJourney.ts`: State machine for start/swap/edit/reorder/reset behavior.
- `app/components/landing/start-point/recommendations.ts`: Primary/secondary candidate generation logic.
- `app/components/landing/start-point/rules.ts`: Placement and full-path validation rules.
- `app/components/landing/start-point/data.ts`: Step metadata, featured/other options, helper builders.
- `app/components/landing/start-point/types.ts`: Shared TypeScript models for the builder module.

### Auth/profile/moments surfaces

- `app/app/layout.tsx`: Authenticated app shell layout.
- `app/app/page.tsx`: In-app home.
- `app/app/moments/page.tsx`: Moments list.
- `app/app/moments/[id]/page.tsx`: Moment detail/edit page.
- `app/app/create/page.tsx`: Create moment flow.
- `app/app/settings/page.tsx`: Settings route entry.
- `app/app/settings/SettingsClient.tsx`: Settings UI logic.
- `app/app/settings/PermissionCenter.tsx`: Settings permission controls.
- `app/app/insights/page.tsx`: Insights page.

### API routes

- `app/api/health/route.ts`: Health check endpoint.
- `app/api/auth/me/route.ts`: Current user endpoint.
- `app/api/auth/signup/route.ts`: Signup endpoint.
- `app/api/profile/route.ts`: Profile read/write.
- `app/api/moments/route.ts`: Create/list moments.
- `app/api/moments/[id]/route.ts`: Get/update/delete single moment.
- `app/api/moments/[id]/publish/route.ts`: Publish/schedule action.
- `app/api/waitlist/route.ts`: Waitlist signup endpoint.
- `app/api/waitlist/feedback/route.ts`: Waitlist feedback endpoint.
- `app/api/waitlist/verify/route.ts`: Waitlist email verification endpoint.
- `app/api/sms/send/route.ts`: SMS send endpoint (Twilio).

### Shared libraries

- `lib/supabaseBrowser.ts`: Browser-side Supabase client.
- `lib/supabaseServer.ts`: Server-side Supabase client.
- `lib/authServer.ts`: Server auth/session utilities.
- `lib/twilio.ts`: Twilio integration helpers.
- `lib/timezone.ts`: Timezone formatting/conversion helpers.
- `lib/waitlistVerify.ts`: Waitlist verification token helpers.
- `lib/profileFallback.ts`: Profile fallback defaults/transforms.

### Database migrations

- `supabase/sql/20260216_create_waitlist_signups.sql`: Waitlist signup table.
- `supabase/sql/20260217_add_waitlist_verification_columns.sql`: Waitlist verify fields.
- `supabase/sql/20260217_create_waitlist_feedback.sql`: Waitlist feedback table.
- `supabase/sql/20260224_profiles_moments_home_upgrade.sql`: Profiles/moments schema upgrades.
- `supabase/sql/20260225_profiles_bio.sql`: Profile bio additions.

## Notes on Comments in Code

- The landing + builder modules now include function-level purpose comments to make navigation faster.
- Commenting every line in every file is intentionally avoided to keep maintenance practical and reduce noise.
# QC-Web
# QC-Web
