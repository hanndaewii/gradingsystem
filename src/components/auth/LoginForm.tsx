/**
 * LoginForm - Email/password login with validation
 * Design-taste compliant: equal edges, soft radius, real icons
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  redirectTo?: string;
  className?: string;
}

export function LoginForm({
  onSuccess,
  onError,
  redirectTo = '/dashboard',
  className,
}: LoginFormProps) {
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const { error: authError } = await signIn(data.email, data.password);

      if (authError) {
        setError(authError.message);
        onError?.(authError);
        return;
      }

      onSuccess?.();

      // Redirect handled by middleware or router
      if (redirectTo) {
        window.location.href = redirectTo;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unexpected error occurred');
      setError(error.message);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleLogin)} className={cn('space-y-6', className)} noValidate>
      {/* Email Field */}
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

      {/* Password Field */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Password
          </label>
          <a
            href="/auth/reset-password"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Forgot password?
          </a>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" aria-hidden="true" />
          <input
            {...register('password')}
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            className={cn(
              'w-full pl-10 pr-12 py-3 bg-white dark:bg-slate-800 border rounded-soft transition-all duration-fast',
              'focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              errors.password
                ? 'border-rose-500 focus:ring-rose-500'
                : 'border-slate-300 dark:border-slate-600'
            )}
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby={errors.password ? 'password-error' : undefined}
            disabled={isSubmitting || isLoading}
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
      </div>

      {/* Remember Me & Error */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            {...register('rememberMe')}
            type="checkbox"
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600"
          />
          <span className="text-sm text-slate-600 dark:text-slate-400">Remember me</span>
        </label>
      </div>

      {/* Global Error */}
      {error && (
        <div
          className="p-3 rounded-soft bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 flex items-center gap-2 animate-slide-up"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || isLoading}
        className={cn(
          'w-full btn-primary py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed',
          'focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900'
        )}
      >
        {isSubmitting || isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            Signing in...
          </span>
        ) : (
          'Sign In'
        )}
      </button>

      {/* Register Link */}
      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Don&apos;t have an account?{' '}
        <a href="/auth/register" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
          Register as Professor
        </a>
      </p>
    </form>
  );
}