import { fetchGuestRows } from './data';

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
  groomCount: number;
  brideCount: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    // Fetch guests with RSVP counts
    const guestList = await fetchGuestRows();
    const totalGuests = guestList.length;
    const confirmedGuests = guestList.filter(g => g.rsvp_status === 'Confirmed').length;
    const pendingGuests = guestList.filter(g => g.rsvp_status === 'Pending').length;
    const declinedGuests = guestList.filter(g => g.rsvp_status === 'Regret').length;
    const checkedInCount = guestList.filter(g => g.checked_in_at).length;

    // tags is stored as a raw comma-separated string, not an
    // array (dbToGuest() is what normally splits it) — split here too.
    const groomCount = guestList.filter(g => g.tags?.split(',').some((t: string) => t.includes("Groom's"))).length;
    const brideCount = guestList.filter(g => g.tags?.split(',').some((t: string) => t.includes("Bride's"))).length;

    // Dietary counts
    const vegetarianCount = guestList.filter(
      g => g.dietary_restrictions?.toLowerCase().includes('vegetarian')
    ).length;
    const veganCount = guestList.filter(
      g => g.dietary_restrictions?.toLowerCase().includes('vegan')
    ).length;

    // Photo count comes from Google Drive via /api/media. A failure here must
    // not blank out the guest/RSVP numbers beside it, so it falls back to 0
    // rather than throwing into the catch below.
    let totalPhotos = 0;
    try {
      const res = await fetch('/api/media?visibility=all&count=1', { cache: 'no-store' });
      if (res.ok) totalPhotos = (await res.json()).count ?? 0;
    } catch (photoErr) {
      console.error('Failed to count photos:', photoErr);
    }

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
      groomCount,
      brideCount,
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
      groomCount: 0,
      brideCount: 0,
    };
  }
}
