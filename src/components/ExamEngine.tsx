import { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  Medal, 
  Download, 
  Volume2, 
  Maximize2, 
  Minimize2, 
  Flag, 
  RotateCcw, 
  Home, 
  Award, 
  TrendingUp, 
  HelpCircle, 
  FileText, 
  Calendar, 
  XSquare, 
  CheckSquare, 
  Activity 
} from 'lucide-react';
import { motion } from 'motion/react';
import { Exam, ExamResult } from '../types';
import { renderFormattedMath } from '../lib/mathUtils';
import { speakText } from '../utils/tts';

interface ExamEngineProps {
  exam: Exam;
  studentUser: any;
  onExit: () => void;
}

export default function ExamEngine({ exam, studentUser, onExit }: ExamEngineProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: 'A' | 'B' | 'C' | 'D' }>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<{ [key: number]: boolean }>({});
  const [secondsLeft, setSecondsLeft] = useState(exam.duration * 60);
  const [isExamActive, setIsExamActive] = useState(true);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Historical attempts for this specific exam
  const [attempts, setAttempts] = useState<any[]>([]);

  // Stop speaking when moving to a new question
  useEffect(() => {
    if (isPlayingTTS) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingTTS(false);
    }
  }, [currentQuestionIndex]);

  // Clean speaking on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!isExamActive || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, isExamActive]);

  // Warn on accidental refresh or unload during active exam
  useEffect(() => {
    if (isExamActive && !result) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'Warning: Leaving or refreshing this page will abort your ongoing CBT session. Your progress will be saved where you left off.';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isExamActive, result]);

  // Auto-save answers progressively (Resume feature)
  useEffect(() => {
    if (isExamActive && !result && exam?.id) {
      const stateToSave = {
        selectedAnswers,
        secondsLeft,
        currentQuestionIndex,
        flaggedQuestions
      };
      localStorage.setItem(`cbt_progress_${exam.id}`, JSON.stringify(stateToSave));
    }
  }, [selectedAnswers, secondsLeft, currentQuestionIndex, flaggedQuestions, isExamActive, result, exam?.id]);

  // Retrieve saved progress (Resume unfinished exam)
  useEffect(() => {
    if (exam?.id) {
      const saved = localStorage.getItem(`cbt_progress_${exam.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.secondsLeft > 0) {
            setSelectedAnswers(parsed.selectedAnswers || {});
            setSecondsLeft(parsed.secondsLeft);
            setCurrentQuestionIndex(parsed.currentQuestionIndex || 0);
            setFlaggedQuestions(parsed.flaggedQuestions || {});
          }
        } catch (e) {
          console.error('Failed to resume CBT progress:', e);
        }
      }
    }
  }, [exam?.id]);

  // Load attempt history for this exam
  useEffect(() => {
    if (exam?.id) {
      const savedAttempts = localStorage.getItem(`cbt_history_${exam.id}`);
      if (savedAttempts) {
        try {
          setAttempts(JSON.parse(savedAttempts));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [exam?.id, result]);

  const handleOptionSelect = (option: 'A' | 'B' | 'C' | 'D') => {
    if (!isExamActive) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: option,
    }));
  };

  const handleAutoSubmit = () => {
    if (!isExamActive) return;
    triggerExamSubmission();
  };

  const toggleFlagQuestion = () => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentQuestionIndex]: !prev[currentQuestionIndex]
    }));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {
        setIsFullscreen(false);
      });
    }
  };

  const triggerExamSubmission = async () => {
    setSubmitting(true);
    setIsExamActive(false);

    const timeSpentInSeconds = (exam.duration * 60) - secondsLeft;

    try {
      const response = await fetch(`/api/exams/${exam.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentUser?.id || 'usr_guest_student',
          studentName: studentUser?.name || 'Guest Scholar',
          answers: selectedAnswers,
          timeSpent: timeSpentInSeconds
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const completedResult = data.result;
        setResult(completedResult);
        saveAttemptToLocalHistory(completedResult, timeSpentInSeconds);
      } else {
        computeLocalFallbackResult(timeSpentInSeconds);
      }
    } catch (err) {
      console.error('Submission failed, using local fallback:', err);
      computeLocalFallbackResult(timeSpentInSeconds);
    } finally {
      setSubmitting(false);
      // Exit full screen if any
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const computeLocalFallbackResult = (timeSpentSeconds: number) => {
    let score = 0;
    const failedOnes: any[] = [];
    exam.questions.forEach((q, idx) => {
      const chosen = selectedAnswers[idx] || null;
      const isCorrect = chosen === q.correctAnswer;
      if (isCorrect) {
        score += q.marks || 5;
      }
      failedOnes.push({
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        selectedAnswer: chosen,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation || `The correct answer is Option ${q.correctAnswer}. Based on ${exam.subject} standards, this holds correct.`,
        topic: q.topic || 'General Topic'
      });
    });

    const totalPossibleMarks = exam.questions.reduce((acc, q) => acc + (q.marks || 5), 0);
    const percentage = Math.round((score / totalPossibleMarks) * 100);
    
    const mockResult: ExamResult = {
      id: "res_fallback_" + Math.random().toString(36).substring(2, 9),
      examId: exam.id,
      examTitle: exam.title,
      subject: exam.subject,
      studentId: studentUser?.id || 'usr_guest_student',
      studentName: studentUser?.name || 'Guest Scholar',
      score,
      percentage,
      totalQuestions: exam.questions.length,
      correctAnswers: exam.questions.filter((_, i) => selectedAnswers[i] === exam.questions[i].correctAnswer).length,
      failedQuestions: failedOnes,
      date: new Date().toISOString(),
    };
    
    // Attach custom extension attributes
    (mockResult as any).timeSpent = timeSpentSeconds;

    setResult(mockResult);
    saveAttemptToLocalHistory(mockResult, timeSpentSeconds);
  };

  const saveAttemptToLocalHistory = (resObj: any, timeSpentSeconds: number) => {
    const storageKey = `brain_history_${exam.id}`;
    let historyList: any[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        historyList = JSON.parse(saved);
      }
    } catch (e) {
      historyList = [];
    }

    const newAttemptItem = {
      id: resObj.id,
      score: resObj.score,
      percentage: resObj.percentage,
      correctAnswers: resObj.correctAnswers,
      totalQuestions: resObj.totalQuestions,
      date: resObj.date,
      timeSpent: timeSpentSeconds
    };

    historyList.push(newAttemptItem);
    localStorage.setItem(storageKey, JSON.stringify(historyList));
    setAttempts(historyList);

    // Also remove progress key to reset state safely
    localStorage.removeItem(`cbt_progress_${exam.id}`);
  };

  const handleRetakeExam = () => {
    if (confirm("Are you sure you want to retake this exam? This will reset your current timer and answers slate.")) {
      setSelectedAnswers({});
      setFlaggedQuestions({});
      setSecondsLeft(exam.duration * 60);
      setIsExamActive(true);
      setResult(null);
      setCurrentQuestionIndex(0);
    }
  };

  // Printing engine
  const triggerNativePrint = (titleSuffix: string) => {
    const originalTitle = document.title;
    document.title = `CBT_${titleSuffix}_${studentUser?.name || 'Student'}`;
    
    // Ensure all exact print styling is respected
    try {
      window.print();
    } catch (err) {
      alert("Print blocked or failed. Please run in full-window/Tab for exact print layout.");
    } finally {
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }
  };

  const handlePrintCertificate = () => {
    alert("To Save PDF Certificate:\n1. Change Printer/Destination target to 'Save as PDF'.\n2. Set Layout to 'Landscape' to fit the diploma grid cleanly.\n3. Make sure background graphics are turned ON under more settings.");
    triggerNativePrint("Certificate");
  };

  const handlePrintResultSlip = () => {
    alert("To Print standard A4 Results Report:\n1. Change Printer/Destination target to 'Save as PDF'.\n2. Set Layout to 'Portrait'.\n3. Click printed sheet to save.");
    triggerNativePrint("Result_Slip");
  };

  const formatElapsedTime = (totalSec: number) => {
    if (totalSec < 60) return `${totalSec}s`;
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs}s`;
  };

  const formatTimeClock = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Analytics derivations
  const questionsAttemptedCount = Object.keys(selectedAnswers).length;
  const questionsSkippedCount = exam.questions.length - questionsAttemptedCount;

  // Attempt statistics
  const bestScore = attempts.length > 0 ? Math.max(...attempts.map(a => a.percentage)) : (result?.percentage || 0);
  const averageScore = attempts.length > 0 
    ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length) 
    : (result?.percentage || 0);

  // Group performance by subject topic
  const topicStats = (() => {
    const stats: { [key: string]: { correct: number; total: number } } = {};
    exam.questions.forEach((q, idx) => {
      const topicName = q.topic || 'General Concepts';
      if (!stats[topicName]) {
        stats[topicName] = { correct: 0, total: 0 };
      }
      stats[topicName].total++;
      if (selectedAnswers[idx] === q.correctAnswer) {
        stats[topicName].correct++;
      }
    });
    return stats;
  })();

  let strongestTopic = 'No assessment topic available';
  let weakestTopic = 'No assessment topic available';
  let maxRate = -1;
  let minRate = 101;

  Object.entries(topicStats).forEach(([topName, val]) => {
    const rate = (val.correct / val.total) * 100;
    if (rate > maxRate) {
      maxRate = rate;
      strongestTopic = topName;
    }
    if (rate < minRate) {
      minRate = rate;
      weakestTopic = topName;
    }
  });

  if (maxRate === -1) strongestTopic = 'N/A';
  if (minRate === 101) weakestTopic = 'N/A';

  const activeQuestion = exam.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Complete High-Fidelity print directives */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          /* Hide non-printable app UI elements */
          header, .print\\:hidden, button, nav, footer, .floating-support {
            display: none !important;
          }
          /* Setup full viewport pages */
          #print-section-certificate, #printable-result-slip {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            page-break-after: always !important;
          }
          #print-section-certificate {
            page-break-inside: avoid !important;
          }
          /* Force colors to print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* CBT Active Header bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-slate-900 text-white rounded-xl py-1 px-3.5 font-bold text-xs uppercase tracking-wider">
              🧠 Swiftstudy CBT Engine
            </span>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 line-clamp-1">{exam.title}</h1>
              <p className="text-xs font-semibold text-slate-500">{exam.subject} • Prep Mode</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isExamActive && !result && (
              <>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                  title="Toggle Fullscreen Mode"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-2xl border border-rose-100 font-mono text-sm font-black">
                  <Clock className="w-4 h-4 text-rose-600 animate-pulse" />
                  <span>{formatTimeClock(secondsLeft)}</span>
                </div>
              </>
            )}

            {!isExamActive && (
              <button
                onClick={onExit}
                className="px-5 py-2 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all"
              >
                Return to Dashboard
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-8">
        
        {/* ==============================================
             1. SUBMITTED CBT EXAM RESULT LAYOUT PAGE 
           ============================================== */}
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            {/* Top score telemetry congratulations bar */}
            <div className="p-8 bg-gradient-to-br from-indigo-700 via-indigo-800 to-indigo-900 rounded-3xl text-white text-left shadow-xl relative overflow-hidden print:hidden">
              <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-[radial-gradient(#ffffff0a_2px,transparent_2px)] [background-size:16px_16px] pointer-events-none" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-indigo-200 border border-white/5">
                    <Award className="w-3.5 h-3.5" />
                    Official CBT Transcript
                  </div>
                  <h2 className="text-3xl font-black">{result.percentage >= 50 ? "🎉 Outstanding Effort!" : "📚 Focus & Practise!"}</h2>
                  <p className="text-indigo-200 text-xs max-w-lg font-medium leading-relaxed">
                    Student name <strong className="text-white font-extrabold">{result.studentName}</strong> has logged submission metrics. Check subject breakdown, corrected answers, and download formal transcripts below.
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shrink-0 text-center min-w-[160px]">
                  <span className="text-[10px] uppercase tracking-widest text-indigo-200 font-extrabold block mb-1">Percentage Grade</span>
                  <p className="text-5xl font-black text-white">{result.percentage}%</p>
                  <span className="text-[10px] mt-2 inline-block px-3 py-0.5 bg-white/20 rounded-full font-bold uppercase">
                    {result.percentage >= 50 ? "🥈 Passed" : "⚠️ Retake Required"}
                  </span>
                </div>
              </div>

              {/* Quick statistics metrics footer */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
                <div className="bg-white/5 rounded-xl p-3">
                  <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">Correct Score</span>
                  <p className="text-lg font-bold text-white">{result.score} Marks ({result.correctAnswers}/{result.totalQuestions})</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">Time Completed</span>
                  <p className="text-lg font-bold text-white">
                    {formatElapsedTime((result as any).timeSpent || ((exam.duration * 60) - secondsLeft))}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">Attempt Timestamp</span>
                  <p className="text-xs font-bold text-white mt-1">
                    {new Date(result.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">Evaluation Identity</span>
                  <p className="text-[10px] font-mono font-bold text-indigo-100 truncate mt-1.5">{result.id}</p>
                </div>
              </div>
            </div>

            {/* Quick Result Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <button
                onClick={handlePrintResultSlip}
                className="px-5 py-3 bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center gap-2.5 cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Download PDF Result Slip
              </button>
              <button
                onClick={handlePrintCertificate}
                className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center gap-2.5 cursor-pointer"
              >
                <Medal className="w-4 h-4 text-white" />
                Print Scholar Certificate
              </button>
              <button
                onClick={handleRetakeExam}
                className="px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition-all flex items-center gap-2.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-indigo-600" />
                Retake Exam
              </button>
              <button
                onClick={onExit}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-250 text-slate-700 font-extrabold text-xs rounded-xl transition-all flex items-center gap-2.5 cursor-pointer"
              >
                <Home className="w-4 h-4 text-slate-600" />
                Return to Dashboard
              </button>
            </div>

            {/* Structured Academic Performance Evaluation Logs / Analytics Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
              {/* CBT Attempt Logs */}
              <div className="p-6 bg-white border border-slate-150 rounded-2xl shadow-xs space-y-4 col-span-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-550 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  CBT History & Progression
                </h4>
                
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
                      <span className="text-[9px] text-slate-400 uppercase font-black block">Best Score</span>
                      <strong className="text-lg font-black text-slate-900">{bestScore}%</strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
                      <span className="text-[9px] text-slate-400 uppercase font-black block">Avg Score</span>
                      <strong className="text-lg font-black text-indigo-650">{averageScore}%</strong>
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider pt-2 border-t border-slate-100">
                    Previous Attempts ({attempts.length})
                  </div>
                  
                  {attempts.length === 0 ? (
                    <p className="text-[11px] text-slate-400">First logged attempt completed.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {attempts.map((att, ind) => (
                        <div key={ind} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs leading-none border border-slate-100">
                          <div>
                            <span className="font-extrabold text-slate-800">Attempt #{ind + 1}</span>
                            <p className="text-[9px] text-slate-400 mt-0.5">{new Date(att.date).toLocaleDateString()}</p>
                          </div>
                          <span className={`font-black uppercase py-1 px-2.5 rounded-md text-[10px] ${att.percentage >= 50 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                            {att.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* CBT Cognitive Analytics Grid */}
              <div className="p-6 bg-white border border-slate-150 rounded-2xl shadow-xs space-y-4 col-span-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-550 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  CBT Subject Analytics Insights
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 uppercase font-black tracking-wider block">Strongest Area of Capability</span>
                    <strong className="text-sm font-black text-slate-900 mt-1 block">{strongestTopic}</strong>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">Demonstrated top performance indices in this conceptual sector.</p>
                  </div>
                  <div className="p-4 bg-rose-50/45 rounded-xl border border-rose-100">
                    <span className="text-[10px] text-rose-500 uppercase font-black tracking-wider block">Target Weakest revision Area</span>
                    <strong className="text-sm font-black text-rose-900 mt-1 block">{weakestTopic}</strong>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">Needs focused revision. Study the detailed explanation keys below.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-extrabold uppercase text-[9px] tracking-wider block mb-1">QUESTIONS ATTEMPTED</span>
                    <p className="text-base font-black text-slate-800">{questionsAttemptedCount} of {exam.questions.length}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-extrabold uppercase text-[9px] tracking-wider block mb-1">UNANSWERED / SKIPPED</span>
                    <p className="text-base font-black text-amber-600">{questionsSkippedCount} skipping</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Topic Performance Progress Grid */}
            <div className="p-6 bg-white border border-slate-150 rounded-3xl shadow-sm space-y-4 print:hidden">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-indigo-500" />
                Sector / Topic Performance Distribution
              </h4>
              
              <div className="space-y-3.5">
                {Object.entries(topicStats).map(([topicName, stats]) => {
                  const rate = Math.round((stats.correct / stats.total) * 100);
                  return (
                    <div key={topicName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>{topicName}</span>
                        <span>{stats.correct}/{stats.total} Correct ({rate}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            rate >= 75 ? 'bg-emerald-500' : rate >= 50 ? 'bg-indigo-600' : 'bg-rose-500'
                          }`}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ====================================
                 REVIEW ANSWERS & CORRECTIONS LIST 
               ==================================== */}
            <div className="p-6 bg-white border border-slate-150 rounded-3xl shadow-sm space-y-6 print:hidden">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-500" />
                  Review Answers & Explanations Panel
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1">
                  Examine every question, correct choice matrix, your choice, and structural learning explanations. Correct is in green, Wrong in red, Unanswered in orange.
                </p>
              </div>

              <div className="space-y-6 divide-y divide-slate-100">
                {result.failedQuestions.map((revItem, idx) => {
                  // Determine status
                  const isCorrect = revItem.selectedAnswer === revItem.correctAnswer;
                  const isNotAnswered = !revItem.selectedAnswer;
                  
                  let badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
                  let badgeText = "Wrong";
                  if (isCorrect) {
                    badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    badgeText = "Correct";
                  } else if (isNotAnswered) {
                    badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                    badgeText = "Not Answered";
                  }

                  const optionsList = [
                    { key: 'A', label: revItem.optionA },
                    { key: 'B', label: revItem.optionB },
                    { key: 'C', label: revItem.optionC },
                    { key: 'D', label: revItem.optionD },
                  ];

                  return (
                    <div key={idx} className="pt-6 space-y-3 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-xs bg-slate-105 text-slate-650 py-1 px-2.5 rounded-full font-extrabold font-mono">
                          Question {(idx + 1).toString().padStart(2, '0')}
                        </span>
                        
                        <span className={`text-[10px] uppercase font-black tracking-wide border py-1 px-3 rounded-full ${badgeColor}`}>
                          {badgeText}
                        </span>
                      </div>

                      {/* Question Text */}
                      <p 
                        className="text-sm sm:text-base font-bold text-slate-800 leading-relaxed math-rendered"
                        dangerouslySetInnerHTML={{ __html: renderFormattedMath(revItem.question) }}
                      />

                      {/* Side by side selections */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                        {optionsList.map((opt) => {
                          const isCorrectOpt = opt.key === revItem.correctAnswer;
                          const isSelectedOpt = opt.key === revItem.selectedAnswer;

                          let borderStyle = "border-slate-150 hover:bg-slate-50";
                          let optionMarkerColor = "bg-slate-100 text-slate-500";
                          
                          if (isCorrectOpt) {
                            borderStyle = "bg-emerald-500/10 border-emerald-300 text-emerald-950";
                            optionMarkerColor = "bg-emerald-500 text-white";
                          } else if (isSelectedOpt) {
                            borderStyle = "bg-rose-500/10 border-rose-300 text-rose-950";
                            optionMarkerColor = "bg-rose-500 text-white";
                          }

                          return (
                            <div 
                              key={opt.key} 
                              className={`p-3.5 border rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-3 transition ${borderStyle}`}
                            >
                              <span className={`w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold shrink-0 text-xs shadow-xs ${optionMarkerColor}`}>
                                {opt.key}
                              </span>
                              <span dangerouslySetInnerHTML={{ __html: renderFormattedMath(opt.label) }} />
                              {isCorrectOpt && <span className="text-[10px] font-extrabold text-emerald-600 ml-auto select-none font-mono uppercase">Correct Choice</span>}
                              {isSelectedOpt && !isCorrectOpt && <span className="text-[10px] font-extrabold text-rose-600 ml-auto select-none font-mono uppercase">Your Choice</span>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation Feedback Block */}
                      <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex items-start gap-2.5 mt-2">
                        <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-600 leading-relaxed font-semibold">
                          <strong className="text-slate-900 font-extrabold">Assessor Explanation Note:</strong>{" "}
                          <span dangerouslySetInnerHTML={{ __html: renderFormattedMath(revItem.explanation || `The correct answer is Option ${revItem.correctAnswer}. Concept evaluation validates this as mathematically or contextually absolute.`) }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ========================================================
                 A4 HIGH-FIDELITY PRINTABLE LANDSCAPE CERTIFICATE
               ======================================================== */}
            <div id="print-section-certificate" className="hidden print:block p-10 bg-white min-h-[190mm]">
              <div className="border border-double border-amber-600 p-8 text-center bg-amber-50/20 max-w-5xl mx-auto rounded-3xl relative">
                <h1 className="text-3xl font-serif font-bold text-amber-900 uppercase">Certificate of Excellence</h1>
                <p className="italic text-sm text-slate-600 my-4">Presented to</p>
                <h2 className="text-4xl font-serif font-black underline my-4 uppercase">{result.studentName}</h2>
                <p className="text-sm text-slate-700 max-w-lg mx-auto">
                  For completing the computer-based evaluation CBT test score aggregates in <strong className="font-extrabold">{exam.title} ({exam.subject})</strong> with a final score percentage of:
                </p>
                <div className="my-6 text-5xl font-black text-rose-700">{result.percentage}%</div>
                
                <div className="flex justify-between items-center text-xs text-slate-500 mt-12 px-12 pt-6 border-t border-dashed border-amber-300">
                  <div className="text-left">
                    Principal Assessor Name: <strong className="text-slate-800">Nwaigbo Augustine</strong>
                    <div className="h-[1px] bg-slate-350 w-32 mt-2" />
                  </div>
                  <div className="text-right">
                    Official CBT Verification Code: <strong className="text-slate-800">{result.id}</strong>
                    <div className="h-[1px] bg-slate-350 w-32 mt-2" />
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================
                 A4 DETAILED PRINTABLE PORTRAIT RESULT SLIP
               ======================================================== */}
            <div id="printable-result-slip" className="hidden print:block p-10 bg-white font-sans text-xs min-h-[297mm]">
              <div className="space-y-6">
                {/* School Letterhead */}
                <div className="text-center border-b-2 border-slate-900 pb-4">
                  <h1 className="text-2xl font-black uppercase text-slate-900">REPUBLIC OF EDUCATION CLASS PORTAL</h1>
                  <p className="text-xs uppercase font-extrabold text-slate-500 tracking-wider">Official Assessment Center • Computer Based Testing Division</p>
                  <p className="text-[10px] text-slate-400">Portal Link: brain-cbt.system</p>
                </div>

                <div className="text-center">
                  <h2 className="text-sm bg-slate-900 text-white font-extrabold py-2 uppercase tracking-widest inline-block px-8 rounded-md">Candidate Result Slip</h2>
                </div>

                {/* Patient Biometrics / Candidate Info */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl leading-relaxed">
                  <div>
                    <span className="text-slate-450 uppercase font-bold text-[9px]">CANDIDATE STUDENT</span>
                    <p className="text-sm font-extrabold text-slate-900">{result.studentName}</p>
                    <p className="text-[10px] text-slate-500">Student ID: {result.studentId}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-450 uppercase font-bold text-[9px]">ASSESSMENT METRIC</span>
                    <p className="text-sm font-extrabold text-slate-900 truncate">{exam.title}</p>
                    <p className="text-[10px] text-slate-500">Subject Area: {exam.subject} ({exam.level})</p>
                  </div>
                </div>

                {/* Score Breakdown Table */}
                <table className="w-full text-left border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-[10px] uppercase font-black tracking-wider">
                      <th className="p-3 border border-slate-200">Evaluation Factor</th>
                      <th className="p-3 border border-slate-200">Registered Metric</th>
                      <th className="p-3 border border-slate-200">Score Achieved</th>
                      <th className="p-3 border border-slate-200">Final Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="font-semibold text-slate-800">
                    <tr>
                      <td className="p-3 border border-slate-200">Aggregate Questions</td>
                      <td className="p-3 border border-slate-200">{result.totalQuestions} Questions</td>
                      <td className="p-3 border border-slate-200">{result.correctAnswers} Correct</td>
                      <td className="p-3 border border-slate-200 text-indigo-700">{result.percentage}%</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-3 border border-slate-200">Session Elapsed</td>
                      <td className="p-3 border border-slate-200">{exam.duration} Minutes max</td>
                      <td className="p-3 border border-slate-200">
                        {formatElapsedTime((result as any).timeSpent || 0)}
                      </td>
                      <td className="p-3 border border-slate-200 text-emerald-600 font-extrabold uppercase">
                        {result.percentage >= 50 ? "Pass" : "Fail"}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Key Performance Indicators Analytics */}
                <div className="space-y-2">
                  <h3 className="font-extrabold text-xs uppercase border-b border-slate-200 pb-1 text-slate-700">Detailed Subject Performance Chart</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase">Strongest Concept Block</span>
                      <strong className="block text-slate-800">{strongestTopic}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase">Weakest Concept Area</span>
                      <strong className="block text-slate-850">{weakestTopic}</strong>
                    </div>
                  </div>
                </div>

                {/* Signature verification block */}
                <div className="grid grid-cols-2 pt-16 border-t border-slate-100 items-end">
                  <div>
                    <p className="italic text-slate-500">Official Web Print Stamp</p>
                    <p className="text-[9px] text-slate-400 mt-2">Generated dynamically by brain-cbt system: {new Date().toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">Principal Assessment Center Signature</p>
                    <p className="font-serif italic text-lg text-indigo-600 my-1">Austin Nwaigbo</p>
                    <div className="h-[1px] bg-slate-350 w-48 ml-auto" />
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        )}

        {/* ==============================================
             2. ONGOING CBT EXAMINATION SCREEN 
           ============================================== */}
        {isExamActive && !result && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Content Card Panel */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-6">
                
                {/* Card Title Details Header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-slate-100 text-slate-700 py-1 px-3.5 rounded-full font-bold">
                    Question {currentQuestionIndex + 1} of {exam.questions.length}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {/* Read Out loud Voice button */}
                    <button
                      onClick={() => {
                        const stripTags = activeQuestion.question.replace(/<[^>]*>/g, '');
                        const strToSpeak = `Question ${currentQuestionIndex + 1}: ${stripTags}. Option A: ${activeQuestion.optionA}. Option B: ${activeQuestion.optionB}. Option C: ${activeQuestion.optionC}. Option D: ${activeQuestion.optionD}.`;
                        speakText(strToSpeak, isPlayingTTS, setIsPlayingTTS);
                      }}
                      className={`p-1.5 px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold border transition duration-150 cursor-pointer ${
                        isPlayingTTS
                          ? "bg-rose-500 text-white border-rose-600"
                          : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      {isPlayingTTS ? "Stop speak" : "🔊 Listen"}
                    </button>

                    {/* Flag button */}
                    <button
                      onClick={toggleFlagQuestion}
                      className={`p-2 rounded-xl border transition ${
                        flaggedQuestions[currentQuestionIndex]
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-white text-slate-400 border-slate-200 hover:text-slate-700 hover:bg-slate-50'
                      }`}
                      title={flaggedQuestions[currentQuestionIndex] ? "Question Flagged for Review" : "Flag Question for Review"}
                    >
                      <Flag className={`w-3.5 h-3.5 ${flaggedQuestions[currentQuestionIndex] ? 'fill-amber-500' : ''}`} />
                    </button>

                    <span className="text-xs bg-indigo-50 text-indigo-700 py-1 px-3 rounded-full font-extrabold border border-indigo-100">
                      +{activeQuestion.marks || 5} Mark
                    </span>
                  </div>
                </div>

                {/* Structural Prompt query rendered */}
                <h3 
                  className="text-base sm:text-lg font-extrabold text-slate-800 leading-relaxed math-rendered"
                  dangerouslySetInnerHTML={{ __html: renderFormattedMath(activeQuestion.question) }}
                />

                {/* Answer Options Radio Block */}
                <div className="space-y-3">
                  {[
                    { key: 'A' as const, label: activeQuestion.optionA },
                    { key: 'B' as const, label: activeQuestion.optionB },
                    { key: 'C' as const, label: activeQuestion.optionC },
                    { key: 'D' as const, label: activeQuestion.optionD },
                  ].map((option) => {
                    const isSelected = selectedAnswers[currentQuestionIndex] === option.key;
                    return (
                      <button
                        key={option.key}
                        onClick={() => handleOptionSelect(option.key)}
                        className={`w-full flex items-center justify-between text-left p-4 rounded-xl border font-bold text-xs sm:text-sm transition duration-150 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/10 border-indigo-600 text-indigo-950 ring-2 ring-indigo-600/15'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-lg font-mono font-black flex items-center justify-center shrink-0 border text-xs leading-none transition ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-500 border-slate-200'
                          }`}>
                            {option.key}
                          </span>
                          <span dangerouslySetInnerHTML={{ __html: renderFormattedMath(option.label) }} />
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Footer Controls Navigation */}
                <div className="flex items-center justify-between pt-5 border-t border-slate-150">
                  <button
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                    className="flex items-center gap-1.5 py-2.5 px-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 rounded-xl font-bold text-xs text-slate-700 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <span className="text-xs text-slate-450 font-bold">Question {currentQuestionIndex + 1} of {exam.questions.length}</span>

                  <button
                    disabled={currentQuestionIndex === exam.questions.length - 1}
                    onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                    className="flex items-center gap-1.5 py-2.5 px-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 rounded-xl font-bold text-xs text-slate-700 transition"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Question index grid navigator */}
            <div className="space-y-6">
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  CBT Navigation Center
                </h4>
                
                {/* Index grid navigator buttons */}
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {exam.questions.map((_, index) => {
                    const isAnswered = selectedAnswers[index] !== undefined;
                    const isActive = currentQuestionIndex === index;
                    const isFlagged = flaggedQuestions[index] === true;
                    return (
                      <button
                        key={index}
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`h-10 text-xs font-mono font-black relative rounded-lg border flex items-center justify-center transition-colors shadow-xs cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : isAnswered
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        {(index + 1).toString().padStart(2, '0')}
                        
                        {/* Flag dot */}
                        {isFlagged && (
                          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-amber-500 rounded-bl-md border-t border-r border-white rounded-tr-md" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legends */}
                <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-500 leading-none">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-indigo-600 rounded-md border border-indigo-700 block" />
                    <span>Current Active Q</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-indigo-50 rounded-md border border-indigo-200 block" />
                    <span>Attempted Q</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-slate-50 rounded-md border border-slate-200 block" />
                    <span>Unanswered Choice</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-amber-400 rounded-md block" />
                    <span>Flagged for Review</span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  onClick={triggerExamSubmission}
                  disabled={submitting}
                  className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-emerald-100 min-h-12 flex items-center justify-center cursor-pointer"
                >
                  {submitting ? 'scoring metrics...' : 'Finish & Submit Exam'}
                </button>
              </div>

              {/* Warnings and Security Notice */}
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 space-y-1">
                  <p className="font-bold">Security Lock Protocols Active</p>
                  <p className="leading-relaxed">This exam is automatically saved to local caching systems. If you accidentally refresh, you will resume directly.</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
