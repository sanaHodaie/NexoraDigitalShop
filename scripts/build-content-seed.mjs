// Build initial CMS records. Runtime seed inserts missing keys only, preserving administrator edits.
import { writeFile } from 'node:fs/promises';
import { CATALOG_CATEGORIES } from '../src/data/catalog.js';
import { CATEGORIES } from '../src/data/mockData.js';
import { HOME_DEFAULTS, SETTINGS_DEFAULTS } from '../src/data/site-defaults.js';
import { ARTICLES } from '../src/data/article-index.js';
import { ARTICLE_CONTENT } from '../src/data/article-content.js';
const content = {
  home: HOME_DEFAULTS,
  settings: SETTINGS_DEFAULTS,
  categories: {items: Object.entries(CATALOG_CATEGORIES).map(([id,c]) => ({id,title:c.title,english:c.english,
    description:c.description,image:c.image,thumbnail:CATEGORIES.find(x=>x.id===id).image}))},
  articles: {items: ARTICLES.map(metadata=>({published:true,metadata,content:ARTICLE_CONTENT[metadata.slug]}))},
};
await writeFile(new URL('../backend/data/site-content.json',import.meta.url),JSON.stringify(content,null,2)+'\n');
console.log('Built initial CMS documents.');
