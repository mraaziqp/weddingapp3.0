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
      // Continue to next check
    }
  }

  // Try creating 'wedding-photos' if not found
  try {
    const { data: created } = await supabaseAdmin.storage.createBucket('wedding-photos', {
      public: true,
      fileSizeLimit: 25 * 1024 * 1024, // 25MB
    });
    if (created) return 'wedding-photos';
  } catch {
    // If creation fails, default to wedding-photos
  }

  return 'wedding-photos';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const guestId = (formData.get('guestId') as string) || '';
    const visibility = ((formData.get('visibility') as string) || 'public') as 'public' | 'private';
    const questTag = (formData.get('questTag') as string) || null;

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 });
    }

    const fileType = file.type.startsWith('video') ? 'video' : 'image';
    const cleanFileName = file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : 'photo.jpg';
    const storagePath = `photos/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${cleanFileName}`;

    let mediaUrl = '';

    // 1. Attempt upload via Supabase Storage Admin
    try {
      const bucket = await getWorkingBucket();
      const buffer = Buffer.from(await file.arrayBuffer());

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(bucket)
        .upload(storagePath, buffer, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        });

      if (!uploadError && uploadData?.path) {
        const { data: publicUrlData } = supabaseAdmin.storage
          .from(bucket)
          .getPublicUrl(uploadData.path);
        mediaUrl = publicUrlData.publicUrl;
      }
    } catch (storageErr) {
      console.warn('[Media Upload] Storage upload fallback:', storageErr);
    }

    // 2. Fallback to base64 Data URL if storage bucket was unreachable
    if (!mediaUrl) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');
      mediaUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`;
    }

    // 3. Insert record into Supabase `media` table
    let insertResult = null;
    try {
      const { data, error } = await supabaseAdmin.from('media').insert({
        media_url: mediaUrl,
        media_type: fileType,
        visibility: visibility,
        quest_tag: questTag,
        guest_id: guestId || null,
        created_at: new Date().toISOString(),
      }).select().single();

      if (error) {
        console.error('[Media Upload] Database insert error:', error);
      } else {
        insertResult = data;
      }
    } catch (dbErr) {
      console.error('[Media Upload] DB insert exception:', dbErr);
    }

    return NextResponse.json({
      ok: true,
      mediaUrl,
      item: insertResult,
    });
  } catch (err) {
    console.error('[Media Upload API] Error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
