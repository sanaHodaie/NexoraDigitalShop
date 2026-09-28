import React from 'react';

export const AccountIcon = ({ className = 'w-6 h-6' }) => (
  <svg className={`text-blue-600 dark:text-sky-300 ${className}`} viewBox="0 0 64 64"
    fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round"
    aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="20" r="12" />
    <path d="M12 53C12 41.9543 20.9543 33 32 33C43.0457 33 52 41.9543 52 53" />
  </svg>
);
