import React from 'react';

export const AccountIcon = ({ className = 'w-6 h-6' }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="userGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
      <filter id="glowUser" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#38bdf8" floodOpacity="0.4" />
      </filter>
    </defs>
    <circle
      cx="32"
      cy="20"
      r="12"
      stroke="url(#userGrad)"
      strokeWidth="5.5"
      strokeLinecap="round"
      filter="url(#glowUser)"
    />
    <path
      d="M12 53C12 41.9543 20.9543 33 32 33C43.0457 33 52 41.9543 52 53"
      stroke="url(#userGrad)"
      strokeWidth="5.5"
      strokeLinecap="round"
      filter="url(#glowUser)"
    />
  </svg>
);
