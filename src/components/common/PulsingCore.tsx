import React from 'react';
import { cn } from '@/lib/utils';

export function PulsingCore({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  // Use unique IDs for gradients/filters to avoid conflicts if used multiple times
  const uniqueId = React.useId();
  const gradientId = `gradient-core-${uniqueId}`;
  const glowId = `gradient-glow-${uniqueId}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={cn(className)}
      {...props}
    >
      <defs>
        <radialGradient id={gradientId}>
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </radialGradient>
        <radialGradient id={glowId}>
          <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
      </defs>
      
      {/* Glow effect circle */}
      <circle
        cx="50"
        cy="50"
        r="40"
        fill={`url(#${glowId})`}
        className="animate-pulse-glow"
        style={{ transformOrigin: 'center' }}
      />
      
      {/* Main core circle */}
      <circle
        cx="50"
        cy="50"
        r="25"
        fill={`url(#${gradientId})`}
        className="animate-pulse-core"
        style={{ transformOrigin: 'center' }}
      />
    </svg>
  );
}
