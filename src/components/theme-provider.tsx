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
  // Initialize with computed value to avoid setState in effect
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    getResolvedTheme(theme)
  );

  // Update resolved theme when theme setting changes
  useEffect(() => {
    queueMicrotask(() => {
      setResolvedTheme(getResolvedTheme(theme));
    });
  }, [theme]);

  // Listen for system theme changes only when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

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
