/**
 * MFA Setup Page - Configure two-factor authentication
 * Design-taste compliant: one section per screen, equal edges, real icons
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Link } from 'next/navigation';
import { ArrowLeft, Shield, CheckCircle } from 'lucide-react';
import { MFASetup } from '@/components/auth/MFASetup';
import { cn } from '@/lib/utils';

export default function MFASetupPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/auth/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, role, mfa_enabled')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        setUser({ id: profile.id, email: profile.email, role: profile.role });
        setMfaEnabled(profile.mfa_enabled || false);
      }
      setLoading(false);
    };

    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
          </div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSuccess = async (backupCodes: string[]) => {
    // MFA enabled successfully
    setMfaEnabled(true);
  };

  const handleError = (error: Error) => {
    console.error('MFA setup error:', error);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-soft bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Two-Factor Authentication
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>

        {/* MFA Status */}
        <div className={cn(
          'p-4 rounded-xl border mb-6 flex items-center justify-between',
          mfaEnabled
            ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800'
            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              mfaEnabled
                ? 'bg-emerald-100 dark:bg-emerald-900'
                : 'bg-slate-100 dark:bg-slate-800'
            )}>
              <Shield className={cn(
                'w-5 h-5',
                mfaEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
              )} />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                {mfaEnabled ? 'MFA Enabled' : 'MFA Not Enabled'}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {mfaEnabled
                  ? 'Your account is protected with two-factor authentication'
                  : 'Enable MFA to add an extra layer of security'}
              </p>
            </div>
          </div>
        </div>

        {/* MFA Setup Component */}
        {mfaEnabled ? (
          <div className="card p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Two-Factor Authentication Active
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Your account is protected. You&apos;ll need your authenticator app to sign in.
            </p>
            <div className="space-y-2 text-sm">
              <Link
                href="/settings/security"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium block"
              >
                Manage MFA Settings
              </Link>
              <Link
                href="/settings/security/backup-codes"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium block"
              >
                View Backup Codes
              </Link>
            </div>
          </div>
        ) : (
          <div className="card p-6">
            <MFASetup
              email={user.email}
              userRole={user.role as any}
              required={user.role !== 'student'}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </div>
        )}

        {/* Info */}
        <div className="mt-6 p-4 rounded-soft bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <h3 className="font-medium text-slate-900 dark:text-white mb-2">Why enable 2FA?</h3>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <li>• Protects your account even if your password is compromised</li>
            <li>• Required for instructors and administrators</li>
            <li>• Uses standard TOTP (Google Authenticator, Authy, 1Password, etc.)</li>
            <li>• Backup codes provided for account recovery</li>
          </ul>
        </div>
      </div>
    </div>
  );
}