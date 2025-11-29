'use client';

/**
 * AISearchBar - Semantic file search component powered by transformers.js
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Loader2, Brain, X, FileText, Folder, AlertCircle } from 'lucide-react';
import { useAISearch, type AIStatus } from '@/hooks/useAISearch';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

interface SearchResult {
  path: string;
  score: number;
}

interface AISearchBarProps {
  onResultSelect?: (path: string) => void;
  className?: string;
}

export function AISearchBar({ onResultSelect, className }: AISearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const aiEnabled = useAppStore((state) => state.aiEnabled);
  const { status, statusMessage, isReady, initialize, search, progress } = useAISearch({
    enabled: aiEnabled,
  });

  // Initialize AI model when component mounts (only if enabled)
  useEffect(() => {
    if (aiEnabled && status === 'idle') {
      initialize();
    }
  }, [aiEnabled, status, initialize]);

  // Search with debounce
  useEffect(() => {
    if (!aiEnabled || !query.trim() || !isReady) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const searchResults = await search(query);
        setResults(searchResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isReady, search]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showResults || results.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            onResultSelect?.(results[selectedIndex].path);
            setShowResults(false);
            setQuery('');
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowResults(false);
          break;
      }
    },
    [showResults, results, selectedIndex, onResultSelect]
  );

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="text-primary h-4 w-4 animate-spin" />;
      case 'ready':
        return <Sparkles className="text-primary h-4 w-4" />;
      case 'error':
        return <AlertCircle className="text-destructive h-4 w-4" />;
      case 'disabled':
        return <Brain className="text-muted-foreground/50 h-4 w-4" />;
      default:
        return <Brain className="text-muted-foreground h-4 w-4" />;
    }
  };

  const getFileName = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1];
  };

  const getParentPath = (path: string) => {
    const parts = path.split('/');
    return parts.slice(0, -1).join('/');
  };

  return (
    <div className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            !aiEnabled
              ? 'AI search disabled'
              : isReady
                ? 'Search files semantically...'
                : 'Loading AI model...'
          }
          disabled={status === 'loading' || status === 'disabled'}
          className={cn(
            'w-full rounded-lg py-2 pr-20 pl-10',
            'bg-muted/50 border-border border',
            'placeholder:text-muted-foreground text-sm',
            'focus:ring-primary/20 focus:border-primary focus:ring-2 focus:outline-hidden',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-all duration-200'
          )}
        />

        {/* Status indicator */}
        <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-2">
          {isSearching && <Loader2 className="h-4 w-4 animate-spin" />}
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="hover:bg-muted rounded p-1"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          {getStatusIcon()}
        </div>
      </div>

      {/* Status message during loading */}
      {status === 'loading' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border-border absolute top-full right-0 left-0 mt-2 rounded-lg border p-3 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <Loader2 className="text-primary h-5 w-5 animate-spin" />
            <div>
              <p className="text-sm font-medium">Loading AI Model</p>
              <p className="text-muted-foreground text-xs">{statusMessage}</p>
            </div>
          </div>
          {progress && (
            <div className="mt-2">
              <div className="bg-muted h-1 overflow-hidden rounded-full">
                <motion.div
                  className="bg-primary h-full"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(progress.current / progress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Search Results */}
      <AnimatePresence>
        {showResults && results.length > 0 && (
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border-border absolute top-full right-0 left-0 z-50 mt-2 max-h-[400px] overflow-y-auto rounded-lg border shadow-lg"
          >
            <div className="p-2">
              <p className="text-muted-foreground px-2 py-1 text-xs">
                {results.length} results • Powered by AI
              </p>
            </div>
            <div className="border-border border-t">
              {results.map((result, index) => (
                <motion.button
                  key={result.path}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    onResultSelect?.(result.path);
                    setShowResults(false);
                    setQuery('');
                  }}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left',
                    'hover:bg-muted/50 transition-colors',
                    index === selectedIndex && 'bg-muted'
                  )}
                >
                  <FileText className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{getFileName(result.path)}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {getParentPath(result.path)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <span className="bg-primary/10 text-primary rounded px-2 py-1 text-xs">
                      {Math.round(result.score * 100)}%
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No results */}
      <AnimatePresence>
        {showResults && query && !isSearching && results.length === 0 && isReady && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border-border absolute top-full right-0 left-0 mt-2 rounded-lg border p-6 text-center shadow-lg"
          >
            <Search className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
            <p className="text-muted-foreground text-sm">No files found</p>
            <p className="text-muted-foreground mt-1 text-xs">Try indexing your files first</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
