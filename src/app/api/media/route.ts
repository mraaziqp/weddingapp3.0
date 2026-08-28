import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAuthorizedAdminRequest, getAllowedAdminKeys } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// GET /api/media — fetch all public wall items (photos & videos)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '80', 10);
    const includePrivate = searchParams.get('all') === 'true';

    let query = supabaseAdmin
      .from('media')
      .select('id, media_url, media_type, visibility, quest_tag, guest_id, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!includePrivate) {
      query = query.eq('visibility', 'public');
    }

    const { data, error } = await query;

    if (error) {
      console.error('[API /api/media GET] Supabase error:', error);
      return NextResponse.json({ ok: false, error: error.message, items: [] }, { status: 500 });
    }

    const items = (data || []).map((m: Record<string, unknown>) => ({
      id: String(m.id || ''),
      imageUrl: String(m.media_url || ''),
      mediaType: String(m.media_type || 'image'),
      visibility: String(m.visibility || 'public'),
      questTag: m.quest_tag ? String(m.quest_tag) : undefined,
      guestName: 'Wedding Guest',
      description: m.quest_tag ? `Quest: ${String(m.quest_tag)}` : 'A cherished memory',
      likes: 0,
      createdAt: String(m.created_at || ''),
    }));

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error('[API /api/media GET] Exception:', err);
    return NextResponse.json({ ok: false, error: String(err), items: [] }, { status: 500 });
  }
}

// DELETE /api/media — allow admin to delete any photo/video
export async function DELETE(req: NextRequest) {
  try {
    const isAuthed = isAuthorizedAdminRequest(req);
    const body = await req.json().catch(() => ({}));
    const { id, adminKey } = body;

    const allowed = getAllowedAdminKeys();
    if (!isAuthed && (!adminKey || !allowed.includes(String(adminKey).trim()))) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing item ID' }, { status: 400 });
    }

    // 1. Delete from database
    const { error: dbError } = await supabaseAdmin
      .from('media')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('[API /api/media DELETE] DB error:', dbError);
      return NextResponse.json({ ok: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Media deleted successfully' });
  } catch (err) {
    console.error('[API /api/media DELETE] Exception:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
