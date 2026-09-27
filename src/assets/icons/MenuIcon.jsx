import React from 'react';

export const MenuIcon = ({ className = 'w-6 h-6' }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="menuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
      <filter id="glowMenu" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#38bdf8" floodOpacity="0.4" />
      </filter>
    </defs>
    <rect
      x="8"
      y="12"
      width="48"
      height="10"
      rx="5"
      fill="url(#menuGrad)"
      filter="url(#glowMenu)"
    />
    <rect
      x="8"
      y="27"
      width="48"
      height="10"
      rx="5"
      fill="url(#menuGrad)"
      filter="url(#glowMenu)"
    />
    <rect
      x="8"
      y="42"
      width="48"
      height="10"
      rx="5"
      fill="url(#menuGrad)"
      filter="url(#glowMenu)"
    />
  </svg>
);
