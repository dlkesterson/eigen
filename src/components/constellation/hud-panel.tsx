'use client';

import { cn } from '@/lib/utils';

interface HudPanelProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
}

export function HudPanel({ title, value, icon, className }: HudPanelProps) {
  return (
    <div
      className={cn(
        'w-56 rounded-lg border border-blue-400/40 bg-black/50 p-4 backdrop-blur-xl',
        className
      )}
      style={{
        boxShadow: '0 0 25px rgba(96, 165, 250, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-widest text-blue-300/70 uppercase">{title}</p>
          <p className="mt-2 font-mono text-sm font-semibold text-white">{value}</p>
        </div>
        {icon && <span className="text-2xl opacity-60">{icon}</span>}
      </div>
    </div>
  );
}
