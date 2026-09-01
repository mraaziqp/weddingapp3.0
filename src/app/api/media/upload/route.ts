import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const BUCKET_NAMES = ['wedding-photos', 'wedding-assets'];

async function getWorkingBucket(): Promise<string> {
  for (const bucket of BUCKET_NAMES) {
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      if (buckets && buckets.some(b => b.name === bucket)) {
        return bucket;
      }
    } catch {
      // Continue
    }
  }

  try {
    const { data: created } = await supabaseAdmin.storage.createBucket('wedding-photos', {
      public: true,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB for video support
    });
    if (created) return 'wedding-photos';
  } catch {
    // Fallback
  }

  return 'wedding-photos';
}

async function uploadSingleFile(
  file: File,
  rawGuestId: string,
  guestName: string,
  visibility: 'public' | 'private',
  questTag: string | null,
  validGuestId: string | null,
  bucket: string
) {
  const fileType = file.type.startsWith('video') ? 'video' : 'image';
  const cleanFileName = file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : `${Date.now()}.jpg`;
  const storagePath = `photos/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${cleanFileName}`;

  let mediaUrl = '';

  // 1. Supabase Storage Upload
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: file.type || (fileType === 'video' ? 'video/mp4' : 'image/jpeg'),
        upsert: true,
      });

    if (!uploadError && uploadData?.path) {
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(uploadData.path);
      mediaUrl = publicUrlData.publicUrl;
    }
  } catch (storageErr) {
    console.warn('[Media Upload] Storage fallback for file:', file.name, storageErr);
  }

  // 2. Base64 Fallback (for smaller images if storage unavailable)
  if (!mediaUrl && file.size < 6 * 1024 * 1024) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    mediaUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`;
  }

  if (!mediaUrl) {
    throw new Error(`Failed to upload ${file.name}`);
  }

  // 3. Database Insert
  let insertResult = null;
  try {
    const { data, error } = await supabaseAdmin.from('media').insert({
      media_url: mediaUrl,
      media_type: fileType,
      visibility: visibility,
      quest_tag: questTag,
      guest_id: validGuestId,
      created_at: new Date().toISOString(),
    }).select().single();

    if (error) {
      const { data: retryData, error: retryError } = await supabaseAdmin.from('media').insert({
        media_url: mediaUrl,
        media_type: fileType,
        visibility: visibility,
        quest_tag: questTag,
        guest_id: null,
        created_at: new Date().toISOString(),
      }).select().single();

      if (!retryError && retryData) {
        insertResult = retryData;
      }
    } else {
      insertResult = data;
    }
  } catch (dbErr) {
    console.error('[Media Upload] DB insert exception:', dbErr);
  }

  return {
    id: insertResult?.id || `temp-${Date.now()}`,
    mediaUrl,
    imageUrl: mediaUrl,
    mediaType: fileType,
    visibility,
    guestName,
    questTag,
    description: questTag ? `Quest: ${questTag}` : `Captured by ${guestName}`,
    createdAt: new Date().toISOString(),
    item: insertResult,
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Collect all uploaded files (supports 'file' or 'files')
    const rawFiles: File[] = [];
    const filesList = formData.getAll('files');
    const singleList = formData.getAll('file');

    for (const f of [...filesList, ...singleList]) {
      if (f instanceof File && f.size > 0) {
        rawFiles.push(f);
      }
    }

    if (rawFiles.length === 0) {
      return NextResponse.json({ ok: false, error: 'No files provided' }, { status: 400 });
    }

    const rawGuestId = (formData.get('guestId') as string) || '';
    const guestName = (formData.get('guestName') as string) || (formData.get('name') as string) || 'Wedding Guest';
    const visibility = ((formData.get('visibility') as string) || 'public') as 'public' | 'private';
    const questTag = (formData.get('questTag') as string) || null;

    // Check valid guest ID once
    let validGuestId: string | null = null;
    if (rawGuestId) {
      try {
        const { data: g } = await supabaseAdmin
          .from('guests')
          .select('id')
          .eq('id', rawGuestId)
          .maybeSingle();
        if (g?.id) validGuestId = g.id;
      } catch {
        validGuestId = null;
      }
    }

    const bucket = await getWorkingBucket();

    // Process all files concurrently (up to 4 at a time to prevent memory spikes)
    const uploadedResults: Awaited<ReturnType<typeof uploadSingleFile>>[] = [];
    const errors: string[] = [];

    // Process in batches of 4
    for (let i = 0; i < rawFiles.length; i += 4) {
      const batch = rawFiles.slice(i, i + 4);
      const batchPromises = batch.map(file =>
        uploadSingleFile(file, rawGuestId, guestName, visibility, questTag, validGuestId, bucket)
          .catch(err => {
            console.error('[Upload Error for file]:', file.name, err);
            errors.push(`${file.name}: ${err.message}`);
            return null;
          })
      );
      const results = await Promise.all(batchPromises);
      for (const res of results) {
        if (res) uploadedResults.push(res);
      }
    }

    if (uploadedResults.length === 0) {
      return NextResponse.json({ ok: false, error: 'All file uploads failed', details: errors }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      count: uploadedResults.length,
      mediaUrl: uploadedResults[0]?.mediaUrl,
      item: uploadedResults[0]?.item,
      items: uploadedResults,
      guestName,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[Media Upload API] Error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
