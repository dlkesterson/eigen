import { Providers } from '@/components/providers';
import { CommandMenu } from '@/components/command-menu';
import { MainContent } from '@/components/main-content';
import { MobileNav } from '@/components/mobile-nav';

/**
 * Main application component - Pure Cosmic UI
 *
 * Architecture:
 * - Full-screen 3D cosmic dashboard (MainContent → OmniboxDashboard)
 * - All navigation via Omnibox (⌘K / Ctrl+K)
 * - Status, notifications, settings integrated into 3D HUD
 * - Mobile navigation for touch devices
 *
 * Per UX Guide:
 * - "3D shows you **where** you are"
 * - "Glass panels show you **what** is there"
 * - All text-heavy interfaces (settings, logs) via glass overlays
 */
export function App() {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-background font-sans antialiased">
        <Providers>
          <div className="bg-background flex h-screen w-screen overflow-hidden">
            {/* Full-screen Cosmic Dashboard */}
            <MainContent />

            {/* Mobile Bottom Navigation */}
            <MobileNav />
          </div>
          <CommandMenu />
          <div className="bg-noise" />
        </Providers>
      </body>
    </html>
  );
}
