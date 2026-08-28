# weddingapp3.0

Wedu 3.0 is a Next.js wedding experience platform with guest invite flows,
live wall, admin planning suite, and cinematic event interactions.

## Admin Access Control

Admin dashboard routes are protected by middleware.

- Set `ADMIN_ACCESS_KEY` in your environment.
- Optional for shared admin access: set `ADMIN_ACCESS_KEYS` as a comma-separated list (for example: `you-key,fiance-key`).
- Preferred admin entry link on your domain: `https://www.raziaraaziq.co.za/admin`.
- First-time admin unlock: `https://www.raziaraaziq.co.za/admin?adminKey=YOUR_KEY`.
- You can also use any protected admin route with `?adminKey=YOUR_KEY` (example: `/dashboard?adminKey=YOUR_KEY`).
- After that first hit, an HTTP-only cookie is set and admin pages remain accessible in that browser session.
- Anyone without valid admin access is redirected to `/event` (public invite experience).

Example fiancée seating access:

- `https://www.raziaraaziq.co.za/seating?adminKey=FIANCE_KEY`

This also means the site root `/` defaults to `/event`, not the admin dashboard.

## Scripts

- `npm run dev` - start development server
- `npm run build` - production build (Vercel-ready)
- `npm run start` - run production server

## Media store — Google Drive

Guest photos (Live Wall + private Vault) are stored in the couple's own Google
Drive. Drive is the whole media database: the JPEG and its metadata — which
guest took it, whether it's public or vault-only, which quest it was tagged
with — live together on the Drive file via `appProperties`, which Drive's query
language can filter on. There is no media table.

    guest phone → POST /api/media/upload → Drive folder "Wedding Media"
    Live Wall / Vault / venue screen → GET /api/media → drive.files.list
    <img src> → GET /api/media/<fileId>/raw  (same-origin proxy)

The OAuth refresh token stays on the server; guests never touch Google.

### One-time setup

1. Google Cloud Console → new project → enable the **Google Drive API**.
2. OAuth consent screen → External → add your own Google account as a test
   user. Before the wedding, click **Publish app** — refresh tokens issued
   while the app is in "Testing" expire after 7 days.
3. Credentials → OAuth client ID → **Web application** → authorised redirect
   URI `http://localhost:53682/callback`.
4. Put the client id/secret in `.env.local` (see `.env.example`), then:

       npm run drive:auth

   Approve in the browser; it prints `GOOGLE_REFRESH_TOKEN=…` to paste into
   `.env.local` and into the Vercel project environment variables.

The app requests the `drive.file` scope — access limited to files it creates
itself. It cannot read anything else in your Drive. On first upload it creates
a folder called `Wedding Media`; rename or move it freely, it's tracked by id.
Set `GDRIVE_MEDIA_FOLDER_ID` to pin a specific folder instead.

Deleting a photo from the admin Vault moves it to the Drive trash (recoverable
for 30 days) rather than destroying it.

### Admin design assets

The invitation and save-the-date editors upload their background images through
`/api/assets/upload` into a **separate** Drive folder (`Wedding Assets`). A
different parent folder is what keeps them out of the Live Wall and the Vault,
whose queries all scope themselves by folder.

### Testing the media pipeline without Google credentials

`scripts/fake-google-drive.mjs` is a local stand-in for the Drive v3 API — it
implements the subset the app uses (token refresh, multipart upload, the
`appProperties has {...}` query language, raw download, trash, patch) and
implements it strictly, so a malformed request fails locally instead of
silently passing and then failing against real Google.

    npm run drive:fake        # terminal 1
    npm run dev               # terminal 2
    npm run test:media        # terminal 3 — 35 assertions

`npm run dev` needs these in `.env.local` to talk to the fake (they are ignored
in production builds, so a stray value can never redirect real wedding photos):

    GOOGLE_TOKEN_ENDPOINT=http://127.0.0.1:8787/token
    GOOGLE_DRIVE_API=http://127.0.0.1:8787/drive/v3
    GOOGLE_DRIVE_UPLOAD_API=http://127.0.0.1:8787/upload/drive/v3
    GOOGLE_CLIENT_ID=fake-client-id
    GOOGLE_CLIENT_SECRET=fake-client-secret
    GOOGLE_REFRESH_TOKEN=fake-refresh-token

The suite covers upload and metadata round-trip, guest-name resolution from
both a household id and a QR code, size/type/empty validation, public-vs-vault
isolation, admin gating on every privileged route, byte-identical image
round-trip through the proxy, the guard that refuses to serve any Drive file
the app did not create, and the full moderation path.

## Database — Firestore

Everything that isn't a guest photo lives in Firestore: guests, households,
RSVPs, seating, timeline, playlist, registry, budget, vendors, well wishes,
the save-the-date and invitation config documents, and the RSVP audit log.

**Nothing reaches Firestore from a browser.** `firestore.rules` denies all
client access outright; every read and write goes through `/api/data`, which
authorises the operation and then runs it with the Admin SDK. A guest can
resolve their own invite code and post a well wish; only a request carrying the
admin cookie can read the guest list.

That is a real improvement on the Supabase setup it replaced, where the anon
key sitting in the page source could read all 261 guest records, their dietary
requirements and their check-in times.

    browser  →  POST /api/data { op, args }  →  authorise  →  Admin SDK  →  Firestore
    server   →  lib/firestore-server.ts directly (no HTTP round trip)

Client components import `@/lib/data`; server code imports
`@/lib/firestore-server`. Keeping those separate is what stops `firebase-admin`
and the service-account credentials being pulled into the browser bundle.

### Setup

1. Firebase Console → Project settings → Service accounts → Generate new
   private key.
2. Base64 it into `FIREBASE_SERVICE_ACCOUNT_B64` (see `.env.example`).
3. Publish the rules: `npm run firebase:rules`.

### Local development

    npm run firebase:emulator     # Firestore emulator on 127.0.0.1:8099

Then uncomment `FIRESTORE_EMULATOR_HOST` in `.env.local`. The Admin SDK needs
no real credentials against the emulator, so the whole data layer can be
exercised without touching the live project.

### Migrating from Supabase

    npm run migrate:firestore -- --dry-run   # inspect
    npm run migrate:firestore                # write, then verify counts

Documents keep the app's own string ids (`household-…`, `guest-…`), so the
script is safe to re-run and every guest↔household reference survives. It reads
Supabase and never deletes from it.

## Maintenance notes

### Tests

    npm test          # typecheck + lint + pure-function unit tests
    npm run test:lib  # CSV escaping, rate limiter (24 assertions)
    npm run test:media # full Drive pipeline against the fake (37 assertions)

### Dependency upgrades deliberately deferred

Minor and patch updates are applied. These majors are **not**, because they
carry breaking-change risk that is not worth taking close to the wedding.
Revisit afterwards:

| Package | Current | Latest | Note |
|---|---|---|---|
| next | 15.x | 16.x | Also clears the nested `postcss` advisories |
| framer-motion | 11.x | 13.x | Used on nearly every screen |
| lucide-react | 0.475 | 1.x | Icon renames |
| eslint | 8.x | 10.x | Flat-config migration |
| date-fns | 3.x | 4.x | |
| @hookform/resolvers | 4.x | 5.x | |
| @dnd-kit/sortable | 8.x | 10.x | Seating chart + culinary planner |

`npm audit` reports vulnerabilities that all sit in the Genkit dependency tree
(`genkit` → `@genkit-ai/firebase` → Google Cloud telemetry → OpenTelemetry).
Genkit is used only by the AI secretary and the save-the-date copy generator,
and that telemetry path never executes here. The remaining `postcss`
advisories are build-time and need Next 16. None are reachable at runtime by a
guest.

### Known gaps, not code problems

- Day-of content tables are empty: `tables`, `timeline_events`, `tracks`,
  `menu_items`, and no guest has a `table_id`. Seating, schedule, playlist and
  menu will render blank until they are filled in.
- Nothing outstanding on the database side: Supabase and Neon are both gone,
  well wishes work, and RSVP free-text comments are captured for the first time
  (the Neon database that was supposed to hold them was never configured).

## The Evening — side-event Memory Panel

A second, separate celebration lives at `/event-hub`: an entertainment evening
whose guest list is **not** the wedding's. Some of those people were invited to
the evening only, and must never see the wedding itinerary, seating plan,
registry or invitation.

    /join  →  4-digit PIN or magic link  →  signed cookie  →  /event-hub

### Access tiers

| Role | Reaches | Notes |
|---|---|---|
| `EVENT_ONLY_GUEST` | `/event-hub` only | Bounced off every wedding page by middleware |
| `MAIN_GUEST` | Hub + the whole wedding site | Issued by magic link |
| `ADMIN` | Hub + moderation controls | Granted automatically when the admin cookie is present |

The session is a stateless HMAC-signed cookie built on Web Crypto, so
`middleware.ts` can verify it on the Edge runtime, where `firebase-admin`
cannot be imported. `WEDDING_ONLY_ROUTES` in `lib/event-access.ts` and the
`matcher` in `middleware.ts` must be kept in step — a route listed in the first
but missing from the second is never actually checked.

Generate magic links at `/event-access` (admin only). They are signed, not
stored, so they cannot be listed again after leaving the page.

### Setup

    EVENT_PIN=1234              # printed on the table cards
    EVENT_SESSION_SECRET=…      # falls back to ADMIN_ACCESS_KEY if unset

### Media separation

Evening photos and voice notes go to their **own Drive folder** (`Event Evening
Memories`), not the wedding folder. Every wall query scopes itself with
`'<folder>' in parents`, so a separate parent excludes the other event
automatically — including from `visibility=all`, which skips the visibility
filter entirely and would otherwise mix the two guest lists' photos together.

Moderation is a `hidden` appProperty rather than a delete: the call gets made
on a phone, in a dark room, mid-party, and an accidental tap has to be one tap
to undo.

### Tests

    node scripts/fake-google-drive.mjs   # terminal 1
    npm run dev                          # terminal 2, with the GOOGLE_* fake endpoints set
    npm run test:event                   # terminal 3

Covers quick-join, wedding/event media isolation, scavenger scoring off a real
upload, reaction idempotency, and admin moderation. Note that unless
`FIRESTORE_EMULATOR_HOST` is set, this writes notes and scores to the **real**
Firestore project — point it at the emulator or clean up afterwards.
