'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ShineBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  borderWidth?: number;
  duration?: number;
  shineColor?: string;
}

export function ShineBorder({
  children,
  className,
  borderWidth = 1,
  duration = 14,
  shineColor = 'rgba(99, 102, 241, 0.5)',
  ...props
}: ShineBorderProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      ref={divRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn('relative overflow-hidden rounded-xl', className)}
      style={{
        padding: borderWidth,
      }}
      {...props}
    >
      {/* Animated border gradient */}
      <div
        className={cn(
          'absolute inset-0 rounded-xl transition-opacity duration-500',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          background: `conic-gradient(from 0deg at 50% 50%, transparent, ${shineColor}, transparent, ${shineColor}, transparent)`,
          animation: isHovered ? `spin ${duration}s linear infinite` : 'none',
        }}
      />

      {/* Static border for non-hover state */}
      <div
        className={cn(
          'absolute inset-0 rounded-xl transition-opacity duration-500',
          isHovered ? 'opacity-0' : 'opacity-100'
        )}
        style={{
          background: 'hsl(var(--border))',
        }}
      />

      {/* Inner content container */}
      <div
        className="bg-card relative h-full w-full rounded-[calc(0.75rem-1px)]"
        style={{
          margin: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
