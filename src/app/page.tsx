'use client';

import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { MainContent } from '@/components/main-content';
import { MobileNav } from '@/components/mobile-nav';
import { useAppStore } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { focusMode, toggleFocusMode } = useAppStore();

  return (
    <div className="bg-background flex h-screen w-screen overflow-hidden">
      {/* Focus Mode Toggle Button */}
      <motion.div
        className="fixed right-4 bottom-4 z-50 md:right-6 md:bottom-6"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          variant="outline"
          size="icon"
          onClick={toggleFocusMode}
          className="border-border bg-card/80 hover:bg-accent/80 h-10 w-10 rounded-full shadow-lg backdrop-blur-md"
          title={focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
        >
          {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </motion.div>

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
