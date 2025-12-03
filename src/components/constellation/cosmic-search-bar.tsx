'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CosmicSearchBarProps {
  onSearch?: (query: string) => void;
  className?: string;
}

export function CosmicSearchBar({ onSearch, className }: CosmicSearchBarProps) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && value.trim()) {
      onSearch(value.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('relative w-96', className)}>
      <div
        className="flex items-center gap-3 rounded-full border border-cyan-400/30 bg-black/30 px-6 py-3 backdrop-blur-xl"
        style={{
          boxShadow: focused
            ? '0 0 30px rgba(34, 211, 238, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)'
            : '0 0 15px rgba(34, 211, 238, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.05)',
          transition: 'box-shadow 0.3s ease',
        }}
      >
        <Search className="h-4 w-4 text-cyan-400/60" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search files semantically..."
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent font-mono text-sm text-white placeholder-gray-500 outline-none"
        />
      </div>

      {/* Glow effect when focused */}
      {focused && (
        <div
          className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500/0 via-cyan-400/20 to-cyan-500/0 blur-xl"
          style={{
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      )}
    </form>
  );
}
