'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showClose?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      open,
      onOpenChange,
      title,
      description,
      children,
      size = 'md',
      showClose = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      className,
    },
    ref
  ) => {
    const sizes = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      full: 'max-w-4xl',
    };

    return (
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 bg-black/50 backdrop-blur-sm',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
            )}
            onClick={closeOnOverlayClick ? () => onOpenChange(false) : undefined}
          />
          <DialogPrimitive.Content
            ref={ref}
            className={cn(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
              'bg-component-card-bg border border-component-card-border rounded-2xl shadow-xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              'data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-brand-primary focus-visible:ring-offset-2',
              sizes[size],
              'w-full mx-4 max-h-[85vh] flex flex-col',
              className
            )}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && closeOnEscape) onOpenChange(false);
            }}
          >
            {(title || showClose) && (
              <div className="flex items-start justify-between p-6 border-b border-component-card-border flex-shrink-0">
                <div>
                  {title && (
                    <DialogPrimitive.Title className="text-heading-md font-semibold text-semantic-text-primary">
                      {title}
                    </DialogPrimitive.Title>
                  )}
                  {description && (
                    <DialogPrimitive.Description className="mt-1 text-body-sm text-semantic-text-secondary">
                      {description}
                    </DialogPrimitive.Description>
                  )}
                </div>
                {showClose && (
                  <DialogPrimitive.Close
                    className={cn(
                      'p-1 rounded-md text-semantic-text-tertiary hover:text-semantic-text-primary hover:bg-semantic-bg-secondary transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-brand-primary'
                    )}
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </DialogPrimitive.Close>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }
);

Modal.displayName = 'Modal';

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalFooter = ({ children, className }: ModalFooterProps) => {
  return (
    <div className={cn('flex items-center justify-end gap-3 p-6 border-t border-component-card-border bg-semantic-bg-secondary rounded-b-2xl flex-shrink-0', className)}>
      {children}
    </div>
  );
};

export { Modal };