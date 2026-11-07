/**
 * Invite Acceptance Page - Accept admin invitation
 * Design-taste compliant: one section per screen, equal edges, real icons
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, AlertCircle, CheckCircle, Loader2, UserPlus, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PasswordStrength } from '@/components/auth/PasswordStrength';

const inviteSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  terms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteInfo {
  email: string;
  role: string;
  institution: string;
  invitedBy: string;
  expiresAt: string;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [step, setStep] = useState<'verify' | 'register' | 'success' | 'error'>('verify');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      terms: false,
    },
  });

  const password = watch('password', '');

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);

  // Verify invitation token
  useEffect(() => {
    const verifyInvite = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error: inviteError } = await supabase
          .from('invitations')
          .select(`
            email,
            role,
            expires_at,
            institutions (name),
            profiles:invited_by (email)
          `)
          .eq('token', token)
          .eq('accepted', false)
          .single();

        if (inviteError || !data) {
          setStep('error');
          setError('Invalid or expired invitation link');
          return;
        }

        // Check expiration
        if (new Date(data.expires_at) < new Date()) {
          setStep('error');
          setError('This invitation has expired');
          return;
        }

        setInvite({
          email: data.email,
          role: data.role,
          institution: data.institutions?.name || 'Unknown Institution',
          invitedBy: data.profiles?.email || 'Unknown',
          expiresAt: data.expires_at,
        });
        setStep('register');
      } catch {
        setStep('error');
        setError('Failed to verify invitation');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      verifyInvite();
    } else {
      setStep('error');
      setError('No invitation token provided');
    }
  }, [token]);

  const handleRegister = async (data: InviteFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      // Sign up with invitation token
      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            invitation_token: token,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Mark invitation as accepted
      await supabase
        .from('invitations')
        .update({ accepted: true, accepted_at: new Date().toISOString() })
        .eq('token', token);

      setStep('success');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Registration failed');
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && step === 'verify') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
          </div>
          <p className="text-slate-600 dark:text-slate-400">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 dark:bg-rose-900 flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Invalid Invitation</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
          <Link href="/auth/login" className="btn-primary py-3 block">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Account Created!</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Your account has been set up successfully. You can now sign in.
          </p>
          <Link href="/auth/login" className="btn-primary py-3 block">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Render registration form
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2" aria-label="CWPC BAD Home">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">CWPC BAD</span>
          </Link>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Electronic Grading System</p>
        </div>

        {/* Invitation Info */}
        {invite && (
          <div className="card p-6 mb-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Invitation to Join</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">{invite.institution}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span><strong>Email:</strong> {invite.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 flex-shrink-0" />
                <span><strong>Role:</strong> {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span><strong>Invited by:</strong> {invite.invitedBy}</span>
              </div>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <div className="card p-6 animate-fade-in">
          <form onSubmit={handleSubmit(handleRegister)} className="space-y-6" noValidate>
            <div className="text-center mb-4">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Create Your Account</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Set up your password to accept the invitation
              </p>
            </div>

            {/* Email (pre-filled) */}
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
                  defaultValue={invite?.email}
                  className={cn(
                    'w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border rounded-soft transition-all duration-fast',
                    'focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                    errors.email
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-slate-300 dark:border-slate-600'
                  )}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  readOnly
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
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
                  onChange={(e) => register('password').onChange(e)}
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
                  <AlertCircle className="w-4 h-4" />
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

            {/* Confirm Password */}
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
                  <AlertCircle className="w-4 h-4" />
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Terms */}
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
                </div>
              </label>
              {errors.terms && (
                <p className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1 ml-7">
                  <AlertCircle className="w-4 h-4" />
                  {errors.terms.message}
                </p>
              )}
            </div>

            {/* Submit */}
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
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </span>
              ) : (
                'Accept Invitation & Create Account'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <Link href="/auth/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
            Already have an account? Sign In
          </Link>
        </p>
      </div>
    </div>
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

// EyeOff icon (inline since not imported)
function EyeOff({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}