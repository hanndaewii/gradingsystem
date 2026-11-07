/**
 * MFASetup - TOTP MFA setup and verification component
 * Design-taste compliant: equal edges, soft radius, real icons
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Smartphone, QrCode, Shield, CheckCircle, AlertCircle, Loader2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateTOTP, verifyTOTP, getOTPAuthURI, formatSecret, generateQRCodeDataURL, generateBackupCodes } from '@/lib/auth/mfa';
import type { UserRole } from '@/lib/auth/roles';

const mfaVerifySchema = z.object({
  token: z.string().length(6, 'Enter the 6-digit code from your authenticator app').regex(/^\d{6}$/, 'Code must be 6 digits'),
});

type MFAVerifyData = z.infer<typeof mfaVerifySchema>;

interface MFASetupProps {
  /** User's email for QR code generation */
  email: string;
  /** User's role (affects whether MFA is required) */
  userRole?: UserRole;
  /** Pre-generated secret (for verification step) */
  secret?: string;
  /** Callback when MFA is successfully enabled */
  onSuccess?: (backupCodes: string[]) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Whether MFA is required for this role */
  required?: boolean;
  className?: string;
}

interface MFASetupState {
  step: 'generate' | 'verify' | 'complete' | 'disable';
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  verified: boolean;
}

export function MFASetup({
  email,
  userRole = 'instructor',
  secret: initialSecret,
  onSuccess,
  onError,
  required = true,
  className,
}: MFASetupProps) {
  const [state, setState] = useState<MFASetupState>({
    step: initialSecret ? 'verify' : 'generate',
    secret: initialSecret || '',
    qrCodeUrl: '',
    backupCodes: [],
    verified: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MFAVerifyData>({
    resolver: zodResolver(mfaVerifySchema),
  });

  // Generate QR code when secret changes
  useEffect(() => {
    if (state.secret) {
      const uri = getOTPAuthURI(email, state.secret);
      generateQRCodeDataURL(uri).then(url => {
        setState(prev => ({ ...prev, qrCodeUrl: url }));
      }).catch(() => {
        // QR code generation failed silently
      });
    }
  }, [state.secret, email]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const newSecret = generateSecret();
      const backupCodes = generateBackupCodes(8);

      setState({
        step: 'verify',
        secret: newSecret,
        qrCodeUrl: '',
        backupCodes,
        verified: false,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate MFA secret');
      setError(error.message);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (data: MFAVerifyData) => {
    setError(null);
    setIsLoading(true);

    try {
      const valid = await verifyTOTP(state.secret, data.token);

      if (!valid) {
        setError('Invalid code. Please check your authenticator app and try again.');
        return;
      }

      setState(prev => ({ ...prev, verified: true, step: 'complete' }));
      onSuccess?.(state.backupCodes);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Verification failed');
      setError(error.message);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(state.secret);
      setCopiedCode('secret');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Clipboard API failed
    }
  };

  const handleCopyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(state.backupCodes.join('\n'));
      setCopiedCode('backup');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Clipboard API failed
    }
  };

  const handleSkip = () => {
    if (required) return;
    onSuccess?.([]);
  };

  // Render current step
  const renderStep = () => {
    switch (state.step) {
      case 'generate':
        return <GenerateStep onGenerate={handleGenerate} isLoading={isLoading} required={required} onSkip={handleSkip} />;
      case 'verify':
        return <VerifyStep
          secret={state.secret}
          qrCodeUrl={state.qrCodeUrl}
          email={email}
          onVerify={handleSubmit(handleVerify)}
          onCopySecret={handleCopySecret}
          copiedCode={copiedCode}
          errors={errors}
          isSubmitting={isSubmitting}
          error={error}
        />;
      case 'complete':
        return <CompleteStep backupCodes={state.backupCodes} onCopy={handleCopyBackupCodes} copiedCode={copiedCode} />;
      default:
        return null;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
          <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {state.step === 'generate' ? 'Set Up Two-Factor Authentication' :
             state.step === 'verify' ? 'Verify Authenticator App' :
             'MFA Enabled Successfully'}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {state.step === 'generate'
              ? 'Add an extra layer of security to your account using an authenticator app.'
              : state.step === 'verify'
              ? 'Scan the QR code with your authenticator app and enter the 6-digit code.'
              : 'Your account is now protected with two-factor authentication.'}
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center gap-2" role="progressbar" aria-valuenow={state.step === 'complete' ? 3 : state.step === 'verify' ? 2 : 1} aria-valuemin={1} aria-valuemax={3} aria-label="MFA setup progress">
        {['generate', 'verify', 'complete'].map((step, index) => (
          <div key={step} className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-fast',
              state.step === step
                ? 'bg-indigo-600 text-white'
                : ['verify', 'complete'].includes(state.step) && index < ['generate', 'verify', 'complete'].indexOf(state.step)
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            )}>
              {['verify', 'complete'].includes(state.step) && index < ['generate', 'verify', 'complete'].indexOf(state.step) ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                index + 1
              ))}
            </div>
            {index < 2 && (
              <div className={cn(
                'flex-1 h-0.5 rounded transition-colors duration-fast',
                ['verify', 'complete'].includes(state.step) && index < ['generate', 'verify', 'complete'].indexOf(state.step)
                  ? 'bg-emerald-500'
                  : 'bg-slate-200 dark:bg-slate-700'
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="animate-fade-in">{renderStep()}</div>

      {/* Error Message */}
      {error && (
        <div
          className="p-3 rounded-soft bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 flex items-center gap-2 animate-slide-up"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
        </div>
      )}
    </div>
  );
}

/** Step 1: Generate Secret */
function GenerateStep({
  onGenerate,
  isLoading,
  required,
  onSkip,
}: { onGenerate: () => void; isLoading: boolean; required: boolean; onSkip: () => void }) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-soft bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-3">What you'll need</h3>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-indigo-500 flex-shrink-0" /> An authenticator app (Google Authenticator, Authy, 1Password, etc.)</li>
          <li className="flex items-center gap-2"><QrCode className="w-4 h-4 text-indigo-500 flex-shrink-0" /> Ability to scan QR codes</li>
        </ul>
      </div>

      <button
        onClick={onGenerate}
        disabled={isLoading}
        className="w-full btn-primary py-3 disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating...
          </span>
        ) : (
          'Set Up Authenticator App'
        )}
      </button>

      {!required && (
        <button
          onClick={onSkip}
          type="button"
          className="w-full btn-ghost py-2 text-sm"
        >
          Skip for now
        </button>
      )}
    </div>
  );
}

/** Step 2: Verify Token */
function VerifyStep({
  secret,
  qrCodeUrl,
  email,
  onVerify,
  onCopySecret,
  copiedCode,
  errors,
  isSubmitting,
  error,
}: {
  secret: string;
  qrCodeUrl: string;
  email: string;
  onVerify: (e: React.BaseSyntheticEvent) => void;
  onCopySecret: () => void;
  copiedCode: string | null;
  errors: any;
  isSubmitting: boolean;
  error: string | null;
}) {
  return (
    <form onSubmit={onVerify} className="space-y-6" noValidate>
      {/* QR Code */}
      <div className="text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          Scan this QR code with your authenticator app
        </p>
        <div className="inline-block p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="MFA QR Code" className="w-64 h-64" />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          )}
        </div>
      </div>

      {/* Manual Entry */}
      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          <span>Can't scan? Enter the code manually</span>
          <QrCode className="w-4 h-4 transition-transform duration-fast group-open:rotate-180" />
        </summary>
        <div className="mt-3 p-3 rounded-soft bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <code className="flex-1 font-mono text-base text-slate-900 dark:text-slate-100 tracking-wide select-all">
              {formatSecret(secret)}
            </code>
            <button
              type="button"
              onClick={onCopySecret}
              className="btn-ghost p-2"
              aria-label={copiedCode === 'secret' ? 'Copied!' : 'Copy secret key'}
            >
              {copiedCode === 'secret' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enter this key in your authenticator app as the "secret key" or "setup key"
          </p>
        </div>
      </details>

      {/* Verification Input */}
      <div>
        <label htmlFor="token" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Verification Code
        </label>
        <div className="relative">
          <input
            {...register('token')}
            id="token"
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="000000"
            className={cn(
              'w-full pl-4 pr-4 py-3 text-center text-2xl tracking-widest font-mono bg-white dark:bg-slate-800 border rounded-soft transition-all duration-fast',
              'focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              errors.token
                ? 'border-rose-500 focus:ring-rose-500'
                : 'border-slate-300 dark:border-slate-600'
            )}
            aria-invalid={errors.token ? 'true' : 'false'}
            aria-describedby={errors.token ? 'token-error' : undefined}
            disabled={isSubmitting}
          />
        </div>
        {errors.token && (
          <p id="token-error" className="mt-1.5 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.token.message}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          'w-full btn-primary py-3 disabled:opacity-50',
          'focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900'
        )}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Verifying...
          </span>
        ) : (
          'Verify & Enable MFA'
        )}
      </button>
    </form>
  );
}

/** Step 3: Complete with Backup Codes */
function CompleteStep({
  backupCodes,
  onCopy,
  copiedCode,
}: { backupCodes: string[]; onCopy: () => void; copiedCode: string | null }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle className="w-8 h-8 text-emerald-500 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">
            Two-Factor Authentication Enabled
          </h3>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
            Your account is now protected. Save your backup codes in a secure place.
          </p>
        </div>
      </div>

      {/* Backup Codes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-slate-900 dark:text-slate-100">Backup Codes</h4>
          <button
            onClick={onCopy}
            className="btn-ghost text-sm gap-1"
            aria-label={copiedCode === 'backup' ? 'Copied!' : 'Copy all backup codes'}
          >
            {copiedCode === 'backup' ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy All
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2" role="list" aria-label="Backup codes">
          {backupCodes.map((code, index) => (
            <code
              key={index}
              className={cn(
                'px-3 py-2 font-mono text-sm text-center bg-white dark:bg-slate-800 border rounded-soft',
                'border-slate-200 dark:border-slate-700',
                'text-slate-900 dark:text-slate-100',
                'select-all'
              )}
              role="listitem"
            >
              {code}
            </code>
          ))}
        </div>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Each code can be used once. Store these securely — they won't be shown again.
        </p>
      </div>

      <button
        type="button"
        className="w-full btn-primary py-3"
        onClick={() => window.location.href = '/dashboard'}
      >
        Continue to Dashboard
      </button>
    </div>
  );
}