import { supabase } from './supabase';

/** Display shape shared by the guest-photo walls (live wall, venue screen, gallery feed). */
export type WallItem = {
  id: string;
  imageUrl: string;
  description: string;
  imageHint?: string;
  guestName: string;
  likes: number;
};

/** Latest public guest photos from the real media table, newest first. */
export async function fetchPublicWallItems(limit = 60): Promise<WallItem[]> {
  const { data, error } = await supabase
    .from('media')
    .select('id, media_url, created_at')
    .eq('visibility', 'public')
    .eq('media_type', 'image')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(m => ({
    id: m.id,
    imageUrl: m.media_url,
    description: 'A cherished memory',
    guestName: 'A Guest',
    likes: 0,
  }));
}
