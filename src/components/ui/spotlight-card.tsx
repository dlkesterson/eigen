'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  spotlightColor?: string;
  shineBorder?: boolean;
  shineDuration?: number;
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = 'rgba(99, 102, 241, 0.15)', // Indigo-500 equivalent
  shineBorder = false,
  shineDuration = 14,
  ...props
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setOpacity(1);
    setIsHovered(true);
  };

  const handleBlur = () => {
    setOpacity(0);
    setIsHovered(false);
  };

  if (shineBorder) {
    return (
      <div
        ref={divRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleFocus}
        onMouseLeave={handleBlur}
        className={cn('relative overflow-hidden rounded-xl p-px', className)}
        {...props}
      >
        {/* Animated shine border gradient */}
        <div
          className={cn(
            'absolute inset-0 rounded-xl transition-opacity duration-500',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            background: `conic-gradient(from 0deg at 50% 50%, transparent, ${spotlightColor.replace('0.15', '0.5')}, transparent, ${spotlightColor.replace('0.15', '0.5')}, transparent)`,
            animation: isHovered ? `spin ${shineDuration}s linear infinite` : 'none',
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

        {/* Inner content */}
        <div className="bg-card/50 relative h-full rounded-[calc(0.75rem-1px)] backdrop-blur-xl">
          {/* Spotlight effect */}
          <div
            className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
            style={{
              opacity,
              background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
            }}
          />
          <div className="relative h-full">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleFocus}
      onMouseLeave={handleBlur}
      className={cn(
        'border-border bg-card/50 hover:border-primary/50 relative overflow-hidden rounded-xl border backdrop-blur-xl transition-colors',
        className
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}
