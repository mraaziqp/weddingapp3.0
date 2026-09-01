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

/**
 * Which celebration a file belongs to.
 *
 * The side-event ("entertainment evening") crowd includes people who are not
 * coming to the wedding, so their photos must never appear on the wedding Live
 * Wall and the wedding's photos must never appear in their hub. That
 * separation is a *different Drive folder*, not a flag, because every wall
 * query already scopes itself with `'<folder>' in parents` — so a separate
 * parent excludes the other event automatically, including from
 * `visibility=all`, which omits the visibility filter entirely and would
 * otherwise mix the two. The same reasoning as the assets folder below.
 */
export type MediaScope = 'wedding' | 'event';

/** Photos, videos and voice memos share a folder; this is what tells them apart. */
export type MediaKind = 'photo' | 'video' | 'voice';

/** Classifies an upload from its MIME type, for the `kind` appProperty. */
export function kindForMime(mimeType: string): MediaKind {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'voice';
  return 'photo';
}

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
  kind: MediaKind;
  /** A short note the guest attached to the upload. */
  caption: string | null;
  /** Soft-deleted by an admin. Hidden from guests, still recoverable. */
  hidden: boolean;
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
const ASSET_FOLDER_NAME = process.env.GDRIVE_ASSET_FOLDER_NAME || 'Wedding Assets';
const EVENT_FOLDER_NAME = process.env.GDRIVE_EVENT_FOLDER_NAME || 'Event Evening Memories';
let cachedFolderId: string | null = null;
let cachedAssetFolderId: string | null = null;
let cachedEventFolderId: string | null = null;

/**
 * Resolves the Drive folder all media lives in, creating it on first use.
 *
 * We authorise with the `drive.file` scope, which only grants access to files
 * this app itself created — so the app makes its own folder rather than writing
 * into one created by hand in the Drive UI. The folder is fully visible in
 * Drive and can be renamed or moved without breaking anything, because it is
 * tracked by id rather than by path.
 */
async function resolveFolder(name: string): Promise<string> {
  const q = [
    "mimeType = 'application/vnd.google-apps.folder'",
    `name = '${escapeQ(name)}'`,
    'trashed = false',
  ].join(' and ');

  const found = await driveJson<{ files: { id: string }[] }>(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`
  );
  if (found.files?.length) return found.files[0].id;

  const created = await driveJson<{ id: string }>(`${DRIVE_API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' }),
  });
  return created.id;
}

export async function getMediaFolderId(): Promise<string> {
  if (process.env.GDRIVE_MEDIA_FOLDER_ID) return process.env.GDRIVE_MEDIA_FOLDER_ID;
  if (cachedFolderId) return cachedFolderId;
  cachedFolderId = await resolveFolder(FOLDER_NAME);
  return cachedFolderId;
}

/**
 * Folder for the couple's design assets — invitation and save-the-date
 * background images.
 *
 * Deliberately a *separate* folder rather than a flag on the file. Every wall
 * query scopes itself with `'<folder>' in parents`, so a different parent
 * excludes assets automatically — including from `visibility=all`, which omits
 * the visibility filter entirely and would otherwise show them.
 */
export async function getAssetFolderId(): Promise<string> {
  if (process.env.GDRIVE_ASSET_FOLDER_ID) return process.env.GDRIVE_ASSET_FOLDER_ID;
  if (cachedAssetFolderId) return cachedAssetFolderId;
  cachedAssetFolderId = await resolveFolder(ASSET_FOLDER_NAME);
  return cachedAssetFolderId;
}

/**
 * Folder for the entertainment evening's photos and voice memos.
 *
 * Separate from the wedding folder so the two guest lists never see each
 * other's uploads — see the `MediaScope` note above.
 */
export async function getEventFolderId(): Promise<string> {
  if (process.env.GDRIVE_EVENT_FOLDER_ID) return process.env.GDRIVE_EVENT_FOLDER_ID;
  if (cachedEventFolderId) return cachedEventFolderId;
  cachedEventFolderId = await resolveFolder(EVENT_FOLDER_NAME);
  return cachedEventFolderId;
}

function folderIdForScope(scope: MediaScope): Promise<string> {
  return scope === 'event' ? getEventFolderId() : getMediaFolderId();
}

/** The pinned-id env var for a scope, if the deploy set one. */
function pinnedFolderId(scope: MediaScope): string | undefined {
  return scope === 'event'
    ? process.env.GDRIVE_EVENT_FOLDER_ID
    : process.env.GDRIVE_MEDIA_FOLDER_ID;
}

function clearFolderCache(scope: MediaScope) {
  if (scope === 'event') cachedEventFolderId = null;
  else cachedFolderId = null;
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
    kind: props.kind === 'voice' || props.kind === 'video' ? props.kind : 'photo',
    caption: props.caption || null,
    hidden: props.hidden === 'true',
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
  /** Which celebration's folder to write into. Defaults to the wedding. */
  scope?: MediaScope;
  kind?: MediaKind;
  caption?: string | null;
};

/**
 * Writes one photo into the Drive folder with its metadata attached.
 *
 * Drive caps each appProperties value at 124 bytes, so free-text fields are
 * truncated rather than left to fail the whole upload at the API boundary.
 */
export async function uploadMedia(input: UploadMediaInput): Promise<DriveMedia> {
  const scope: MediaScope = input.scope ?? 'wedding';
  try {
    return await uploadToFolder(input, await folderIdForScope(scope));
  } catch (err) {
    // The folder id is cached for the life of the server instance. If the
    // folder is deleted in Drive, a warm instance keeps uploading into an id
    // that no longer exists and Drive answers 404 — forever, for that
    // instance. Drop the cache and let the next attempt find or recreate the
    // folder, so losing the folder costs one failed request, not the rest of
    // the night. Only retry when we hold the cache ourselves; a pinned
    // GDRIVE_MEDIA_FOLDER_ID that 404s is a config error worth surfacing.
    const isMissingParent = err instanceof Error && /Drive API 404/.test(err.message);
    if (!isMissingParent || pinnedFolderId(scope)) throw err;

    clearFolderCache(scope);
    return uploadToFolder(input, await folderIdForScope(scope));
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
  // Derived from the MIME type when the caller does not say, so a video
  // uploaded through this route is still tagged as one and the Vault knows to
  // render a player rather than an <img> that will never load.
  appProperties.kind = input.kind ?? kindForMime(input.mimeType);
  if (input.caption) appProperties.caption = clampProp(input.caption);

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

/**
 * Opens a resumable upload session and returns the URI the browser PUTs to.
 * ────────────────────────────────────────────────────────────────────────
 * Videos do not fit through the app's own upload route. This deploys to
 * Firebase App Hosting, which is Cloud Run, and Cloud Run refuses a request
 * body over 32MB — while a thirty-second clip off a phone is routinely 60MB
 * or more. Proxying the bytes would also mean paying for them twice: once
 * into the container, once back out to Google.
 *
 * So the server only mints the session. The OAuth token is spent here and
 * never leaves; what the browser receives is a single-use URI scoped to one
 * file in one folder, which is why this is safe to hand out — and why the
 * route that calls it is still admin-gated, since minting them freely would
 * let anyone write into the couple's Drive.
 *
 * The returned URI accepts a cross-origin PUT (Google sets CORS headers on
 * the upload host), and the browser can resume an interrupted one against the
 * same URI rather than restarting a 60MB video on a flaky venue connection.
 */
export async function createResumableSession(input: {
  filename: string;
  mimeType: string;
  visibility: MediaVisibility;
  scope?: MediaScope;
  guestId?: string | null;
  guestName?: string | null;
  questTag?: string | null;
  caption?: string | null;
  /** Total byte length, so Drive can reject an over-large file up front. */
  sizeBytes?: number;
}): Promise<{ uploadUri: string }> {
  const scope: MediaScope = input.scope ?? 'wedding';
  try {
    return await openSession(input, await folderIdForScope(scope));
  } catch (err) {
    // Same stale-folder recovery the multipart path has. Without it a deleted
    // (or recreated) folder leaves a warm instance minting sessions against an
    // id Drive no longer knows, and every guest upload fails with a 404 for as
    // long as that instance lives — which on the night is the whole night.
    const isMissingParent = err instanceof Error && /Drive API 404/.test(err.message);
    if (!isMissingParent || pinnedFolderId(scope)) throw err;

    clearFolderCache(scope);
    return openSession(input, await folderIdForScope(scope));
  }
}

async function openSession(
  input: {
    filename: string;
    mimeType: string;
    visibility: MediaVisibility;
    scope?: MediaScope;
    guestId?: string | null;
    guestName?: string | null;
    questTag?: string | null;
    caption?: string | null;
    sizeBytes?: number;
  },
  folderId: string
): Promise<{ uploadUri: string }> {
  const appProperties: Record<string, string> = {
    visibility: input.visibility,
    app: 'wedu',
    kind: kindForMime(input.mimeType),
  };
  if (input.guestId) appProperties.guestId = clampProp(input.guestId);
  if (input.guestName) appProperties.guestName = clampProp(input.guestName);
  if (input.questTag) appProperties.questTag = clampProp(input.questTag);
  if (input.caption) appProperties.caption = clampProp(input.caption);

  const metadata = {
    name: input.filename,
    parents: [folderId],
    appProperties,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Upload-Content-Type': input.mimeType,
  };
  if (input.sizeBytes) headers['X-Upload-Content-Length'] = String(input.sizeBytes);

  const res = await driveFetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=resumable&fields=${encodeURIComponent(FILE_FIELDS)}`,
    { method: 'POST', headers, body: JSON.stringify(metadata) }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Drive API ${res.status} opening resumable session: ${body.slice(0, 200)}`);
  }

  // Drive returns the session URI in Location; it already carries its own
  // upload token, so nothing further needs to be signed.
  const uploadUri = res.headers.get('location');
  if (!uploadUri) throw new Error('Drive did not return a resumable session URI');

  invalidateListCache();
  return { uploadUri };
}

/**
 * Stores one of the couple's design assets. Same Drive account, different
 * folder, so it never appears on the Live Wall or in the Vault.
 */
export async function uploadAsset(input: {
  bytes: ArrayBuffer | Uint8Array;
  filename: string;
  mimeType: string;
}): Promise<DriveMedia> {
  return uploadToFolder(
    {
      bytes: input.bytes,
      filename: input.filename,
      mimeType: input.mimeType,
      visibility: 'public',
    },
    await getAssetFolderId()
  );
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
  /** Which celebration's folder to read. Defaults to the wedding. */
  scope?: MediaScope;
  /**
   * Include admin-hidden uploads. Guests never get this; the couple's
   * moderation view does, so a hide can be undone.
   */
  includeHidden?: boolean;
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
  const {
    visibility = 'public',
    questTag,
    guestId,
    limit = 60,
    pageToken,
    scope = 'wedding',
    includeHidden = false,
  } = options;
  const folderId = await folderIdForScope(scope);

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

  // Drive's query language has no negation for appProperties — there is no
  // "where hidden != true" — so hidden files are dropped after mapping. Ask
  // for a few extra so a moderated photo doesn't visibly shorten the page.
  const overFetch = includeHidden ? 0 : 10;

  const params = new URLSearchParams({
    q: clauses.join(' and '),
    orderBy: 'createdTime desc',
    fields: `nextPageToken,files(${FILE_FIELDS})`,
    pageSize: String(Math.min(Math.max(limit + overFetch, 1), 1000)),
  });
  if (pageToken) params.set('pageToken', pageToken);

  const res = await driveJson<{ files: DriveFile[]; nextPageToken?: string }>(
    `${DRIVE_API}/files?${params}`
  );

  const mapped = (res.files ?? []).map(toDriveMedia);
  const visible = includeHidden ? mapped : mapped.filter(m => !m.hidden);

  return {
    items: visible.slice(0, limit),
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
export async function countMedia(
  visibility: MediaVisibility | 'all' = 'all',
  scope: MediaScope = 'wedding'
): Promise<number> {
  const folderId = await folderIdForScope(scope);
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

/**
 * Streams one file's bytes back, for the same-origin media proxy.
 *
 * `range` is forwarded to Drive verbatim so `<video>` can seek: a video
 * element requests byte ranges rather than the whole file, and a proxy that
 * ignores Range forces the browser to download the entire clip before it will
 * play, and makes the scrubber inert.
 */
export async function getMediaStream(
  fileId: string,
  range?: string | null
): Promise<{
  body: ReadableStream<Uint8Array>;
  mimeType: string;
  size: string | null;
  status: number;
  contentRange: string | null;
} | null> {
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

  const download = await driveFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: range ? { Range: range } : {},
  });

  // 206 is the success case for a ranged request, so it must not be treated
  // as a failure alongside the genuine errors.
  if ((!download.ok && download.status !== 206) || !download.body) {
    throw new Error(`Drive API ${download.status} downloading file`);
  }

  return {
    body: download.body as ReadableStream<Uint8Array>,
    mimeType: file.mimeType || 'application/octet-stream',
    size: download.headers.get('content-length') ?? file.size ?? null,
    status: download.status === 206 ? 206 : 200,
    contentRange: download.headers.get('content-range'),
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

/**
 * Admin soft-delete for the memory wall.
 *
 * Hides rather than trashes, because the judgement call is being made in a
 * dark room on a phone in the middle of a party: an accidental tap on the
 * wrong photo must be one tap to undo, not a trip to the Drive trash. A
 * genuinely unwanted file can still be trashed afterwards with `trashMedia`.
 *
 * Drive merges `appProperties` on PATCH, so writing this one key leaves
 * guestId, questTag and the rest untouched.
 */
export type MediaPatch = {
  caption?: string | null;
  guestName?: string | null;
  questTag?: string | null;
  visibility?: MediaVisibility;
  hidden?: boolean;
};

/**
 * Edits the metadata on one item. The single write primitive behind every
 * admin change to the wall.
 *
 * Drive merges `appProperties` rather than replacing the map, so only the
 * keys named here are touched. It stores every value as a string and has no
 * null type — clearing a field means writing `null`, which deletes the key,
 * which is why the empty string is normalised to `null` below. Without that,
 * clearing a caption would store the literal `""` and the item would keep
 * rendering an empty caption row forever.
 */
export async function updateMedia(fileId: string, patch: MediaPatch): Promise<void> {
  const appProperties: Record<string, string | null> = {};

  if (patch.caption !== undefined) appProperties.caption = patch.caption?.trim() || null;
  if (patch.guestName !== undefined) appProperties.guestName = patch.guestName?.trim() || null;
  if (patch.questTag !== undefined) appProperties.questTag = patch.questTag?.trim() || null;
  if (patch.visibility !== undefined) appProperties.visibility = patch.visibility;
  // Drive stores appProperties as strings; there is no boolean type.
  if (patch.hidden !== undefined) appProperties.hidden = patch.hidden ? 'true' : 'false';

  if (Object.keys(appProperties).length === 0) return;

  await driveJson(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appProperties }),
  });
  invalidateListCache();
}

/** Soft-deletes an item: hidden from guests, still recoverable by the couple. */
export async function setMediaHidden(fileId: string, hidden: boolean): Promise<void> {
  await updateMedia(fileId, { hidden });
}

/** Flips a photo between the Live Wall and the private Vault. */
export async function setMediaVisibility(
  fileId: string,
  visibility: MediaVisibility
): Promise<void> {
  await updateMedia(fileId, { visibility });
}
