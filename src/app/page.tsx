import { redirect } from 'next/navigation';

export default function Home() {
  // Public entrypoint defaults to the invitation experience.
  redirect('/event');
}
