'use client';

import { ReactNode, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---
// BaseDialog Types
// ---

export interface BaseDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog should close */
  onClose: () => void;
  /** Dialog title */
  title: string;
  /** Optional dialog description */
  description?: string;
  /** Dialog content */
  children: ReactNode;
  /** Footer content (typically action buttons) */
  footer?: ReactNode;
  /** Max width class (default: max-w-md) */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Whether to show loading overlay */
  loading?: boolean;
  /** Loading text to display */
  loadingText?: string;
  /** Custom className for the card */
  className?: string;
  /** Whether to close on escape key (default: true) */
  closeOnEscape?: boolean;
  /** Whether to close on backdrop click (default: true) */
  closeOnBackdrop?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
} as const;

/**
 * BaseDialog - A consistent dialog component for the application
 *
 * Use this as the foundation for all dialogs to ensure consistent styling,
 * keyboard handling, and accessibility.
 *
 * @example
 * ```tsx
 * <BaseDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Add Device"
 *   description="Enter the device ID to add a new device"
 *   footer={
 *     <DialogFooter
 *       onCancel={() => setIsOpen(false)}
 *       onConfirm={handleAdd}
 *       confirmText="Add Device"
 *       loading={isAdding}
 *     />
 *   }
 * >
 *   <InputField ... />
 * </BaseDialog>
 * ```
 */
export function BaseDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
  loading = false,
  loadingText = 'Loading...',
  className,
  closeOnEscape = true,
  closeOnBackdrop = true,
}: BaseDialogProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape && !loading) {
        onClose();
      }
    },
    [onClose, closeOnEscape, loading]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when dialog is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdrop && !loading) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <Card
        className={cn(
          'border-border bg-card w-full shadow-2xl',
          maxWidthClasses[maxWidth],
          className
        )}
      >
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <span className="text-sm text-white">{loadingText}</span>
            </div>
          </div>
        )}

        {/* Header */}
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground absolute top-4 right-4"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle id="dialog-title" className="text-foreground text-xl">
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-muted-foreground">{description}</CardDescription>
          )}
        </CardHeader>

        {/* Content */}
        <CardContent className="space-y-4">{children}</CardContent>

        {/* Footer */}
        {footer && (
          <div className="border-border flex justify-end gap-2 border-t px-6 py-4">{footer}</div>
        )}
      </Card>
    </div>
  );
}

// ---
// DialogFooter - Common footer pattern
// ---

export interface DialogFooterProps {
  /** Cancel button handler */
  onCancel?: () => void;
  /** Confirm button handler */
  onConfirm?: () => void;
  /** Cancel button text (default: 'Cancel') */
  cancelText?: string;
  /** Confirm button text (default: 'Confirm') */
  confirmText?: string;
  /** Whether confirm is loading */
  loading?: boolean;
  /** Whether confirm is disabled */
  disabled?: boolean;
  /** Confirm button variant */
  confirmVariant?: 'default' | 'destructive' | 'secondary';
  /** Additional footer content (rendered before buttons) */
  children?: ReactNode;
}

export function DialogFooter({
  onCancel,
  onConfirm,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  loading = false,
  disabled = false,
  confirmVariant = 'default',
  children,
}: DialogFooterProps) {
  return (
    <>
      {children}
      {onCancel && (
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          {cancelText}
        </Button>
      )}
      {onConfirm && (
        <Button variant={confirmVariant} onClick={onConfirm} disabled={disabled || loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {confirmText}
            </>
          ) : (
            confirmText
          )}
        </Button>
      )}
    </>
  );
}

// ---
// DialogSection - For grouping content within dialogs
// ---

export interface DialogSectionProps {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Section content */
  children: ReactNode;
  /** Additional className */
  className?: string;
}

export function DialogSection({ title, description, children, className }: DialogSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {(title || description) && (
        <div>
          {title && <h4 className="text-foreground text-sm font-medium">{title}</h4>}
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

// ---
// DialogInput - Styled input for dialogs
// ---

export interface DialogInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Input label */
  label?: string;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
}

export function DialogInput({
  label,
  error,
  helperText,
  className,
  id,
  ...props
}: DialogInputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-foreground text-sm font-medium">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {helperText && !error && <p className="text-muted-foreground text-xs">{helperText}</p>}
    </div>
  );
}

// ---
// DialogTextarea - Styled textarea for dialogs
// ---

export interface DialogTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Textarea label */
  label?: string;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
}

export function DialogTextarea({
  label,
  error,
  helperText,
  className,
  id,
  ...props
}: DialogTextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-foreground text-sm font-medium">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          'border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring min-h-20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {helperText && !error && <p className="text-muted-foreground text-xs">{helperText}</p>}
    </div>
  );
}
