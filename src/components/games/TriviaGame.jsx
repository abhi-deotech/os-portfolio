import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, RefreshCw, ArrowLeft, Brain, CheckCircle2, XCircle, Timer, ChevronRight, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TriviaGame = ({ onBack }) => {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('loading'); // loading, playing, finished, error
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [timeLeft, setLeftTime] = useState(15);

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
            answers,
            question: decodeHTML(q.question),
            correct_answer: decodeHTML(q.correct_answer),
            answers: answers.map(decodeHTML)
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
  }, [fetchQuestions]);

  useEffect(() => {
    if (status === 'playing' && selectedAnswer === null && timeLeft > 0) {
      const timer = setInterval(() => {
        setLeftTime(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && selectedAnswer === null) {
      handleAnswer(null);
    }
  }, [status, selectedAnswer, timeLeft]);

  const decodeHTML = (html) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  const handleAnswer = (answer) => {
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
      }
    }, 2000);
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-16 h-16 border-4 border-os-primary/30 border-t-os-primary rounded-full animate-spin mb-4" />
        <p className="text-os-onSurfaceVariant animate-pulse font-bold tracking-widest uppercase text-xs">Fetching Knowledge...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <XCircle size={48} className="text-os-error mb-4 opacity-50" />
        <h2 className="text-2xl font-bold mb-2">Connection Lost</h2>
        <p className="text-os-onSurfaceVariant mb-6">Could not fetch questions from the trivia vault.</p>
        <button onClick={fetchQuestions} className="px-6 py-2 bg-os-primary text-white rounded-xl font-bold flex items-center gap-2">
          <RefreshCw size={18} /> Retry
        </button>
      </div>
    );
  }

  if (status === 'finished') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          className="w-24 h-24 bg-gradient-to-br from-[#ffd700] to-[#ff9500] rounded-[2rem] flex items-center justify-center shadow-2xl mb-6"
        >
          <Trophy size={48} className="text-white" />
        </motion.div>
        <h2 className="text-3xl font-black mb-1">Quest Complete!</h2>
        <p className="text-os-onSurfaceVariant mb-8">You mastered {score} out of {questions.length} challenges.</p>
        
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-10">
           <div className="p-4 rounded-2xl bg-os-surfaceContainerLow/50 border border-os-outline/10">
              <p className="text-[10px] uppercase tracking-widest text-os-onSurfaceVariant font-bold mb-1">Accuracy</p>
              <p className="text-2xl font-black text-os-primary">{Math.round((score / questions.length) * 100)}%</p>
           </div>
           <div className="p-4 rounded-2xl bg-os-surfaceContainerLow/50 border border-os-outline/10">
              <p className="text-[10px] uppercase tracking-widest text-os-onSurfaceVariant font-bold mb-1">Points</p>
              <p className="text-2xl font-black text-os-secondary">{score * 100}</p>
           </div>
        </div>

        <div className="flex gap-4">
          <button onClick={onBack} className="px-8 py-3 rounded-2xl border border-os-outline/20 font-bold hover:bg-os-surfaceContainerLow transition-all">
            Exit
          </button>
          <button onClick={fetchQuestions} className="px-8 py-3 rounded-2xl bg-os-primary text-white font-bold shadow-lg shadow-os-primary/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
            <RefreshCw size={18} /> New Quest
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="flex flex-col h-full p-4 md:p-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-os-primary/10 blur-[100px] rounded-full" />
      <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-os-secondary/10 blur-[100px] rounded-full" />

      {/* Header */}
      <div className="flex justify-between items-center mb-8 relative z-10">
        <button onClick={onBack} className="p-2 rounded-xl bg-os-surfaceContainerLow/50 border border-os-outline/10 hover:bg-os-surfaceContainerHighest transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
           <div className="flex flex-col items-end mr-4">
              <span className="text-[10px] uppercase tracking-widest text-os-onSurfaceVariant font-black">Score</span>
              <span className="text-xl font-black text-os-primary">{score * 100}</span>
           </div>
           <div className="w-px h-8 bg-os-outline/10" />
           <div className="flex items-center gap-2 ml-4">
              <Timer size={18} className={timeLeft < 5 ? 'text-os-error animate-pulse' : 'text-os-onSurfaceVariant'} />
              <span className={`text-xl font-mono font-bold ${timeLeft < 5 ? 'text-os-error' : ''}`}>{timeLeft}s</span>
           </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-os-surfaceContainerHighest rounded-full mb-10 relative overflow-hidden">
        <motion.div 
          className="absolute h-full bg-gradient-to-r from-os-primary to-os-secondary shadow-[0_0_10px_rgba(var(--os-primary-rgb),0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full relative z-10">
        <div className="mb-8">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-os-secondary mb-2 block">Challenge {currentIndex + 1} of {questions.length}</span>
          <h2 className="text-xl md:text-3xl font-bold leading-tight text-os-onSurface">
            {currentQuestion.question}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => handleAnswer(answer)}
                  disabled={selectedAnswer !== null}
                  className={`
                    group p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden flex items-center justify-between
                    ${variant === "default" ? "bg-os-surfaceContainerLow/40 border-os-outline/10 hover:border-os-primary/40 hover:bg-os-surfaceContainerHigh/60" : ""}
                    ${variant === "correct" ? "bg-os-primary/20 border-os-primary/50 text-os-primary" : ""}
                    ${variant === "wrong" ? "bg-os-error/20 border-os-error/50 text-os-error" : ""}
                    ${variant === "dimmed" ? "opacity-30 border-os-outline/5 grayscale bg-os-surfaceContainerLow/20" : ""}
                  `}
                >
                  <span className="font-bold text-sm md:text-base pr-4">{answer}</span>
                  
                  {variant === "correct" && <CheckCircle2 size={24} className="shrink-0" />}
                  {variant === "wrong" && <XCircle size={24} className="shrink-0" />}
                  {variant === "default" && <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-os-primary" />}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Hint Footer */}
      <div className="mt-8 text-center text-[10px] text-os-onSurfaceVariant font-bold uppercase tracking-widest opacity-40">
         Powered by Open Trivia Database
      </div>
    </div>
  );
};

export default TriviaGame;
