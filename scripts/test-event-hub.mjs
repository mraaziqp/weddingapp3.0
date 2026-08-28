#!/usr/bin/env node
/**
 * End-to-end test of the entertainment-evening hub.
 * ─────────────────────────────────────────────────
 * Drives the real Next.js routes against the local fake Drive, covering the
 * paths that matter on the night: quick-join, the wedding/event media
 * separation, scavenger scoring off a real upload, reactions, and admin
 * moderation.
 *
 * Prerequisites:
 *   node scripts/fake-google-drive.mjs
 *   npm run dev            # with the GOOGLE_* fake endpoints in .env.local
 *   node scripts/test-event-hub.mjs
 *
 * Exits non-zero on the first failing assertion.
 */

const APP = process.env.APP_URL || 'http://localhost:3000';
const PIN = process.env.EVENT_PIN || '2609';
const ADMIN = process.env.ADMIN_ACCESS_KEY || 'local-dev-admin';

let passed = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 58 - title.length))}`);
}

/** A minimal but real JPEG, so Drive-side image handling sees actual bytes. */
function makeJpeg() {
  return Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
      'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
      'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
    'base64'
  );
}

/** Pulls the session cookie out of a Set-Cookie header. */
function cookieFrom(res, name) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const entry of raw) {
    const [pair] = entry.split(';');
    const [key, value] = pair.split('=');
    if (key.trim() === name) return `${name}=${value}`;
  }
  return null;
}

async function main() {
  // ── Join ────────────────────────────────────────────────────────────────
  section('Quick join');

  const joinRes = await fetch(`${APP}/api/event/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: PIN, name: 'Pipeline Tester' }),
  });
  const joinBody = await joinRes.json();
  check('PIN join returns 200', joinRes.status === 200, String(joinRes.status));
  check(
    'PIN grants only EVENT_ONLY_GUEST',
    joinBody.session?.role === 'EVENT_ONLY_GUEST',
    joinBody.session?.role
  );

  const guestCookie = cookieFrom(joinRes, 'wedding_event_session');
  check('session cookie issued', Boolean(guestCookie));
  const guest = { Cookie: guestCookie };

  // ── Upload ──────────────────────────────────────────────────────────────
  section('Photo upload + scavenger scoring');

  const form = new FormData();
  form.append('file', new Blob([makeJpeg()], { type: 'image/jpeg' }), 'shot.jpg');
  form.append('caption', 'Testing the wall');
  form.append('questTag', 'host-selfie'); // worth 10 points

  const upRes = await fetch(`${APP}/api/event/upload`, {
    method: 'POST',
    headers: guest,
    body: form,
  });
  const upBody = await upRes.json();
  check('upload returns 201', upRes.status === 201, JSON.stringify(upBody).slice(0, 160));
  check('stored as a photo', upBody.media?.kind === 'photo', upBody.media?.kind);
  check('caption round-trips', upBody.media?.caption === 'Testing the wall');
  check(
    'uploader taken from the session, not the form',
    upBody.media?.guestName === 'Pipeline Tester',
    upBody.media?.guestName
  );
  check('task credited on upload', upBody.progress?.tasks?.['host-selfie'] !== undefined);
  check('points awarded for the task', upBody.progress?.points >= 10, String(upBody.progress?.points));

  const photoId = upBody.media?.id;

  // An invented tag must not be able to mint points.
  const bogusForm = new FormData();
  bogusForm.append('file', new Blob([makeJpeg()], { type: 'image/jpeg' }), 'shot2.jpg');
  bogusForm.append('questTag', 'not-a-real-quest');
  const bogusRes = await fetch(`${APP}/api/event/upload`, {
    method: 'POST',
    headers: guest,
    body: bogusForm,
  });
  const bogusBody = await bogusRes.json();
  check('unknown quest tag is dropped', bogusBody.media?.questTag === null, bogusBody.media?.questTag);
  check('unknown quest tag scores nothing', bogusBody.progress === null);

  // ── Separation from the wedding wall ────────────────────────────────────
  section('Event photos stay out of the wedding wall');

  const weddingWall = await fetch(`${APP}/api/media?visibility=public&limit=100`).then(r =>
    r.json()
  );
  const leaked = (weddingWall.items ?? []).some(i => i.id === photoId);
  check('event photo absent from the wedding Live Wall', !leaked);

  const vault = await fetch(`${APP}/api/media?visibility=all&limit=100`, {
    headers: { Cookie: `wedding_admin_session=${ADMIN}` },
  }).then(r => r.json());
  const leakedVault = (vault.items ?? []).some(i => i.id === photoId);
  check("event photo absent from the couple's Vault", !leakedVault);

  // ── Feed ────────────────────────────────────────────────────────────────
  section('Memory wall feed');

  const feed = await fetch(`${APP}/api/event/feed`, { headers: guest }).then(r => r.json());
  check('feed contains the upload', feed.items?.some(i => i.id === photoId));
  check('feed is Drive-configured', feed.configured === true);

  // Notes and photos share one stream.
  await fetch(`${APP}/api/event/memories`, {
    method: 'POST',
    headers: { ...guest, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'A note from the pipeline test' }),
  });
  const feed2 = await fetch(`${APP}/api/event/feed`, { headers: guest }).then(r => r.json());
  check(
    'notes appear alongside photos',
    feed2.items?.some(i => i.type === 'note' && i.message?.includes('pipeline test'))
  );

  // ── Reactions ───────────────────────────────────────────────────────────
  section('Reactions');

  await fetch(`${APP}/api/event/reactions`, {
    method: 'POST',
    headers: { ...guest, 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetId: photoId, emoji: '❤️' }),
  });
  // Twice, to prove one guest cannot inflate a count.
  await fetch(`${APP}/api/event/reactions`, {
    method: 'POST',
    headers: { ...guest, 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetId: photoId, emoji: '❤️' }),
  });

  const feed3 = await fetch(`${APP}/api/event/feed`, { headers: guest }).then(r => r.json());
  check(
    'reaction counted exactly once per guest',
    feed3.reactions?.[photoId]?.['❤️'] === 1,
    JSON.stringify(feed3.reactions?.[photoId])
  );

  const badEmoji = await fetch(`${APP}/api/event/reactions`, {
    method: 'POST',
    headers: { ...guest, 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetId: photoId, emoji: 'not-an-emoji' }),
  });
  check('unknown reaction rejected', badEmoji.status === 400, String(badEmoji.status));

  // ── Moderation ──────────────────────────────────────────────────────────
  section('Moderation');

  const guestModerate = await fetch(`${APP}/api/event/moderate`, {
    method: 'PATCH',
    headers: { ...guest, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: photoId, type: 'photo', hidden: true }),
  });
  check('guest cannot moderate', guestModerate.status === 401, String(guestModerate.status));

  // An admin joining the hub is upgraded to ADMIN by the session route.
  const adminJoin = await fetch(`${APP}/api/event/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `wedding_admin_session=${ADMIN}`,
    },
    body: JSON.stringify({ pin: PIN, name: 'The Host' }),
  });
  const adminBody = await adminJoin.json();
  check('admin cookie upgrades the event role', adminBody.session?.role === 'ADMIN', adminBody.session?.role);

  const adminCookie = cookieFrom(adminJoin, 'wedding_event_session');
  const admin = { Cookie: adminCookie };

  const hideRes = await fetch(`${APP}/api/event/moderate`, {
    method: 'PATCH',
    headers: { ...admin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: photoId, type: 'photo', hidden: true }),
  });
  check('admin can hide an item', hideRes.status === 200, String(hideRes.status));

  const guestFeedAfterHide = await fetch(`${APP}/api/event/feed`, { headers: guest }).then(r =>
    r.json()
  );
  check(
    'hidden item disappears for guests',
    !guestFeedAfterHide.items?.some(i => i.id === photoId)
  );

  const adminFeedAfterHide = await fetch(`${APP}/api/event/feed`, { headers: admin }).then(r =>
    r.json()
  );
  const adminSees = adminFeedAfterHide.items?.find(i => i.id === photoId);
  check('admin still sees it, flagged hidden', adminSees?.hidden === true);

  const unhide = await fetch(`${APP}/api/event/moderate`, {
    method: 'PATCH',
    headers: { ...admin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: photoId, type: 'photo', hidden: false }),
  });
  check('hide is reversible', unhide.status === 200);

  const restored = await fetch(`${APP}/api/event/feed`, { headers: guest }).then(r => r.json());
  check('item returns for guests after unhide', restored.items?.some(i => i.id === photoId));

  // ── Trivia ──────────────────────────────────────────────────────────────
  section('Trivia');

  const play = await fetch(`${APP}/api/event/play`, { headers: guest }).then(r => r.json());
  const leaksAnswer = play.questions?.some(
    q => 'answerIndex' in q || 'reveal' in q
  );
  check('answer key never sent to the client', !leaksAnswer);
  check('leaderboard includes the tester', play.leaderboard?.some(r => r.guestName === 'Pipeline Tester'));

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(62)}`);
  console.log(`${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  · ${f}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\nTest run crashed:', err);
  process.exit(1);
});
