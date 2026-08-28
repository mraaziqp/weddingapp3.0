import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let redirectToStd = false;
  let isWeddingDayMode = true; // Default: Wedding Evening Celebration is LIVE
  try {
    const { data } = await supabaseAdmin
      .from('std_config')
      .select('config')
      .eq('id', 'main')
      .single();

    if (data?.config && typeof data.config === 'object') {
      const cfg = data.config as { redirectToStd?: boolean; weddingDayMode?: boolean };
      if ('redirectToStd' in cfg) redirectToStd = Boolean(cfg.redirectToStd);
      if ('weddingDayMode' in cfg) isWeddingDayMode = Boolean(cfg.weddingDayMode);
    }
  } catch (err) {
    console.error('[Root redirect] failed to fetch config:', err);
  }

  if (isWeddingDayMode) {
    redirect('/event');
  }

  redirect(redirectToStd ? '/std' : '/invitation');
}
