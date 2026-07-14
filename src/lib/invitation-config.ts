/**
 * Single source of truth for the invitation config shape.
 * Stored as one JSONB row in Neon (`invitation_config`, id = 'main'),
 * so extending this type requires no SQL migration.
 *
 * Media field mapping (kept for back-compat with the upload flow):
 *   musicUrl → background_music_url
 *   videoUrl → hero_video_url (looping, muted, plays behind the card)
 *   imageUrl → hero_image_url (fallback when no video is set)
 */
export interface InvitationConfig {
  title: string;
  subtitle: string;
  dateTime: string;
  location: string;
  dressCode: string;
  rsvpDeadline: string;
  extraInfo: string;
  imageUrl?: string;
  musicUrl?: string;
  videoUrl?: string;
  weddingDate?: string;
  /** Poem shown on the cream "Gifting" enclosure card. Empty string hides the card. */
  giftingPoem?: string;
}

export const DEFAULT_INVITATION_CONFIG: InvitationConfig = {
  title: 'In The Name of Allah, The Most Gracious, The Most Merciful',
  subtitle: 'Abduraziq Parker & Razia Shade',
  dateTime: 'Sunday, 6 September 2026 at 10:00 AM',
  location: 'Masjidul Quds Mosque, Rylands',
  dressCode: 'Formal & Modest Attire',
  rsvpDeadline: '14 August 2026',
  extraInfo: 'Tuscany Hall, Rylands - 2 Jane Avenue, Gatesville at 5:00 PM',
  weddingDate: '2026-09-06T10:00:00+02:00',
  giftingPoem:
    "With all that we have, we've been truly blessed,\n" +
    'your presence and prayers are all that we request,\n' +
    'but should you decide to give nonetheless,\n' +
    'a monetary gift is what we suggest.',
};
