'use client';

import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { MainContent } from '@/components/main-content';
import { MobileNav } from '@/components/mobile-nav';
import { useAppStore } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Minimize2, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { focusMode, toggleFocusMode, toggleDebugPanel } = useAppStore();

  return (
    <div className="bg-background flex h-screen w-screen overflow-hidden">
      {/* Focus Mode Floating Controls - visible only in focus mode */}
      <AnimatePresence>
        {focusMode && (
          <motion.div
            className="fixed bottom-4 left-4 z-50 flex flex-col gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <Button
              variant="secondary"
              size="icon"
              onClick={toggleFocusMode}
              className="bg-card/80 hover:bg-card border-border h-10 w-10 rounded-full border shadow-lg backdrop-blur-sm"
              title="Exit Focus Mode"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={toggleDebugPanel}
              className="bg-card/80 hover:bg-card border-border h-10 w-10 rounded-full border shadow-lg backdrop-blur-sm"
              title="Debug Panel (Ctrl+Shift+D)"
            >
              <Bug className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - hidden on mobile and in focus mode */}
      <AnimatePresence>
        {!focusMode && (
          <motion.div
            className="hidden md:block"
            initial={{ x: -256, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -256, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden pb-16 md:pb-0">
        <AnimatePresence>
          {!focusMode && (
            <motion.div
              initial={{ y: -64, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -64, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <Header />
            </motion.div>
          )}
        </AnimatePresence>
        <MainContent />
      </div>

      {/* Mobile Bottom Navigation - hidden on desktop and in focus mode */}
      <AnimatePresence>
        {!focusMode && (
          <motion.div
            initial={{ y: 64, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 64, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <MobileNav />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
