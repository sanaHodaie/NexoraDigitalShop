import assert from 'node:assert/strict';
import test from 'node:test';
import { access } from 'node:fs/promises';
import { ARTICLES, articleHref } from '../src/data/article-index.js';
import { ARTICLE_CONTENT } from '../src/data/article-content.js';
import { CATALOG_CATEGORIES } from '../src/data/catalog.js';

test('every home article resolves to content, local images and valid source links', async () => {
  assert.equal(new Set(ARTICLES.map(articleHref)).size, 4);
  for (const article of ARTICLES) {
    const content=ARTICLE_CONTENT[article.slug];
    assert.ok(content && CATALOG_CATEGORIES[article.category]);
    const anchors=content.sections.map(s=>s.id);
    assert.equal(new Set(anchors).size, anchors.length);
    for (const file of [article.image, ...content.sections.map(s=>s.image).filter(Boolean)]) {
      await access(new URL(`../public${file}`,import.meta.url));
    }
    assert.ok(content.sections.some(s=>s.sources?.length));
    for (const section of content.sections) {
      for (const source of section.sources || []) assert.equal(new URL(source.url).protocol,'https:');
    }
  }
});
