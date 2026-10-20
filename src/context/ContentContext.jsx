import React, {createContext, useContext, useEffect, useState} from 'react';
import {api} from '../api/client';
import {HOME_DEFAULTS, SETTINGS_DEFAULTS} from '../data/site-defaults';
import {CATALOG_CATEGORIES} from '../data/catalog';
import {CATEGORIES} from '../data/mockData';
import {ARTICLES} from '../data/article-index';

const ContentContext = createContext(null);
export function ContentProvider({children}) {
  const [documents, setDocuments] = useState({});
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    const load = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try { const data = await api('/content', {signal: controller.signal}); if (!controller.signal.aborted) setDocuments(data); }
      catch { /* Published local content remains available while the API wakes up. */ }
      finally { busy = false; }
    };
    load();
    const timer = setInterval(load, 60_000);
    window.addEventListener('focus', load);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', load); };
  }, []);
  const categories = {...CATALOG_CATEGORIES};
  for (const item of documents.categories?.items || []) categories[item.id] = {...categories[item.id], ...item};
  const categoryList = CATEGORIES.map(c=>({...c, name: categories[c.id].title, image: categories[c.id].thumbnail || c.image}));
  const articles = documents.articles ? documents.articles.items.map(a=>a.metadata) : ARTICLES;
  const articleContent = Object.fromEntries((documents.articles?.items || []).map(a=>[a.metadata.slug,a.content]));
  return <ContentContext.Provider value={{home: documents.home || HOME_DEFAULTS, settings: documents.settings || SETTINGS_DEFAULTS,
    categories, categoryList, articles, articleContent, loadedArticles: Boolean(documents.articles)}}>{children}</ContentContext.Provider>;
}
export const useContent = () => useContext(ContentContext);
