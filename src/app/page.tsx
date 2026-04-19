import { redirect } from 'next/navigation';

export default function Home() {
  // The main experience is the admin dashboard
  redirect('/dashboard');
}
