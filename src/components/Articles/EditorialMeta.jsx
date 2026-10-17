import { useEffect } from 'react';

export default function EditorialMeta({ title, description, path, image, article }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | مجله نکسورا`;
    const restore = [];
    const url = `${window.location.origin}${path}`;
    for (const [attribute, name, content] of [
      ['name', 'description', description], ['property', 'og:title', title],
      ['property', 'og:description', description], ['property', 'og:type', article ? 'article' : 'website'],
      ['property', 'og:url', url], ['property', 'og:image', `${window.location.origin}${image}`],
    ]) {
      let node = document.head.querySelector(`meta[${attribute}="${name}"]`);
      const existed = Boolean(node), old = node?.getAttribute('content');
      if (!node) { node = document.createElement('meta'); node.setAttribute(attribute, name); document.head.appendChild(node); }
      node.setAttribute('content', content);
      restore.push(() => { if (!existed) node.remove(); else if (old === null) node.removeAttribute('content'); else node.setAttribute('content', old); });
    }
    const canonical = document.createElement('link'); canonical.rel = 'canonical'; canonical.href = url;
    document.head.appendChild(canonical);
    const schema = document.createElement('script'); schema.type = 'application/ld+json';
    schema.textContent = JSON.stringify(article ? {
      '@context': 'https://schema.org', '@type': 'Article', headline: title, description,
      image: `${window.location.origin}${image}`, datePublished: article.published,
      dateModified: article.published, inLanguage: 'fa', mainEntityOfPage: url,
      author: { '@type': 'Organization', name: 'مجله نکسورا' },
    } : { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description, url, inLanguage: 'fa' }).replace(/</g, '\\u003c');
    document.head.appendChild(schema);
    return () => { document.title = previousTitle; restore.forEach(fn => fn()); canonical.remove(); schema.remove(); };
  }, [title, description, path, image, article]);
  return null;
}
