/**
 * Reset Password Page - Request password reset email
 * Design-taste compliant: one section per screen, equal edges, real icons
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'next/navigation';
import { Mail, Lock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { AuthProvider } from '@/components/auth/AuthProvider';

const resetSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

type ResetFormData = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const { resetPassword } = useAuth();
  const [step, setStep] = useState<'request' | 'sent' | 'error'>('request');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const handleSubmitForm = async (data: ResetFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const { error: authError } = await resetPassword(data.email);

      if (authError) {
        setError(authError.message);
        setStep('error');
        return;
      }

      setStep('sent');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unexpected error occurred');
      setError(error.message);
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'sent') {
    return (
      <div className="text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Check Your Email</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          We&apos;ve sent a password reset link to your email address.
          The link will expire in 1 hour.
        </p>
        <div className="p-4 rounded-soft bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <strong>Didn&apos;t receive the email?</strong>
          </p>
          <ul className="mt-2 text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <li>Check your spam or junk folder</li>
            <li>Make sure you entered the correct email address</li>
            <li>Wait a few minutes for delivery</li>
          </ul>
        </div>
        <button
          onClick={() => setStep('request')}
          className="w-full btn-secondary py-2"
        >
          Send Another Email
        </button>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 dark:bg-rose-900 flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Something Went Wrong</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          {error || 'Unable to send reset email. Please try again.'}
        </p>
        <button
          onClick={() => setStep('request')}
          className="w-full btn-primary py-2"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6" noValidate>
      <div className="text-center mb-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Reset Password</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" aria-hidden="true" />
          <input
            {...register('email')}
            id="email"
            type="email"
            autoComplete="email"
            placeholder="professor@university.edu"
            className={cn(
              'w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border rounded-soft transition-all duration-fast',
              'focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              errors.email
                ? 'border-rose-500 focus:ring-rose-500'
                : 'border-slate-300 dark:border-slate-600'
            )}
            aria-invalid={errors.email ? 'true' : 'false'}
            aria-describedby={errors.email ? 'email-error' : undefined}
            disabled={isSubmitting || isLoading}
          />
        </div>
        {errors.email && (
          <p id="email-error" className="mt-1.5 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            {errors.email.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || isLoading}
        className={cn(
          'w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed',
          'focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900'
        )}
      >
        {isSubmitting || isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            Sending...
          </span>
        ) : (
          'Send Reset Link'
        )}
      </button>

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        <Link href="/auth/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
          Back to Sign In
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <Link href="/" className="inline-flex items-center gap-2" aria-label="CWPC BAD Home">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">CWPC BAD</span>
            </Link>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Electronic Grading System</p>
          </div>

          <div className="card p-8 animate-fade-in">
            <ResetPasswordForm />
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}