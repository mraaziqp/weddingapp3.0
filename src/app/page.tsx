import { redirect } from 'next/navigation';
import { readConfigDoc } from '@/lib/firestore-server';

export const dynamic = 'force-dynamic';

/**
 * Where the site root sends people.
 *
 * The celebration is the default, and the Save the Date envelope is now the
 * opt-in. It used to be the other way round, with the envelope also serving as
 * the fallback when the config could not be read — so any Firestore outage
 * sent every visitor to the envelope and there was no way to get out of it:
 * the dashboard toggle writes to the same database that was failing, so
 * turning it off could not be saved either. The envelope was the one phase of
 * the site guaranteed to survive its own database going down.
 *
 * Inverting it means the failure mode is landing on the live celebration —
 * the page people are actually here for on the night — rather than on an
 * invitation to an event that has already started.
 */
export default async function Home() {
  let showSaveTheDate = false;

  try {
    const config = await readConfigDoc<{ redirectToStd?: boolean }>('std_config');
    // Only an explicit, stored `true` brings the envelope back. A missing key,
    // a null document, or a read that throws all mean "show the celebration".
    showSaveTheDate = config?.redirectToStd === true;
  } catch (err) {
    console.error('[Root redirect] config unreadable, showing the celebration:', err);
  }

  redirect(showSaveTheDate ? '/std' : '/event');
}
