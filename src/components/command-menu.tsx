'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import {
  Search,
  Laptop,
  Folder,
  Settings,
  LayoutDashboard,
  ScrollText,
  X,
  FileSearch,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { useAISearch } from '@/hooks/useAISearch';

interface SearchResult {
  path: string;
  name?: string;
  score: number;
}

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const { setActiveTab, aiEnabled } = useAppStore();
  const { search: aiSearch, isReady } = useAISearch();

  // Handle keyboard shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Debounced AI search
  React.useEffect(() => {
    if (!aiEnabled || !isReady || search.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const results = await aiSearch(search);
        setSearchResults(results.map((r) => ({ ...r, name: r.path.split('/').pop() })));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, aiEnabled, isReady, aiSearch]);

  const navigateTo = (tab: 'dashboard' | 'folders' | 'devices' | 'settings' | 'logs') => {
    setActiveTab(tab);
    setOpen(false);
    setSearch('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100">
      {/* Backdrop */}
      <div
        className="bg-background/80 absolute inset-0 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Command Dialog */}
      <div className="fixed top-1/4 left-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2">
        <Command
          className="border-border bg-card overflow-hidden rounded-xl border shadow-2xl"
          shouldFilter={!aiEnabled}
        >
          <div className="border-border flex items-center border-b px-3">
            <Search className="text-muted-foreground mr-2 h-4 w-4 shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder={aiEnabled ? 'Ask Eigen anything...' : 'Type a command or search...'}
              className="placeholder:text-muted-foreground flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="text-muted-foreground py-6 text-center text-sm">
              {isSearching ? 'Searching...' : 'No results found.'}
            </Command.Empty>

            {/* Navigation Group */}
            <Command.Group
              heading="Navigation"
              className="text-muted-foreground px-2 py-1.5 text-xs font-medium"
            >
              <Command.Item
                onSelect={() => navigateTo('dashboard')}
                className="hover:bg-accent aria-selected:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
                <span className="text-muted-foreground ml-auto text-xs">Overview</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('folders')}
                className="hover:bg-accent aria-selected:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm"
              >
                <Folder className="h-4 w-4" />
                <span>Folders</span>
                <span className="text-muted-foreground ml-auto text-xs">Manage synced folders</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('devices')}
                className="hover:bg-accent aria-selected:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm"
              >
                <Laptop className="h-4 w-4" />
                <span>Devices</span>
                <span className="text-muted-foreground ml-auto text-xs">Connected peers</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('logs')}
                className="hover:bg-accent aria-selected:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm"
              >
                <ScrollText className="h-4 w-4" />
                <span>Logs</span>
                <span className="text-muted-foreground ml-auto text-xs">System events</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('settings')}
                className="hover:bg-accent aria-selected:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
                <span className="text-muted-foreground ml-auto text-xs">Preferences</span>
              </Command.Item>
            </Command.Group>

            {/* AI Search Results */}
            {aiEnabled && searchResults.length > 0 && (
              <Command.Group
                heading="Files"
                className="text-muted-foreground px-2 py-1.5 text-xs font-medium"
              >
                {searchResults.slice(0, 5).map((result: SearchResult, index: number) => (
                  <Command.Item
                    key={`${result.path}-${index}`}
                    className="hover:bg-accent aria-selected:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm"
                  >
                    <FileSearch className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="truncate">
                        {result.name || result.path.split('/').pop()}
                      </span>
                      <span className="text-muted-foreground truncate text-xs">{result.path}</span>
                    </div>
                    <span className="text-muted-foreground ml-auto text-xs">
                      {(result.score * 100).toFixed(0)}%
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div className="border-border text-muted-foreground flex items-center justify-between border-t px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <kbd className="border-border bg-muted rounded border px-1.5 py-0.5 font-mono">
                ↑↓
              </kbd>
              <span>Navigate</span>
              <kbd className="border-border bg-muted rounded border px-1.5 py-0.5 font-mono">↵</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="border-border bg-muted rounded border px-1.5 py-0.5 font-mono">
                Esc
              </kbd>
              <span>Close</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
