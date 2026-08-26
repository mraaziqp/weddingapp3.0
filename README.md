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

### Still on Supabase

Everything that isn't guest media: guests, households, RSVPs, seating, timeline,
playlist, registry, budget, vendors, well wishes. The save-the-date and
invitation editors also still upload their background images to the Supabase
`wedding-assets` bucket — those are admin-authored assets, not guest media.

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
