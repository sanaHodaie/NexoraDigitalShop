import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock } from 'lucide-react';
import { ARTICLES, articleHref } from '../data/article-index';
import EditorialMeta from '../components/Articles/EditorialMeta';
import './editorial.css';

export default function MagazinePage() {
  const [featured, ...rest] = ARTICLES;
  return <div className="editorial" dir="rtl">
    <EditorialMeta title="مجله فناوری" description="راهنماهای کاربردی نکسورا دربارهٔ میز کار، گجت‌های روزمره، خانهٔ هوشمند و دنیای بازی." path="/magazine" image={featured.image} />
    <nav className="editorial-crumb" aria-label="مسیر صفحه"><Link to="/">خانه</Link><span>/</span><span aria-current="page">مجله فناوری</span></nav>
    <header className="magazine-heading"><span className="editorial-kicker"><BookOpen size={17} /> خواندن، شناختن، انتخاب‌کردن</span><h1>فناوری، برای زندگی بهتر<span>مجلهٔ نکسورا</span></h1><p>از یک میز کار مرتب تا یک خانهٔ هوشمند؛ ایده‌هایی کاربردی برای استفادهٔ بهتر از دنیای دیجیتال.</p></header>
    <Link to={articleHref(featured)} className="magazine-feature">
      <img src={featured.image} alt={featured.imageAlt} width="1200" height="800" fetchPriority="high" decoding="async" />
      <div><span className="editorial-kicker">انتخاب سردبیر · {featured.tag}</span><h2>{featured.title}</h2><p>{featured.excerpt}</p><span className="editorial-meta"><Clock size={15} /> {featured.readTime}</span><span className="editorial-link">شروع مطالعه <ArrowLeft size={18} /></span></div>
    </Link>
    <section aria-labelledby="more-reading"><h2 id="more-reading" className="editorial-section-title">برای کنجکاوی بعدی تو</h2><div className="magazine-grid">{rest.map(item => <Link to={articleHref(item)} key={item.id} className="magazine-card"><img src={item.image} alt={item.imageAlt} width="600" height="400" loading="lazy" decoding="async" /><div><span className="editorial-kicker">{item.tag}</span><h3>{item.title}</h3><p>{item.excerpt}</p><span className="editorial-meta">{item.readTime}<ArrowLeft size={16} /></span></div></Link>)}</div></section>
  </div>;
}
