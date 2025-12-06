'use client';

/**
 * Search Results Panel — Layer-Aware Results Display
 *
 * Per the UX guide:
 * - ≤8 results → Layer 2: Floating glass cards orbiting camera
 * - >8 results → Layer 3: Full glass panel list
 *
 * "Never put >12 lines of text in 3D space → Always spawn a glass panel or enter a room"
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Folder, Laptop, AlertTriangle, HelpCircle, X } from 'lucide-react';
import { useVisualizationStore, type ContentDisplayMode } from '@/store/omnibox';
import { GlassPanel } from '@/components/ui/glass-panel';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface SearchResult {
  id: string;
  type: 'device' | 'folder' | 'file' | 'conflict' | 'help' | 'command';
  title: string;
  description?: string;
  icon?: React.ReactNode;
  metadata?: Record<string, unknown>;
  onClick?: () => void;
}

interface SearchResultsPanelProps {
  results: SearchResult[];
  query: string;
  onResultClick?: (result: SearchResult) => void;
  onClose?: () => void;
}

// =============================================================================
// Icon mapping
// =============================================================================

const TYPE_ICONS: Record<SearchResult['type'], React.ReactNode> = {
  device: <Laptop className="h-4 w-4" />,
  folder: <Folder className="h-4 w-4" />,
  file: <FileText className="h-4 w-4" />,
  conflict: <AlertTriangle className="h-4 w-4" />,
  help: <HelpCircle className="h-4 w-4" />,
  command: <Search className="h-4 w-4" />,
};

const TYPE_COLORS: Record<SearchResult['type'], string> = {
  device: 'text-cyan-400',
  folder: 'text-purple-400',
  file: 'text-blue-400',
  conflict: 'text-amber-400',
  help: 'text-green-400',
  command: 'text-gray-400',
};

// =============================================================================
// Floating Card (Layer 2)
// =============================================================================

interface FloatingResultCardProps {
  result: SearchResult;
  index: number;
  onClick?: () => void;
}

function FloatingResultCard({ result, index, onClick }: FloatingResultCardProps) {
  const icon = result.icon || TYPE_ICONS[result.type];

  return (
    <motion.button
      className={cn(
        'glass-card group flex w-64 cursor-pointer items-start gap-3 p-4 text-left',
        'transition-all duration-300 hover:scale-105 hover:border-white/30'
      )}
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.9 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className={cn('mt-0.5', TYPE_COLORS[result.type])}>{icon}</div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-medium text-white group-hover:text-cyan-200">
          {result.title}
        </h4>
        {result.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-400">{result.description}</p>
        )}
      </div>
    </motion.button>
  );
}

// =============================================================================
// Floating Cards Container (Layer 2)
// =============================================================================

function FloatingCardsDisplay({
  results,
  onResultClick,
}: {
  results: SearchResult[];
  onResultClick?: (result: SearchResult) => void;
}) {
  return (
    <motion.div
      className="fixed inset-x-0 top-40 z-50 flex flex-wrap justify-center gap-4 px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {results.map((result, index) => (
        <FloatingResultCard
          key={result.id}
          result={result}
          index={index}
          onClick={() => onResultClick?.(result)}
        />
      ))}
    </motion.div>
  );
}

// =============================================================================
// Glass Panel List (Layer 3)
// =============================================================================

interface GlassPanelListProps {
  results: SearchResult[];
  query: string;
  onResultClick?: (result: SearchResult) => void;
  onClose?: () => void;
}

function GlassPanelList({ results, query, onResultClick, onClose }: GlassPanelListProps) {
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
        onClick={onClose}
      />

      {/* Glass Panel */}
      <GlassPanel
        size="lg"
        variant="modal"
        title={`Search: "${query}"`}
        description={`${results.length} results found`}
        animate
        scrollable
        maxHeight="85vh"
        className="relative z-10"
      >
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Results list */}
        <div className="space-y-2">
          {results.map((result) => {
            const icon = result.icon || TYPE_ICONS[result.type];
            return (
              <motion.button
                key={result.id}
                className={cn(
                  'flex w-full items-start gap-4 rounded-lg p-4 text-left',
                  'bg-white/5 transition-all hover:bg-white/10'
                )}
                onClick={() => onResultClick?.(result)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className={cn('mt-1', TYPE_COLORS[result.type])}>{icon}</div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-white">{result.title}</h4>
                  {result.description && (
                    <p className="mt-1 text-sm text-gray-400">{result.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-gray-500">
                      {result.type}
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

// =============================================================================
// Main Component (Auto-switches based on result count)
// =============================================================================

export function SearchResultsPanel({
  results,
  query,
  onResultClick,
  onClose,
}: SearchResultsPanelProps) {
  const { setDisplayMode, setLayer } = useVisualizationStore();

  // Determine display mode based on result count
  const effectiveMode = useMemo<ContentDisplayMode>(() => {
    if (results.length === 0) return '3d';
    if (results.length <= 8) return 'floating-cards';
    return 'glass-panel';
  }, [results.length]);

  // Handle close - return to 3D mode
  const handleClose = () => {
    setDisplayMode('3d');
    setLayer(1);
    onClose?.();
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {effectiveMode === 'floating-cards' ? (
        <FloatingCardsDisplay key="floating" results={results} onResultClick={onResultClick} />
      ) : (
        <GlassPanelList
          key="panel"
          results={results}
          query={query}
          onResultClick={onResultClick}
          onClose={handleClose}
        />
      )}
    </AnimatePresence>
  );
}

export default SearchResultsPanel;
