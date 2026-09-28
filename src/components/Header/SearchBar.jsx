import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ArrowUpLeft, Sparkles } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export const SearchBar = ({ className = '', isCompact = false }) => {
  const { searchQuery, setSearchQuery, setQuickViewProduct, allProducts } = useShop();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef(null);


  const filteredProducts = searchQuery.trim()
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.categoryFa.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        if (isCompact && !searchQuery) {
          setIsExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCompact, searchQuery]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* If compact, it behaves like a sleek expandable pill or small input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (filteredProducts.length > 0) {
            setQuickViewProduct(filteredProducts[0]);
            setIsOpen(false);
          }
        }}
        className="relative flex items-center"
      >
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setIsExpanded(true);
          }}
          placeholder="جستجو..."
          className={`h-8 text-xs bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-full border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all shadow-inner pr-8 pl-6 ${
            isCompact ? (isExpanded || searchQuery ? 'w-44 lg:w-56' : 'w-28 lg:w-36') : 'w-full'
          }`}
        />

        {/* Search icon inside right */}
        <Search className="absolute right-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />

        {/* Clear Button */}
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setIsOpen(false);
            }}
            className="absolute left-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </form>

      {/* Live Search Suggestions Dropdown */}
      {isOpen && searchQuery.trim() !== '' && (
        <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="py-2">
            <div className="px-3.5 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase flex items-center justify-between">
              <span>نتایج جستجو ({filteredProducts.length})</span>
              <Sparkles className="w-3 h-3 text-blue-500" />
            </div>

            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    setQuickViewProduct(product);
                    setIsOpen(false);
                  }}
                  className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-right cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 overflow-hidden shrink-0">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 line-clamp-1">
                        {product.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ${product.price}
                      </div>
                    </div>
                  </div>
                  <ArrowUpLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                </button>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-500">
                موردی یافت نشد.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
