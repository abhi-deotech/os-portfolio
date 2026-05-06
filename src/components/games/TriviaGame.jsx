import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, RefreshCw, ArrowLeft, Brain, CheckCircle2, XCircle, Timer, ChevronRight, Play, Zap, Cpu, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useOSStore from '../../store/osStore';

const TriviaGame = ({ onBack }) => {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('loading'); // loading, playing, finished, error
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [, setIsCorrect] = useState(null);
  const [timeLeft, setLeftTime] = useState(15);
  const { unlockAchievement } = useOSStore();

  const decodeHTML = (html) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  const fetchQuestions = useCallback(async () => {
    setStatus('loading');
    try {
      const response = await fetch('https://opentdb.com/api.php?amount=10&type=multiple');
      const data = await response.json();
      if (data.response_code === 0) {
        const formatted = data.results.map(q => {
          const answers = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);
          return {
            ...q,
            answers: answers.map(decodeHTML),
            question: decodeHTML(q.question),
            correct_answer: decodeHTML(q.correct_answer)
          };
        });
        setQuestions(formatted);
        setStatus('playing');
        setCurrentIndex(0);
        setScore(0);
        setLeftTime(15);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswer = useCallback((answer) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answer);
    const correct = answer === questions[currentIndex].correct_answer;
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setLeftTime(15);
      } else {
        setStatus('finished');
        if (score + (correct ? 1 : 0) >= 8) unlockAchievement('trivia_expert');
      }
    }, 1500);
  }, [questions, currentIndex, selectedAnswer, score, unlockAchievement]);

  useEffect(() => {
    if (status === 'playing' && selectedAnswer === null && timeLeft > 0) {
      const timer = setInterval(() => {
        setLeftTime(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && selectedAnswer === null && status === 'playing') {
      handleAnswer(null);
    }
  }, [status, selectedAnswer, timeLeft, handleAnswer]);

  if (status === 'loading') {
    return (
      <div className="h-full w-full bg-[#050505] flex flex-col items-center justify-center p-8">
        <div className="relative">
           <div className="w-24 h-24 border-2 border-os-primary/20 border-t-os-primary rounded-full animate-spin" />
           <div className="absolute inset-0 flex items-center justify-center">
              <Search size={32} className="text-os-primary animate-pulse" />
           </div>
        </div>
        <div className="mt-8 text-center">
           <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Accessing Vault</h2>
           <p className="text-[10px] font-black text-os-primary uppercase tracking-[0.3em] mt-2 animate-pulse">Syncing Neural Nodes...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="h-full w-full bg-[#050505] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-[2rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
           <XCircle size={40} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Connection Breach</h2>
        <p className="text-white/40 font-black tracking-[0.2em] uppercase text-[10px] mt-2 mb-8">Trivia repository inaccessible</p>
        <button onClick={fetchQuestions} className="px-10 py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl flex items-center gap-3">
          <RefreshCw size={18} /> Re-Attempt Link
        </button>
      </div>
    );
  }

  if (status === 'finished') {
    const accuracy = Math.round((score / questions.length) * 100);
    return (
      <div className="h-full w-full bg-[#050505] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(204,151,255,0.05)_0%,transparent_70%)]" />
        
        <motion.div 
          initial={{ scale: 0, rotate: -20 }} 
          animate={{ scale: 1, rotate: 0 }} 
          className="w-24 h-24 bg-gradient-to-br from-os-primary to-os-secondary rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_rgba(204,151,255,0.3)] mb-8 relative z-10"
        >
          <Trophy size={48} className="text-black" />
        </motion.div>
        
        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white mb-2 relative z-10">Sync Complete</h2>
        <p className="text-os-primary font-black tracking-[0.3em] uppercase text-[10px] mb-10 relative z-10">Data Integrity verified</p>
        
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-12 relative z-10">
           <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
              <p className="text-[9px] uppercase tracking-widest text-white/20 font-black mb-2">Accuracy</p>
              <p className="text-3xl font-black text-os-primary tracking-tighter italic">{accuracy}%</p>
           </div>
           <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
              <p className="text-[9px] uppercase tracking-widest text-white/20 font-black mb-2">Neural Load</p>
              <p className="text-3xl font-black text-os-secondary tracking-tighter italic">{score * 100}</p>
           </div>
        </div>

        <div className="flex gap-4 relative z-10">
          <button onClick={onBack} className="px-8 py-4 rounded-2xl border border-white/10 font-black uppercase text-[10px] tracking-widest text-white/40 hover:bg-white/5 transition-all">
            Exit Node
          </button>
          <button onClick={fetchQuestions} className="px-8 py-4 rounded-2xl bg-white text-black font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all">
            <RefreshCw size={16} /> New Session
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="h-full w-full bg-[#050505] text-white flex flex-col p-6 md:p-8 relative overflow-hidden select-none font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(204,151,255,0.05)_0%,transparent_50%)] pointer-events-none" />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8 relative z-10">
        <motion.button 
          whileHover={{ scale: 1.1, x: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/40 hover:text-white"
        >
          <ArrowLeft size={20} />
        </motion.button>
        
        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase tracking-widest text-white/20 font-black">Sync-Score</span>
              <span className="text-2xl font-black italic text-os-primary tracking-tighter">{score * 100}</span>
           </div>
           <div className="w-px h-8 bg-white/10" />
           <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5 min-w-[80px] justify-center">
              <Timer size={18} className={timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-os-secondary'} />
              <span className={`text-xl font-black italic tracking-tighter tabular-nums ${timeLeft < 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}s</span>
           </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-white/5 rounded-full mb-12 relative overflow-hidden">
        <motion.div 
          className="absolute h-full bg-gradient-to-r from-os-primary via-os-secondary to-os-primary"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Question Card */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full relative z-10">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-1.5 h-1.5 rounded-full bg-os-secondary animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-os-secondary">Node Query {currentIndex + 1} / {questions.length}</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-black leading-[1.1] text-white italic tracking-tight">
            {currentQuestion.question}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="wait">
            {currentQuestion.answers.map((answer, i) => {
              const isSelected = selectedAnswer === answer;
              const isCorrectAnswer = answer === currentQuestion.correct_answer;
              
              let variant = "default";
              if (selectedAnswer !== null) {
                if (isCorrectAnswer) variant = "correct";
                else if (isSelected) variant = "wrong";
                else variant = "dimmed";
              }

              return (
                <motion.button
                  key={`${currentIndex}-${answer}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => handleAnswer(answer)}
                  disabled={selectedAnswer !== null}
                  className={`
                    group p-6 rounded-3xl border-2 text-left transition-all duration-300 relative overflow-hidden flex items-center justify-between
                    ${variant === "default" ? "bg-white/[0.02] border-white/5 hover:border-os-primary/40 hover:bg-white/[0.05]" : ""}
                    ${variant === "correct" ? "bg-os-primary/10 border-os-primary text-os-primary shadow-[0_0_30px_rgba(204,151,255,0.2)]" : ""}
                    ${variant === "wrong" ? "bg-red-500/10 border-red-500 text-red-500" : ""}
                    ${variant === "dimmed" ? "opacity-20 border-white/5 grayscale" : ""}
                  `}
                >
                  <span className="font-black italic text-sm md:text-base tracking-tight uppercase pr-4">{answer}</span>
                  
                  {variant === "correct" && <CheckCircle2 size={24} className="shrink-0 animate-bounce" />}
                  {variant === "wrong" && <XCircle size={24} className="shrink-0" />}
                  {variant === "default" && <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-os-primary" />}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Footer Details */}
      <div className="mt-auto flex justify-between items-center opacity-20">
         <div className="flex items-center gap-2">
            <Cpu size={12} />
            <span className="text-[8px] font-black uppercase tracking-widest">Logic Processor: Ready</span>
         </div>
         <span className="text-[8px] font-black uppercase tracking-widest">Powered by Open Trivia Vault</span>
      </div>
    </div>
  );
};

export default TriviaGame;
