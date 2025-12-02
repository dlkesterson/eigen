'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';

// Helper to compute resolved theme
function getResolvedTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  if (theme === 'system') {
    // Check if window is available (SSR safety)
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // Default for SSR
  }
  return theme;
}

export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useAppStore((state) => state.theme);
  const hasHydrated = useAppStore((state) => state._hasHydrated);

  // Use a stable default until hydrated to avoid state updates during initial render
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
  const [isMounted, setIsMounted] = useState(false);

  // Mark as mounted after first render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update resolved theme when theme setting changes (only after mount and hydration)
  useEffect(() => {
    if (isMounted && hasHydrated) {
      setResolvedTheme(getResolvedTheme(theme));
    }
  }, [theme, isMounted, hasHydrated]);

  // Listen for system theme changes only when theme is 'system'
  useEffect(() => {
    if (!isMounted || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, isMounted]);

  return resolvedTheme;
}
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      // Check system preference
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Listen for system theme changes when using "system" preference
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return <>{children}</>;
}
