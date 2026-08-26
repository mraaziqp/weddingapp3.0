import { NextRequest, NextResponse } from 'next/server';
import { uploadAsset, isDriveConfigured } from '@/lib/google-drive';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';

/**
 * Admin asset upload — background images for the invitation and
 * save-the-date editors.
 *
 * These used to go to the Supabase `wedding-assets` bucket. They now land in
 * the same Google Drive folder as guest photos, tagged `asset` so they never
 * appear on the Live Wall or in the Vault alongside real memories.
 *
 * Admin-only: these are the couple's design assets, not guest content.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = /^image\/(jpeg|png|webp|gif|svg\+xml)$/;

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isDriveConfigured()) {
    return NextResponse.json(
      { error: 'Image storage is not configured yet.' },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Malformed upload' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file attached' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'That file came through empty' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'That image is too large' }, { status: 413 });
  }
  if (!ALLOWED_MIME.test(file.type)) {
    return NextResponse.json({ error: 'Only image files can be uploaded' }, { status: 415 });
  }

  const folder = typeof form.get('folder') === 'string' ? String(form.get('folder')) : 'assets';

  try {
    const media = await uploadAsset({
      bytes: await file.arrayBuffer(),
      filename: `${folder}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)}`,
      mimeType: file.type,
    });

    return NextResponse.json({ ok: true, url: media.url }, { status: 201 });
  } catch (err) {
    console.error('[Assets] upload failed:', err);
    return NextResponse.json({ error: 'Could not upload that image' }, { status: 502 });
  }
}
