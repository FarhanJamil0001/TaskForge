'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // Check allowlist before sign-up
        const res = await fetch('/api/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });
        const data = await res.json();
        if (!data.allowed) {
          throw new Error(
            'Your email is not authorized to create an account. Contact your administrator to request access.',
          );
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
            },
          },
        });
        if (error) throw error;
        setSignUpSuccess(true);
        return;
      }
      router.push('/orgs');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100">TaskForge</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
            Project management with Discord integration
          </p>
        </div>

        <div className="card">
          <div className="mb-6 flex rounded-lg bg-gray-100 p-1 dark:bg-zinc-700">
            <button
              onClick={() => {
                setIsLogin(true);
                setSignUpSuccess(false);
              }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                isLogin ? 'bg-white text-gray-900 shadow-sm dark:bg-zinc-600 dark:text-zinc-100' : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setSignUpSuccess(false);
              }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                !isLogin ? 'bg-white text-gray-900 shadow-sm dark:bg-zinc-600 dark:text-zinc-100' : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          {signUpSuccess ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <p className="font-medium">Check your email</p>
                <p className="mt-1 text-green-700">
                  We&apos;ve sent a verification link to <strong>{email}</strong>. Click the link in that email to verify your account and sign in.
                </p>
                <p className="mt-2 text-green-600">
                  Didn&apos;t receive it? Check your spam folder or try signing up again.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSignUpSuccess(false);
                  setFirstName('');
                  setLastName('');
                  setEmail('');
                  setPassword('');
                }}
                className="btn-secondary w-full"
              >
                Back to Sign Up
              </button>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                We&apos;ll send a verification email to your inbox. You&apos;ll need to click the link in that email to activate your account.
              </p>
            )}
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-200">
                    First name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="input"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-200">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="input"
                    placeholder="Doe"
                  />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-200">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
