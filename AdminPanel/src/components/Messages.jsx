import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  MessageSquare,
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  Zap,
  Phone,
  Tag,
  Gem
} from 'lucide-react';
import { toPersianDigits, formatPersianTime } from '../utils/formatters';
import { playTactileClick, playSuccessChime } from '../utils/sound';

export default function Messages({ messages = [], onSendMessage }) {
  const [selectedMessageId, setSelectedMessageId] = useState(messages[0]?.id || null);
  const [replyText, setReplyText] = useState('');

  const activeMessage = messages.find((m) => m.id === selectedMessageId) || messages[0];

  // Canned Quick Responses tailored for gold & jewelry
  const quickResponses = [
    'سلام و احترام، بله کلیه مصنوعات طلای ۱۸ عیار ما دارای شناسنامه رسمی اتحادیه و کد استاندارد هستند.',
    'سلام وقت بخیر، امکان ساخت سفارشی بر اساس وزن و طرح دلخواه شما در کارگاه زرین طی ۳ روز کاری فراهم است.',
    'سلام، اجرت ساخت این مدل طبق نرخ اتحادیه مصوب محاسبه شده و ۹٪ مالیات فقط به اجرت و سود تعلق می‌گیرد.',
    'با درود، شمش‌های طلای ما به صورت پلمپ شرکتی همراه با هولوگرام امنیتی و فاکتور رسمی تحویل می‌گردد.'
  ];

  const handleSend = (e) => {
    e?.preventDefault();
    if (!replyText.trim() || !activeMessage) return;

    playSuccessChime();
    onSendMessage(activeMessage.id, replyText);
    setReplyText('');
  };

  const handleInsertCanned = (text) => {
    playTactileClick();
    setReplyText(text);
  };

  return (
    <div className="space-y-6 pb-12 w-full max-w-full min-w-0 overflow-hidden">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="p-2 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20">
            <MessageSquare className="w-5 h-5" />
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
            مرکز پیام‌ها و مشاوره آنلاین طلا
          </h1>
        </div>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
          پاسخگویی سریع به استعلام‌های قیمت، سفارشات ساخت اختصاصی و سوالات مشتریان
        </p>
      </div>

      {/* Main Chat Grid (Left conversations list, Right active chat) */}
      <div className="glass-panel rounded-3xl border border-purple-100 dark:border-purple-900/30 grid grid-cols-1 lg:grid-cols-12 min-h-[600px] overflow-hidden">
        {/* Left / Sidebar Messages List (4 Cols) */}
        <div className="lg:col-span-4 border-l border-slate-100 dark:border-slate-800/80 p-4 space-y-3 bg-white/40 dark:bg-slate-900/40">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              گفتگوهای اخیر ({toPersianDigits(messages.length)})
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300">
              {toPersianDigits(messages.filter((m) => m.unread).length)} پیام جدید
            </span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[520px] pr-1">
            {messages.map((msg) => {
              const isSelected = msg.id === activeMessage?.id;
              return (
                <motion.div
                  key={msg.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    playTactileClick();
                    setSelectedMessageId(msg.id);
                  }}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-500/15 to-pink-500/10 border-purple-300 dark:border-purple-700 shadow-sm'
                      : 'bg-white/70 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 hover:border-purple-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <img
                        src={msg.avatar}
                        alt={msg.customerName}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover border border-purple-200 dark:border-purple-800"
                      />
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {msg.customerName}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400">{msg.time}</span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                    {msg.lastMessage}
                  </p>

                  <div className="flex items-center gap-1.5 mt-2">
                    {msg.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right / Active Conversation Pane (8 Cols) */}
        {activeMessage ? (
          <div className="lg:col-span-8 flex flex-col justify-between p-6 bg-white/60 dark:bg-slate-900/60">
            {/* Conversation Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={activeMessage.avatar}
                  alt={activeMessage.customerName}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-full object-cover border-2 border-purple-400 shadow-md"
                />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {activeMessage.customerName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-purple-600" />
                    {toPersianDigits(activeMessage.phone)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  مشتری آنلاین
                </span>
              </div>
            </div>

            {/* Message Stream */}
            <div className="py-6 space-y-4 overflow-y-auto max-h-[380px] pr-2">
              {activeMessage.chatHistory.map((item, idx) => {
                const isAdmin = item.sender === 'admin';
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] p-4 rounded-3xl text-xs leading-relaxed shadow-sm ${
                        isAdmin
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {item.text}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">{toPersianDigits(item.time)}</span>
                  </div>
                );
              })}
            </div>

            {/* Quick Canned Responses Bar */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  پاسخ‌های آماده:
                </span>
                {quickResponses.map((qr, i) => (
                  <button
                    key={i}
                    onClick={() => handleInsertCanned(qr)}
                    className="text-[11px] px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-slate-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-slate-700 border border-purple-200/60 dark:border-purple-800/40 whitespace-nowrap transition-colors"
                  >
                    {qr.slice(0, 32)}...
                  </button>
                ))}
              </div>

              {/* Reply Input Box */}
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="پاسخ خود را به مشتری بنویسید..."
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 hover:opacity-95 transition-all"
                >
                  <Send className="w-4 h-4 transform rotate-180" />
                </motion.button>
              </form>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 flex items-center justify-center p-12 text-slate-400 text-xs">
            گفتگویی را انتخاب کنید.
          </div>
        )}
      </div>
    </div>
  );
}
