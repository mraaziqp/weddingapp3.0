import { supabase } from './supabase';

export interface DashboardStats {
  totalGuests: number;
  confirmedGuests: number;
  pendingGuests: number;
  declinedGuests: number;
  confirmationRate: number;
  totalPhotos: number;
  checkedInCount: number;
  vegetarianCount: number;
  veganCount: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    // Fetch guests with RSVP counts
    const { data: guests, error: guestErr } = await supabase
      .from('guests')
      .select('id, rsvp_status, dietary_restrictions, checked_in_at');

    if (guestErr) throw guestErr;

    const guestList = guests ?? [];
    const totalGuests = guestList.length;
    const confirmedGuests = guestList.filter(g => g.rsvp_status === 'Confirmed').length;
    const pendingGuests = guestList.filter(g => g.rsvp_status === 'Pending').length;
    const declinedGuests = guestList.filter(g => g.rsvp_status === 'Regret').length;
    const checkedInCount = guestList.filter(g => g.checked_in_at).length;

    // Dietary counts
    const vegetarianCount = guestList.filter(
      g => g.dietary_restrictions?.toLowerCase().includes('vegetarian')
    ).length;
    const veganCount = guestList.filter(
      g => g.dietary_restrictions?.toLowerCase().includes('vegan')
    ).length;

    // Fetch photo count
    const { data: photos, error: photoErr } = await supabase
      .from('media')
      .select('id', { count: 'exact' })
      .eq('media_type', 'image');

    if (photoErr) throw photoErr;
    const totalPhotos = photos?.length ?? 0;

    return {
      totalGuests,
      confirmedGuests,
      pendingGuests,
      declinedGuests,
      confirmationRate: totalGuests > 0 ? Math.round((confirmedGuests / totalGuests) * 100) : 0,
      totalPhotos,
      checkedInCount,
      vegetarianCount,
      veganCount,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return {
      totalGuests: 0,
      confirmedGuests: 0,
      pendingGuests: 0,
      declinedGuests: 0,
      confirmationRate: 0,
      totalPhotos: 0,
      checkedInCount: 0,
      vegetarianCount: 0,
      veganCount: 0,
    };
  }
}
