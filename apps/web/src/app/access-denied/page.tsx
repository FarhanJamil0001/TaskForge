'use client';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function AccessDeniedPage() {
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">
            ⛔
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="mt-3 text-gray-600">
          Your email is not authorized to access this application. If you believe this is an error,
          please contact your administrator to add your email to the allowlist.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <button onClick={handleSignOut} className="btn-primary w-full">
            Sign Out
          </button>
          <Link href="/auth" className="text-sm text-gray-500 hover:text-gray-700">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
