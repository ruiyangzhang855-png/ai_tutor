'use client';

import React, { useState, useEffect } from 'react';
import { CatAssistant } from '@/components/CatAssistant';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, BookOpen, CheckCircle2, Zap, ChevronLeft, ChevronRight } from 'lucide-react';

// --- 类型与接口 ---
type InteractionPhase = 'learning' | 'reviewing' | 'testing' | 'passed' | 'error';
interface Node { id: string; label: string; subSections?: any[]; knowledge: string; }
interface NodeProgress { completedSubs: number[]; lastIndex: number; percent: number; }

export default function CFAApp() {
  const [courseData, setCourseData] = useState<{ nodes: Node[] } | null>(null);
  const [activeNode, setActiveNode] = useState<Node | null>(null);
  const [currentSubIndex, setCurrentSubIndex] = useState(0);
  
  // 【关键：二级进度状态】存放在 localStorage
  const [detailedProgress, setDetailedProgress] = useState<Record<string, NodeProgress>>({});

  const [phase, setPhase] = useState<InteractionPhase>('learning');
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; content: string }[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // 1. 初始化加载
useEffect(() => {
  fetch('/data/course.json')
    .then(res => res.json())
    .then(data => setCourseData(data))
    .catch(err => console.error("加载课程失败喵:", err));

  const saved = localStorage.getItem('cfa-detailed-progress');
  if (saved) {
    try {
      // 增加 try-catch 保护，防止格式错误导致白屏
      const parsed = JSON.parse(saved);
      setDetailedProgress(parsed);
    } catch (e) {
      console.error("进度数据损坏，已重置喵:", e);
      localStorage.removeItem('cfa-detailed-progress');
    }
  }
}, []);

  // 2. 【核心逻辑】切换小节时自动检查进度
  useEffect(() => {
    if (activeNode) {
      const nodeProgress = detailedProgress[activeNode.id];
      const isAlreadyDone = nodeProgress?.completedSubs.includes(currentSubIndex);

      if (isAlreadyDone) {
        // --- 场景 A：回看已完成章节 ---
        setMessages([{ role: 'bot', content: "喵！这一节你已经过关啦，温故而知新，或者点击 Next 继续前进！" }]);
        setPhase('learning');
        setCanNext(true); // 自动解锁按钮
      } else {
        // --- 场景 B：新挑战 ---
        const sub = activeNode.subSections?.[currentSubIndex];
        setMessages([{ role: 'bot', content: `喵！新关卡开启：**【${sub?.title}】**。看完内容后，请复述重点，我要开始考核啦！` }]);
        setPhase('reviewing');
        setCanNext(false); // 强制锁定按钮
      }
    }
  }, [activeNode, currentSubIndex]);

  // 3. 处理对话逻辑 (对接后端 API)
  const handleChat = async (userInput: string) => {
    if (!userInput.trim() || !activeNode) return;
    const newUserMsg = { role: 'user' as const, content: userInput };
    setMessages(prev => [...prev, newUserMsg]);
    setIsAiThinking(true);
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newUserMsg],
          currentNode: activeNode,
          subSectionIndex: currentSubIndex,
          interactionPhase: phase,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', content: data.reply }]);
      setPhase(data.nextPhase);
      setCanNext(data.canNavigate);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', content: "喵...断网了，我先打个盹。" }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  // 4. 【核心逻辑】保存进度并跳转
  const goToNext = () => {
    if (!activeNode) return;
    const total = activeNode.subSections?.length || 1;
    const isLast = currentSubIndex === total - 1;

    // --- 💾 持久化进度 ---
    const currentObj = detailedProgress[activeNode.id] || { completedSubs: [], lastIndex: 0, percent: 0 };
    const newCompleted = Array.from(new Set([...currentObj.completedSubs, currentSubIndex]));
    const newPercent = Math.round((newCompleted.length / total) * 100);
    const updated = { 
      completedSubs: newCompleted, 
      lastIndex: isLast ? currentSubIndex : currentSubIndex + 1, // 存入断点
      percent: newPercent 
    };

    const newAll = { ...detailedProgress, [activeNode.id]: updated };
    setDetailedProgress(newAll);
    localStorage.setItem('cfa-detailed-progress', JSON.stringify(newAll));

    if (!isLast) setCurrentSubIndex(prev => prev + 1);
    else setPhase('passed');
  };

  // --- 🎨 渲染逻辑地图中上次学习的提示 ---
  const lastStudiedId = Object.entries(detailedProgress)
    .sort((a, b) => b[1].percent - a[1].percent)[0]?.[0]; // 简单逻辑：找进度最大的
  const lastNodeLabel = courseData?.nodes.find(n => n.id === lastStudiedId)?.label;

  if (!courseData) return <div className="h-screen flex items-center justify-center font-black text-slate-200 text-5xl">LOADING...</div>;

  return (
    <div className="min-h-screen bg-[#F9FBFF]">
      {/* Navbar */}
      <nav className="fixed top-0 w-full h-16 bg-white/80 backdrop-blur-xl border-b z-50 flex items-center px-10 justify-between">
        <div className="flex items-center gap-2 text-sky-600 font-black italic text-xl uppercase tracking-tighter"><Zap fill="currentColor" size={20} /> Cat-Pilot</div>
        {activeNode && (
          <button onClick={() => setActiveNode(null)} className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
            <ArrowLeft size={14} /> Back to Map
          </button>
        )}
      </nav>

      <main className="pt-28 pb-32 px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {!activeNode ? (
            /* --- 🗺️ 首页逻辑地图 --- */
            <motion.div key="map" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {courseData.nodes.map((node) => {
                const p = detailedProgress[node.id]?.percent || 0;
                return (
                  <div key={node.id} onClick={() => { setActiveNode(node); setCurrentSubIndex(detailedProgress[node.id]?.lastIndex || 0); }} className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-50 cursor-pointer hover:translate-y-[-6px] transition-all relative group">
                    <div className="flex justify-between items-start mb-8">
                      <div className={`p-5 rounded-[1.5rem] ${p === 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-sky-50 text-sky-600'}`}><BookOpen size={28} /></div>
                      {p === 100 && <CheckCircle2 className="text-emerald-500" size={28} />}
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-6 leading-tight tracking-tight">{node.label}</h3>
                    {/* 进度条 */}
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-3">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${p}%` }} className={`h-full ${p === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">{p}% Completed</p>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            /* --- ✍️ 学习闯关页 --- */
            <motion.div key="learn" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto">
              <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden">
                <div className="p-12 md:p-16">
                  <div className="flex items-center gap-4 mb-10">
                    <span className="px-5 py-2 bg-sky-600 text-white text-[10px] font-black rounded-full uppercase italic tracking-widest">Mission {currentSubIndex + 1}</span>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">{activeNode.subSections?.[currentSubIndex]?.title}</h2>
                  </div>
                  <div className="bg-slate-50/50 p-10 rounded-[3rem] text-slate-600 leading-[1.8] border border-slate-100 shadow-inner text-lg">
                    {activeNode.subSections?.[currentSubIndex]?.content}
                  </div>
                  <div className="mt-14 pt-10 border-t border-slate-100 flex items-center justify-between">
                    <button onClick={() => currentSubIndex > 0 && setCurrentSubIndex(prev => prev - 1)} disabled={currentSubIndex === 0} className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase transition-all ${currentSubIndex > 0 ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'opacity-0'}`}><ChevronLeft size={16} /> Prev</button>
                    <button onClick={goToNext} disabled={!canNext} className={`flex items-center gap-2 px-12 py-5 rounded-[2rem] font-black text-xs tracking-widest uppercase transition-all ${canNext ? 'bg-sky-600 text-white shadow-2xl shadow-sky-200 hover:-translate-y-1' : 'bg-slate-100 text-slate-300 cursor-not-allowed border-2 border-dashed'}`}>
                      {currentSubIndex === (activeNode.subSections?.length || 1) - 1 ? "Finish Journey 🎉" : "Continue Mission →"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- 全局小猫交互 --- */}
      <CatAssistant 
        phase={phase} 
        messages={messages} 
        isTyping={isAiThinking} 
        onSendMessage={handleChat} 
        isHomePage={!activeNode}
        lastStudiedNode={lastNodeLabel}
      />
    </div>
  );
}