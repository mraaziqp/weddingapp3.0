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
      fileSizeLimit: 25 * 1024 * 1024, // 25MB
    });
    if (created) return 'wedding-photos';
  } catch {
    // Fallback
  }

  return 'wedding-photos';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const rawGuestId = (formData.get('guestId') as string) || '';
    const guestName = (formData.get('guestName') as string) || (formData.get('name') as string) || 'Wedding Guest';
    const visibility = ((formData.get('visibility') as string) || 'public') as 'public' | 'private';
    const questTag = (formData.get('questTag') as string) || null;

    if (!file) {
      return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 });
    }

    const fileType = file.type.startsWith('video') ? 'video' : 'image';
    const cleanFileName = file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : 'photo.jpg';
    const storagePath = `photos/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${cleanFileName}`;

    let mediaUrl = '';

    // 1. Storage Upload
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

    // 2. Base64 Fallback
    if (!mediaUrl) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');
      mediaUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`;
    }

    // 3. Verify Foreign Key for guestId
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

    const description = questTag ? `${guestName} · Quest: ${questTag}` : guestName;

    // 4. Insert record into Supabase `media` table
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
        console.warn('[Media Upload] Primary insert failed, retrying without FK:', error);
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

    return NextResponse.json({
      ok: true,
      mediaUrl,
      item: insertResult,
      guestName,
    });
  } catch (err) {
    console.error('[Media Upload API] Error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
