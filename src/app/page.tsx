'use client';

import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { MainContent } from '@/components/main-content';
import { MobileNav } from '@/components/mobile-nav';

export default function Home() {
  return (
    <div className="bg-background flex h-screen w-screen overflow-hidden">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden pb-16 md:pb-0">
        <Header />
        <MainContent />
      </div>

      {/* Mobile Bottom Navigation - hidden on desktop */}
      <MobileNav />
    </div>
  );
}
