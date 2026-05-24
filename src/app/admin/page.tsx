import { redirect } from 'next/navigation';

export default async function AdminAliasPage({
  searchParams,
}: {
  searchParams: Promise<{ adminKey?: string }>;
}) {
  const params = await searchParams;
  const adminKey = params?.adminKey;
  if (adminKey) {
    redirect(`/dashboard?adminKey=${encodeURIComponent(adminKey)}`);
  }
  redirect('/dashboard');
}
