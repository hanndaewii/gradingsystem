/**
 * Update Password Page - Set new password after reset
 * Design-taste compliant: one section per screen, equal edges, real icons
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, AlertCircle, CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PasswordStrength } from '@/components/auth/PasswordStrength';

const updateSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type UpdateFormData = z.infer<typeof updateSchema>;

function UpdatePasswordForm() {
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [step, setStep] = useState<'update' | 'success' | 'error'>('update');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema),
  });

  const password = watch('password', '');

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);

  const handleUpdate = async (data: UpdateFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (authError) {
        setError(authError.message);
        setStep('error');
        return;
      }

      setStep('success');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unexpected error occurred');
      setError(error.message);
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Password Updated</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Your password has been successfully changed. You can now sign in with your new password.
        </p>
        <Link
          href="/auth/login"
          className="w-full btn-primary py-3 block"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 dark:bg-rose-900 flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Unable to Update Password</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          {error || 'The reset link may have expired or already been used.'}
        </p>
        <Link
          href="/auth/reset-password"
          className="w-full btn-primary py-3 block"
        >
          Request New Reset Link
        </Link>
      </div>
    );
  }

  // Check if we have valid reset token params
  const hasToken = searchParams.get('access_token') || searchParams.get('token');

  return (
    <form onSubmit={handleSubmit(handleUpdate)} className="space-y-6" noValidate>
      {!hasToken && (
        <div className="p-3 rounded-soft bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">Invalid or expired reset link</p>
            <p className="mt-1">Please request a new password reset email.</p>
          </div>
        </div>
      )}

      <div className="text-center mb-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Set New Password</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Your new password must be different from previous passwords
        </p>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          New Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" aria-hidden="true" />
          <input
            {...register('password')}
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            className={cn(
              'w-full pl-10 pr-12 py-3 bg-white dark:bg-slate-800 border rounded-soft transition-all duration-fast',
              'focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              errors.password
                ? 'border-rose-500 focus:ring-rose-500'
                : 'border-slate-300 dark:border-slate-600'
            )}
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby={errors.password ? 'password-error' : 'password-hint'}
            disabled={isSubmitting || isLoading}
            onChange={(e) => {
              register('password').onChange(e);
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="mt-1.5 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            {errors.password.message}
          </p>
        )}
        {!errors.password && (
          <p id="password-hint" className="mt-1.5 text-sm text-slate-500 dark:text-slate-500">
            Must be 8+ chars with uppercase, lowercase, number & special character
          </p>
        )}
        {password && (
          <PasswordStrength strength={passwordStrength} className="mt-3" />
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Confirm New Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" aria-hidden="true" />
          <input
            {...register('confirmPassword')}
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            className={cn(
              'w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border rounded-soft transition-all duration-fast',
              'focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              errors.confirmPassword
                ? 'border-rose-500 focus:ring-rose-500'
                : 'border-slate-300 dark:border-slate-600'
            )}
            aria-invalid={errors.confirmPassword ? 'true' : 'false'}
            aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
            disabled={isSubmitting || isLoading}
          />
        </div>
        {errors.confirmPassword && (
          <p id="confirm-error" className="mt-1.5 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || isLoading || !hasToken}
        className={cn(
          'w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed',
          'focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900'
        )}
      >
        {isSubmitting || isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            Updating...
          </span>
        ) : (
          'Update Password'
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

function calculatePasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

export default function UpdatePasswordPage() {
  return (
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
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  );
}