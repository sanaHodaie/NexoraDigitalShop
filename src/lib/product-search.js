// Share Persian/Arabic normalization between autocomplete and catalogue filtering.
export const normalizeSearch = value => String(value ?? '').normalize('NFKC').toLowerCase()
  .replace(/ي|ى/g, 'ی').replace(/ك/g, 'ک').replace(/[آأإ]/g, 'ا')
  .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function buildSearchIndex(products) {
  return products.filter(product => product.isActive !== false).map(product => {
    const names = [product.name, product.nameEn, product.id].map(normalizeSearch);
    const text = normalizeSearch([
      ...names, product.brand, product.categoryFa, product.category,
      ...(Array.isArray(product.specs) ? product.specs : []),
    ].join(' '));
    return { product, names, text, compact: text.replaceAll(' ', '') };
  });
}

export function matchesSearch(entry, query) {
  const tokens = normalizeSearch(query).split(' ').filter(Boolean);
  // Model numbers must be whole tokens: iPhone 15 must not match an iPhone 14's A15 chip.
  const words = entry.text.split(' ');
  return tokens.every(token => /^\d+$/.test(token) ? words.includes(token) : entry.compact.includes(token));
}

export function suggestProducts(index, query, limit = 6) {
  const term = normalizeSearch(query);
  if (!term) return [];
  return index.filter(entry => matchesSearch(entry, term)).map(entry => ({
    product: entry.product,
    score: entry.names.some(name => name === term) ? 3
      : entry.names.some(name => name.startsWith(term)) ? 2
        : entry.names.some(name => name.includes(term)) ? 1 : 0,
  })).sort((a, b) => b.score - a.score || Number(b.product.inStock !== false) - Number(a.product.inStock !== false))
    .slice(0, limit).map(entry => entry.product);
}
