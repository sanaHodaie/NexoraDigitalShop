import React, { useState } from 'react';
import { Mail, Send, CheckCircle2 } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export const NewsletterSection = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { addToast } = useShop();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setIsSubmitted(true);
    addToast('ایمیل شما با موفقیت در خبرنامه نکسورا ثبت شد!', 'success');
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-l from-blue-50/80 via-indigo-50/50 to-white dark:from-slate-850 dark:via-slate-900 dark:to-slate-950 border border-blue-100 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Text and Mail Icon */}
          <div className="flex items-center gap-4 text-right w-full lg:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
              <Mail className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                همگام با جدیدترین امواج تکنولوژی
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                تخفیف‌های اختصاصی، معرفی محصولات جدید و تازه‌ترین اخبار دیجیتال را در ایمیل خود دریافت کنید.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="w-full lg:max-w-md">
            {isSubmitted ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>عضویت شما تایید شد. کد تخفیف ۱۰ درصدی به ایمیل شما ارسال گشت!</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="آدرس ایمیل خود را وارد نمایید..."
                  className="flex-1 h-11 px-4 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5 rotate-180" />
                  <span>عضویت</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
