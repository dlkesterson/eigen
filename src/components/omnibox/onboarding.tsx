/**
 * Omnibox Onboarding System
 *
 * Interactive tutorial that guides new users through the Omnibox interface
 * with animated highlights and step-by-step instructions.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Command,
  Eye,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResolvedTheme } from '@/components/theme-provider';

// =============================================================================
// Types
// =============================================================================

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  highlight?: 'omnibox' | 'visualizations' | 'quick-commands' | 'help';
  tip?: string;
  action?: {
    label: string;
    command?: string;
  };
}

interface OnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

// =============================================================================
// Onboarding Steps
// =============================================================================

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Eigen',
    description:
      'Eigen uses a powerful command interface called the Omnibox. Type commands or natural language to control your Syncthing setup with beautiful 3D visualizations.',
    tip: 'Press Ctrl+K anytime to focus the Omnibox',
  },
  {
    id: 'omnibox',
    title: 'The Omnibox',
    description:
      'The Omnibox at the top is your command center. Type commands like "status", "folders", or "sync" to see different views. You can also use natural language like "show me my devices".',
    highlight: 'omnibox',
    action: {
      label: 'Try typing "status"',
      command: 'status',
    },
  },
  {
    id: 'visualizations',
    title: 'Dynamic Visualizations',
    description:
      'Each command reveals a unique 3D visualization. Watch your devices orbit in the Device Topology, explore folders in the 3D explorer, or see real-time sync flows.',
    highlight: 'visualizations',
    tip: 'Use mouse to orbit, scroll to zoom, shift+drag to pan',
  },
  {
    id: 'quick-commands',
    title: 'Quick Commands',
    description:
      'The quick command buttons at the bottom provide one-click access to common views. Click any button or use keyboard shortcuts Ctrl+1 through Ctrl+5.',
    highlight: 'quick-commands',
  },
  {
    id: 'natural-language',
    title: 'Natural Language',
    description:
      'Ask questions naturally! Try "what\'s syncing?", "show conflicts", or "how much storage am I using?". The AI-powered parser understands your intent.',
    action: {
      label: 'Try "show my folders"',
      command: 'show my folders',
    },
  },
  {
    id: 'context',
    title: 'Context Awareness',
    description:
      'The Omnibox remembers context. After viewing a device, subsequent commands apply to it. Use breadcrumbs to track your navigation path.',
    tip: 'Click breadcrumbs to jump back in context',
  },
  {
    id: 'complete',
    title: "You're Ready!",
    description:
      "You now know the basics of Eigen's Omnibox interface. Explore the visualizations, try different commands, and enjoy managing your Syncthing setup in style!",
    tip: 'Press ? in the Omnibox for a full command reference',
  },
];

// =============================================================================
// Step Indicator
// =============================================================================

function StepIndicator({
  steps,
  currentStep,
  onStepClick,
  isDark,
}: {
  steps: OnboardingStep[];
  currentStep: number;
  onStepClick: (index: number) => void;
  isDark: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => (
        <button
          key={step.id}
          onClick={() => onStepClick(index)}
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            index === currentStep
              ? 'w-8 bg-cyan-500'
              : index < currentStep
                ? 'w-2 bg-cyan-500/50 hover:bg-cyan-500/70'
                : isDark
                  ? 'w-2 bg-white/20 hover:bg-white/30'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
          )}
          aria-label={`Go to step ${index + 1}: ${step.title}`}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Highlight Overlay
// =============================================================================

function HighlightOverlay({ highlight }: { highlight?: OnboardingStep['highlight'] }) {
  if (!highlight) return null;

  const positions: Record<NonNullable<typeof highlight>, string> = {
    omnibox: 'top-0 left-0 right-0 h-20',
    visualizations: 'top-20 left-0 right-0 bottom-20',
    'quick-commands': 'bottom-0 left-0 right-0 h-16',
    help: 'top-0 right-0 w-12 h-12',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none fixed inset-0 z-40"
    >
      {/* Darkened overlay with cutout */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Highlighted area */}
      <motion.div
        className={cn('absolute bg-transparent', positions[highlight])}
        style={{
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
        }}
        layoutId="highlight"
      >
        <div className="absolute inset-0 rounded-lg border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.3)]" />
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
// Main Onboarding Component
// =============================================================================

export function OnboardingTutorial({ onComplete, onSkip }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const theme = useResolvedTheme();
  const isDark = theme === 'dark';

  const step = ONBOARDING_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  const goToStep = useCallback(
    (index: number) => {
      if (isAnimating) return;
      setIsAnimating(true);
      setCurrentStep(index);
      setTimeout(() => setIsAnimating(false), 300);
    },
    [isAnimating]
  );

  const nextStep = useCallback(() => {
    if (isLastStep) {
      onComplete();
    } else {
      goToStep(currentStep + 1);
    }
  }, [currentStep, isLastStep, goToStep, onComplete]);

  const prevStep = useCallback(() => {
    if (!isFirstStep) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, isFirstStep, goToStep]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextStep, prevStep, onSkip]);

  return (
    <div className="fixed inset-0 z-50">
      {/* Highlight overlay */}
      <AnimatePresence mode="wait">
        <HighlightOverlay key={step.highlight} highlight={step.highlight} />
      </AnimatePresence>

      {/* Tutorial card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-24 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 px-4"
      >
        <div
          className={cn(
            'overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl',
            isDark ? 'border-white/10 bg-slate-900/95' : 'border-gray-200/60 bg-white/95'
          )}
        >
          {/* Header */}
          <div
            className={cn(
              'flex items-center justify-between border-b px-6 py-4',
              isDark ? 'border-white/10' : 'border-gray-200/60'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
                {isLastStep ? (
                  <CheckCircle2 className="h-5 w-5 text-white" />
                ) : (
                  <Sparkles className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <h3 className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>
                  {step.title}
                </h3>
                <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                  Step {currentStep + 1} of {ONBOARDING_STEPS.length}
                </p>
              </div>
            </div>

            <button
              onClick={onSkip}
              className={cn(
                'rounded-lg p-2 transition-colors',
                isDark
                  ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              )}
              aria-label="Skip tutorial"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <p className={cn('leading-relaxed', isDark ? 'text-gray-300' : 'text-gray-600')}>
                  {step.description}
                </p>

                {/* Tip */}
                {step.tip && (
                  <div
                    className={cn(
                      'mt-4 flex items-start gap-2 rounded-lg px-3 py-2',
                      isDark ? 'bg-cyan-500/10' : 'bg-cyan-50'
                    )}
                  >
                    <Zap
                      className={cn(
                        'mt-0.5 h-4 w-4 flex-shrink-0',
                        isDark ? 'text-cyan-400' : 'text-cyan-600'
                      )}
                    />
                    <p className={cn('text-sm', isDark ? 'text-cyan-300' : 'text-cyan-700')}>
                      {step.tip}
                    </p>
                  </div>
                )}

                {/* Action hint */}
                {step.action && (
                  <div
                    className={cn(
                      'mt-4 flex items-center gap-2 rounded-lg border border-dashed px-3 py-2',
                      isDark ? 'border-white/20 bg-white/5' : 'border-gray-300 bg-gray-50'
                    )}
                  >
                    <Command
                      className={cn('h-4 w-4', isDark ? 'text-gray-400' : 'text-gray-500')}
                    />
                    <span className={cn('text-sm', isDark ? 'text-gray-300' : 'text-gray-600')}>
                      {step.action.label}
                    </span>
                    {step.action.command && (
                      <code
                        className={cn(
                          'ml-auto rounded px-2 py-0.5 font-mono text-xs',
                          isDark ? 'bg-black/30 text-cyan-400' : 'bg-cyan-100 text-cyan-700'
                        )}
                      >
                        {step.action.command}
                      </code>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div
            className={cn(
              'flex items-center justify-between border-t px-6 py-4',
              isDark ? 'border-white/10' : 'border-gray-200/60'
            )}
          >
            <StepIndicator
              steps={ONBOARDING_STEPS}
              currentStep={currentStep}
              onStepClick={goToStep}
              isDark={isDark}
            />

            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  onClick={prevStep}
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors',
                    isDark
                      ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              )}

              <button
                onClick={nextStep}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                  isLastStep
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500'
                    : isDark
                      ? 'bg-white/10 text-white hover:bg-white/20'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                )}
              >
                {isLastStep ? (
                  <>
                    Get Started
                    <Sparkles className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Keyboard hints */}
        <div
          className={cn(
            'mt-3 flex justify-center gap-4 text-xs',
            isDark ? 'text-gray-500' : 'text-gray-400'
          )}
        >
          <span>
            <kbd className={cn('rounded px-1.5 py-0.5', isDark ? 'bg-white/10' : 'bg-gray-200')}>
              ←
            </kbd>
            <kbd
              className={cn('ml-1 rounded px-1.5 py-0.5', isDark ? 'bg-white/10' : 'bg-gray-200')}
            >
              →
            </kbd>{' '}
            Navigate
          </span>
          <span>
            <kbd className={cn('rounded px-1.5 py-0.5', isDark ? 'bg-white/10' : 'bg-gray-200')}>
              Enter
            </kbd>{' '}
            Continue
          </span>
          <span>
            <kbd className={cn('rounded px-1.5 py-0.5', isDark ? 'bg-white/10' : 'bg-gray-200')}>
              Esc
            </kbd>{' '}
            Skip
          </span>
        </div>
      </motion.div>
    </div>
  );
}

// =============================================================================
// Onboarding Hook
// =============================================================================

import { useStartupStore } from '@/lib/startup-orchestrator';

const ONBOARDING_STORAGE_KEY = 'eigen-omnibox-onboarding-complete';

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const setOnboardingActive = useStartupStore((s) => s.setOnboardingActive);
  const completeStartup = useStartupStore((s) => s.completeStartup);
  const startupPhase = useStartupStore((s) => s.phase);

  useEffect(() => {
    // Check if user has completed onboarding
    const isComplete = localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
    if (!isComplete) {
      // Small delay to let the app load first
      const timer = setTimeout(() => {
        setShowOnboarding(true);
        setOnboardingActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Only set hasChecked when onboarding is already complete
      // Delay the welcome badge to avoid overlapping with connection toasts
      const timer = setTimeout(() => {
        setHasChecked(true);
        // If startup isn't complete yet, mark it as settling
        if (startupPhase !== 'ready') {
          completeStartup();
        }
      }, 2000); // Longer delay to let connection toast clear
      return () => clearTimeout(timer);
    }
  }, [setOnboardingActive, completeStartup, startupPhase]);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setShowOnboarding(false);
    setOnboardingActive(false);
    // Delay hasChecked to give time for any pending toasts to clear
    setTimeout(() => {
      setHasChecked(true);
      // Complete startup sequence
      completeStartup();
    }, 1500);
  }, [setOnboardingActive, completeStartup]);

  const skipOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setShowOnboarding(false);
    setOnboardingActive(false);
    // Delay hasChecked to give time for any pending toasts to clear
    setTimeout(() => {
      setHasChecked(true);
      completeStartup();
    }, 1500);
  }, [setOnboardingActive, completeStartup]);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setShowOnboarding(true);
    setOnboardingActive(true);
    setHasChecked(false);
  }, [setOnboardingActive]);

  return {
    showOnboarding,
    hasChecked,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
  };
}

// =============================================================================
// Welcome Badge (shown after onboarding)
// =============================================================================

export function WelcomeBadge({ onReplayTutorial }: { onReplayTutorial: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const theme = useResolvedTheme();
  const isDark = theme === 'dark';
  const startupPhase = useStartupStore((s) => s.phase);

  // Delay visibility until startup is complete to avoid overlapping with toasts
  useEffect(() => {
    // Only show when startup is fully complete
    if (startupPhase === 'ready') {
      // Add extra delay to ensure toasts have time to be dismissed
      const showTimer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(showTimer);
    }
  }, [startupPhase]);

  useEffect(() => {
    if (!visible) return;
    // Auto-dismiss after 8 seconds (shorter since we already delayed showing it)
    const timer = setTimeout(() => setDismissed(true), 8000);
    return () => clearTimeout(timer);
  }, [visible]);

  if (dismissed || !visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2"
    >
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm',
          isDark ? 'border-cyan-500/20 bg-slate-900/90' : 'border-blue-400/30 bg-white/90'
        )}
      >
        <Eye className={cn('h-5 w-5', isDark ? 'text-cyan-400' : 'text-blue-600')} />
        <div>
          <p className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-gray-900')}>
            Ready to explore!
          </p>
          <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
            Press Ctrl+K to open the Omnibox
          </p>
        </div>
        <div className="ml-2 flex items-center gap-1">
          <button
            onClick={onReplayTutorial}
            className={cn(
              'rounded-lg px-2 py-1 text-xs transition-colors',
              isDark ? 'text-cyan-400 hover:bg-white/5' : 'text-blue-600 hover:bg-gray-100'
            )}
          >
            Replay
          </button>
          <button
            onClick={() => setDismissed(true)}
            className={cn(
              'rounded-lg p-1 transition-colors',
              isDark
                ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
