import { useState, useEffect, FormEvent } from 'react';
import { Sparkles, BrainCircuit, School, BookOpen, GraduationCap, ArrowRight, Check, Star, Shield, MessageSquare, Phone } from 'lucide-react';
import LandingPage from './components/LandingPage';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import AdminDashboard from './components/AdminDashboard';
import ExamEngine from './components/ExamEngine';
import FloatingSupportChat from './components/FloatingSupportChat';
import { Exam } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedCBTExam, setSelectedCBTExam] = useState<Exam | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [guestStudentName, setGuestStudentName] = useState('');
  const [admissionStep, setAdmissionStep] = useState<'inputName' | 'startExam'>('inputName');
  const [activeExamStudentName, setActiveExamStudentName] = useState('');
  const [userPerspective, setUserPerspective] = useState<'student' | 'teacher' | 'admin'>('teacher');
  const [guestExamCompleted, setGuestExamCompleted] = useState<{ studentName: string; examTitle: string } | null>(null);
  
  // Security checking states for CBT attempts & standard 50 Naira gate charge
  const [candidateAuthError, setCandidateAuthError] = useState('');
  const [candidateAttemptsCount, setCandidateAttemptsCount] = useState(0);
  const [initiatingAttempt, setInitiatingAttempt] = useState(false);

  // Parse custom parameters on initial mount (e.g., student joins exam link from whatsapp/url)
  const parseExamLinkQuery = async (examsList: Exam[]) => {
    const hash = window.location.hash || '';
    const params = new URLSearchParams(window.location.search);
    const examIdFromQuery = params.get('examId');

    let examId = '';
    if (hash.startsWith('#/exam/')) {
      examId = hash.replace('#/exam/', '');
    } else if (examIdFromQuery) {
      examId = examIdFromQuery;
    }

    if (examId) {
      const match = examsList.find((e) => e.id === examId);
      if (match) {
        setSelectedCBTExam(match);
      }
    }
  };

  const checkUserSession = async () => {
    setSessionLoading(true);
    try {
      // Automatic configuration of persistent admin guest session
      let localUserStr = localStorage.getItem('brain_guest_user');
      let userObj = null;
      if (localUserStr) {
        try {
          userObj = JSON.parse(localUserStr);
        } catch (e) {
          userObj = null;
        }
      }

      if (!userObj) {
        userObj = {
          id: 'usr_guest_admin', // Fixed to match parent backend fallback guest account synchronization!
          name: 'Austin Nwaigbo',
          email: 'nwaigboaugust@gmail.com',
          role: 'admin',
          regNumber: 'REG-2026-NWAIGBO',
          walletBalance: 25000,
          classLevel: 'Senior Secondary Section 3'
        };
        localStorage.setItem('brain_guest_user', JSON.stringify(userObj));
      }

      setCurrentUser(userObj);

      const savedPerspective = localStorage.getItem('brain_perspective');
      setUserPerspective((savedPerspective as any) || 'teacher');

      // Fetch exams List to check instant link joining hooks
      const examRes = await fetch('/api/exams');
      if (examRes.ok) {
        const examData = await examRes.json();
        const publishedExams = examData.exams || [];
        parseExamLinkQuery(publishedExams);
      }
    } catch (e) {
      console.error('Session sync offline:', e);
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    checkUserSession();
    
    // Hash change detector
    const handleHashChange = () => {
      fetch('/api/exams')
        .then((r) => r.json())
        .then((data) => parseExamLinkQuery(data.exams || []));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser?.id]);

  const handleLogout = async () => {
    try {
      // Clear local credentials to emulate session reset, then rebuild instant guest access
      localStorage.removeItem('brain_guest_user');
      localStorage.removeItem('brain_perspective');
      await checkUserSession();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAuth = (role: 'student' | 'teacher' | 'admin') => {
    setUserPerspective(role);
    localStorage.setItem('brain_perspective', role);
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans space-y-4">
        <div className="relative">
          <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold text-2xl shadow-xl animate-bounce">
            B
          </span>
          <span className="absolute inset-0 rounded-2xl bg-violet-500 animate-ping opacity-25" />
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-slate-800">Bootstrapping school structures...</p>
          <p className="text-xs text-slate-400 font-semibold mt-1">Contact: nwaigboaugust@gmail.com</p>
        </div>
      </div>
    );
  }

  // Active CBT testing console - runs full-screen
  if (selectedCBTExam) {
    if (!activeExamStudentName) {
      const handleProceedAndStart = async (e: FormEvent) => {
        e.preventDefault();
        const trimmed = guestStudentName.trim();
        if (!trimmed) return;

        setCandidateAuthError('');
        setInitiatingAttempt(true);

        try {
          // 1. Verify Attempt limit per candidate name
          const checkRes = await fetch(`/api/exams/${selectedCBTExam.id}/check-attempts?studentName=${encodeURIComponent(trimmed)}`);
          if (!checkRes.ok) {
            throw new Error("Could not verify attempt status on core server.");
          }
          const checkData = await checkRes.json();
          if (checkData.attempts >= 2) {
            setCandidateAuthError(`Access Denied: '${trimmed}' has already taken this CBT exam 2 times. The maximum attempt threshold is strictly enforced.`);
            setInitiatingAttempt(false);
            return;
          }

          // 2. Perform Standard Take charge authentication
          const startRes = await fetch(`/api/exams/${selectedCBTExam.id}/start-attempt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentName: trimmed })
          });

          const startData = await startRes.json();
          if (!startRes.ok) {
            setCandidateAuthError(startData.error || `Registration gate failure. Please contact administrator.`);
            setInitiatingAttempt(false);
            return;
          }

          // Proceed to CBT and show standard attempt message
          setCandidateAttemptsCount(startData.attemptNumber);
          setActiveExamStudentName(trimmed);
          setAdmissionStep('startExam');
        } catch (err: any) {
          setCandidateAuthError(err.message || "An unexpected error occurred. Please try again.");
        } finally {
          setInitiatingAttempt(false);
        }
      };

      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
          <form
            onSubmit={handleProceedAndStart}
            className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-150 text-center space-y-6 shadow-xl"
          >
            <div className="w-16 h-16 bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-md">
              ✍
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-black text-slate-900 font-sans">Enter Your Name & Start Exam</h1>
              <p className="text-xs text-slate-500 font-medium font-sans">
                Please enter your name below to unlock your standard CBT exam access immediately.
              </p>
            </div>

            {/* Error messaging block */}
            {candidateAuthError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs text-left rounded-2xl font-bold font-sans">
                {candidateAuthError}
              </div>
            )}

            {/* Live CBT Exam Details Info Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2 text-xs font-sans">
              <p className="font-semibold text-slate-600"><strong className="text-slate-800">CBT Exam:</strong> {selectedCBTExam.title}</p>
              <p className="font-semibold text-slate-600"><strong className="text-slate-800">Subject:</strong> {selectedCBTExam.subject} ({selectedCBTExam.level})</p>
              <p className="font-semibold text-slate-600"><strong className="text-slate-800">Duration:</strong> {selectedCBTExam.duration} Minutes</p>
              <p className="font-bold text-violet-600 p-1 bg-violet-50 rounded-lg text-[10px] uppercase tracking-wider block text-center">CBT Standard Taking Fee: ₦50 Direct Debit</p>
            </div>
            
            <div className="space-y-2 text-left">
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider block">
                Your Full Name:
              </label>
              <input
                type="text"
                required
                disabled={initiatingAttempt}
                placeholder="e.g., John Doe"
                value={guestStudentName}
                onChange={(ev) => setGuestStudentName(ev.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition text-sm"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="submit"
                disabled={!guestStudentName.trim() || initiatingAttempt}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-lg transition cursor-pointer"
              >
                {initiatingAttempt ? "Authenticating Entry..." : "Start Exam (₦50 Debit)"}
              </button>
              <button
                type="button"
                disabled={initiatingAttempt}
                onClick={() => {
                  setSelectedCBTExam(null);
                  setGuestStudentName('');
                  setActiveExamStudentName('');
                  setAdmissionStep('inputName');
                  setCandidateAuthError('');
                  window.location.hash = '';
                  if (window.location.search) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel and Go Back
              </button>
            </div>
            
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Secure CBT Engine by Brain AI
            </p>
          </form>
        </div>
      );
    }

    return (
      <ExamEngine
        exam={selectedCBTExam}
        studentUser={{
          id: currentUser?.id && !currentUser?.isGuest ? currentUser.id : 'guest_' + Math.random().toString(36).substring(2, 9),
          name: activeExamStudentName,
          email: `${activeExamStudentName.toLowerCase().replace(/\s+/g, '')}@student.cbt`,
          role: 'student',
          isGuest: true,
          walletBalance: 0,
        }}
        onExit={() => {
          // If the student is a direct link guest (not registered/logged in), redirect to the custom completion thank-you screen!
          if (!currentUser) {
            setGuestExamCompleted({
              studentName: activeExamStudentName,
              examTitle: selectedCBTExam.title,
            });
          }
          setSelectedCBTExam(null);
          setGuestStudentName('');
          setActiveExamStudentName('');
          setAdmissionStep('inputName');
          window.location.hash = '';
          if (window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }}
      />
    );
  }

  if (guestExamCompleted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-150 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-3xl mx-auto shadow-md">
            ✓
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-900 leading-tight">CBT Session Completed</h1>
            <p className="text-xs text-slate-500 font-semibold">
              Thank you, <strong className="text-slate-800 font-extrabold">{guestExamCompleted.studentName}</strong>! Your CBT answers for <strong className="text-slate-800 font-extrabold">{guestExamCompleted.examTitle}</strong> have been saved and scored.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 text-xs text-slate-650 space-y-2 font-medium">
            <p>Your results have been securely archived. Your principal assessor and teacher can now view your academic scores.</p>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider pt-1">You may now safely close this browser window or tab.</p>
          </div>
          <button
            onClick={() => {
              setGuestExamCompleted(null);
            }}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition cursor-pointer border-none"
          >
            Go to School Homepage
          </button>
        </div>
      </div>
    );
  }

  // Dashboard state routing
  if (currentUser) {
    const adaptedUser = {
      ...currentUser,
      role: userPerspective,
    };

    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        {/* Integrated Dual/Triple-Perspective Switcher Header */}
        <div className="bg-slate-900 border-b border-slate-950 text-slate-100 px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <div className="text-xs">
              <span className="text-slate-400 font-medium font-sans">Active Profile: </span>
              <strong className="text-white font-extrabold font-sans">{currentUser.name}</strong> 
              <span className="text-[10px] bg-slate-800 text-slate-300 ml-2 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                {userPerspective === "admin" ? "Administrator Portal" : userPerspective === "teacher" ? "Educator Profile" : "Candidate Student"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">Viewing Perspective:</span>
            <div className="inline-flex rounded-xl bg-slate-800/80 p-0.5 border border-slate-700/60 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setUserPerspective('student');
                  localStorage.setItem('brain_perspective', 'student');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black tracking-wide transition-all ease-out duration-150 cursor-pointer ${
                  userPerspective === 'student'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/20'
                }`}
              >
                Student Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserPerspective('teacher');
                  localStorage.setItem('brain_perspective', 'teacher');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black tracking-wide transition-all ease-out duration-150 cursor-pointer ${
                  userPerspective === 'teacher'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/20'
                }`}
              >
                Teachers Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserPerspective('admin');
                  localStorage.setItem('brain_perspective', 'admin');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black tracking-wide transition-all ease-out duration-150 cursor-pointer ${
                  userPerspective === 'admin'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/20'
                }`}
              >
                Admin System
              </button>
            </div>
          </div>
        </div>

        <div className="flex-grow flex flex-col">
          {userPerspective === 'admin' ? (
            <AdminDashboard
              user={adaptedUser}
              onLogout={handleLogout}
            />
          ) : userPerspective === 'teacher' ? (
            <TeacherDashboard
              user={adaptedUser}
              onLogout={handleLogout}
            />
          ) : (
            <StudentDashboard
              user={adaptedUser}
              onLogout={handleLogout}
              onTakeExam={(exam) => setSelectedCBTExam(exam)}
            />
          )}
        </div>
        
        <FloatingSupportChat />
      </div>
    );
  }

  // Fallback fallback render (Visitor Landing page can be accessed if sessionStorage state is deleted)
  return (
    <>
      <LandingPage
        onGetStarted={() => handleOpenAuth('teacher')}
        onLoginClick={(role) => handleOpenAuth(role)}
        onSelectExam={(exam) => setSelectedCBTExam(exam)}
      />

      <FloatingSupportChat />
    </>
  );
}
