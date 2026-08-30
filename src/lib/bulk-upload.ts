/**
 * Multi-file upload for the Memory Vault.
 * ───────────────────────────────────────
 * Everything goes to Drive through a resumable session: the server mints a
 * single-use URI and the browser PUTs the bytes straight to Google.
 *
 * That path is required for video — this deploys to Firebase App Hosting
 * (Cloud Run), which refuses a request body over 32MB, and a thirty-second
 * phone clip is routinely more than that. Using it for photos as well is a
 * deliberate simplification rather than an accident: it keeps one code path,
 * it credits every vault upload to the couple instead of the "A Guest"
 * fallback the guest route produces, and it means admin uploads go through an
 * admin-gated endpoint rather than the public one guests post to.
 *
 * The guest route stays as a fallback for files small enough to fit through
 * it, so a network that blocks Google's upload host degrades instead of
 * failing outright.
 */

import { compressImageFile } from './image-utils';

/**
 * Must not exceed MAX_UPLOAD_BYTES in /api/media/upload, or the fallback
 * "retries" into a guaranteed 413.
 */
const SERVER_ROUTE_CEILING = 15 * 1024 * 1024;

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
export async function uploadOne(
  task: UploadTask,
  visibility: 'public' | 'private',
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
    await uploadResumable(file, visibility, onProgress, signal);
  } catch (err) {
    // A cancelled upload is not a failure to retry around.
    if (signal?.aborted) throw err;
    // Only worth falling back if it would actually fit through the server.
    if (file.size > SERVER_ROUTE_CEILING) throw err;
    await uploadViaServer(file, visibility, onProgress, signal);
  }
}

// ── Path 1: through our own API ───────────────────────────────────────────

function uploadViaServer(
  file: File,
  visibility: 'public' | 'private',
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  form.append('visibility', visibility);

  return xhrSend('POST', '/api/media/upload', form, onProgress, signal);
}

// ── Path 2: straight to Drive ─────────────────────────────────────────────

async function uploadResumable(
  file: File,
  visibility: 'public' | 'private',
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
      visibility,
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
      let message = `Upload failed (${xhr.status})`;
      try {
        const parsed = JSON.parse(xhr.responseText);
        if (parsed.error) message = parsed.error;
      } catch {
        // Google's errors are not always JSON; the status alone will do.
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
