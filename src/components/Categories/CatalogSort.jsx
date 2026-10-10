import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, SlidersHorizontal } from 'lucide-react';

const options = [
  { value: 'featured', label: 'پیشنهاد نکسورا' },
  { value: 'price-asc', label: 'ارزان‌ترین' },
  { value: 'price-desc', label: 'گران‌ترین' },
];

export default function CatalogSort({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const items = useRef([]);
  const menuId = useId();
  const selected = options.findIndex(option => option.value === value);
  useEffect(() => {
    if (!open) return;
    items.current[selected]?.focus();
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, selected]);
  const choose = next => { onChange(next); setOpen(false); trigger.current?.focus(); };
  const onKeyDown = event => {
    const index = items.current.indexOf(document.activeElement);
    if (['Enter', ' '].includes(event.key) && index >= 0) { event.preventDefault(); choose(options[index].value); }
    else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      items.current[next]?.focus();
    }
  };
  return <div className="catalog-sort" ref={root}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button type="button" className="catalog-sort-trigger" ref={trigger}
      aria-label={`مرتب‌سازی: ${options[selected].label}`} aria-haspopup="menu" aria-expanded={open}
      aria-controls={open ? menuId : undefined} onClick={() => setOpen(previous => !previous)}
      onKeyDown={event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); } }}>
      <SlidersHorizontal size={17} aria-hidden="true" /><span>{options[selected].label}</span>
      <ChevronDown size={16} className="catalog-sort-chevron" aria-hidden="true" />
    </button>
    {open && <div id={menuId} className="catalog-sort-menu" role="menu" aria-label="مرتب‌سازی محصولات" onKeyDown={onKeyDown}>
      {options.map((option, index) => <button key={option.value} type="button" role="menuitemradio"
        aria-checked={value === option.value} tabIndex={-1} ref={el => { items.current[index] = el; }}
        onClick={() => choose(option.value)}><span>{option.label}</span>
        {value === option.value && <Check size={16} aria-hidden="true" />}</button>)}
    </div>}
  </div>;
}
