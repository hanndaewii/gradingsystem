/**
 * PasswordStrength - Visual password strength meter
 * Design-taste compliant: soft radius, semantic colors, smooth animations
 */

'use client';

import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

interface PasswordStrengthProps {
  /** Strength score 0-4 */
  strength: number;
  /** Additional className */
  className?: string;
  /** Show requirements checklist */
  showRequirements?: boolean;
}

const requirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const strengthConfig = [
  { label: 'Very Weak', color: 'bg-rose-500', bgColor: 'bg-rose-100 dark:bg-rose-950', borderColor: 'border-rose-200 dark:border-rose-800', textColor: 'text-rose-700 dark:text-rose-300' },
  { label: 'Weak', color: 'bg-rose-500', bgColor: 'bg-rose-100 dark:bg-rose-950', borderColor: 'border-rose-200 dark:border-rose-800', textColor: 'text-rose-700 dark:text-rose-300' },
  { label: 'Fair', color: 'bg-amber-500', bgColor: 'bg-amber-100 dark:bg-amber-950', borderColor: 'border-amber-200 dark:border-amber-800', textColor: 'text-amber-700 dark:text-amber-300' },
  { label: 'Good', color: 'bg-emerald-500', bgColor: 'bg-emerald-100 dark:bg-emerald-950', borderColor: 'border-emerald-200 dark:border-emerald-800', textColor: 'text-emerald-700 dark:text-emerald-300' },
  { label: 'Strong', color: 'bg-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-950', borderColor: 'border-emerald-200 dark:border-emerald-800', textColor: 'text-emerald-700 dark:text-emerald-300' },
];

export function PasswordStrength({
  strength,
  className,
  showRequirements = false,
}: PasswordStrengthProps) {
  const config = strengthConfig[Math.max(0, Math.min(strength, 4))];
  const filledSegments = Math.max(0, Math.min(strength, 4));

  return (
    <div className={cn('space-y-2', className)} role="progressbar" aria-valuenow={strength} aria-valuemin={0} aria-valuemax={4} aria-label="Password strength">
      {/* Strength Bar */}
      <div className="flex gap-1.5" aria-hidden="true">
        {strengthConfig.map((segment, index) => (
          <div
            key={index}
            className={cn(
              'flex-1 h-2 rounded-full transition-all duration-normal ease-out',
              index < filledSegments ? segment.color : 'bg-slate-200 dark:bg-slate-700'
            )}
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          />
        ))}
      </div>

      {/* Strength Label */}
      <div className={cn('text-sm font-medium transition-colors duration-fast', config.textColor)}>
        Password strength: {config.label}
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="space-y-1.5 pt-1">
          {requirements.map((req, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-sm transition-colors duration-fast"
            >
              <CheckCircle
                className={cn(
                  'w-4 h-4 flex-shrink-0 transition-colors duration-fast',
                  req.test('') ? 'text-slate-300 dark:text-slate-600' : config.color
                )}
              />
              <span className={cn(
                req.test('') ? 'text-slate-500 dark:text-slate-400' : config.textColor
              )}>
                {req.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * PasswordStrengthInline - Compact inline version
 */
export function PasswordStrengthInline({
  strength,
  className,
}: { strength: number; className?: string }) {
  const config = strengthConfig[Math.max(0, Math.min(strength, 4))];
  const filledSegments = Math.max(0, Math.min(strength, 4));

  return (
    <div className={cn('flex items-center gap-2', className)} role="progressbar" aria-valuenow={strength} aria-valuemin={0} aria-valuemax={4} aria-label="Password strength">
      <div className="flex gap-1" aria-hidden="true">
        {strengthConfig.map((segment, index) => (
          <div
            key={index}
            className={cn(
              'w-6 h-1.5 rounded transition-all duration-normal ease-out',
              index < filledSegments ? segment.color : 'bg-slate-200 dark:bg-slate-700'
            )}
          />
        ))}
      </div>
      <span className={cn('text-xs font-medium', config.textColor)}>
        {config.label}
      </span>
    </div>
  );
}

/**
 * PasswordRequirements - Standalone requirements checklist
 */
export function PasswordRequirements({
  password = '',
  className,
}: { password?: string; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {requirements.map((req, index) => {
        const met = req.test(password);
        return (
          <div
            key={index}
            className={cn(
              'flex items-center gap-2 text-sm transition-colors duration-fast',
              met ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
            )}
          >
            <CheckCircle
              className={cn(
                'w-4 h-4 flex-shrink-0 transition-colors duration-fast',
                met ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'
              )}
            />
            <span>{req.label}</span>
          </div>
        );
      })}
    </div>
  );
}