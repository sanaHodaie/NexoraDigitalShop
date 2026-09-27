import React from 'react';
import { Logo } from '../Header/Logo';
import { Instagram, Youtube, Twitter, Facebook, Globe, Smartphone, Download } from 'lucide-react';

export const Footer = () => {
  const setupThumbnails = [
    '/src/assets/images/article_productivity_setup_1790528034532.jpg',
    '/src/assets/images/collection_audio_headphones_1790528002919.jpg',
    '/src/assets/images/collection_gaming_gear_1790528013982.jpg',
    '/src/assets/images/collection_smart_home_1790528023441.jpg',
    '/src/assets/images/collection_laptop_pc_1790528088687.jpg',
    '/src/assets/images/collection_wearables_watch_1790528102322.jpg',
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
                به جمع بیش از ۵۰۰ هزار علاقه‌مند فناوری بپیوندید: Nexora.Tech@
              </p>
            </div>

            {/* Social Icons */}
            <div className="flex items-center justify-center gap-2">
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

            {/* App Store & Google Play Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white transition-colors cursor-pointer text-right"
              >
                <Smartphone className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-[9px] text-slate-400">دانلود از</div>
                  <div className="text-xs font-bold font-sans">App Store</div>
                </div>
              </button>

              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white transition-colors cursor-pointer text-right"
              >
                <Download className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-[9px] text-slate-400">دریافت از</div>
                  <div className="text-xs font-bold font-sans">Google Play</div>
                </div>
              </button>
            </div>
          </div>

          {/* Column 1: فروشگاه */}
          <div className="flex flex-col items-center md:items-start">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-4 text-center md:text-right">
              فروشگاه
            </h5>
            <ul className="space-y-2.5 text-xs text-center md:text-right">
              <li><a href="#trending" className="hover:text-blue-400 transition-colors">همه کالاها</a></li>
              <li><a href="#recommended" className="hover:text-blue-400 transition-colors">تازه‌ترین‌ها</a></li>
              <li><a href="#trending" className="hover:text-blue-400 transition-colors">پرفروش‌ترین‌ها</a></li>
              <li><a href="#deals" className="hover:text-blue-400 transition-colors">تخفیف‌های ویژه</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">کارت هدیه نکسورا</a></li>
            </ul>
          </div>

          {/* Column 2: دسته‌بندی‌ها */}
          <div className="flex flex-col items-center md:items-start">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-4 text-center md:text-right">
              دسته‌بندی‌ها
            </h5>
            <ul className="space-y-2.5 text-xs text-center md:text-right">
              <li><a href="#smartphones" className="hover:text-blue-400 transition-colors">گوشی‌های هوشمند</a></li>
              <li><a href="#laptops" className="hover:text-blue-400 transition-colors">لپ‌تاپ و رایانه</a></li>
              <li><a href="#audio" className="hover:text-blue-400 transition-colors">تجهیزات صوتی</a></li>
              <li><a href="#gaming" className="hover:text-blue-400 transition-colors">گیمینگ و کنسول</a></li>
              <li><a href="#smart-home" className="hover:text-blue-400 transition-colors">خانه هوشمند</a></li>
              <li><a href="#wearables" className="hover:text-blue-400 transition-colors">ساعت و پوشیدنی</a></li>
            </ul>
          </div>

          {/* Column 3: پشتیبانی */}
          <div className="flex flex-col items-center md:items-start">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-4 text-center md:text-right">
              پشتیبانی
            </h5>
            <ul className="space-y-2.5 text-xs text-center md:text-right">
              <li><a href="#" className="hover:text-blue-400 transition-colors">مرکز راهنمایی و سوالات</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">رویه ارسال و تحویل</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">شرایط بازگرداندن کالا</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">گارانتی و اصالت</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">پیگیری سفارش</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">ارتباط با کارشناسان</a></li>
            </ul>
          </div>

          {/* Column 4: درباره نکسورا و روش‌های پرداخت */}
          <div className="flex flex-col items-center md:items-start">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-4 text-center md:text-right">
              درباره نکسورا
            </h5>
            <ul className="space-y-2.5 text-xs mb-6 text-center md:text-right">
              <li><a href="#" className="hover:text-blue-400 transition-colors">داستان ما</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">فرصت‌های شغلی</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">روابط عمومی و اخبار</a></li>
              <li><a href="#articles" className="hover:text-blue-400 transition-colors">مجله تخصصی</a></li>
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
            © ۲۰۲۵ تمامی حقوق برای فروشگاه تکنولوژی نکسورا (Nexora Tech) محفوظ است.
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
