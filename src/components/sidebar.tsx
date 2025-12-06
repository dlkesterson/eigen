import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Bug, Command, ChevronLeft, ChevronRight, Sparkles, Keyboard } from 'lucide-react';

/**
 * Minimal sidebar for the unified 3D + Omnibox UI.
 *
 * The cosmic dashboard is always visible - users navigate via:
 * - Omnibox (Cmd+K): Search, commands, AI queries
 * - Focus Mode (Ctrl+K): Full 2D power-user interface
 * - Direct artifact interaction in the 3D scene
 *
 * This sidebar provides:
 * - Branding
 * - Quick action hints
 * - Debug access
 */
export function Sidebar() {
  const { sidebarOpen, toggleSidebar, toggleFocusMode, toggleDebugPanel } = useAppStore();

  return (
    <aside
      className={cn(
        'glass-panel z-30 flex h-full flex-col border-r border-white/10 transition-all duration-300',
        sidebarOpen ? 'w-56' : 'w-14'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/5 px-3">
        <img src="/app_icon.png" alt="Eigen" width={32} height={32} className="rounded-lg" />
        {sidebarOpen && (
          <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-lg font-bold text-transparent">
            Eigen
          </span>
        )}
      </div>

      {/* Keyboard Hints */}
      <div className="flex-1 space-y-2 p-3">
        {sidebarOpen && (
          <div className="mb-4 space-y-1 rounded-lg bg-white/5 p-3">
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
              Quick Actions
            </p>

            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">⌘K</kbd>
              <span>Omnibox</span>
            </div>

            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">^K</kbd>
              <span>Focus Mode</span>
            </div>

            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">Esc</kbd>
              <span>Close overlays</span>
            </div>
          </div>
        )}

        {/* Quick Action Buttons */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'text-muted-foreground hover:bg-accent/50 hover:text-foreground w-full',
            sidebarOpen ? 'justify-start gap-3' : 'justify-center'
          )}
          onClick={() => {
            // Trigger omnibox open via custom event
            window.dispatchEvent(new CustomEvent('open-omnibox'));
          }}
          title="Open Omnibox (⌘K)"
        >
          <Command className="h-4 w-4 shrink-0" />
          {sidebarOpen && <span>Omnibox</span>}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'text-muted-foreground hover:bg-accent/50 hover:text-foreground w-full',
            sidebarOpen ? 'justify-start gap-3' : 'justify-center'
          )}
          onClick={toggleFocusMode}
          title="Focus Mode (Ctrl+K)"
        >
          <Keyboard className="h-4 w-4 shrink-0" />
          {sidebarOpen && <span>Focus Mode</span>}
        </Button>

        {/* Spacer with cosmic hint */}
        {sidebarOpen && (
          <div className="text-muted-foreground/50 mt-6 flex items-center gap-2 px-2 text-xs">
            <Sparkles className="h-3 w-3" />
            <span>Click artifacts in the cosmos</span>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="space-y-1 border-t border-white/5 p-3">
        {/* Debug Panel Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'text-muted-foreground hover:bg-accent/50 hover:text-foreground w-full',
            sidebarOpen ? 'justify-start gap-3' : 'justify-center'
          )}
          onClick={toggleDebugPanel}
          title="Debug Panel (Ctrl+Shift+D)"
        >
          <Bug className="h-4 w-4 shrink-0" />
          {sidebarOpen && <span>Debug</span>}
        </Button>

        {/* Sidebar Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:bg-accent/50 hover:text-foreground w-full justify-center"
          onClick={toggleSidebar}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
