#!/usr/bin/env node
/**
 * End-to-end test of the Google Drive media pipeline.
 * ───────────────────────────────────────────────────
 * Drives the real Next.js API routes against the local fake Drive, covering
 * the whole path a wedding photo takes: guest upload → Drive file with
 * appProperties → Live Wall / Vault listing → same-origin image proxy →
 * admin moderation.
 *
 * Prerequisites (three terminals, or run the fake in the background):
 *   node scripts/fake-google-drive.mjs
 *   npm run dev                       # with the GOOGLE_* fake endpoints in .env.local
 *   node scripts/test-media-pipeline.mjs
 *
 * Exits non-zero on the first failing assertion.
 */

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const APP = process.env.APP_URL || 'http://localhost:3000';
const FAKE = process.env.FAKE_DRIVE_URL || 'http://127.0.0.1:8787';
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

/** A real JPEG of the given size, built from a baseline header we patch. */
function makeJpeg(width, height) {
  // Minimal baseline JPEG: SOI, APP0, DQT, SOF0, DHT, SOS, EOI. We only need
  // the SOF0 dimensions to be readable and the bytes to round-trip intact.
  const header = Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
    'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
    'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
    'base64'
  );
  const buf = Buffer.from(header);
  // Patch the SOF0 height/width (big-endian, right after marker + length + precision).
  const sof = buf.indexOf(Buffer.from([0xff, 0xc0]));
  if (sof !== -1) {
    buf.writeUInt16BE(height, sof + 5);
    buf.writeUInt16BE(width, sof + 7);
  }
  return buf;
}

async function upload(fileBuf, filename, fields = {}) {
  const form = new FormData();
  form.append('file', new Blob([fileBuf], { type: 'image/jpeg' }), filename);
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const res = await fetch(`${APP}/api/media/upload`, { method: 'POST', body: form });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function list(visibility = 'public', extra = '', auth = false) {
  const res = await fetch(`${APP}/api/media?visibility=${visibility}${extra}`, {
    headers: auth ? adminCookie : {},
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

// ── run ───────────────────────────────────────────────────────────────────

const tmp = mkdtempSync(join(tmpdir(), 'wedu-'));
await fetch(`${FAKE}/reset`, { method: 'POST' });

section('upload');
const landscape = makeJpeg(1200, 800);
const portrait = makeJpeg(800, 1200);

const pub = await upload(landscape, 'ceremony.jpg', {
  visibility: 'public',
  guestId: 'household-1784052451187',
  questTag: 'Ceremony',
});
check('public upload returns 201', pub.status === 201, `got ${pub.status}`);
check('metadata round-trips visibility', pub.body.media?.visibility === 'public');
check('metadata round-trips questTag', pub.body.media?.questTag === 'Ceremony');
check('proxy url is same-origin', pub.body.media?.url?.startsWith('/api/media/'));
check('real guest name resolved from household id', !!pub.body.media?.guestName);
check('dimensions reported', pub.body.media?.width === 1200 && pub.body.media?.height === 800,
  `${pub.body.media?.width}x${pub.body.media?.height}`);

const vault = await upload(portrait, 'secret.jpg', {
  visibility: 'private',
  guestId: 'WEDU-HH-1784052617729',
});
check('private upload returns 201', vault.status === 201);
check('guest name resolved from QR code', !!vault.body.media?.guestName);

section('upload validation');
// Built by hand rather than through upload(), which always labels its blob
// image/jpeg — sending a genuine text/plain part is the point of this case.
const badForm = new FormData();
badForm.append('file', new Blob([Buffer.from('nope')], { type: 'text/plain' }), 'x.txt');
const badRes = await fetch(`${APP}/api/media/upload`, { method: 'POST', body: badForm });
check('non-image rejected with 415', badRes.status === 415, `got ${badRes.status}`);

const emptyForm = new FormData();
emptyForm.append('visibility', 'public');
const emptyRes = await fetch(`${APP}/api/media/upload`, { method: 'POST', body: emptyForm });
check('missing file rejected with 400', emptyRes.status === 400, `got ${emptyRes.status}`);

const big = await upload(Buffer.alloc(16 * 1024 * 1024, 0x41), 'big.jpg', { visibility: 'public' });
check('oversized file rejected with 413', big.status === 413, `got ${big.status}`);

section('listing and isolation');
const publicList = await list('public');
check('public wall shows only public photos', publicList.body.items?.length === 1,
  `got ${publicList.body.items?.length}`);
check('vault photo absent from public wall',
  !publicList.body.items?.some(i => i.visibility === 'private'));

const vaultNoAuth = await list('private');
check('vault requires admin (401)', vaultNoAuth.status === 401, `got ${vaultNoAuth.status}`);

const vaultAuth = await list('private', '', true);
check('vault lists private photo for admin', vaultAuth.body.items?.length === 1);

const allCount = await fetch(`${APP}/api/media?visibility=all&count=1`, { headers: adminCookie });
check('count endpoint totals both', (await allCount.json()).count === 2);

const quest = await list('public', '&questTag=Ceremony');
check('quest tag filter works', quest.body.items?.length === 1);
const noQuest = await list('public', '&questTag=Nonexistent');
check('unmatched quest tag returns nothing', noQuest.body.items?.length === 0);

section('image proxy');
const id = publicList.body.items[0].id;
const raw = await fetch(`${APP}/api/media/${id}/raw`);
const rawBytes = Buffer.from(await raw.arrayBuffer());
check('proxy returns 200', raw.status === 200);
check('bytes are byte-identical to the upload', rawBytes.equals(landscape),
  `${rawBytes.length} vs ${landscape.length}`);
check('content-type is the image type', raw.headers.get('content-type') === 'image/jpeg');
check('cached immutably', (raw.headers.get('cache-control') || '').includes('immutable'));
check('nosniff set', raw.headers.get('x-content-type-options') === 'nosniff');

const badId = await fetch(`${APP}/api/media/xx/raw`);
check('malformed id rejected with 400', badId.status === 400);
const missing = await fetch(`${APP}/api/media/fakeidZZZdoesnotexist/raw`);
check('unknown id returns 404', missing.status === 404);

// A file in the Drive that this app did not create must never be served.
const foreign = await fetch(`${FAKE}/drive/v3/files?fields=id`, {
  method: 'POST',
  headers: { Authorization: 'Bearer fake-access-token', 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'tax-return.pdf', mimeType: 'application/pdf' }),
}).then(r => r.json());
const foreignRes = await fetch(`${APP}/api/media/${foreign.id}/raw`);
check('refuses to serve a file the app did not create', foreignRes.status === 404,
  `got ${foreignRes.status}`);

section('moderation');
const patchNoAuth = await fetch(`${APP}/api/media`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id, visibility: 'private' }),
});
check('visibility change requires admin (401)', patchNoAuth.status === 401);

const patch = await fetch(`${APP}/api/media`, {
  method: 'PATCH',
  headers: { ...adminCookie, 'Content-Type': 'application/json' },
  body: JSON.stringify({ id, visibility: 'private' }),
});
check('admin can move a photo to the vault', patch.status === 200);
check('photo left the public wall', (await list('public')).body.items?.length === 0);
check('photo arrived in the vault', (await list('private', '', true)).body.items?.length === 2);

const badPatch = await fetch(`${APP}/api/media`, {
  method: 'PATCH',
  headers: { ...adminCookie, 'Content-Type': 'application/json' },
  body: JSON.stringify({ id, visibility: 'banana' }),
});
check('invalid visibility rejected with 400', badPatch.status === 400);

const delNoAuth = await fetch(`${APP}/api/media?id=${id}`, { method: 'DELETE' });
check('delete requires admin (401)', delNoAuth.status === 401);

const del = await fetch(`${APP}/api/media?id=${id}`, { method: 'DELETE', headers: adminCookie });
check('admin can trash a photo', del.status === 200);
check('trashed photo leaves the vault', (await list('private', '', true)).body.items?.length === 1);
const trashedRaw = await fetch(`${APP}/api/media/${id}/raw`);
check('trashed photo stops being served', trashedRaw.status === 404);

section('list caching');
// On the night, every guest's gallery polls every 20s and the venue screen
// every 10s. Without a server-side cache that is hundreds of Drive
// files.list calls a minute against one project's rate limit.
async function driveListCalls() {
  const res = await fetch(`${FAKE}/stats`, { headers: { Authorization: 'Bearer fake-access-token' } });
  return (await res.json()).listCallCount;
}

await list('public'); // prime
const callsBefore = await driveListCalls();
await Promise.all(Array.from({ length: 25 }, () => list('public')));
const callsAfter = await driveListCalls();
check(
  '25 concurrent guest polls collapse to at most 1 Drive call',
  callsAfter - callsBefore <= 1,
  `made ${callsAfter - callsBefore}`
);

// Staleness is only acceptable if a guest still sees their own photo appear.
const beforeUpload = (await list('public')).body.items.length;
await upload(makeJpeg(400, 300), 'cache-bust.jpg', { visibility: 'public' });
const afterUpload = (await list('public')).body.items.length;
check('a new upload is visible immediately, not after the TTL',
  afterUpload === beforeUpload + 1, `${beforeUpload} -> ${afterUpload}`);

// ── report ────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(62)}`);
if (failures.length) {
  console.log(`${passed} passed, ${failures.length} FAILED:`);
  failures.forEach(f => console.log(`   - ${f}`));
  process.exit(1);
}
console.log(`All ${passed} checks passed.`);
writeFileSync(join(tmp, 'ok'), 'ok');
