// Client-side image resize/compression so uploads stay fast on venue wifi/cellular.
// Guest phone photos can be 8-20MB straight out of the camera roll; we never need
// more than ~1600px on the long edge for the live wall / vault.

export async function compressImageFile(
  file: File,
  { maxDimension = 1600, quality = 0.82 }: { maxDimension?: number; quality?: number } = {}
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));

    if (scale >= 1 && file.size <= 1.5 * 1024 * 1024) {
      bitmap.close?.();
      return file;
    }

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    );
    if (!blob) return file;

    // Only use the compressed version if it's actually smaller.
    if (blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg' });
  } catch {
    // createImageBitmap can fail on some HEIC/odd formats — fall back to the original file.
    return file;
  }
}

export class UploadTimeoutError extends Error {
  constructor(message = 'Upload timed out') {
    super(message);
    this.name = 'UploadTimeoutError';
  }
}

export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new UploadTimeoutError()), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
