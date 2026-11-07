'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { Modal, ModalFooter } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'warning';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  className?: string;
}

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  loading = false,
  className,
}: ConfirmDialogProps) => {
  const icons = {
    default: <AlertCircle className="h-6 w-6 text-semantic-brand-primary" />,
    destructive: <AlertTriangle className="h-6 w-6 text-semantic-status-error" />,
    warning: <AlertTriangle className="h-6 w-6 text-semantic-status-warning" />,
  };

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // Error handled by caller
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      className={className}
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0 mt-0.5">{icons[variant]}</div>
        <div className="flex-1">
          {description && <p className="text-body-sm text-semantic-text-secondary">{description}</p>}
        </div>
      </div>
      <ModalFooter>
        <Button variant="ghost" onClick={() => { onCancel?.(); onOpenChange(false); }} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant={variant === 'destructive' ? 'destructive' : 'primary'} onClick={handleConfirm} loading={loading}>
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  onConfirm?: () => void;
  className?: string;
}

export const AlertDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'OK',
  variant = 'default',
  onConfirm,
  className,
}: AlertDialogProps) => {
  const icons = {
    default: <Info className="h-6 w-6 text-semantic-status-info" />,
    success: <CheckCircle className="h-6 w-6 text-semantic-status-success" />,
    error: <AlertCircle className="h-6 w-6 text-semantic-status-error" />,
    warning: <AlertTriangle className="h-6 w-6 text-semantic-status-warning" />,
    info: <Info className="h-6 w-6 text-semantic-status-info" />,
  };

  const buttonVariants = {
    default: 'primary',
    success: 'primary',
    error: 'destructive',
    warning: 'primary',
    info: 'primary',
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      className={className}
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0 mt-0.5">{icons[variant]}</div>
        <div className="flex-1">
          {description && <p className="text-body-sm text-semantic-text-secondary">{description}</p>}
        </div>
      </div>
      <ModalFooter>
        <Button variant={buttonVariants[variant]} onClick={() => { onConfirm?.(); onOpenChange(false); }}>
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  submitText?: string;
  cancelText?: string;
  onSubmit: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const FormDialog = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  submitText = 'Save',
  cancelText = 'Cancel',
  onSubmit,
  onCancel,
  loading = false,
  size = 'md',
  className,
}: FormDialogProps) => {
  const handleSubmit = async () => {
    try {
      await onSubmit();
      onOpenChange(false);
    } catch {
      // Error handled by caller
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size={size}
      className={className}
    >
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {children}
      </form>
      <ModalFooter>
        <Button variant="ghost" type="button" onClick={() => { onCancel?.(); onOpenChange(false); }} disabled={loading}>
          {cancelText}
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          {submitText}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export { Modal, ModalFooter };