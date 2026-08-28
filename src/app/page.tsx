import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let redirectToStd = false; // Default: Wedding Invitation & Guest VIP Hub is LIVE
  try {
    const { data } = await supabaseAdmin
      .from('std_config')
      .select('config')
      .eq('id', 'main')
      .single();

    if (data?.config && typeof data.config === 'object' && 'redirectToStd' in data.config) {
      redirectToStd = Boolean((data.config as { redirectToStd?: boolean }).redirectToStd);
    }
  } catch (err) {
    console.error('[Root redirect] failed to fetch config, defaulting to invitation:', err);
  }

  redirect(redirectToStd ? '/std' : '/invitation');
}
