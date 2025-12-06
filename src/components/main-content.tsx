import { lazy, Suspense } from 'react';
import { MotionPage } from '@/components/ui/motion';

// Dynamically import the 3D dashboard for code splitting
const OmniboxDashboard = lazy(() =>
  import('@/components/omnibox/omnibox-dashboard').then((mod) => ({
    default: mod.OmniboxDashboard,
  }))
);

/**
 * Main Content — The Cosmic Chamber
 *
 * The unified 3D visualization interface. All 2D views (folders, devices,
 * settings, logs) are now accessed via Focus Mode (Ctrl+K).
 *
 * Per the UX guide: "3D is for feeling. 2D is for reading, editing, deciding."
 */
export function MainContent() {
  return (
    <main className="relative z-0 flex h-full flex-1 flex-col overflow-hidden">
      <MotionPage className="h-full">
        <Suspense
          fallback={<div className="flex h-full items-center justify-center">Loading...</div>}
        >
          <OmniboxDashboard />
        </Suspense>
      </MotionPage>
    </main>
  );
}
