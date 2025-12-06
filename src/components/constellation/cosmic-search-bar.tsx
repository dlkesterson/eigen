'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Sparkles, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useOmniboxUIStore } from '@/store/omnibox';

interface CosmicSearchBarProps {
  onSearch?: (query: string) => void;
  className?: string;
  /** If true, acts as a trigger button for the Omnibox instead of a standalone input */
  triggerMode?: boolean;
}

// Easter egg phrases
const EASTER_EGG_TRIGGERS = ['eigen', 'vvsvs', 'the future'];

export function CosmicSearchBar({
  onSearch,
  className,
  triggerMode = false,
}: CosmicSearchBarProps) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState('');
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isOpen: omniboxOpen, setOpen: openOmnibox } = useOmniboxUIStore();

  // Check for easter egg
  useEffect(() => {
    const lowerValue = value.toLowerCase();
    const isEasterEgg = EASTER_EGG_TRIGGERS.some((trigger) => lowerValue.includes(trigger));
    setShowEasterEgg(isEasterEgg);
  }, [value]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (onSearch && value.trim()) {
        onSearch(value.trim());
        // Don't clear if it's an easter egg
        if (!showEasterEgg) {
          setValue('');
        }
      }
    },
    [onSearch, value, showEasterEgg]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setValue('');
      inputRef.current?.blur();
    }
  }, []);

  // Handle click to open omnibox menu in trigger mode
  const handleTriggerClick = useCallback(() => {
    openOmnibox(true);
  }, [openOmnibox]);

  // Hide when omnibox is open in trigger mode
  if (triggerMode && omniboxOpen) {
    return null;
  }

  // Trigger mode: just a clickable button
  if (triggerMode) {
    return (
      <div className={cn('relative', className)}>
        <motion.button
          type="button"
          onClick={handleTriggerClick}
          className={cn(
            'flex w-full items-center gap-3 rounded-full border px-6 py-3 backdrop-blur-xl transition-all duration-300',
            'border-cyan-400/20 bg-black/30 hover:border-cyan-400/50 hover:bg-black/50'
          )}
          style={{
            boxShadow:
              '0 0 15px rgba(34, 211, 238, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.05)',
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Search className="h-4 w-4 text-cyan-400/60" />
          <span className="flex-1 text-left font-mono text-sm text-gray-400">
            Search the cosmos...
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </motion.button>

        {/* Subtle glow */}
        <div className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500/0 via-cyan-400/10 to-cyan-500/0 blur-xl" />
      </div>
    );
  }

  // Full input mode (original behavior)
  return (
    <div className={cn('relative', className)}>
      <form onSubmit={handleSubmit}>
        <motion.div
          className={cn(
            'flex items-center gap-3 rounded-full border px-6 py-3 backdrop-blur-xl transition-all duration-300',
            focused ? 'border-cyan-400/50 bg-black/50' : 'border-cyan-400/20 bg-black/30',
            showEasterEgg && 'border-amber-400/50'
          )}
          style={{
            boxShadow: focused
              ? showEasterEgg
                ? '0 0 40px rgba(251, 191, 36, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.1)'
                : '0 0 40px rgba(34, 211, 238, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)'
              : '0 0 15px rgba(34, 211, 238, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.05)',
          }}
          animate={{
            scale: focused ? 1.02 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            animate={{ rotate: focused ? 360 : 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {showEasterEgg ? (
              <Sparkles className="h-4 w-4 text-amber-400" />
            ) : (
              <Search className="h-4 w-4 text-cyan-400/60" />
            )}
          </motion.div>

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search the cosmos... ⌘K for commands"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full bg-transparent font-mono text-sm outline-none placeholder:text-gray-500',
              showEasterEgg ? 'text-amber-200' : 'text-white'
            )}
          />

          {value && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 text-xs text-gray-500"
            >
              <Command className="h-3 w-3" />
              <span>Enter</span>
            </motion.div>
          )}
        </motion.div>

        {/* Animated glow ring */}
        <AnimatePresence>
          {focused && (
            <motion.div
              className={cn(
                'pointer-events-none absolute -inset-1 rounded-full blur-xl',
                showEasterEgg
                  ? 'bg-gradient-to-r from-amber-500/0 via-amber-400/30 to-amber-500/0'
                  : 'bg-gradient-to-r from-cyan-500/0 via-cyan-400/20 to-cyan-500/0'
              )}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>
      </form>

      {/* Easter egg reveal */}
      <AnimatePresence>
        {showEasterEgg && (
          <motion.div
            className="absolute top-full left-1/2 mt-4 -translate-x-1/2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="glow-text-gold rounded-lg border border-amber-400/30 bg-black/80 px-6 py-3 backdrop-blur-xl"
              style={{
                boxShadow: '0 0 30px rgba(251, 191, 36, 0.3)',
              }}
            >
              <p className="font-mono text-xs tracking-widest text-amber-200 uppercase">
                ✧ THE FUTURE IS ALREADY SYNCED ✧
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
