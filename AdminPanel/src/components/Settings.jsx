import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Settings as SettingsIcon,
  Store,
  Percent,
  Moon,
  Sun,
  Laptop,
  Volume2,
  VolumeX,
  Shield,
  Save,
  Download,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { toPersianDigits } from '../utils/formatters';
import { playTactileClick, playSuccessChime, setAudioMuted, getAudioMuted } from '../utils/sound';

export default function Settings({ themeMode, onSetThemeMode }) {
  const [storeName, setStoreName] = useState('گالری لوکس ژوئل');
  const [licenseNumber, setLicenseNumber] = useState('۷۴۸۲۹');
  const [phone, setPhone] = useState('۰۲۱-۸۸۹۹۰۰۱۱');
  const [address, setAddress] = useState('تهران، بازار بزرگ، پاساژ زرگران، طبقه ۱، واحد ۴۴');
  const [profitPercent, setProfitPercent] = useState(7);
  const [taxPercent, setTaxPercent] = useState(9);
  const [soundEnabled, setSoundEnabled] = useState(!getAudioMuted());
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e) => {
    e?.preventDefault();
    playSuccessChime();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSoundToggle = (val) => {
    setSoundEnabled(val);
    setAudioMuted(!val);
    if (val) playTactileClick();
  };

  const exportDataJSON = () => {
    playSuccessChime();
    const data = {
      storeName,
      licenseNumber,
      profitPercent,
      taxPercent,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jouel-backup-${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="space-y-6 pb-12 w-full max-w-full min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20">
              <SettingsIcon className="w-5 h-5" />
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              تنظیمات سیستم و پیکربندی طلافروشی
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            مدیریت مشخصات پروانه کسب، درصد قانونی سود و مالیات، تم ظاهری و بازخورد صوتی
          </p>
        </div>

        {savedSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-300"
          >
            <CheckCircle2 className="w-4 h-4" />
            تنظیمات با موفقیت ذخیره شد
          </motion.div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Gallery & Guild License Configuration */}
        <div className="glass-panel rounded-3xl p-6 border border-purple-100 dark:border-purple-900/30 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Store className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              مشخصات گالری و پروانه اتحادیه طلا و جواهر
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                نام رسمی گالری یا فروشگاه
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                شماره پروانه کسب اتحادیه
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                تلفن تماس ثابت و همراه
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                آدرس کامل درج در فاکتورهای رسمی
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Legal Calculation & VAT Rates */}
        <div className="glass-panel rounded-3xl p-6 border border-purple-100 dark:border-purple-900/30 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Percent className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              درصدهای قانونی و محاسباتی فاکتور طلا
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                سود فروشنده طلا (مصوب اتحادیه: ۷٪)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={profitPercent}
                  onChange={(e) => setProfitPercent(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="font-bold text-slate-500">درصد</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                مالیات ارزش افزوده (منحصراً بر اجرت و سود: ۹٪)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="font-bold text-slate-500">درصد</span>
              </div>
            </div>
          </div>
        </div>

        {/* Theme & Tactile Audio Feedback */}
        <div className="glass-panel rounded-3xl p-6 border border-purple-100 dark:border-purple-900/30 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              پوسته ظاهری و تعاملات حسی
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            {/* Theme Mode */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                حالت رنگی پوسته (پشتیبانی خودکار از روشن و تاریک)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'light', label: 'روشن', icon: Sun },
                  { id: 'dark', label: 'تاریک', icon: Moon },
                  { id: 'auto', label: 'خودکار', icon: Laptop }
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = themeMode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        playTactileClick();
                        onSetThemeMode(item.id);
                      }}
                      className={`py-3 px-2 rounded-2xl flex flex-col items-center gap-1.5 font-bold border transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent shadow-md shadow-purple-500/20'
                          : 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audio Feedback */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                بازخورد صوتی و لمسی دکمه‌ها
              </label>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-purple-600" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-slate-400" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800 dark:text-white block">
                      صدای ملایم تعاملات (Audio Haptics)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      پخش صدای لمس هنگام کلیک روی نرخ‌ها و دکمه‌ها
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSoundToggle(!soundEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    soundEnabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      soundEnabled ? '-translate-x-6' : '-translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
          <button
            type="button"
            onClick={exportDataJSON}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:border-purple-300 transition-all shadow-xs"
          >
            <Download className="w-4 h-4 text-purple-600" />
            دریافت پشتیبان داده‌ها (JSON)
          </button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white font-bold text-xs shadow-lg shadow-purple-500/25 hover:opacity-95 transition-all"
          >
            <Save className="w-4 h-4" />
            ذخیره تغییرات تنظیمات
          </motion.button>
        </div>
      </form>
    </div>
  );
}
