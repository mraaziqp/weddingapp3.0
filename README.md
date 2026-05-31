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
