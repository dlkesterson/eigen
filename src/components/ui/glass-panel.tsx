/**
 * Glass Panel — Reusable 2D Glass Substrate
 *
 * Per the UX guide: "2D is for reading, editing, deciding."
 *
 * This component provides consistent glass panel styling for:
 * - Layer 2: Medium-density info (5-50 items) - floating HUD panels
 * - Layer 3: Dense text, forms, lists - full liminal rooms
 */

import { forwardRef, type ReactNode, type HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export type GlassPanelSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type GlassPanelVariant = 'default' | 'floating' | 'embedded' | 'modal';

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Panel size preset */
  size?: GlassPanelSize;
  /** Visual variant */
  variant?: GlassPanelVariant;
  /** Optional title shown at top */
  title?: string;
  /** Optional description under title */
  description?: string;
  /** Enable cinematic entrance animation */
  animate?: boolean;
  /** Custom max height */
  maxHeight?: string;
  /** Whether content is scrollable */
  scrollable?: boolean;
  /** Glow color accent */
  glowColor?: 'cyan' | 'amber' | 'purple' | 'green' | 'red';
}

// =============================================================================
// Size presets
// =============================================================================

const SIZE_CLASSES: Record<GlassPanelSize, string> = {
  sm: 'w-[400px]',
  md: 'w-[600px]',
  lg: 'w-[900px]',
  xl: 'w-[1100px]',
  full: 'w-full',
};

const VARIANT_CLASSES: Record<GlassPanelVariant, string> = {
  default: 'glass-card',
  floating: 'glass-card shadow-2xl',
  embedded: 'bg-white/5 rounded-xl border border-white/10',
  modal: 'glass-card shadow-[0_0_60px_rgba(0,0,0,0.5)]',
};

const GLOW_CLASSES: Record<string, string> = {
  cyan: 'border-cyan-400/30 shadow-[0_0_30px_rgba(34,211,238,0.15)]',
  amber: 'border-amber-400/30 shadow-[0_0_30px_rgba(251,191,36,0.15)]',
  purple: 'border-purple-400/30 shadow-[0_0_30px_rgba(192,132,252,0.15)]',
  green: 'border-green-400/30 shadow-[0_0_30px_rgba(74,222,128,0.15)]',
  red: 'border-red-400/30 shadow-[0_0_30px_rgba(248,113,113,0.15)]',
};

// =============================================================================
// Animation variants
// =============================================================================

const panelVariants = {
  initial: {
    opacity: 0,
    y: 40,
    scale: 0.98,
    filter: 'blur(8px)',
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    filter: 'blur(8px)',
    transition: {
      duration: 0.3,
    },
  },
} as const;

// =============================================================================
// Component
// =============================================================================

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    {
      children,
      size = 'md',
      variant = 'default',
      title,
      description,
      animate = true,
      maxHeight,
      scrollable = false,
      glowColor,
      className,
      ...props
    },
    ref
  ) => {
    // Use regular div for non-animated version, motion.div for animated
    if (!animate) {
      return (
        <div
          ref={ref}
          className={cn(
            SIZE_CLASSES[size],
            VARIANT_CLASSES[variant],
            glowColor && GLOW_CLASSES[glowColor],
            scrollable && 'overflow-y-auto',
            className
          )}
          style={maxHeight ? { maxHeight } : undefined}
          {...props}
        >
          {(title || description) && (
            <div className="border-b border-white/10 px-6 py-4">
              {title && (
                <h3 className="font-mono text-sm font-semibold tracking-wide text-white uppercase">
                  {title}
                </h3>
              )}
              {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
            </div>
          )}
          <div className={cn('p-6', scrollable && 'overflow-y-auto')}>{children}</div>
        </div>
      );
    }

    return (
      <motion.div
        ref={ref}
        className={cn(
          SIZE_CLASSES[size],
          VARIANT_CLASSES[variant],
          glowColor && GLOW_CLASSES[glowColor],
          scrollable && 'overflow-y-auto',
          className
        )}
        style={maxHeight ? { maxHeight } : undefined}
        variants={panelVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {(title || description) && (
          <div className="border-b border-white/10 px-6 py-4">
            {title && (
              <h3 className="font-mono text-sm font-semibold tracking-wide text-white uppercase">
                {title}
              </h3>
            )}
            {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
          </div>
        )}
        <div className={cn('p-6', scrollable && 'overflow-y-auto')}>{children}</div>
      </motion.div>
    );
  }
);

GlassPanel.displayName = 'GlassPanel';

// =============================================================================
// Floating Glass Card (Layer 2 - HUD style)
// =============================================================================

interface FloatingGlassCardProps {
  children: ReactNode;
  /** Enable hover effects */
  interactive?: boolean;
  /** Glow color on hover */
  glowColor?: 'cyan' | 'amber' | 'purple' | 'green';
  className?: string;
  onClick?: () => void;
}

export const FloatingGlassCard = forwardRef<HTMLDivElement, FloatingGlassCardProps>(
  ({ children, interactive = true, glowColor: _glowColor = 'cyan', className, onClick }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          'glass-card p-4',
          interactive && 'cursor-pointer transition-all duration-300',
          interactive && 'hover:border-white/20 hover:bg-white/10',
          className
        )}
        whileHover={interactive ? { scale: 1.02, y: -2 } : undefined}
        whileTap={interactive ? { scale: 0.98 } : undefined}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }
);

FloatingGlassCard.displayName = 'FloatingGlassCard';

// =============================================================================
// Glass Modal Container (Layer 3 - Full liminal room)
// =============================================================================

interface GlassModalProps {
  children: ReactNode;
  open: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  size?: GlassPanelSize;
  /** Whether clicking backdrop closes modal */
  closeOnBackdropClick?: boolean;
}

export function GlassModal({
  children,
  open,
  onClose,
  title,
  description,
  size = 'lg',
  closeOnBackdropClick = true,
}: GlassModalProps) {
  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeOnBackdropClick ? onClose : undefined}
      />

      {/* Panel */}
      <GlassPanel
        size={size}
        variant="modal"
        title={title}
        description={description}
        animate
        className="relative z-10 max-h-[85vh]"
        scrollable
      >
        {children}
      </GlassPanel>
    </motion.div>
  );
}

export default GlassPanel;
