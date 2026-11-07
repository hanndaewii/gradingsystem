/**
 * Pending Approval Page - Polls for account approval status
 * Design-taste compliant: one section per screen, equal edges, real icons
 */

'use client';

import { useEffect, useState } from 'react';
import { Link, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Clock, CheckCircle, AlertCircle, Mail, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PendingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'pending' | 'approved' | 'rejected' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkApproval = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_approved, approval_status, rejection_reason')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setStatus('error');
        setError('Failed to check approval status');
        return;
      }

      if (profile?.is_approved) {
        setStatus('approved');
        // Redirect after short delay
        setTimeout(() => router.push('/dashboard'), 1500);
      } else if (profile?.approval_status === 'rejected') {
        setStatus('rejected');
      } else {
        setStatus('pending');
      }
    };

    checkApproval();

    // Poll every 10 seconds
    const interval = setInterval(checkApproval, 10000);
    return () => clearInterval(interval);
  }, [router]);

  const handleRefresh = () => {
    setStatus('checking');
    setError(null);
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mb-6 animate-pulse">
            <Loader2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400 animate-spin" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Checking Status</h1>
          <p className="text-slate-600 dark:text-slate-400">Please wait while we verify your account...</p>
        </div>
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-6 animate-scale-in">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Account Approved!</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Redirecting to dashboard...</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8 text-center animate-fade-in">
          {status === 'pending' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mb-6">
                <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Awaiting Approval</h1>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Your registration has been submitted and is pending administrator review.
                This typically takes 1-2 business days.
              </p>

              <div className="p-4 rounded-soft bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                  <Mail className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                  <span>You&apos;ll receive an email notification when your account is approved</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                  <Clock className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                  <span>We check for approval every 10 seconds automatically</span>
                </div>
              </div>

              <button
                onClick={handleRefresh}
                className="mt-6 w-full btn-secondary py-2 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Check Now
              </button>
            </>
          )}

          {status === 'rejected' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 dark:bg-rose-900 flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
              </div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Registration Not Approved</h1>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Unfortunately, your registration could not be approved at this time.
                Please contact support for more information.
              </p>
              <div className="p-4 rounded-soft bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800">
                <p className="text-sm text-rose-700 dark:text-rose-300">
                  If you believe this is an error, please contact your institution's administrator.
                </p>
              </div>
              <Link
                href="/support"
                className="mt-6 w-full btn-primary py-3 block"
              >
                Contact Support
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 dark:bg-rose-900 flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
              </div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Error Checking Status</h1>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {error || 'Unable to verify your approval status. Please try again.'}
              </p>
              <button
                onClick={handleRefresh}
                className="w-full btn-primary py-3"
              >
                Try Again
              </button>
            </>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>
            <Link href="/auth/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}