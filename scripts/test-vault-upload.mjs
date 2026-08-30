#!/usr/bin/env node
/**
 * End-to-end test of the Memory Vault's bulk upload.
 * ──────────────────────────────────────────────────
 * Covers the two routes a file can take to Drive and the things that only
 * matter once video is in the mix:
 *
 *   small file  → POST /api/media/upload (multipart, through our server)
 *   large file  → resumable session, PUT straight to Google
 *   playback    → Range requests through the same-origin proxy
 *
 * Prerequisites:
 *   node scripts/fake-google-drive.mjs
 *   npm run dev            # with the GOOGLE_* fake endpoints in .env.local
 *   node scripts/test-vault-upload.mjs
 */

const APP = process.env.APP_URL || 'http://localhost:3000';
const ADMIN = process.env.ADMIN_ACCESS_KEY || 'local-dev-admin';
const adminCookie = { Cookie: `wedding_admin_session=${ADMIN}` };

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

function makeJpeg() {
  return Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
      'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
      'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
    'base64'
  );
}

/** A recognisable byte pattern, so a Range slice can be checked exactly. */
function makeVideo(sizeBytes) {
  const buf = Buffer.alloc(sizeBytes);
  for (let i = 0; i < sizeBytes; i++) buf[i] = i % 251;
  return buf;
}

async function main() {
  // ── Multipart path ──────────────────────────────────────────────────────
  section('Small file — through the app server');

  const imgForm = new FormData();
  imgForm.append('file', new Blob([makeJpeg()], { type: 'image/jpeg' }), 'vault-photo.jpg');
  imgForm.append('visibility', 'private');

  const imgRes = await fetch(`${APP}/api/media/upload`, {
    method: 'POST',
    headers: adminCookie,
    body: imgForm,
  });
  const imgBody = await imgRes.json();
  check('image upload returns 201', imgRes.status === 201, JSON.stringify(imgBody).slice(0, 150));
  check('image tagged kind=photo', imgBody.media?.kind === 'photo', imgBody.media?.kind);

  // Video through the server route too — the MIME allow-list has to accept it.
  const smallVidForm = new FormData();
  smallVidForm.append('file', new Blob([makeVideo(2048)], { type: 'video/mp4' }), 'clip.mp4');
  smallVidForm.append('visibility', 'private');

  const smallVidRes = await fetch(`${APP}/api/media/upload`, {
    method: 'POST',
    headers: adminCookie,
    body: smallVidForm,
  });
  const smallVidBody = await smallVidRes.json();
  check('video accepted by the upload route', smallVidRes.status === 201, String(smallVidRes.status));
  check('video tagged kind=video', smallVidBody.media?.kind === 'video', smallVidBody.media?.kind);

  // ── Resumable path ──────────────────────────────────────────────────────
  section('Large file — resumable, straight to Drive');

  const unauth = await fetch(`${APP}/api/media/upload-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: 'x.mp4', mimeType: 'video/mp4', sizeBytes: 100 }),
  });
  check('session minting requires admin', unauth.status === 401, String(unauth.status));

  const badType = await fetch(`${APP}/api/media/upload-session`, {
    method: 'POST',
    headers: { ...adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: 'x.exe', mimeType: 'application/x-msdownload', sizeBytes: 100 }),
  });
  check('non-media rejected at session time', badType.status === 415, String(badType.status));

  const videoBytes = makeVideo(64 * 1024);
  const sessionRes = await fetch(`${APP}/api/media/upload-session`, {
    method: 'POST',
    headers: { ...adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: 'big-clip.mp4',
      mimeType: 'video/mp4',
      sizeBytes: videoBytes.length,
      visibility: 'private',
    }),
  });
  const sessionBody = await sessionRes.json();
  check('session returns an upload URI', Boolean(sessionBody.uploadUri), JSON.stringify(sessionBody).slice(0, 150));

  // The browser PUTs the bytes itself — note: no Authorization header, which
  // is the whole point of handing out a session URI.
  const putRes = await fetch(sessionBody.uploadUri, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4' },
    body: videoBytes,
  });
  const putBody = await putRes.json();
  check('direct PUT succeeds without an OAuth token', putRes.ok, String(putRes.status));
  check(
    'resumable file tagged kind=video',
    putBody.appProperties?.kind === 'video',
    putBody.appProperties?.kind
  );

  const bigId = putBody.id;

  // ── Listing ─────────────────────────────────────────────────────────────
  section('Vault listing');

  const list = await fetch(`${APP}/api/media?visibility=private&limit=50`, {
    headers: adminCookie,
  }).then(r => r.json());

  const big = (list.items ?? []).find(i => i.id === bigId);
  check('resumable upload appears in the vault', Boolean(big));
  check('listing exposes kind for the UI', big?.kind === 'video', big?.kind);
  check(
    'listing exposes mimeType as a fallback',
    typeof big?.mimeType === 'string' && big.mimeType.startsWith('video/'),
    big?.mimeType
  );

  // ── Range / playback ────────────────────────────────────────────────────
  section('Video playback through the proxy');

  const head = await fetch(`${APP}/api/media/${bigId}/raw`);
  check('proxy advertises Accept-Ranges', head.headers.get('accept-ranges') === 'bytes');

  const ranged = await fetch(`${APP}/api/media/${bigId}/raw`, {
    headers: { Range: 'bytes=100-199' },
  });
  check('ranged request returns 206', ranged.status === 206, String(ranged.status));
  check(
    'Content-Range is correct',
    ranged.headers.get('content-range') === `bytes 100-199/${videoBytes.length}`,
    ranged.headers.get('content-range')
  );

  const slice = Buffer.from(await ranged.arrayBuffer());
  check('ranged bytes are the right 100 bytes', slice.length === 100 && slice.equals(videoBytes.subarray(100, 200)));

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
