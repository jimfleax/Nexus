import React from "react";

export function NexusLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f8f4fb]">
      <svg
        viewBox="0 0 100 100"
        width="80"
        height="80"
        aria-label="Loading…"
        role="img"
      >
        <defs>
          <linearGradient id="nexus-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4a3285" />
            <stop offset="45%" stopColor="#815ac0" />
            <stop offset="100%" stopColor="#c19ee0" />
          </linearGradient>
        </defs>

        <path
          d="M 28 75 L 28 25 L 72 75 L 72 25"
          fill="none"
          stroke="url(#nexus-grad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="100"
          className="nexus-n-stroke"
        />
      </svg>

      <style>{`
        @keyframes nexus-draw-erase {
          0%   { stroke-dashoffset: 100; }
          45%  { stroke-dashoffset: 0; }
          55%  { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -100; }
        }
        
        @keyframes nexus-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .nexus-n-stroke {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: nexus-draw-erase 2.2s ease-in-out infinite;
        }

        @media (prefers-reduced-motion) {
          .nexus-n-stroke {
            stroke-dasharray: none;
            stroke-dashoffset: 0;
            animation: nexus-pulse 2s ease-in-out infinite;
          }
        }
      `}</style>
    </div>
  );
}
