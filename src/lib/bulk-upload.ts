/**
 * Multi-file upload, shared by the Memory Vault and the guest camera hub.
 * ──────────────────────────────────────────────────────────────────────
 * Everything goes to Drive through a resumable session: the server mints a
 * single-use URI and the browser PUTs the bytes straight to Google.
 *
 * That path is required for anything but a small photo. The app is served
 * from Vercel, whose serverless functions reject a request body larger than
 * about 4.5MB *before* the handler runs — the platform answers with a plain
 * text "Request Entity Too Large", not our JSON — so a phone photo, let alone
 * a video, cannot be proxied through the app at all. Using it for photos as well is a
 * deliberate simplification rather than an accident: it keeps one code path,
 * it credits every vault upload to the couple instead of the "A Guest"
 * fallback the guest route produces, and it means admin uploads go through an
 * admin-gated endpoint rather than the public one guests post to.
 *
 * The app's own route stays as a fallback for files small enough to fit
 * through it, so a network that blocks Google's upload host degrades instead
 * of failing outright.
 *
 * Guests use the same path. They pass their invite code as `guestId`, which
 * the session endpoint resolves to a real household before minting anything —
 * so the wall credits their photos by name, and an anonymous caller cannot
 * open a write session against the couple's Drive.
 */

import { compressImageFile } from './image-utils';

/**
 * The largest file worth attempting through our own API route.
 *
 * Deliberately below the platform's ~4.5MB request cap rather than at it: the
 * multipart envelope adds overhead on top of the file's own bytes, and a
 * request rejected at the edge never reaches the handler, so it comes back as
 * plain text that looks nothing like our error shape. Anything bigger goes to
 * Drive directly or not at all.
 *
 * Must also not exceed MAX_UPLOAD_BYTES in /api/media/upload.
 */
const SERVER_ROUTE_CEILING = 4 * 1024 * 1024;

export type UploadStatus = 'queued' | 'preparing' | 'uploading' | 'done' | 'error';

export type UploadTask = {
  id: string;
  file: File;
  name: string;
  sizeBytes: number;
  isVideo: boolean;
  status: UploadStatus;
  /** 0-100. */
  progress: number;
  error?: string;
  /** Local object URL for the thumbnail; revoke when the queue is cleared. */
  previewUrl?: string;
};

export const ACCEPTED_TYPES = 'image/*,video/*';

export function isAcceptedFile(file: File): boolean {
  return file.type.startsWith('image/') || file.type.startsWith('video/');
}

/**
 * Uploads one file, reporting progress as it goes.
 *
 * `onProgress` is driven by XMLHttpRequest rather than fetch: fetch still has
 * no upload-progress event, and on a 200MB video a bar that only moves at the
 * end is indistinguishable from a hang.
 */
export type UploadContext = {
  visibility: 'public' | 'private';
  /** A guest's invite code. Omitted when the couple uploads from the Vault. */
  guestId?: string | null;
  /** Tags the upload against a photo quest. */
  questTag?: string | null;
};

export async function uploadOne(
  task: UploadTask,
  context: UploadContext,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<void> {
  const isVideo = task.file.type.startsWith('video/');

  // Images are downscaled first — the Vault never displays more than ~1600px,
  // and it turns a 12MB camera file into a few hundred KB.
  const file = isVideo
    ? task.file
    : await compressImageFile(task.file, { maxDimension: 1600, quality: 0.82 });

  try {
    await uploadResumable(file, context, onProgress, signal);
  } catch (err) {
    // A cancelled upload is not a failure to retry around.
    if (signal?.aborted) throw err;

    // Falling back is only meaningful for a file that would actually fit
    // through the platform's request cap. Retrying a 40MB video into a route
    // that cannot receive it just turns one clear error into a confusing 413,
    // so surface why the direct path failed instead.
    if (file.size > SERVER_ROUTE_CEILING) {
      throw new Error(
        err instanceof Error && err.message
          ? err.message
          : 'This file is too large to upload right now.'
      );
    }
    await uploadViaServer(file, context, onProgress, signal);
  }
}

// ── Path 1: through our own API ───────────────────────────────────────────

function uploadViaServer(
  file: File,
  context: UploadContext,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  form.append('visibility', context.visibility);
  if (context.guestId) form.append('guestId', context.guestId);
  if (context.questTag) form.append('questTag', context.questTag);

  return xhrSend('POST', '/api/media/upload', form, onProgress, signal);
}

// ── Path 2: straight to Drive ─────────────────────────────────────────────

async function uploadResumable(
  file: File,
  context: UploadContext,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch('/api/media/upload-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      visibility: context.visibility,
      guestId: context.guestId ?? undefined,
      questTag: context.questTag ?? undefined,
    }),
    signal,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.uploadUri) {
    throw new Error(body.error ?? `Could not start the upload (${res.status})`);
  }

  // A single PUT of the whole file. The session URI is what makes this
  // resumable in principle; chunking it is only worth the complexity if
  // uploads start actually breaking mid-flight.
  await xhrSend('PUT', body.uploadUri, file, onProgress, signal, {
    'Content-Type': file.type,
  });
}

// ── Shared XHR plumbing ───────────────────────────────────────────────────

function xhrSend(
  method: string,
  url: string,
  payload: XMLHttpRequestBodyInit,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
  headers?: Record<string, string>
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [key, value] of Object.entries(headers ?? {})) {
      xhr.setRequestHeader(key, value);
    }

    xhr.upload.onprogress = event => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      // The body here is not reliably JSON. Google's Drive errors are not
      // always, and a request rejected at the platform edge — the 413 for an
      // oversized body — never reaches our handler at all and comes back as
      // plain text, which is what used to surface to the guest as
      // "Unexpected token 'R'... is not valid JSON".
      let message =
        xhr.status === 413
          ? 'That file is too large to send this way.'
          : `Upload failed (${xhr.status})`;
      try {
        const parsed = JSON.parse(xhr.responseText);
        if (parsed?.error) message = parsed.error;
      } catch {
        // Not JSON — the status-derived message above is the useful one.
      }
      reject(new Error(message));
    };

    xhr.onerror = () =>
      reject(new Error('The connection dropped. Check your signal and try again.'));
    xhr.ontimeout = () => reject(new Error('That upload timed out.'));

    const abort = () => xhr.abort();
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    signal?.addEventListener('abort', abort, { once: true });

    xhr.send(payload);
  });
}

/**
 * Runs the queue with a small amount of concurrency.
 *
 * Serial is too slow for forty photos; unbounded saturates the uplink and
 * makes every file slow at once, so a stalled connection stalls everything.
 * Three at a time keeps the bar moving without starving any single upload.
 */
export const UPLOAD_CONCURRENCY = 3;
