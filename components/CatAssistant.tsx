'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type InteractionPhase = 'learning' | 'reviewing' | 'testing' | 'passed' | 'error';

interface Message { role: 'user' | 'bot'; content: string; }

interface CatAssistantProps {
  phase: InteractionPhase;
  messages: Message[];
  isTyping: boolean;
  onSendMessage: (msg: string) => void;
  isHomePage?: boolean;     // 【新增】标识当前是否在首页
  lastStudiedNode?: string; // 【新增】传入上次学习的章节名
}

export const CatAssistant: React.FC<CatAssistantProps> = ({ 
  phase, 
  messages, 
  isTyping, 
  onSendMessage,
  isHomePage = false,
  lastStudiedNode
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [homeTipIndex, setHomeTipIndex] = useState(0); // 首页气泡索引
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- 🌸 首页气泡逻辑 ---
  const homeTips = [
    "CFA 备考路漫漫，金多利陪你转喵！🐾",
    "建议按 1→2→3→4 的顺序学习，地基稳才行喵！",
    lastStudiedNode ? `上次学到【${lastStudiedNode}】，继续加油喵！✨` : "点击下方章节，开始今天的挑战吧！",
    "每一小节都要通过我的 3 题考核才能过关喔！🎓"
  ];

  useEffect(() => {
    if (isHomePage) {
      setIsOpen(false); // 强制关闭弹窗
      const timer = setInterval(() => {
        setHomeTipIndex((prev) => (prev + 1) % homeTips.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [isHomePage, lastStudiedNode]);

  // --- 📜 自动滚动 ---
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue('');
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end">
      
      {/* --- 💬 学习页弹窗 (首页不显示) --- */}
      <AnimatePresence>
        {!isHomePage && isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-6 w-[90vw] md:w-[450px] h-[70vh] md:h-[600px] bg-white rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b flex items-center justify-between bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{isTyping ? '🤔' : '🐱'}</div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm tracking-tighter uppercase italic">KinDori Pro</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    <span className="text-[10px] font-black text-slate-400 uppercase">{phase} Mode</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>

            {/* Chat Body */}
            <div ref={scrollRef} className="flex-grow overflow-y-auto p-6 space-y-6 bg-[#FAFBFF] custom-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] px-5 py-3.5 rounded-3xl text-sm shadow-sm ${
                    msg.role === 'user' ? 'bg-sky-600 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                  }`}>
                    {/* Markdown 解析：处理加粗、分段和列表 */}
                    <div className="prose prose-sm prose-slate max-w-none prose-strong:text-sky-700 prose-blockquote:bg-sky-50 prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:rounded-xl">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && <div className="flex gap-1 pl-4"><span className="w-1.5 h-1.5 bg-sky-200 rounded-full animate-bounce" /><span className="w-1.5 h-1.5 bg-sky-300 rounded-full animate-bounce [animation-delay:0.2s]" /></div>}
            </div>

            {/* Input Footer */}
            <div className="p-6 bg-white border-t border-slate-50">
              <div className="flex gap-3 items-center bg-slate-50 p-2 rounded-2xl border border-slate-100 focus-within:bg-white focus-within:border-sky-300 transition-all">
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="回答金多利的问题..."
                  className="flex-grow bg-transparent px-3 py-2 text-sm outline-none"
                />
                <button onClick={handleSend} disabled={!inputValue.trim()} className="bg-sky-600 text-white p-2.5 rounded-xl hover:bg-sky-700 transition-all shadow-lg"><Send size={18} /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- 🐾 首页小猫气泡 --- */}
      <div className="relative flex items-center">
        <AnimatePresence mode="wait">
          {isHomePage && (
            <motion.div
              key={homeTipIndex}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="absolute right-24 bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl shadow-xl border border-slate-100 text-slate-700 text-xs font-bold whitespace-nowrap z-[-1]"
            >
              <div className="flex items-center gap-2"><Sparkles size={14} className="text-amber-500" /> {homeTips[homeTipIndex]}</div>
              <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-r border-t border-slate-100 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- 🐱 小猫本体 --- */}
        <motion.button
          onClick={() => !isHomePage && setIsOpen(!isOpen)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-2xl border-4 transition-all ${
            isOpen && !isHomePage ? 'bg-white border-sky-400 rotate-90' : 'bg-sky-600 border-white'
          } ${isHomePage ? 'cursor-default' : 'cursor-pointer'}`}
        >
          {isOpen && !isHomePage ? <X className="text-sky-500" /> : '🐱'}
        </motion.button>
      </div>
    </div>
  );
};