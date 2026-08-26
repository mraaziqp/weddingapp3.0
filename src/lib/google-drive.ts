/**
 * Google Drive as the media database — server only.
 * ─────────────────────────────────────────────────
 * Guest photos live in a folder in the couple's own Google Drive. There is no
 * separate metadata table: everything the app needs about a photo (which guest
 * took it, whether it's for the Live Wall or the private Vault, which quest it
 * was tagged with) is stored on that Drive file's `appProperties`, which the
 * Drive query language can filter on directly.
 *
 * Talks to the Drive REST API with plain fetch rather than the `googleapis`
 * package: that package pulls a very large tree of generated clients into the
 * serverless bundle for the handful of calls we actually make.
 *
 * Required env (see .env.example):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 *   GDRIVE_MEDIA_FOLDER_ID  (optional — auto-created on first upload if unset)
 */

/**
 * Google's endpoints, overridable so the pipeline can be exercised end to end
 * against a local fake (see scripts/fake-google-drive.mjs) without real
 * credentials. Ignored in production builds — a stray env var must never be
 * able to redirect the couple's wedding photos to another host.
 */
const allowEndpointOverride = process.env.NODE_ENV !== 'production';
const endpoint = (envVar: string, real: string) =>
  (allowEndpointOverride && process.env[envVar]) || real;

const TOKEN_ENDPOINT = endpoint('GOOGLE_TOKEN_ENDPOINT', 'https://oauth2.googleapis.com/token');
const DRIVE_API = endpoint('GOOGLE_DRIVE_API', 'https://www.googleapis.com/drive/v3');
const DRIVE_UPLOAD_API = endpoint(
  'GOOGLE_DRIVE_UPLOAD_API',
  'https://www.googleapis.com/upload/drive/v3'
);

/** Fields we ask Drive for on every file — keep in sync with `toDriveMedia`. */
const FILE_FIELDS =
  'id,name,mimeType,size,createdTime,appProperties,imageMediaMetadata(width,height)';

export type MediaVisibility = 'public' | 'private';

export type DriveMedia = {
  id: string;
  /** Same-origin proxy URL — Drive's own file links expire and rate-limit. */
  url: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  guestId: string | null;
  guestName: string | null;
  visibility: MediaVisibility;
  questTag: string | null;
  width: number | null;
  height: number | null;
};

export class DriveNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(`Google Drive is not configured. Missing env: ${missing.join(', ')}`);
    this.name = 'DriveNotConfiguredError';
  }
}

function missingEnv(): string[] {
  return (['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'] as const).filter(
    k => !process.env[k]
  );
}

/** True when the three OAuth secrets are present, so callers can degrade gracefully. */
export function isDriveConfigured(): boolean {
  return missingEnv().length === 0;
}

// ── Access token ──────────────────────────────────────────────────────────
// Refresh tokens are long-lived; access tokens last an hour. Cache the access
// token in module scope so a burst of uploads on the dance floor doesn't hit
// the token endpoint once per photo.

let cachedToken: { value: string; expiresAt: number } | null = null;
let inFlightToken: Promise<string> | null = null;

async function getAccessToken(): Promise<string> {
  const missing = missingEnv();
  if (missing.length) throw new DriveNotConfiguredError(missing);

  // 60s of slack so a token never expires mid-request.
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  // Collapse concurrent refreshes into a single token request.
  if (inFlightToken) return inFlightToken;

  inFlightToken = (async () => {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
        grant_type: 'refresh_token',
      }),
      cache: 'no-store',
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      cachedToken = null;
      throw new Error(
        `Google token refresh failed (${res.status}): ${
          body.error_description ?? body.error ?? 'unknown error'
        }`
      );
    }

    cachedToken = {
      value: body.access_token,
      expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
    };
    return cachedToken.value;
  })();

  try {
    return await inFlightToken;
  } finally {
    inFlightToken = null;
  }
}

async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  // A 401 here means the cached token went stale early (clock skew, a grant
  // revoked and re-issued). Drop it and retry exactly once before failing.
  if (res.status === 401) {
    cachedToken = null;
    const retryToken = await getAccessToken();
    return fetch(url, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${retryToken}` },
      cache: 'no-store',
    });
  }
  return res;
}

async function driveJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await driveFetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: { message?: string } }).error?.message ?? res.statusText;
    throw new Error(`Drive API ${res.status}: ${message}`);
  }
  return body as T;
}

// ── Folder ────────────────────────────────────────────────────────────────

const FOLDER_NAME = process.env.GDRIVE_MEDIA_FOLDER_NAME || 'Wedding Media';
let cachedFolderId: string | null = null;

/**
 * Resolves the Drive folder all media lives in, creating it on first use.
 *
 * We authorise with the `drive.file` scope, which only grants access to files
 * this app itself created — so the app makes its own folder rather than writing
 * into one created by hand in the Drive UI. The folder is fully visible in
 * Drive and can be renamed or moved without breaking anything, because it is
 * tracked by id rather than by path.
 */
export async function getMediaFolderId(): Promise<string> {
  if (process.env.GDRIVE_MEDIA_FOLDER_ID) return process.env.GDRIVE_MEDIA_FOLDER_ID;
  if (cachedFolderId) return cachedFolderId;

  const q = [
    "mimeType = 'application/vnd.google-apps.folder'",
    `name = '${escapeQ(FOLDER_NAME)}'`,
    'trashed = false',
  ].join(' and ');

  const found = await driveJson<{ files: { id: string }[] }>(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`
  );

  if (found.files?.length) {
    cachedFolderId = found.files[0].id;
    return cachedFolderId;
  }

  const created = await driveJson<{ id: string }>(`${DRIVE_API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  cachedFolderId = created.id;
  return cachedFolderId;
}

// ── Mapping ───────────────────────────────────────────────────────────────

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  appProperties?: Record<string, string>;
  imageMediaMetadata?: { width?: number; height?: number };
};

function toDriveMedia(f: DriveFile): DriveMedia {
  const props = f.appProperties ?? {};
  return {
    id: f.id,
    url: `/api/media/${f.id}/raw`,
    name: f.name,
    mimeType: f.mimeType,
    size: Number(f.size ?? 0),
    createdAt: f.createdTime,
    guestId: props.guestId || null,
    guestName: props.guestName || null,
    visibility: props.visibility === 'private' ? 'private' : 'public',
    questTag: props.questTag || null,
    width: f.imageMediaMetadata?.width ?? null,
    height: f.imageMediaMetadata?.height ?? null,
  };
}

// ── Upload ────────────────────────────────────────────────────────────────

export type UploadMediaInput = {
  bytes: ArrayBuffer | Uint8Array;
  filename: string;
  mimeType: string;
  visibility: MediaVisibility;
  guestId?: string | null;
  guestName?: string | null;
  questTag?: string | null;
};

/**
 * Writes one photo into the Drive folder with its metadata attached.
 *
 * Drive caps each appProperties value at 124 bytes, so free-text fields are
 * truncated rather than left to fail the whole upload at the API boundary.
 */
export async function uploadMedia(input: UploadMediaInput): Promise<DriveMedia> {
  try {
    return await uploadToFolder(input, await getMediaFolderId());
  } catch (err) {
    // The folder id is cached for the life of the server instance. If the
    // folder is deleted in Drive, a warm instance keeps uploading into an id
    // that no longer exists and Drive answers 404 — forever, for that
    // instance. Drop the cache and let the next attempt find or recreate the
    // folder, so losing the folder costs one failed request, not the rest of
    // the night. Only retry when we hold the cache ourselves; a pinned
    // GDRIVE_MEDIA_FOLDER_ID that 404s is a config error worth surfacing.
    const isMissingParent = err instanceof Error && /Drive API 404/.test(err.message);
    if (!isMissingParent || process.env.GDRIVE_MEDIA_FOLDER_ID) throw err;

    cachedFolderId = null;
    return uploadToFolder(input, await getMediaFolderId());
  }
}

async function uploadToFolder(input: UploadMediaInput, folderId: string): Promise<DriveMedia> {
  const appProperties: Record<string, string> = {
    visibility: input.visibility,
    app: 'wedu',
  };
  if (input.guestId) appProperties.guestId = clampProp(input.guestId);
  if (input.guestName) appProperties.guestName = clampProp(input.guestName);
  if (input.questTag) appProperties.questTag = clampProp(input.questTag);

  const metadata = {
    name: input.filename,
    parents: [folderId],
    appProperties,
  };

  const boundary = `wedu-${crypto.randomUUID()}`;
  const body = buildMultipartBody(boundary, metadata, input.bytes, input.mimeType);

  const file = await driveJson<DriveFile>(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=${encodeURIComponent(FILE_FIELDS)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    }
  );

  invalidateListCache();
  return toDriveMedia(file);
}

function clampProp(value: string): string {
  // 124 bytes, not 124 characters — count UTF-8 length so an emoji in a guest
  // name can't silently push the value past Drive's limit.
  const encoder = new TextEncoder();
  if (encoder.encode(value).length <= 124) return value;
  let out = value;
  while (out.length > 0 && encoder.encode(out).length > 121) out = out.slice(0, -1);
  return `${out}…`;
}

function buildMultipartBody(
  boundary: string,
  metadata: unknown,
  bytes: ArrayBuffer | Uint8Array,
  mimeType: string
): Blob {
  const head =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`;
  const tail = `\r\n--${boundary}--`;
  return new Blob([head, bytes as BlobPart, tail]);
}

// ── Read ──────────────────────────────────────────────────────────────────

export type ListMediaOptions = {
  visibility?: MediaVisibility | 'all';
  questTag?: string | null;
  guestId?: string | null;
  limit?: number;
  pageToken?: string;
};

/**
 * Short-lived cache in front of Drive's file listing.
 *
 * Every guest's gallery polls every 20 seconds and the venue screen every 10.
 * With ~150 guests on the dance floor that is several hundred `files.list`
 * calls a minute against a single Drive project — enough to run into Google's
 * per-project rate limits on the one night it must not fail, and each call
 * adds its round trip to the guest's page load.
 *
 * A few seconds of staleness is invisible on a photo wall, so identical
 * queries inside the window share one Drive call. Writes invalidate
 * immediately, so a guest still sees their own photo appear right after
 * uploading it rather than waiting out the TTL.
 */
const LIST_CACHE_TTL_MS = 8_000;
const listCache = new Map<string, { at: number; value: { items: DriveMedia[]; nextPageToken: string | null } }>();

/** Called after any write so the next read reflects it immediately. */
function invalidateListCache() {
  listCache.clear();
}

export async function listMedia(
  options: ListMediaOptions = {}
): Promise<{ items: DriveMedia[]; nextPageToken: string | null }> {
  const cacheKey = JSON.stringify(options);
  const hit = listCache.get(cacheKey);
  if (hit && Date.now() - hit.at < LIST_CACHE_TTL_MS) return hit.value;

  const value = await listMediaUncached(options);

  // Bound the map: distinct queries are few (a handful of visibility/quest
  // combinations), but a crafted questTag could otherwise grow it forever.
  if (listCache.size > 64) listCache.clear();
  listCache.set(cacheKey, { at: Date.now(), value });
  return value;
}

async function listMediaUncached(
  options: ListMediaOptions
): Promise<{ items: DriveMedia[]; nextPageToken: string | null }> {
  const { visibility = 'public', questTag, guestId, limit = 60, pageToken } = options;
  const folderId = await getMediaFolderId();

  const clauses = [`'${folderId}' in parents`, 'trashed = false'];
  if (visibility !== 'all') {
    clauses.push(`appProperties has { key='visibility' and value='${visibility}' }`);
  }
  if (questTag) {
    clauses.push(`appProperties has { key='questTag' and value='${escapeQ(questTag)}' }`);
  }
  if (guestId) {
    clauses.push(`appProperties has { key='guestId' and value='${escapeQ(guestId)}' }`);
  }

  const params = new URLSearchParams({
    q: clauses.join(' and '),
    orderBy: 'createdTime desc',
    fields: `nextPageToken,files(${FILE_FIELDS})`,
    pageSize: String(Math.min(Math.max(limit, 1), 1000)),
  });
  if (pageToken) params.set('pageToken', pageToken);

  const res = await driveJson<{ files: DriveFile[]; nextPageToken?: string }>(
    `${DRIVE_API}/files?${params}`
  );

  return {
    items: (res.files ?? []).map(toDriveMedia),
    nextPageToken: res.nextPageToken ?? null,
  };
}

function escapeQ(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Total photo count for the dashboard.
 *
 * Drive has no "count only" query, so this pages through ids — 1000 per call,
 * which is one round trip for any realistic wedding. Capped so a runaway
 * folder can't turn a dashboard load into an unbounded loop.
 */
export async function countMedia(visibility: MediaVisibility | 'all' = 'all'): Promise<number> {
  const folderId = await getMediaFolderId();
  const clauses = [`'${folderId}' in parents`, 'trashed = false'];
  if (visibility !== 'all') {
    clauses.push(`appProperties has { key='visibility' and value='${visibility}' }`);
  }

  let total = 0;
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({
      q: clauses.join(' and '),
      fields: 'nextPageToken,files(id)',
      pageSize: '1000',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await driveJson<{ files: { id: string }[]; nextPageToken?: string }>(
      `${DRIVE_API}/files?${params}`
    );
    total += res.files?.length ?? 0;
    if (!res.nextPageToken) break;
    pageToken = res.nextPageToken;
  }
  return total;
}

/** Streams one file's bytes back, for the same-origin image proxy. */
export async function getMediaStream(
  fileId: string
): Promise<{ body: ReadableStream<Uint8Array>; mimeType: string; size: string | null } | null> {
  const meta = await driveFetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id,mimeType,size,appProperties,trashed`
  );
  if (meta.status === 404) return null;
  if (!meta.ok) throw new Error(`Drive API ${meta.status} fetching file metadata`);

  const file = (await meta.json()) as DriveFile & { trashed?: boolean };
  if (file.trashed) return null;
  // Only ever serve files this app put there, so the proxy can't be pointed at
  // an unrelated document in the couple's Drive.
  if (file.appProperties?.app !== 'wedu') return null;

  const download = await driveFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`);
  if (!download.ok || !download.body) {
    throw new Error(`Drive API ${download.status} downloading file`);
  }

  return {
    body: download.body as ReadableStream<Uint8Array>,
    mimeType: file.mimeType || 'application/octet-stream',
    size: file.size ?? null,
  };
}

/** Moves a photo to the Drive trash — recoverable for 30 days, unlike a hard delete. */
export async function trashMedia(fileId: string): Promise<void> {
  await driveJson(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashed: true }),
  });
  invalidateListCache();
}

/** Flips a photo between the Live Wall and the private Vault. */
export async function setMediaVisibility(
  fileId: string,
  visibility: MediaVisibility
): Promise<void> {
  await driveJson(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appProperties: { visibility } }),
  });
  invalidateListCache();
}
