import React from 'react';
import { Check, Columns3 } from 'lucide-react';
import { useCompare } from '../../context/CompareContext';
import './compare.css';

export default function CompareButton({ product, className = '' }) {
  const { ids, toggle } = useCompare();
  const selected = ids.includes(product.id);
  return <button type="button" className={`compare-toggle ${className}`} aria-pressed={selected}
    aria-label={`${selected ? 'حذف از مقایسه' : 'افزودن به مقایسه'}: ${product.name}`}
    onClick={event => { event.stopPropagation(); toggle(product); }}>
    {selected ? <Check size={16} /> : <Columns3 size={16} />}<span>{selected ? 'در فهرست مقایسه' : 'مقایسه'}</span>
  </button>;
}
