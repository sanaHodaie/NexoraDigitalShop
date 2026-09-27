import React from 'react';

export const LogoutIcon = ({ className = 'w-6 h-6' }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="logoutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
      <filter id="glowLogout" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#38bdf8" floodOpacity="0.4" />
      </filter>
    </defs>
    {/* Door Frame */}
    <path
      d="M34 11H14C11.7909 11 10 12.7909 10 15V49C10 51.2091 11.7909 53 14 53H34"
      stroke="url(#logoutGrad)"
      strokeWidth="5.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter="url(#glowLogout)"
    />
    {/* Arrow Stem */}
    <path
      d="M26 32H54"
      stroke="url(#logoutGrad)"
      strokeWidth="5.5"
      strokeLinecap="round"
      filter="url(#glowLogout)"
    />
    {/* Arrow Head */}
    <path
      d="M42 20L54 32L42 44"
      stroke="url(#logoutGrad)"
      strokeWidth="5.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter="url(#glowLogout)"
    />
  </svg>
);
