/**
 * Login Page - Sign in with email/password
 * Design-taste compliant: one section per screen, equal edges, real icons
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { Link } from 'next/navigation';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthProvider } from '@/components/auth/AuthProvider';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const error = searchParams.get('error');

  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Logo/Brand */}
          <div className="text-center mb-10">
            <Link href="/" className="inline-flex items-center gap-2" aria-label="CWPC BAD Home">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">CWPC BAD</span>
            </Link>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Electronic Grading System</p>
          </div>

          {/* Login Card */}
          <div className="card p-8 animate-fade-in">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Welcome Back</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Sign in to access your grading dashboard
              </p>
            </div>

            {/* Error from URL params */}
            {error && (
              <div
                className="mb-6 p-3 rounded-soft bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 flex items-center gap-2 animate-slide-up"
                role="alert"
              >
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" aria-hidden="true" />
                <p className="text-sm text-rose-700 dark:text-rose-300">
                  {error === 'email_not_confirmed' ? 'Please verify your email address before signing in.' :
                   error === 'invalid_credentials' ? 'Invalid email or password. Please try again.' :
                   'An error occurred. Please try again.'}
                </p>
              </div>
            )}

            <LoginForm
              redirectTo={redirectTo}
              onError={(err) => {
                console.error('Login error:', err);
              }}
            />

            {/* MFA Note */}
            <div className="mt-6 p-3 rounded-soft bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-2">
                <Lock className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="mt-1">
                    If you have MFA enabled, you&apos;ll be prompted for your authenticator code after signing in.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <p>
              Need help?{' '}
              <a href="/support" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                Contact Support
              </a>
            </p>
            <p>
              <Link href="/auth/register" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                Register as Professor
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}