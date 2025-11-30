'use client';

import { cn } from '@/lib/utils';
import { SpotlightCard } from './spotlight-card';

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {children}
    </div>
  );
}

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: 1 | 2 | 3;
  rowSpan?: 1 | 2;
  spotlightColor?: string;
  shineBorder?: boolean;
}

export function BentoCard({
  children,
  className,
  colSpan = 1,
  rowSpan = 1,
  spotlightColor,
  shineBorder = false,
}: BentoCardProps) {
  const colSpanClass = {
    1: '',
    2: 'md:col-span-2',
    3: 'md:col-span-2 lg:col-span-3',
  };

  const rowSpanClass = {
    1: '',
    2: 'row-span-2',
  };

  return (
    <SpotlightCard
      className={cn('flex flex-col p-6', colSpanClass[colSpan], rowSpanClass[rowSpan], className)}
      spotlightColor={spotlightColor}
      shineBorder={shineBorder}
    >
      {children}
    </SpotlightCard>
  );
}
