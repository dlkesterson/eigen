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

import { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVisualizationStore } from '@/store/omnibox';

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
            className="fixed inset-0 z-[9997] bg-black/60 backdrop-blur-sm"
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
                'glass-card flex flex-col overflow-hidden',
                SIZE_CLASSES[size],
                className
              )}
              style={{
                boxShadow:
                  '0 0 60px rgba(34, 211, 238, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div className="flex items-center gap-3">
                  {showBack && onBack && (
                    <button
                      onClick={onBack}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}
                  <div>
                    <h2 className="font-mono text-lg font-semibold tracking-wide text-white">
                      {title}
                    </h2>
                    {subtitle && <p className="mt-0.5 text-sm text-gray-400">{subtitle}</p>}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">{children}</div>

              {/* Footer hint */}
              <div className="flex items-center justify-center border-t border-white/10 py-2 text-xs text-gray-500">
                Press <kbd className="mx-1 rounded bg-white/10 px-1.5 py-0.5">Esc</kbd> to close
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
