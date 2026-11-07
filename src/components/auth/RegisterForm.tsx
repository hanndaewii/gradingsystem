/**
 * RegisterForm - Professor registration with email, employee number, password
 * Design-taste compliant: equal edges, soft radius, real icons, Zod validation
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, BadgeCheck, AlertCircle, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { PasswordStrength } from './PasswordStrength';

const registerSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  employeeNumber: z
    .string()
    .min(1, 'Employee number is required')
    .regex(/^\d{6,10}$/, 'Employee number must be 6-10 digits'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  terms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms and conditions' }) }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  redirectTo?: string;
  className?: string;
}

export function RegisterForm({
  onSuccess,
  onError,
  redirectTo = '/auth/pending',
  className,
}: RegisterFormProps) {
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      terms: false,
    },
  });

  const password = watch('password', '');

  // Update password strength on change
  const handlePasswordChange = (value: string) => {
    setPasswordStrength(calculatePasswordStrength(value));
  };

  const handleRegister = async (data: RegisterFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const { error: authError } = await signUp(data.email, data.password, {
        employee_number: data.employeeNumber,
        full_name: '', // Will be filled after approval
        role: 'instructor',
      });

      if (authError) {
        setError(authError.message);
        onError?.(authError);
        return;
      }

      onSuccess?.();

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
    <form onSubmit={handleSubmit(handleRegister)} className={cn('space-y-6', className)} noValidate>
      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          University Email Address
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

      {/* Employee Number Field */}
      <div>
        <label htmlFor="employeeNumber" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Employee Number
        </label>
        <div className="relative">
          <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" aria-hidden="true" />
          <input
            {...register('employeeNumber')}
            id="employeeNumber"
            type="text"
            autoComplete="off"
            placeholder="123456"
            className={cn(
              'w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border rounded-soft transition-all duration-fast',
              'focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              errors.employeeNumber
                ? 'border-rose-500 focus:ring-rose-500'
                : 'border-slate-300 dark:border-slate-600'
            )}
            aria-invalid={errors.employeeNumber ? 'true' : 'false'}
            aria-describedby={errors.employeeNumber ? 'employee-error' : undefined}
            disabled={isSubmitting || isLoading}
          />
        </div>
        {errors.employeeNumber && (
          <p id="employee-error" className="mt-1.5 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            {errors.employeeNumber.message}
          </p>
        )}
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-500">
          Your 6-10 digit university employee ID number
        </p>
      </div>

      {/* Password Field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Password
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
              handlePasswordChange(e.target.value);
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
        {/* Password Strength Meter */}
        {password && (
          <PasswordStrength strength={passwordStrength} className="mt-3" />
        )}
      </div>

      {/* Confirm Password Field */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Confirm Password
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

      {/* Terms & Conditions */}
      <div className="space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            {...register('terms')}
            type="checkbox"
            className="w-4 h-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600"
          />
          <div className="text-sm text-slate-600 dark:text-slate-400">
            I agree to the
            <a href="/terms" className="text-indigo-600 dark:text-indigo-400 hover:underline ml-1">
              Terms of Service
            </a>
            {' '}and
            <a href="/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline ml-1">
              Privacy Policy
            </a>
            . I confirm I am a faculty member at a participating institution.
          </div>
        </label>
        {errors.terms && (
          <p className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1 ml-7">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            {errors.terms.message}
          </p>
        )}
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
            Creating account...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <User className="w-5 h-5" aria-hidden="true" />
            Register as Professor
          </span>
        )}
      </button>

      {/* Info Note */}
      <div className="p-3 rounded-soft bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-start gap-2">
          <BadgeCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm text-indigo-800 dark:text-indigo-200">
            <p className="font-medium">Registration requires admin approval</p>
            <p className="mt-1">
              After submitting, your account will be reviewed by an administrator.
              You&apos;ll receive an email once your account is approved.
            </p>
          </div>
        </div>
      </div>

      {/* Login Link */}
      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Already have an account?{' '}
        <a href="/auth/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
          Sign In
        </a>
      </p>
    </form>
  );
}

/**
 * Calculate password strength score (0-4)
 */
function calculatePasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}