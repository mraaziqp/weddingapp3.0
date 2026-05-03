# weddingapp3.0

Wedu 3.0 is a Next.js wedding experience platform with guest invite flows,
live wall, admin planning suite, and cinematic event interactions.

## Admin Access Control

Admin dashboard routes are protected by middleware.

- Set `ADMIN_ACCESS_KEY` in your environment.
- Access any admin route once with `?adminKey=YOUR_KEY` (example: `/dashboard?adminKey=YOUR_KEY`).
- After that first hit, an HTTP-only cookie is set and admin pages remain accessible in that browser session.
- Anyone without valid admin access is redirected to `/event` (public invite experience).

This also means the site root `/` defaults to `/event`, not the admin dashboard.

## Scripts

- `npm run dev` - start development server
- `npm run build` - production build (Vercel-ready)
- `npm run start` - run production server
