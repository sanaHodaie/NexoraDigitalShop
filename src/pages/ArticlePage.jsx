import React, { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Check, Clock } from 'lucide-react';
import { articleHref } from '../data/article-index';
import { useContent } from '../context/ContentContext';
import { ARTICLE_CONTENT } from '../data/article-content';
import EditorialMeta from '../components/Articles/EditorialMeta';
import './editorial.css';

export default function ArticlePage() {
  const {articles: ARTICLES, articleContent, categories: CATALOG_CATEGORIES, loadedArticles} = useContent();
  const { slug } = useParams();
  const { hash } = useLocation();
  const article = ARTICLES.find(item => item.slug === slug);
  const content = loadedArticles ? articleContent[slug] : ARTICLE_CONTENT[slug];
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [slug, hash, content]);
  if (!article || !content) return <section className="editorial editorial-missing" dir="rtl"><title>مقاله پیدا نشد | نکسورا</title><meta name="robots" content="noindex" /><h1>این مقاله پیدا نشد</h1><Link to="/magazine">بازگشت به مجله فناوری</Link></section>;
  return <div className="editorial" dir="rtl">
    <EditorialMeta title={article.title} description={article.excerpt} path={articleHref(article)} image={article.image} article={article} />
    <nav className="editorial-crumb" aria-label="مسیر صفحه"><Link to="/">خانه</Link><span>/</span><Link to="/magazine">مجله فناوری</Link><span>/</span><span aria-current="page">{article.tag}</span></nav>
    <article>
      <header className="article-heading"><span className="editorial-kicker"><BookOpen size={16} />{article.tag}</span><h1>{article.title}</h1><p>{article.excerpt}</p><div className="editorial-meta"><span>مجلهٔ نکسورا</span><time dateTime={article.published}>{article.date}</time><span><Clock size={15} />{article.readTime}</span></div></header>
      <figure className="article-cover"><img src={article.image} alt={article.imageAlt} width="1200" height="800" fetchPriority="high" decoding="async" /><figcaption>تصویر نمایشی برای فضاسازی مقاله</figcaption></figure>
      <div className="article-layout">
        <aside className="article-sidebar"><nav aria-label="فهرست مطالب"><span className="editorial-kicker">در این مقاله می‌خوانی</span>{content.sections.map(section => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}<a href="#checklist">چک‌لیست کاربردی</a></nav><Link className="article-shop" to={`/category/${article.category}`}><span>از خواندن تا انتخاب</span><strong>{CATALOG_CATEGORIES[article.category].title}</strong><ArrowLeft size={19} /></Link></aside>
        <div className="article-body"><p className="article-lead">{content.intro}</p><div className="article-takeaway"><span>نکتهٔ کلیدی</span><p>{content.takeaway}</p></div>
          {content.sections.map(section => <section key={section.id} id={section.id} className="article-section"><h2>{section.title}</h2>{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}{section.sources && <div className="article-sources"><span>منبع و مطالعهٔ بیشتر: </span>{section.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label}<span className="sr-only"> (در زبانهٔ جدید)</span></a>)}</div>}{section.image && <figure className={section.contain ? 'article-figure contain' : 'article-figure'}><img src={section.image} alt={section.imageAlt} width="960" height="640" loading="lazy" decoding="async" /><figcaption>{section.caption}</figcaption></figure>}</section>)}
          <section id="checklist" className="article-checklist"><h2>قبل از انتخاب، این‌ها را بررسی کن</h2><ul>{content.checklist.map(item => <li key={item}><Check size={18} aria-hidden="true" />{item}</li>)}</ul></section>
          <p className="article-note">تألیف و جمع‌بندی فارسی برای مجلهٔ نکسورا، با ارجاع به منابع هر بخش. تصاویر برای فضاسازی‌اند و این مطلب گزارش آزمایش عملی محصولات نیست.</p>
        </div>
      </div>
    </article>
    <section className="article-related" aria-labelledby="related-title"><h2 id="related-title" className="editorial-section-title">مطالعه را ادامه بده</h2><div className="magazine-grid">{ARTICLES.filter(item => item.id !== article.id).map(item => <Link className="magazine-card" to={articleHref(item)} key={item.id}><img src={item.image} alt={item.imageAlt} width="600" height="400" loading="lazy" decoding="async" /><div><span className="editorial-kicker">{item.tag}</span><h3>{item.title}</h3><span className="editorial-link">ادامهٔ مطلب<ArrowLeft size={16} /></span></div></Link>)}</div></section>
  </div>;
}
