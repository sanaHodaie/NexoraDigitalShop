import React from 'react';

export const Logo = ({ className = '' }) => {
  return (
    <a
      href="#"
      className={`inline-flex items-center gap-2.5 group select-none ${className}`}
    >
      {/* Geometric Modern Tech Symbol */}
      <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-400 rounded-xl rotate-6 group-hover:rotate-12 transition-transform duration-300 shadow-md shadow-blue-500/20" />
        <div className="relative z-10 w-4 h-4 border-2 border-white rounded-md transform -rotate-6 group-hover:rotate-0 transition-transform duration-300 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full" />
        </div>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col text-right">
        <span className="text-xl font-extrabold tracking-wider bg-gradient-to-l from-blue-700 via-indigo-600 to-slate-900 dark:from-sky-400 dark:via-blue-300 dark:to-white bg-clip-text text-transparent font-sans">
          NEXORA
        </span>
        <span className="text-[9px] font-bold tracking-[0.2em] text-slate-500 dark:text-slate-400 uppercase -mt-1 font-sans">
          TECH MARKETPLACE
        </span>
      </div>
    </a>
  );
};
