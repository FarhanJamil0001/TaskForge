import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileClient } from './client';

export default async function ProfilePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth');

  const meta = user.user_metadata as { first_name?: string; last_name?: string } | undefined;
  const firstName = meta?.first_name ?? '';
  const lastName = meta?.last_name ?? '';

  return (
    <ProfileClient
      email={user.email ?? ''}
      initialFirstName={firstName}
      initialLastName={lastName}
    />
  );
}
