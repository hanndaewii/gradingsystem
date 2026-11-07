/**
 * Register Page - Professor registration
 * Design-taste compliant: one section per screen, equal edges, real icons
 */

'use client';

import { Link } from 'next/navigation';
import { UserPlus, Shield, BadgeCheck } from 'lucide-react';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { AuthProvider } from '@/components/auth/AuthProvider';

export default function RegisterPage() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Logo/Brand */}
          <div className="text-center mb-10">
            <Link href="/" className="inline-flex items-center gap-2" aria-label="CWPC BAD Home">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">CWPC BAD</span>
            </Link>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Electronic Grading System</p>
          </div>

          {/* Register Card */}
          <div className="card p-8 animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mb-4">
                <BadgeCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Professor Registration</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Create your instructor account to access grading tools
              </p>
            </div>

            {/* Info Box */}
            <div className="mb-6 p-4 rounded-soft bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-sm text-indigo-800 dark:text-indigo-200">
                  <p className="font-medium">Registration requires approval</p>
                  <p className="mt-1">
                    All professor accounts are reviewed by administrators.
                    You&apos;ll receive an email once your account is approved.
                  </p>
                </div>
              </div>
            </div>

            <RegisterForm
              redirectTo="/auth/pending"
              onError={(err) => {
                console.error('Registration error:', err);
              }}
            />
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <p>
              Already have an account?{' '}
              <Link href="/auth/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                Sign In
              </Link>
            </p>
            <p>
              <a href="/support" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                Need help? Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}