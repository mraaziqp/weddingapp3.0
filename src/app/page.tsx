import { redirect } from 'next/navigation';
import { readConfigDoc } from '@/lib/firestore-server';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let redirectToStd = true; // default: redirect to Save the Date
  try {
    const config = await readConfigDoc<{ redirectToStd?: boolean }>('std_config');
    if (config && typeof config === 'object' && 'redirectToStd' in config) {
      redirectToStd = Boolean(config.redirectToStd);
    }
  } catch (err) {
    console.error('[Root redirect] failed to fetch config, defaulting to STD:', err);
  }

  redirect(redirectToStd ? '/std' : '/event');
}
