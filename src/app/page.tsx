import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let redirectToStd = true; // default: redirect to Save the Date
  try {
    const { data } = await supabaseAdmin
      .from('std_config')
      .select('config')
      .eq('id', 'main')
      .single();

    if (data?.config && typeof data.config === 'object' && 'redirectToStd' in data.config) {
      redirectToStd = (data.config as { redirectToStd: boolean }).redirectToStd;
    }
  } catch (err) {
    console.error('[Root redirect] failed to fetch config, defaulting to STD:', err);
  }

  redirect(redirectToStd ? '/std' : '/event');
}
