import {api, write, resetCsrf} from '../api';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Gem,
  Coins,
  X
} from 'lucide-react';
import { playTactileClick, playSuccessChime } from '../utils/sound';

interface Particle {
  id: number;
  x: number; // percentage 0 - 100
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  sway: number;
  type: 'gold_flake' | 'sparkle' | 'shimmer';
}

export default function LoginModal({
  isOpen,
  onLoginSuccess,
  onClose,
  themeMode,
  onToggleTheme,
  initialError = ''
}: {
  isOpen: boolean;
  onLoginSuccess: (user: any) => void;
  onClose?: () => void;
  themeMode?: string;
  onToggleTheme?: () => void;
  initialError?: string;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(initialError);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Generate luxury 3D cascading golden flakes and sparkles for light aesthetic
  useEffect(() => {
    const generated: Particle[] = [];
    const count = 40;

    for (let i = 0; i < count; i++) {
      generated.push({
        id: i,
        x: Math.random() * 100,
        size: Math.random() * 9 + 4,
        duration: Math.random() * 6 + 5,
        delay: Math.random() * 4,
        opacity: Math.random() * 0.7 + 0.3,
        sway: (Math.random() - 0.5) * 50,
        type: i % 3 === 0 ? 'sparkle' : i % 3 === 1 ? 'gold_flake' : 'shimmer'
      });
    }
    setParticles(generated);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim()) {
      setErrorMsg('لطفاً ایمیل حساب مدیریت را وارد نمایید');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('لطفاً رمز عبور را وارد نمایید');
      return;
    }

    setIsLoading(true);
    playTactileClick();

    try {
      await write('/auth/login','POST',{email:username.trim(),password});
      resetCsrf();
      const manager = await api('/admin/me');
      playSuccessChime(); onLoginSuccess(manager);
    } catch(error) {setErrorMsg(error instanceof Error ? error.message : "خطای ارتباط با سرور");}
    finally {setIsLoading(false);}
  };

  const handleEyeToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playTactileClick();
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Light & Radiant Luxury Glassmorphic Ambient Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100/90 via-purple-50/90 to-pink-50/90 dark:from-slate-950/95 dark:via-purple-950/90 dark:to-slate-900/95 backdrop-blur-xl overflow-hidden transition-colors duration-500">
        {/* Soft Glowing Aurora Lights */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-purple-300/40 dark:bg-purple-600/30 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-pink-300/40 dark:bg-pink-600/25 blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-amber-300/25 dark:bg-amber-500/10 blur-[100px] pointer-events-none" />

        {/* 3D Cascading Golden Rain & Sparkles from top */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                y: '-10vh',
                x: `${p.x}vw`,
                opacity: 0,
                scale: 0.5,
                rotate: 0
              }}
              animate={{
                y: '110vh',
                x: `${p.x + p.sway / 10}vw`,
                opacity: [0, p.opacity, p.opacity, 0],
                scale: [0.5, 1.2, 0.7],
                rotate: [0, 180, 360]
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: 'linear'
              }}
              style={{
                position: 'absolute',
                width: `${p.size}px`,
                height: `${p.size}px`,
                zIndex: 1
              }}
            >
              {p.type === 'sparkle' ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="w-full h-full bg-amber-400 dark:bg-amber-300 rounded-full shadow-[0_0_12px_#f59e0b] blur-[0.3px]" />
                  <span className="absolute text-[9px] text-amber-600 dark:text-amber-200 font-bold">✦</span>
                </div>
              ) : p.type === 'gold_flake' ? (
                <div
                  className="w-full h-full rounded-sm bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 transform rotate-45"
                  style={{
                    boxShadow: '0 0 10px rgba(245, 158, 11, 0.7), inset 0 0 4px rgba(255, 255, 255, 0.9)'
                  }}
                />
              ) : (
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-400 to-amber-300 blur-[0.4px] shadow-[0_0_8px_#ec4899]" />
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main White Crystal Glassmorphism Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 25 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 25 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md max-h-[94dvh] overflow-y-auto p-6 sm:p-8 rounded-3xl backdrop-blur-2xl bg-white/85 dark:bg-slate-900/85 border border-purple-200/80 dark:border-purple-800/60 shadow-[0_20px_60px_rgba(168,85,247,0.15)] text-slate-800 dark:text-white overflow-hidden"
      >
        {/* Subtle top rainbow border sheen */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-purple-600 via-pink-500 to-amber-400" />

        {/* Close Button if applicable */}
        {onClose && (
          <button
            onClick={() => {
              playTactileClick();
              onClose();
            }}
            className="absolute left-4 top-4 p-2 rounded-2xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="بستن پنجره"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center space-y-3 mb-6 pt-1">
          <div className="inline-flex relative">
            <motion.div
              whileHover={{ rotate: 8, scale: 1.05 }}
              className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-400 via-purple-600 to-pink-500 p-0.5 shadow-xl shadow-purple-500/25 flex items-center justify-center cursor-pointer"
            >
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <span className="font-black text-2xl bg-gradient-to-r from-purple-700 via-pink-600 to-amber-500 bg-clip-text text-transparent">
                  نکسورا
                </span>
              </div>
            </motion.div>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 shadow-sm shadow-amber-400"></span>
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
              نکسورا دیجیتال
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              مدیریت محصولات، سفارش‌ها و کاربران نکسورا
            </p>
          </div>
        </div>

        {/* Error Notification */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username / ID Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>ایمیل حساب مدیر</span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">دسترسی محدود</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="email" autoComplete="username" required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin@example.com"
                className="w-full pr-11 pl-4 py-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/80 border border-purple-100 dark:border-purple-900/50 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-xs"
              />
              <span className="absolute right-3.5 text-purple-500 pointer-events-none">
                <User className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Password Input with Wink / Eye Toggle (نوع ورودی صریحاً بر اساس showPassword عوض می‌شود) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>رمز عبور سیستم</span>
<a href="/" className="text-[10px] text-pink-600">بازیابی رمز در فروشگاه</a>
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="رمز عبور خود را وارد کنید"
                className={`w-full pr-11 pl-11 py-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/80 border border-purple-100 dark:border-purple-900/50 text-xs font-black text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-xs ${
                  showPassword ? 'tracking-normal font-bold' : 'tracking-widest font-mono'
                }`}
              />
              <span className="absolute right-3.5 text-purple-500 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>

              {/* Password Eye Toggle Button (چشمک برای آشکارسازی و پنهان‌سازی رمز) */}
              <button
                type="button"
                onClick={handleEyeToggle}
                className="absolute left-3 p-1.5 rounded-xl text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 hover:bg-purple-100/60 dark:hover:bg-slate-700/60 transition-colors focus:outline-none cursor-pointer"
                title={showPassword ? 'مخفی کردن رمز عبور' : 'مشاهده رمز عبور'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                ) : (
                  <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                )}
              </button>
            </div>
          </div>

          {/* Remember me & Security Badge */}
          <div className="flex items-center justify-between pt-1">
<span className="text-xs text-slate-500">نشست امن حساب کاربری</span>

            <div className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-700/50">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>کنترل دسترسی</span>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full mt-3 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>در حال اعتبارسنجی ورود...</span>
              </div>
            ) : (
              <>
                <span>ورود به پنل نکسورا</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </form>

        <p className="mt-5 text-xs text-center text-slate-500">فقط حساب دارای مجوز مدیریت امکان ورود دارد.</p>
      </motion.div>
    </div>
  );
}
