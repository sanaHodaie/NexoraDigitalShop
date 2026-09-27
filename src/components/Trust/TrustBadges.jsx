import React from 'react';
import { ShieldCheck, Truck, RotateCcw, Award, HeadphonesIcon } from 'lucide-react';

export const TrustBadges = () => {
  const features = [
    {
      icon: <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      title: 'پرداخت امن و مطمئن',
      desc: 'درگاه‌های رمزنگاری شده ۱۰۰٪ ایمن',
    },
    {
      icon: <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      title: 'ارسال اکسپرس رایگان',
      desc: 'برای سفارش‌های بالاتر از ۹۹ دلار',
    },
    {
      icon: <RotateCcw className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      title: 'ضمانت بازگشت ۳۰ روزه',
      desc: 'بازگشت کالا بدون کوچک‌ترین دغدغه',
    },
    {
      icon: <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      title: '۲ سال گارانتی معتبر',
      desc: 'پوشش ضمانت روی اغلب کالاها',
    },
    {
      icon: <HeadphonesIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      title: 'پشتیبانی ۲۴/۷ مشتریان',
      desc: 'همواره در هر لحظه کنار شما هستیم',
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="rounded-2xl bg-white dark:bg-slate-850/80 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-100 dark:divide-slate-800">
          {features.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 pt-3 md:pt-0 ${
                idx > 0 ? 'md:pr-4' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {item.title}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
