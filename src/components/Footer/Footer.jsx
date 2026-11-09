import React from 'react';
import {useContent} from '../../context/ContentContext';
import { Link } from 'react-router-dom';
import {TELEGRAM_SHOP_BOT} from '../../data/support';
import { Logo } from '../Header/Logo';
import { Instagram, Youtube, Twitter, Facebook, Globe, Send, Headphones } from 'lucide-react';

export const Footer = () => {
  const {settings} = useContent();
  const setupThumbnails = [
    '/assets/article_productivity_setup_1790528034532.jpg',
    '/assets/collection_audio_headphones_1790528002919.jpg',
    '/assets/collection_gaming_gear_1790528013982.jpg',
    '/assets/collection_smart_home_1790528023441.jpg',
    '/assets/collection_laptop_pc_1790528088687.jpg',
    '/assets/collection_wearables_watch_1790528102322.jpg',
  ];

  return (
    <footer id="footer" className="bg-slate-900 text-slate-400 pt-12 pb-8 border-t border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Follow Section & Tech Gallery */}
        <div className="border-b border-slate-800 pb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 text-center md:text-right">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                آینده را با ما دنبال کنید
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                برای راهنمای خرید، پیگیری و استعلام عمده، با نکسورا در ارتباط باشید.
              </p>
            </div>

            {/* Social Icons */}
            <div className="flex items-center justify-center gap-2">
              <a href={TELEGRAM_SHOP_BOT} target="_blank" rel="noopener noreferrer" aria-label="تلگرام نکسورا؛ خرید عمده و پشتیبانی" title="بات خرید عمده و پشتیبانی نکسورا" className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-sky-500 text-slate-300 hover:text-white flex items-center justify-center transition-colors"><Send className="w-4 h-4"/></a>
              <a
                href="#"
                aria-label="اینستاگرام"
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="#"
                aria-label="یوتیوب"
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a
                href="#"
                aria-label="توییتر / X"
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-sky-500 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="#"
                aria-label="فیس‌بوک"
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-blue-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Setup Thumbnails Gallery */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {setupThumbnails.map((thumb, idx) => (
              <div
                key={idx}
                className="h-20 sm:h-24 rounded-xl overflow-hidden bg-slate-800 group relative cursor-pointer"
              >
                <img
                  src={thumb}
                  alt="Tech setup snapshot"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Instagram className="w-4 h-4 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Footer Links & Company Details:
            Centered on Mobile (text-center items-center justify-center),
            Right-aligned on Desktop (md:text-right) as explicitly requested!
        */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 text-center md:text-right">
          {/* Brand Info & App Badges */}
          <div className="lg:col-span-2 space-y-4 flex flex-col items-center md:items-start">
            <Logo />
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm text-center md:text-right">
              مرجع نهایی شما برای تکنولوژی‌های نسل آینده. کاوش کنید، نوآوری را تجربه نمایید و زندگی دیجیتال خود را ارتقا دهید.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <a href={TELEGRAM_SHOP_BOT} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors"><Send className="w-4 h-4"/>خرید عمده در تلگرام</a>
              <Link to="/support" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs transition-colors"><Headphones className="w-4 h-4"/>راهنمای پشتیبانی</Link>
            </div>
          </div>

          {/* Column 1: فروشگاه */}
          <div className="flex flex-col items-center md:items-start">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-4 text-center md:text-right">
              فروشگاه
            </h5>
            <ul className="space-y-2.5 text-xs text-center md:text-right">
              <li><a href="/#trending" className="hover:text-blue-400 transition-colors">همه کالاها</a></li>
              <li><a href="/#recommended" className="hover:text-blue-400 transition-colors">تازه‌ترین‌ها</a></li>
              <li><a href="/#trending" className="hover:text-blue-400 transition-colors">پرفروش‌ترین‌ها</a></li>
              <li><a href="/#deals" className="hover:text-blue-400 transition-colors">تخفیف‌های ویژه</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">کارت هدیه نکسورا</a></li>
            </ul>
          </div>

          {/* Column 2: دسته‌بندی‌ها */}
          <div className="flex flex-col items-center md:items-start">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-4 text-center md:text-right">
              دسته‌بندی‌ها
            </h5>
            <ul className="space-y-2.5 text-xs text-center md:text-right">
              <li><a href="/#smartphones" className="hover:text-blue-400 transition-colors">گوشی‌های هوشمند</a></li>
              <li><a href="/#laptops" className="hover:text-blue-400 transition-colors">لپ‌تاپ و رایانه</a></li>
              <li><a href="/#audio" className="hover:text-blue-400 transition-colors">تجهیزات صوتی</a></li>
              <li><a href="/#gaming" className="hover:text-blue-400 transition-colors">گیمینگ و کنسول</a></li>
              <li><a href="/#smart-home" className="hover:text-blue-400 transition-colors">خانه هوشمند</a></li>
              <li><Link to="/category/wearables" className="hover:text-blue-400 transition-colors">ساعت و پوشیدنی</Link></li>
            </ul>
          </div>

          {/* Column 3: پشتیبانی */}
          <div className="flex flex-col items-center md:items-start">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-4 text-center md:text-right">
              پشتیبانی
            </h5>
            <ul className="space-y-2.5 text-xs text-center md:text-right">
              <li><Link to="/support#faq" className="hover:text-blue-400 transition-colors">مرکز راهنمایی و سوالات</Link></li>
              <li><Link to="/support#shipping" className="hover:text-blue-400 transition-colors">رویه ارسال و تحویل</Link></li>
              <li><Link to="/support#damaged-goods" className="hover:text-blue-400 transition-colors">آسیب‌دیدگی و مغایرت کالا</Link></li>
              <li><Link to="/support#returns" className="hover:text-blue-400 transition-colors">شرایط بازگرداندن کالا</Link></li>
              <li><Link to="/support#warranty" className="hover:text-blue-400 transition-colors">گارانتی و اصالت</Link></li>
              <li><Link to="/support#tracking" className="hover:text-blue-400 transition-colors">پیگیری سفارش</Link></li>
              <li><a href={TELEGRAM_SHOP_BOT} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">استعلام خرید عمده در تلگرام</a></li>
              <li><Link to="/support#contact" className="hover:text-blue-400 transition-colors">ارتباط با کارشناسان</Link></li>
            </ul>
          </div>

          {/* Column 4: درباره نکسورا و روش‌های پرداخت */}
          <div className="flex flex-col items-center md:items-start">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-4 text-center md:text-right">
              درباره {settings.storeName}
            </h5>
            <ul className="space-y-2.5 text-xs mb-6 text-center md:text-right">
              <li><a href="#" className="hover:text-blue-400 transition-colors">داستان ما</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">فرصت‌های شغلی</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">روابط عمومی و اخبار</a></li>
              <li><Link to="/magazine" className="hover:text-blue-400 transition-colors">مجله تخصصی</Link></li>
            </ul>

            <div className="pt-1 flex flex-col items-center md:items-start">
              <span className="text-[11px] font-semibold text-slate-300 block mb-2 text-center md:text-right">
                روش‌های پرداخت ایمن:
              </span>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-white border border-slate-700">VISA</span>
                <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-white border border-slate-700">MasterCard</span>
                <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-white border border-slate-700">Apple Pay</span>
                <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-white border border-slate-700">شتاب</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Terms */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-center sm:text-right">
          <p className="text-slate-500">
            © {new Date().getFullYear()} {settings.storeName} — {settings.description}
            {settings.supportEmail && <span className="block" dir="ltr">{settings.supportEmail}</span>}
            {settings.supportPhone && <span className="block" dir="ltr">{settings.supportPhone}</span>}
          </p>

          <div className="flex items-center justify-center gap-4 text-slate-400">
            <a href="#" className="hover:text-white transition-colors">حریم خصوصی</a>
            <span>·</span>
            <a href="#" className="hover:text-white transition-colors">شرایط استفاده</a>
            <span>·</span>
            <a href="#" className="hover:text-white transition-colors">کوکی‌ها</a>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-slate-400">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>ایران / ریال</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
