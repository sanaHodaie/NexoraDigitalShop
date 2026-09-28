import React from 'react';

export const LogoutIcon = ({ className = 'w-6 h-6' }) => (
  <svg className={`text-blue-600 dark:text-sky-300 ${className}`} viewBox="0 0 64 64"
    fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <path d="M34 11H14C11.7909 11 10 12.7909 10 15V49C10 51.2091 11.7909 53 14 53H34" />
    <path d="M26 32H54M42 20L54 32L42 44" />
  </svg>
);
