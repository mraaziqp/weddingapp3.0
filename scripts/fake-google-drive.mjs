#!/usr/bin/env node
/**
 * A local stand-in for the Google Drive v3 API.
 * ─────────────────────────────────────────────
 * Lets the whole media pipeline — upload route, multipart body, appProperties
 * query, list, raw-bytes proxy, trash, visibility patch — be exercised end to
 * end without real Google credentials.
 *
 *   node scripts/fake-google-drive.mjs           # listens on 8787
 *
 * Then point the app at it in .env.local:
 *   GOOGLE_TOKEN_ENDPOINT=http://127.0.0.1:8787/token
 *   GOOGLE_DRIVE_API=http://127.0.0.1:8787/drive/v3
 *   GOOGLE_DRIVE_UPLOAD_API=http://127.0.0.1:8787/upload/drive/v3
 *
 * This is a test double, not a Drive emulator. It implements the subset the
 * app uses, and it implements it strictly — an unknown query clause or a
 * missing Authorization header is an error, so a malformed request fails here
 * rather than silently passing and then failing against real Google.
 */

import http from 'node:http';
import { randomBytes } from 'node:crypto';

const PORT = Number(process.env.FAKE_DRIVE_PORT || 8787);
const ACCESS_TOKEN = 'fake-access-token';

/** id -> { id, name, mimeType, size, createdTime, appProperties, parents, trashed, bytes } */
const files = new Map();
let listCallCount = 0;
let seq = 0;

const newId = () => `fakeid${String(++seq).padStart(4, '0')}${randomBytes(6).toString('hex')}`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  try {
    if (path === '/token' && req.method === 'POST') return handleToken(req, res);

    // Everything below is a Drive call and must carry the bearer token.
    if (path !== '/reset') {
      const auth = req.headers.authorization;
      if (auth !== `Bearer ${ACCESS_TOKEN}`) {
        return json(res, 401, { error: { code: 401, message: 'Invalid Credentials' } });
      }
    }

    if (path === '/reset') { files.clear(); seq = 0; listCallCount = 0; return json(res, 200, { ok: true }); }
    if (path === '/stats') return json(res, 200, { listCallCount });
    if (path === '/upload/drive/v3/files' && req.method === 'POST') return handleUpload(req, res, url);
    if (path === '/drive/v3/files' && req.method === 'GET') return handleList(res, url);
    if (path === '/drive/v3/files' && req.method === 'POST') return handleCreate(req, res);

    const fileMatch = /^\/drive\/v3\/files\/([^/]+)$/.exec(path);
    if (fileMatch) {
      const id = decodeURIComponent(fileMatch[1]);
      if (req.method === 'GET') return handleGet(res, url, id);
      if (req.method === 'PATCH') return handlePatch(req, res, id);
    }

    return json(res, 404, { error: { code: 404, message: `No fake route for ${req.method} ${path}` } });
  } catch (err) {
    return json(res, 500, { error: { code: 500, message: String(err?.message ?? err) } });
  }
});

// ── handlers ──────────────────────────────────────────────────────────────

async function handleToken(req, res) {
  const body = await readBody(req);
  const params = new URLSearchParams(body.toString('utf8'));
  for (const required of ['client_id', 'client_secret', 'refresh_token', 'grant_type']) {
    if (!params.get(required)) {
      return json(res, 400, { error: 'invalid_request', error_description: `missing ${required}` });
    }
  }
  if (params.get('grant_type') !== 'refresh_token') {
    return json(res, 400, { error: 'unsupported_grant_type' });
  }
  return json(res, 200, { access_token: ACCESS_TOKEN, expires_in: 3600, token_type: 'Bearer' });
}

/** Folder creation — plain JSON metadata, no media. */
async function handleCreate(req, res) {
  const meta = JSON.parse((await readBody(req)).toString('utf8'));
  const file = {
    id: newId(),
    name: meta.name,
    mimeType: meta.mimeType || 'application/octet-stream',
    size: '0',
    createdTime: new Date(Date.now() + seq).toISOString(),
    appProperties: meta.appProperties ?? {},
    parents: meta.parents ?? [],
    trashed: false,
    bytes: Buffer.alloc(0),
  };
  files.set(file.id, file);
  return json(res, 200, project(file));
}

/**
 * multipart/related upload. Parses the body the way Drive does, so a
 * malformed boundary or a missing metadata part is caught here.
 */
async function handleUpload(req, res, url) {
  if (url.searchParams.get('uploadType') !== 'multipart') {
    return json(res, 400, { error: { code: 400, message: 'expected uploadType=multipart' } });
  }

  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType);
  if (!boundaryMatch) {
    return json(res, 400, { error: { code: 400, message: 'no multipart boundary' } });
  }
  const boundary = (boundaryMatch[1] || boundaryMatch[2]).trim();

  const raw = await readBody(req);
  const parts = splitMultipart(raw, boundary);
  if (parts.length !== 2) {
    return json(res, 400, {
      error: { code: 400, message: `expected 2 multipart parts, got ${parts.length}` },
    });
  }

  let meta;
  try {
    meta = JSON.parse(parts[0].body.toString('utf8'));
  } catch {
    return json(res, 400, { error: { code: 400, message: 'metadata part is not valid JSON' } });
  }
  if (!meta.name) return json(res, 400, { error: { code: 400, message: 'metadata.name required' } });

  // Real Drive 404s an upload whose parent doesn't exist. Enforcing that here
  // is what catches a stale cached folder id instead of silently accepting the
  // file into a phantom parent where nothing will ever list it again.
  for (const parent of meta.parents ?? []) {
    if (!files.has(parent)) {
      return json(res, 404, { error: { code: 404, message: `File not found: ${parent}.` } });
    }
  }

  const file = {
    id: newId(),
    name: meta.name,
    mimeType: parts[1].contentType || 'application/octet-stream',
    size: String(parts[1].body.length),
    // Monotonic so `orderBy: createdTime desc` is deterministic in tests.
    createdTime: new Date(Date.now() + seq).toISOString(),
    appProperties: meta.appProperties ?? {},
    parents: meta.parents ?? [],
    trashed: false,
    bytes: parts[1].body,
  };
  files.set(file.id, file);
  return json(res, 200, project(file));
}

function handleList(res, url) {
  listCallCount++;
  const q = url.searchParams.get('q') ?? '';
  let result = [...files.values()];

  for (const clause of splitClauses(q)) {
    const filter = compileClause(clause);
    if (filter === null) {
      return json(res, 400, { error: { code: 400, message: `fake cannot parse clause: ${clause}` } });
    }
    result = result.filter(filter);
  }

  if ((url.searchParams.get('orderBy') ?? '').startsWith('createdTime desc')) {
    result.sort((a, b) => b.createdTime.localeCompare(a.createdTime));
  }

  const pageSize = Number(url.searchParams.get('pageSize') || 100);
  const start = Number(url.searchParams.get('pageToken') || 0);
  const page = result.slice(start, start + pageSize);
  const nextStart = start + page.length;

  const body = { files: page.map(project) };
  if (nextStart < result.length) body.nextPageToken = String(nextStart);
  return json(res, 200, body);
}

function handleGet(res, url, id) {
  const file = files.get(id);
  if (!file) return json(res, 404, { error: { code: 404, message: 'File not found' } });
  if (url.searchParams.get('alt') === 'media') {
    res.writeHead(200, { 'Content-Type': file.mimeType, 'Content-Length': file.bytes.length });
    return res.end(file.bytes);
  }
  return json(res, 200, { ...project(file), trashed: file.trashed });
}

async function handlePatch(req, res, id) {
  const file = files.get(id);
  if (!file) return json(res, 404, { error: { code: 404, message: 'File not found' } });
  const patch = JSON.parse((await readBody(req)).toString('utf8'));
  if (typeof patch.trashed === 'boolean') file.trashed = patch.trashed;
  // Drive merges appProperties rather than replacing the map.
  if (patch.appProperties) Object.assign(file.appProperties, patch.appProperties);
  return json(res, 200, project(file));
}

// ── Drive query language (the subset the app emits) ───────────────────────

/** Splits on top-level " and ", ignoring the inside of {...} and '...'. */
function splitClauses(q) {
  const out = [];
  let depth = 0, quoted = false, current = '';
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    if (c === "'" && q[i - 1] !== '\\') quoted = !quoted;
    if (!quoted && c === '{') depth++;
    if (!quoted && c === '}') depth--;
    if (!quoted && depth === 0 && q.startsWith(' and ', i)) {
      out.push(current.trim());
      current = '';
      i += 4;
      continue;
    }
    current += c;
  }
  if (current.trim()) out.push(current.trim());
  return out.filter(Boolean);
}

const unescape = s => s.replace(/\\'/g, "'").replace(/\\\\/g, '\\');

function compileClause(clause) {
  let m;

  if ((m = /^'(.*)' in parents$/.exec(clause))) {
    const parent = unescape(m[1]);
    return f => f.parents.includes(parent);
  }
  if ((m = /^trashed\s*=\s*(true|false)$/.exec(clause))) {
    const want = m[1] === 'true';
    return f => f.trashed === want;
  }
  if ((m = /^mimeType\s*=\s*'(.*)'$/.exec(clause))) {
    const want = unescape(m[1]);
    return f => f.mimeType === want;
  }
  if ((m = /^name\s*=\s*'(.*)'$/.exec(clause))) {
    const want = unescape(m[1]);
    return f => f.name === want;
  }
  if ((m = /^appProperties has \{\s*key\s*=\s*'(.*?)'\s+and\s+value\s*=\s*'(.*?)'\s*\}$/.exec(clause))) {
    const key = unescape(m[1]);
    const value = unescape(m[2]);
    return f => f.appProperties?.[key] === value;
  }
  return null;
}

// ── plumbing ──────────────────────────────────────────────────────────────

function project(f) {
  const out = {
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size,
    createdTime: f.createdTime,
    appProperties: f.appProperties,
  };
  // Real Drive reports pixel dimensions for images it has processed, which is
  // what the masonry grid uses to reserve the right aspect ratio. Set
  // FAKE_DRIVE_NO_IMAGE_META=1 to omit it and exercise the app's fallback.
  if (!process.env.FAKE_DRIVE_NO_IMAGE_META) {
    const dims = jpegSize(f.bytes);
    if (dims) out.imageMediaMetadata = dims;
  }
  return out;
}

/** Reads width/height out of a JPEG's SOF marker. Enough for test fixtures. */
function jpegSize(buf) {
  if (!buf || buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    // SOF0-SOF15, excluding the non-frame markers DHT/JPG/DAC.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

function splitMultipart(buf, boundary) {
  const delim = Buffer.from(`--${boundary}`);
  const parts = [];
  let index = buf.indexOf(delim);
  while (index !== -1) {
    const start = index + delim.length;
    if (buf.slice(start, start + 2).toString() === '--') break; // closing delimiter
    const next = buf.indexOf(delim, start);
    const chunk = buf.slice(start, next === -1 ? buf.length : next);
    const sep = chunk.indexOf('\r\n\r\n');
    if (sep !== -1) {
      const headers = chunk.slice(0, sep).toString('utf8');
      let body = chunk.slice(sep + 4);
      if (body.slice(-2).toString() === '\r\n') body = body.slice(0, -2);
      const ct = /Content-Type:\s*([^\r\n;]+)/i.exec(headers);
      parts.push({ contentType: ct ? ct[1].trim() : null, body });
    }
    index = next;
  }
  return parts;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) });
  res.end(payload);
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`fake Google Drive listening on http://127.0.0.1:${PORT}`);
});
