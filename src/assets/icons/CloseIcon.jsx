import React from 'react';

export const CloseIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="closeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
      <filter id="glowClose" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#38bdf8" floodOpacity="0.4" />
      </filter>
    </defs>
    <line
      x1="14"
      y1="14"
      x2="50"
      y2="50"
      stroke="url(#closeGrad)"
      strokeWidth="6"
      strokeLinecap="round"
      filter="url(#glowClose)"
    />
    <line
      x1="50"
      y1="14"
      x2="14"
      y2="50"
      stroke="url(#closeGrad)"
      strokeWidth="6"
      strokeLinecap="round"
      filter="url(#glowClose)"
    />
  </svg>
);
