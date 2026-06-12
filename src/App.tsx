import { useState, useEffect, FormEvent } from 'react';
import { Sparkles, BrainCircuit, School, BookOpen, GraduationCap, ArrowRight, Check, Star, Shield, MessageSquare, Phone, X, Lock, Mail, User } from 'lucide-react';
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
  const [guestExamCompleted, setGuestExamCompleted] = useState<{ studentName: string; examTitle: string } | null>(null);

  // Authentication UI States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [registerRole, setRegisterRole] = useState<'student' | 'teacher'>('student');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Registration Form Fields
  const [fullName, setFullName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Admin route separation states
  const [isAdminRoute, setIsAdminRoute] = useState(
    window.location.hash === '#/admin' || window.location.pathname === '/admin'
  );
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Security checking states for CBT attempts & standard 50 Naira gate charge
  const [candidateAuthError, setCandidateAuthError] = useState('');
  const [initiatingAttempt, setInitiatingAttempt] = useState(false);

  useEffect(() => {
    // Listen to URL hash and path adjustments for Separate Admin Portal Routing
    const handleUrlChange = () => {
      setIsAdminRoute(
        window.location.hash === '#/admin' || window.location.pathname === '/admin'
      );
    };
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  // Parse custom parameters on initial mount (e.g., student joins exam link from url query or hash)
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
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }

      // Fetch exams List to check instant link joining hooks
      const examRes = await fetch('/api/exams');
      if (examRes.ok) {
        const examData = await examRes.json();
        const publishedExams = examData.exams || [];
        parseExamLinkQuery(publishedExams);
      }
    } catch (e) {
      console.error('Session sync offline:', e);
      setCurrentUser(null);
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    checkUserSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      // If admin was logged out, refresh route
      if (isAdminRoute) {
        setAdminEmail('');
        setAdminPassword('');
      } else {
        setShowAuthModal(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit standard student/teacher registration/login handler
  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    try {
      if (authTab === 'register') {
        // Validation Checks
        if (!fullName || fullName.trim().length < 2) {
          throw new Error('Unable to create account. Please enter a valid name of at least 2 characters.');
        }

        if (!emailAddress) {
          throw new Error('Invalid email.');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailAddress)) {
          throw new Error('Invalid email.');
        }

        if (!password || password.length < 8) {
          throw new Error('Password must be at least 8 characters.');
        }

        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        const payload = {
          name: fullName.trim(),
          email: emailAddress.trim(),
          password,
          confirmPassword,
          role: registerRole
        };

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        let data: any;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          throw new Error(text.slice(0, 100) || 'Unable to parse registration response on server.');
        }

        if (!response.ok) {
          throw new Error(data.error || 'Unable to create account. Please try again.');
        }

        // Display Welcome message first, then redirect to dashboard after a short delay
        if (data.note) {
          setAuthSuccess(`Welcome ${data.user.name}! ${data.note}`);
        } else {
          setAuthSuccess(`Welcome ${data.user.name}! Account created successfully.`);
        }
        setTimeout(() => {
          setCurrentUser(data.user);
          setShowAuthModal(false);
          // Reset form
          setFullName('');
          setEmailAddress('');
          setPassword('');
          setConfirmPassword('');
        }, 1200);

      } else {
        // Login code path
        const payload = { email: emailAddress.trim(), password };
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        let data: any;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          throw new Error(text.slice(0, 100) || 'Unable to parse login response on server.');
        }

        if (!response.ok) {
          throw new Error(data.error || 'Failed to authenticate.');
        }

        setAuthSuccess(`Welcome back ${data.user.name}! Sign-in authenticated successfully.`);
        setTimeout(() => {
          setCurrentUser(data.user);
          setShowAuthModal(false);
          setEmailAddress('');
          setPassword('');
        }, 1200);
      }
    } catch (err: any) {
      console.group('--- AUTHENTICATION/REGISTRATION FAILURE DIAGNOSTICS ---');
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack || err);
      console.error('Auth action tab:', authTab);
      console.error('Current window.location.origin:', window.location.origin);
      console.error('Current window.location.host:', window.location.host);
      console.error('Payload role selection:', authTab === 'register' ? registerRole : 'N/A');
      console.error('API endpoint path:', authTab === 'register' ? '/api/auth/register' : '/api/auth/login');
      
      const isFailedToFetch = err.message && err.message.toLowerCase().includes('failed to fetch');
      if (isFailedToFetch) {
        console.error('Failed to fetch indicates a network level or CORS policy error.');
        console.groupEnd();
        setAuthError(
          'Unable to reach server. Please check your internet connection or reload the page and try again.'
        );
      } else {
        console.groupEnd();
        setAuthError(err.message || 'Unable to create account. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Submit secure ADMIN Login separate flow
  const handleAdminLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });

      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text.slice(0, 100) || 'Unable to parse admin authentication response.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Authentication error.');
      }

      // Check role separation
      if (data.user.role !== 'admin') {
        throw new Error('Access Denied: Non-administrator accounts do not have clearance to enter the Admin Portal.');
      }

      setCurrentUser(data.user);
    } catch (err: any) {
      setAdminError(err.message || 'Admin authentication failed.');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!emailAddress) {
      setAuthError('Please enter your registered email address first.');
      return;
    }
    setAuthError('');
    setAuthSuccess('');
    try {
      const response = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAddress })
      });
      const data = await response.json();
      if (response.ok) {
        setAuthSuccess(data.message || 'Reset guidelines sent successfully!');
      } else {
        setAuthError(data.error || 'Could not trigger password reset.');
      }
    } catch {
      setAuthError('Error reaching core authentication server.');
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans space-y-4">
        <div className="relative">
          <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold text-2xl shadow-xl animate-bounce">
            S
          </span>
          <span className="absolute inset-0 rounded-2xl bg-indigo-500 animate-ping opacity-25" />
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
          // 1. Verify Attempt limits per name
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

          // 2. Take exam initiation action
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

            {candidateAuthError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs text-left rounded-2xl font-bold font-sans">
                {candidateAuthError}
              </div>
            )}

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2 text-xs font-sans">
              <p className="font-semibold text-slate-600"><strong className="text-slate-800">CBT Exam:</strong> {selectedCBTExam.title}</p>
              <p className="font-semibold text-slate-600"><strong className="text-slate-800">Subject:</strong> {selectedCBTExam.subject} ({selectedCBTExam.level})</p>
              <p className="font-semibold text-slate-600"><strong className="text-slate-800">Duration:</strong> {selectedCBTExam.duration} Minutes</p>
              <p className="font-bold text-indigo-600 p-1 bg-indigo-50/50 rounded-lg text-[10px] uppercase tracking-wider block text-center">CBT Standard Taking Fee: ₦50 Direct Debit</p>
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-sm"
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
              Secure CBT Engine by Swiftstudy
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

  // A: COMPLETELY SEPARATE ADMIN PORTAL ROUTE LAYOUT (/admin)
  if (isAdminRoute) {
    // If logged in as admin already, render Admin Portal
    if (currentUser && currentUser.role === 'admin') {
      return (
        <div className="min-h-screen flex flex-col bg-slate-900">
          <div className="bg-slate-950 border-b border-indigo-950 px-6 py-3 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-xs">
                <span className="text-slate-400">Authenticated Admin: </span>
                <strong className="text-emerald-400">{currentUser.name}</strong>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs font-bold transition cursor-pointer"
            >
              Exit System
            </button>
          </div>
          <div className="flex-grow flex flex-col">
            <AdminDashboard user={currentUser} onLogout={handleLogout} />
          </div>
          <FloatingSupportChat />
        </div>
      );
    }

    // Otherwise, Render completely isolated Secure Admin Login Portal
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl border border-indigo-950/60 shadow-2xl relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold text-2xl shadow-lg relative mb-2">
              S
            </span>
            <h1 className="text-2xl font-black text-white font-sans tracking-tight">Admin Portal Secure Entrance</h1>
            <p className="text-xs text-slate-400 font-medium">
              Only authorized personnel can access the administrator settings board.
            </p>
          </div>

          {adminError && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs rounded-2xl font-bold font-sans">
              {adminError}
            </div>
          )}

          <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Admin Email Address</label>
              <input
                type="email"
                required
                placeholder="e.g. administrator@swiftstudy.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full bg-slate-950/50 border border-indigo-950/60 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-medium"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Admin Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full bg-slate-950/50 border border-indigo-950/60 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={adminLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs rounded-xl transition uppercase tracking-wider cursor-pointer shadow-lg"
            >
              {adminLoading ? 'Authenticating access clearance...' : 'Authenticate Admin Access'}
            </button>
          </form>

          <div className="text-center pt-2">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setIsAdminRoute(false);
                window.location.hash = '';
              }}
              className="text-xs font-bold text-slate-400 hover:text-indigo-400 transition"
            >
              ← Cancel and Return to Swiftstudy homepage
            </a>
          </div>
        </div>
      </div>
    );
  }

  // B: STUDENT & TEACHER COMPLETED SECURE SESSIONS
  if (currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-indigo-500 selection:text-white">
        {/* Simple & Clean Status Header representing correct Persona */}
        <div className="bg-slate-900 border-b border-slate-950 text-slate-100 px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-black text-md">
              S
            </span>
            <div className="text-xs">
              <span className="text-slate-400 font-medium font-sans">User: </span>
              <strong className="text-white font-extrabold font-sans pr-1">{currentUser.name}</strong>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                {currentUser.role === 'teacher' ? 'Educator Portfolio' : 'Candidate Student'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {currentUser.regNumber && (
              <span className="text-slate-400 text-xs font-mono font-bold tracking-wider uppercase">
                ID: {currentUser.regNumber}
              </span>
            )}
            <div className="h-4 w-[1px] bg-slate-700 hidden md:block" />
            <div className="text-xs text-indigo-400 font-bold bg-indigo-950/40 px-3 py-1 rounded-lg border border-indigo-900/60 flex items-center gap-1.5 font-mono">
              💳 Bal: ₦{(currentUser.walletBalance || 0).toLocaleString()}
            </div>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="flex-grow flex flex-col">
          {currentUser.role === 'teacher' ? (
            <TeacherDashboard
              user={currentUser}
              onLogout={handleLogout}
            />
          ) : (
            <StudentDashboard
              user={currentUser}
              onLogout={handleLogout}
              onTakeExam={(exam) => setSelectedCBTExam(exam)}
            />
          )}
        </div>
        
        <FloatingSupportChat />
      </div>
    );
  }

  // C: PUBLIC HOMEPAGE & UNIFIED MODAL DIALOGS
  return (
    <>
      <LandingPage
        onGetStarted={() => {
          setAuthTab('register');
          setShowAuthModal(true);
        }}
        onLoginClick={() => {
          setAuthTab('login');
          setShowAuthModal(true);
        }}
        onSelectExam={(exam) => setSelectedCBTExam(exam)}
      />

      {/* Dynamic Unified Student / Teacher Access portal Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-sans">
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {authTab === 'login' ? 'Portal Account Sign-In' : 'Join academic profile'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {authTab === 'login' ? 'Returning candidate or educator entrance' : 'Swiftstudy registration workspace'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthError('');
                  setAuthSuccess('');
                }}
                className="p-1.5 hover:bg-slate-200/60 rounded-full text-slate-450 hover:text-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[80vh] space-y-6">
              
              {/* Errors Display */}
              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-250 text-rose-700 text-xs rounded-2xl font-bold">
                  {authError}
                </div>
              )}
              {authSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-700 text-xs rounded-2xl font-bold">
                  {authSuccess}
                </div>
              )}

              {/* REGISTER SUB-VIEW ROLE SECTION */}
              {authTab === 'register' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-3">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">
                    Choose Your Account Profile Type
                  </span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRegisterRole('student')}
                      className={`p-3 rounded-xl border text-left transition relative cursor-pointer ${
                        registerRole === 'student'
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-950 ring-2 ring-indigo-500/10'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <input
                          type="radio"
                          name="profile_role"
                          checked={registerRole === 'student'}
                          onChange={() => setRegisterRole('student')}
                          className="accent-indigo-600"
                        />
                        <span className="text-xs font-black">Student</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium leading-tight">Access assignments, CBT exams, syllabus items, report sheets</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegisterRole('teacher')}
                      className={`p-3 rounded-xl border text-left transition relative cursor-pointer ${
                        registerRole === 'teacher'
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-950 ring-2 ring-indigo-500/10'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <input
                          type="radio"
                          name="profile_role"
                          checked={registerRole === 'teacher'}
                          onChange={() => setRegisterRole('teacher')}
                          className="accent-indigo-600"
                        />
                        <span className="text-xs font-black">Teacher</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium leading-tight">Draft schemes, upload documents, generate questions & CBT</p>
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authTab === 'register' && (
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g., Jane Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1 text-left">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="e.g., student@swiftstudy.edu"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                {authTab === 'register' && (
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-750 hover:to-indigo-750 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl transition cursor-pointer shadow-md"
                  >
                    {authLoading ? (
                      'Processing profile requests...'
                    ) : authTab === 'login' ? (
                      'Login'
                    ) : registerRole === 'student' ? (
                      'Create Student Account'
                    ) : (
                      'Create Teacher Account'
                    )}
                  </button>
                </div>
              </form>

              {/* Auth helpers footer section */}
              <div className="flex flex-col gap-2.5 text-center text-xs text-slate-500 border-t border-slate-100 pt-4 font-semibold">
                {authTab === 'login' ? (
                  <>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-violet-600 hover:text-violet-850 transition block font-bold cursor-pointer"
                    >
                      Forgot Password
                    </button>
                    <p>
                      Already new to the community?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('register');
                          setAuthError('');
                          setAuthSuccess('');
                        }}
                        className="text-indigo-600 hover:text-indigo-850 underline transition font-extrabold cursor-pointer"
                      >
                        Create Account
                      </button>
                    </p>
                  </>
                ) : (
                  <p>
                    Returning to academic portal?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('login');
                        setAuthError('');
                        setAuthSuccess('');
                      }}
                      className="text-indigo-600 hover:text-indigo-850 underline transition font-extrabold cursor-pointer"
                    >
                      Login instead
                    </button>
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      <FloatingSupportChat />
    </>
  );
}
