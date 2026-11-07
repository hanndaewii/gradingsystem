'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  title?: string;
  description?: string;
  action?: React.ReactNode;
  duration?: number;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant = 'default', title, description, action, duration = 5000, ...props }, ref) => {
    const icons = {
      default: <Info className="h-5 w-5 text-semantic-status-info" />,
      success: <CheckCircle className="h-5 w-5 text-semantic-status-success" />,
      error: <AlertCircle className="h-5 w-5 text-semantic-status-error" />,
      warning: <AlertTriangle className="h-5 w-5 text-semantic-status-warning" />,
      info: <Info className="h-5 w-5 text-semantic-status-info" />,
    };

    const variants = {
      default: 'bg-component-card-bg border-component-card-border',
      success: 'bg-semantic-status-success-bg border-semantic-border-success',
      error: 'bg-semantic-status-error-bg border-semantic-border-error',
      warning: 'bg-semantic-status-warning-bg border-semantic-border-warning',
      info: 'bg-semantic-status-info-bg border-semantic-border-info',
    };

    return (
      <ToastPrimitive.Root
        ref={ref}
        className={cn(
          'flex items-start gap-3 p-4 rounded-xl border shadow-lg',
          'animate-slide-in-from-right',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0',
          'data-[swipe=end]:animate-out data-[swipe=end]:translate-x-full',
          variants[variant],
          className
        )}
        {...props}
      >
        <div className="flex-shrink-0 mt-0.5" aria-hidden="true">{icons[variant]}</div>
        <div className="flex-1 min-w-0">
          {title && <p className="font-semibold text-body-sm text-semantic-text-primary">{title}</p>}
          {description && <p className="mt-1 text-body-sm text-semantic-text-secondary">{description}</p>}
          {action && <div className="mt-3">{action}</div>}
        </div>
        <ToastPrimitive.Close
          className={cn(
            'flex-shrink-0 p-1 rounded-md text-semantic-text-tertiary hover:text-semantic-text-primary hover:bg-semantic-bg-secondary transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-brand-primary'
          )}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </ToastPrimitive.Close>
      </ToastPrimitive.Root>
    );
  }
);
Toast.displayName = ToastPrimitive.Root.displayName;

export interface ToastViewportProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport> {}

const ToastViewport = React.forwardRef<HTMLDivElement, ToastViewportProps>(
  ({ className, ...props }, ref) => {
    return (
      <ToastPrimitive.Viewport
        ref={ref}
        className={cn(
          'fixed top-4 right-4 z-[var(--z-toast)] flex flex-col gap-2 w-[380px] max-w-[calc(100vw-2rem)]',
          className
        )}
        {...props}
      />
    );
  }
);
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

export interface ToastActionProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action> {}

const ToastAction = React.forwardRef<HTMLButtonElement, ToastActionProps>(
  ({ className, ...props }, ref) => {
    return (
      <ToastPrimitive.Action
        ref={ref}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 text-body-sm font-medium rounded-soft',
          'bg-semantic-brand-primary text-semantic-text-inverse hover:bg-semantic-brand-primary-hover',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-semantic-brand-primary focus-visible:ring-offset-2',
          className
        )}
        {...props}
      />
    );
  }
);
ToastAction.displayName = ToastPrimitive.Action.displayName;

export const ToastProvider = ToastPrimitive.Provider;

export const useToast = () => {
  const [toasts, setToasts] = React.useState<Array<ToastProps & { id: string }>>([]);

  const toast = React.useCallback(({ id = Math.random().toString(36).slice(2), ...props }: ToastProps & { id?: string }) => {
    setToasts((prev) => [...prev, { ...props, id }]);
    if (props.duration !== 0) {
      setTimeout(() => dismiss(id), props.duration || 5000);
    }
    return id;
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = React.useCallback(
    (title: string, description?: string, action?: React.ReactNode) =>
      toast({ variant: 'success', title, description, action }),
    [toast]
  );

  const error = React.useCallback(
    (title: string, description?: string, action?: React.ReactNode) =>
      toast({ variant: 'error', title, description, action }),
    [toast]
  );

  const warning = React.useCallback(
    (title: string, description?: string, action?: React.ReactNode) =>
      toast({ variant: 'warning', title, description, action }),
    [toast]
  );

  const info = React.useCallback(
    (title: string, description?: string, action?: React.ReactNode) =>
      toast({ variant: 'info', title, description, action }),
    [toast]
  );

  return { toasts, toast, dismiss, success, error, warning, info };
};

export { Toast, ToastViewport, ToastAction };