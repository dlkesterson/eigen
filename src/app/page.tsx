'use client';

import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { MainContent } from '@/components/main-content';
import { MobileNav } from '@/components/mobile-nav';
import { PendingRequestsBanner } from '@/components/pending-requests-banner';

/**
 * Main application page - Unified Cosmic UI
 *
 * Architecture:
 * - Always-visible 3D cosmic dashboard (MainContent → OmniboxDashboard)
 * - Minimal sidebar with quick actions and keyboard hints
 * - Compact header with omnibox trigger
 * - Mobile navigation for touch devices
 *
 * Navigation methods:
 * - Omnibox (⌘K): Search, commands, AI queries
 * - Focus Mode (Ctrl+K): Full 2D interface overlay
 * - Direct interaction with 3D artifacts
 */
export default function Home() {
  return (
    <div className="bg-background flex h-screen w-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden pb-16 md:pb-0">
        <Header />
        <PendingRequestsBanner />
        <MainContent />
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
