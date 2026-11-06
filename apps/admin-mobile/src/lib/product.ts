import type { Product } from '../api/types';
import { digits } from './format';
export type Filters = { categories: { id: string; title: string }[]; kinds: Record<string, string[]> };
export const integer = (value: string, max: number) => {
  const raw = digits(value.trim());
  if (!/^\d+$/.test(raw) || Number(raw) > max) throw new Error('عدد صحیح در محدودهٔ مجاز وارد کنید.');
  return Number(raw);
};
export function productBody(product: Product) {
  return { id: product.id, name: product.name, nameEn: product.nameEn, category: product.category,
    categoryFa: product.categoryFa || '', brand: product.brand || '', priceRial: Math.round(product.price * 600000),
    stock: product.stock, expectedStock: product.stock, isActive: product.isActive, image: product.image,
    description: product.description || '', specs: product.specs || [], badge: product.badge || '' };
}
