import { supabase } from './supabase';

/** Display shape shared by the guest-photo walls (live wall, venue screen, gallery feed). */
export type WallItem = {
  id: string;
  imageUrl: string;
  description: string;
  imageHint?: string;
  guestName: string;
  likes: number;
  mediaType?: string;
  visibility?: string;
  questTag?: string;
  createdAt?: string;
};

/** Latest public guest photos & videos, newest first. */
export async function fetchPublicWallItems(limit = 80): Promise<WallItem[]> {
  // On client, fetch via /api/media to bypass any anonymous RLS locks
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/media?limit=${limit}`);
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.items)) {
          return json.items;
        }
      }
    } catch {
      // Fall back to direct Supabase query
    }
  }

  // Server / Fallback query
  try {
    const { data, error } = await supabase
      .from('media')
      .select('id, media_url, media_type, visibility, quest_tag, created_at')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data ?? []).map(m => ({
      id: String(m.id || ''),
      imageUrl: String(m.media_url || ''),
      mediaType: String(m.media_type || 'image'),
      description: m.quest_tag ? `Quest: ${m.quest_tag}` : 'A cherished memory',
      guestName: 'Wedding Guest',
      likes: 0,
      createdAt: String(m.created_at || ''),
    }));
  } catch (err) {
    console.error('[fetchPublicWallItems] error:', err);
    return [];
  }
}

/** Delete a media item (Admin operation) */
export async function deleteMediaItem(id: string, adminKey = '0408'): Promise<boolean> {
  try {
    const res = await fetch('/api/media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, adminKey }),
    });
    const data = await res.json();
    return Boolean(data.ok);
  } catch (err) {
    console.error('[deleteMediaItem] error:', err);
    return false;
  }
}
