/**
 * Glass Overlay — Layer 2/3 Glass Panel System
 *
 * Per the UX guide: "Glass panels show you **what** is there."
 *
 * This component provides the glass-card overlay system for:
 * - Layer 2: Medium-density info (5-50 items) - floating glass cards
 * - Layer 3: Dense text, forms, lists, settings - full liminal rooms
 *
 * Usage:
 * - Click a device → GlassOverlay with device details
 * - Click a folder → GlassOverlay with folder browser
 * - Click pending request → GlassOverlay with accept/reject
 */

'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResolvedTheme } from '@/components/theme-provider';

// =============================================================================
// Types
// =============================================================================

interface GlassOverlayProps {
  /** Whether the overlay is visible */
  isOpen: boolean;
  /** Callback when overlay should close */
  onClose: () => void;
  /** Title displayed in header */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Content to render inside the glass panel */
  children: React.ReactNode;
  /** Size variant */
  size?: 'small' | 'medium' | 'large' | 'full';
  /** Whether to show back button instead of close */
  showBack?: boolean;
  /** Callback for back button */
  onBack?: () => void;
  /** Additional class names */
  className?: string;
}

// Size configurations
const SIZE_CLASSES = {
  small: 'w-[400px] max-h-[500px]',
  medium: 'w-[640px] max-h-[720px]',
  large: 'w-[900px] max-h-[800px]',
  full: 'w-[95vw] max-w-[1200px] h-[90vh]',
};

// =============================================================================
// Main Component
// =============================================================================

export function GlassOverlay({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'medium',
  showBack = false,
  onBack,
  className,
}: GlassOverlayProps) {
  const theme = useResolvedTheme();
  const isDark = theme === 'dark';

  // Handle ESC key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={cn(
              'fixed inset-0 z-[9997] backdrop-blur-sm',
              isDark ? 'bg-black/60' : 'bg-black/40'
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Glass Panel */}
          <motion.div
            className={cn('fixed top-1/2 left-1/2 z-[9998]', '-translate-x-1/2 -translate-y-1/2')}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className={cn(
                'flex flex-col overflow-hidden rounded-2xl border backdrop-blur-xl',
                isDark ? 'border-white/10 bg-gray-900/90' : 'border-gray-200/60 bg-white/90',
                SIZE_CLASSES[size],
                className
              )}
              style={{
                boxShadow: isDark
                  ? '0 0 60px rgba(34, 211, 238, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.1)'
                  : '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.5)',
              }}
            >
              {/* Header */}
              <div
                className={cn(
                  'flex items-center justify-between border-b px-6 py-4',
                  isDark ? 'border-white/10' : 'border-gray-200/60'
                )}
              >
                <div className="flex items-center gap-3">
                  {showBack && onBack && (
                    <button
                      onClick={onBack}
                      className={cn(
                        'rounded-lg p-1.5 transition-colors',
                        isDark
                          ? 'text-gray-400 hover:bg-white/10 hover:text-white'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}
                  <div>
                    <h2
                      className={cn(
                        'font-mono text-lg font-semibold tracking-wide',
                        isDark ? 'text-white' : 'text-gray-900'
                      )}
                    >
                      {title}
                    </h2>
                    {subtitle && (
                      <p
                        className={cn('mt-0.5 text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}
                      >
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className={cn(
                    'rounded-lg p-2 transition-colors',
                    isDark
                      ? 'text-gray-400 hover:bg-white/10 hover:text-white'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">{children}</div>

              {/* Footer hint */}
              <div
                className={cn(
                  'flex items-center justify-center border-t py-2 text-xs',
                  isDark ? 'border-white/10 text-gray-500' : 'border-gray-200/60 text-gray-400'
                )}
              >
                Press{' '}
                <kbd
                  className={cn(
                    'mx-1 rounded px-1.5 py-0.5',
                    isDark ? 'bg-white/10' : 'bg-gray-100'
                  )}
                >
                  Esc
                </kbd>{' '}
                to close
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// Specialized Overlays
// =============================================================================

interface DeviceDetailsOverlayProps {
  deviceId: string | null;
  onClose: () => void;
  children: React.ReactNode;
}

export function DeviceDetailsOverlay({ deviceId, onClose, children }: DeviceDetailsOverlayProps) {
  return (
    <GlassOverlay
      isOpen={!!deviceId}
      onClose={onClose}
      title="Device Details"
      subtitle={deviceId ? `ID: ${deviceId.slice(0, 16)}...` : undefined}
      size="medium"
    >
      {children}
    </GlassOverlay>
  );
}

interface FolderDetailsOverlayProps {
  folderId: string | null;
  folderLabel?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function FolderDetailsOverlay({
  folderId,
  folderLabel,
  onClose,
  children,
}: FolderDetailsOverlayProps) {
  return (
    <GlassOverlay
      isOpen={!!folderId}
      onClose={onClose}
      title={folderLabel || 'Folder Details'}
      subtitle={folderId || undefined}
      size="large"
    >
      {children}
    </GlassOverlay>
  );
}

interface PendingRequestOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  requestType: 'device' | 'folder';
  requestName?: string;
  children: React.ReactNode;
}

export function PendingRequestOverlay({
  isOpen,
  onClose,
  requestType,
  requestName,
  children,
}: PendingRequestOverlayProps) {
  return (
    <GlassOverlay
      isOpen={isOpen}
      onClose={onClose}
      title={`Pending ${requestType === 'device' ? 'Device' : 'Folder'} Request`}
      subtitle={requestName}
      size="small"
    >
      {children}
    </GlassOverlay>
  );
}

export default GlassOverlay;
