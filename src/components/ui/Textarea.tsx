'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  showCharacterCount?: boolean;
  maxLength?: number;
  autoResize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, label, error, hint, size = 'md', showCharacterCount = false, maxLength, autoResize = true, id, 'aria-describedby': ariaDescribedBy, ...props },
    ref
  ) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const [height, setHeight] = React.useState<number | undefined>(undefined);

    const handleRef = (el: HTMLTextAreaElement | null) => {
      textareaRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    };

    React.useEffect(() => {
      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        const newHeight = textareaRef.current.scrollHeight;
        setHeight(newHeight);
      }
    }, [autoResize, props.value, props.defaultValue]);

    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const countId = `${id}-count`;
    const describedBy = [error && errorId, hint && hintId, showCharacterCount && countId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;

    const currentLength = props.value?.toString().length || 0;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-body-sm font-medium text-semantic-text-primary mb-2">
            {label}
            {props.required && <span className="text-semantic-status-error ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          <textarea
            ref={handleRef}
            id={id}
            className={cn(
              'w-full border rounded-soft bg-semantic-input-bg border-semantic-input-border placeholder:text-semantic-input-placeholder transition-all duration-fast ease-out resize-none',
              'focus:outline-none focus:ring-2 focus:ring-semantic-brand-primary focus:ring-offset-2 focus:border-semantic-input-focus',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-semantic-bg-tertiary',
              'aria-invalid:border-semantic-input-error aria-invalid:focus:ring-semantic-status-error',
              {
                'py-2 px-3 text-caption rounded-md': size === 'sm',
                'py-2.5 px-4 text-body-sm': size === 'md',
                'py-3 px-4 text-body': size === 'lg',
              },
              error && 'border-semantic-input-error focus:ring-semantic-status-error',
              className
            )}
            style={{ height: height ? `${height}px` : undefined, minHeight: size === 'sm' ? '60px' : size === 'md' ? '80px' : '100px' }}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            maxLength={maxLength}
            {...props}
          />
          {(showCharacterCount || maxLength) && (
            <div className="absolute bottom-2 right-3 text-caption text-semantic-text-tertiary" aria-live="polite" id={countId}>
              {currentLength}{maxLength && ` / ${maxLength}`}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-caption text-semantic-status-error" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-caption text-semantic-text-tertiary">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };