import React, { useState, useEffect } from "react";
import { BookOpen, GraduationCap, Clock, Award, HelpCircle, ArrowRight, TrendingUp, Sparkles, LogOut, CheckCircle, ListTodo, FileText, Printer, Trophy, Sliders, Edit3, Volume2, FolderOpen, Flame, Play, Tv, UploadCloud, Check, Calendar, Layers } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { Exam, ExamResult, Question } from "../types";
import { renderFormattedMath } from "../lib/mathUtils";
import { VoiceInputButton } from "./VoiceInputButton";
import { speakText } from "../utils/tts";
import MyLibrary from "./MyLibrary";
import SchemeOfWorkDashboard from "./SchemeOfWorkDashboard";

interface StudentDashboardProps {
  user: any;
  onLogout: () => void;
  onTakeExam: (exam: Exam) => void;
}

export default function StudentDashboard({ user, onLogout, onTakeExam }: StudentDashboardProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [activeTab, setActiveTab] = useState<"exams" | "report_card" | "results" | "practice" | "notifications" | "library" | "scheme">("exams");
  const [loading, setLoading] = useState(false);
  const [reportSheets, setReportSheets] = useState<any[]>([]);
  const [localSelectedTerm, setLocalSelectedTerm] = useState("First Term");
  const [localCumulative, setLocalCumulative] = useState(false);
  const [isPlayingPracticeTTS, setIsPlayingPracticeTTS] = useState(false);
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);
  
  // Quick Join Assigned CBT state
  const [examJoinInput, setExamJoinInput] = useState("");
  const [joinError, setJoinError] = useState("");

  // Advanced Educational Portals State
  const [activeLearningTab, setActiveLearningTab] = useState<"videos" | "materials" | "assignments">("videos");
  const [studyStreak, setStudyStreak] = useState(5);
  const [showStreakModal, setShowStreakModal] = useState(false);
  
  // Custom mock video tutorials list
  const [videoLessons, setVideoLessons] = useState([
    {
      id: "vid_1",
      title: "Quadratic Equations & Parabolic Graphs Mastery",
      subject: "Mathematics",
      instructor: "Nwaigbo Augustine",
      duration: "14 mins 30 secs",
      url: "https://www.w3schools.com/html/mov_bbb.mp4",
      isPlaying: false,
    },
    {
      id: "vid_2",
      title: "Boyle's and Charles' Gas Laws - Practical Calculus",
      subject: "Physics",
      instructor: "Dr. Charles Obi",
      duration: "18 mins 15 secs",
      url: "https://www.w3schools.com/html/movie.mp4",
      isPlaying: false,
    },
    {
      id: "vid_3",
      title: "Electron Configuration & Quantum Orbit shells",
      subject: "Chemistry",
      instructor: "Professor Helen George",
      duration: "22 mins 10 secs",
      url: "https://www.w3schools.com/html/mov_bbb.mp4",
      isPlaying: false,
    }
  ]);

  // Downloadable syllabus textbooks & Study materials
  const [studyMaterials, setStudyMaterials] = useState([
    {
      id: "mat_1",
      title: "Grade 10 Algebra & Polynomial Equations Masterclass Book.pdf",
      subject: "Mathematics",
      fileSize: "4.8 MB",
      downloads: 612,
      isPremium: false,
    },
    {
      id: "mat_2",
      title: "Boyle's Law & Kinetic Energy revision worksheet.docx",
      subject: "Physics",
      fileSize: "1.2 MB",
      downloads: 403,
      isPremium: false,
    },
    {
      id: "mat_3",
      title: "IUPAC Organic Chemistry Nomenclature Workbook 2026.pdf",
      subject: "Chemistry",
      fileSize: "3.5 MB",
      downloads: 295,
      isPremium: true,
    }
  ]);

  // Interactive Homework Assignment submissions portal
  const [assignments, setAssignments] = useState([
    {
      id: "asg_1",
      title: "Algebraic Factorization Assignment 4",
      subject: "Mathematics",
      dueDate: "2026-06-15",
      status: "Unsubmitted",
      grade: null as string | null,
    },
    {
      id: "asg_2",
      title: "Thermodynamics & Kinetic Heat Computation Practice",
      subject: "Physics",
      dueDate: "2026-06-18",
      status: "Graded",
      grade: "A (92/100)",
      feedback: "Brilliant calculations on temperature scale constants!",
    },
    {
      id: "asg_3",
      title: "Balancing Redox chemical equations in acidic solutions",
      subject: "Chemistry",
      dueDate: "2026-06-21",
      status: "Pending",
      grade: null as string | null,
    }
  ]);

  const [selectedAsgId, setSelectedAsgId] = useState("asg_1");
  const [asgAnswerText, setAsgAnswerText] = useState("");
  const [asgAttachedFile, setAsgAttachedFile] = useState<File | null>(null);
  const [asgSubmitStatus, setAsgSubmitStatus] = useState("");

  const handleJoinExamDirect = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");
    const input = examJoinInput.trim();
    if (!input) return;

    let examId = input;
    // Extract examId from query format if a full link was pasted
    if (input.includes("examId=")) {
      const parts = input.split("examId=");
      if (parts.length > 1) {
        examId = parts[1].split("&")[0];
      }
    } else if (input.includes("#/exam/")) {
      const parts = input.split("#/exam/");
      if (parts.length > 1) {
        examId = parts[1];
      }
    }

    const match = allExams.find(
      (ex) => ex.id.toLowerCase() === examId.toLowerCase() || ex.title.toLowerCase().includes(examId.toLowerCase())
    );

    if (match) {
      onTakeExam(match);
      setExamJoinInput("");
    } else {
      setJoinError("Unable to locate CBT assessment. Please check your exam link or code.");
    }
  };

  // High-fidelity print/Save PDF engine for students running in secure frames
  const handlePrintPDF = (elementId: string, docTitle: string = "Document", isLandscape: boolean = false) => {
    const element = document.getElementById(elementId);
    if (!element) {
      alert("Printable element not found!");
      return;
    }

    // Create a print-specific style element to hide everything except our target printable element
    const styleNode = document.createElement("style");
    styleNode.id = "print-utility-override";
    styleNode.innerHTML = `
      @media print {
        body {
          background: white !important;
          color: black !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        #root, #root > * {
          display: none !important;
        }
        body > * {
          display: none !important;
        }
        #${elementId}-print-container {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          visibility: visible !important;
          background: white !important;
          color: black !important;
        }
        @page {
          size: A4 ${isLandscape ? "landscape" : "portrait"};
          margin: 10mm;
        }
      }
    `;
    document.head.appendChild(styleNode);

    // Clone element to prevent losing React state or unmounting parent widgets
    const cloned = element.cloneNode(true) as HTMLElement;
    const printContainer = document.createElement("div");
    printContainer.id = `${elementId}-print-container`;
    printContainer.className = "print-only-container";
    printContainer.appendChild(cloned);
    
    // Inject at body level during print
    document.body.appendChild(printContainer);

    const originalTitle = document.title;
    document.title = docTitle;

    // Trigger standard browser native print
    try {
      window.print();
    } catch (e) {
      console.warn("Print trigger blocked or failed:", e);
      alert("Your browser security blocked direct printing. Please open this app in a New Tab to print flawlessly.");
    }

    // Cleanup style and container shortly after print triggers
    setTimeout(() => {
      document.title = originalTitle;
      styleNode.remove();
      printContainer.remove();
    }, 1500);
  };

  // Direct, offline client-side PDF downloads using high-fidelity native system print-to-PDF
  const handleDownloadPDFDirectly = (elementId: string, filename: string = "Document", isLandscape: boolean = false) => {
    const element = document.getElementById(elementId);
    if (!element) {
      alert("Element to download not found!");
      return;
    }
    // Inform user how to download beautifully
    alert(`To download "${filename}" in A4 PDF format:\n\n1. In the print window that opens, set your Printer/Destination to "Save as PDF" (or "Save to Files").\n2. Click "Save" to download.`);
    handlePrintPDF(elementId, filename, isLandscape);
  };

  // Dynamic Certificate Generation & High-fidelity Print/Download
  const handlePrintPassCertificate = (resItem: any) => {
    // Inform user how to download beautifully
    alert(`To download standard A4 PDF certificate:\n\n1. In the print window that opens, set Printer/Destination to "Save as PDF" (or "Save to Files").\n2. Set Layout to "Landscape".\n3. Click "Save" to download.`);

    const tempDiv = document.createElement("div");
    tempDiv.id = "temp-pass-certificate-container";
    
    // Inject the elegant styles and certificate frame inside the temporary element
    tempDiv.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap');
        
        #temp-pass-certificate-container {
          box-sizing: border-box !important;
          background-color: white !important;
          padding: 10mm !important;
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: 'Inter', sans-serif !important;
          min-height: 180mm !important;
        }
        
        .certificate-frame {
          border: 8px double #d97706 !important;
          padding: 40px !important;
          background-color: #fefaf0 !important;
          text-align: center !important;
          border-radius: 12px !important;
          box-sizing: border-box !important;
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          box-shadow: none !important;
          position: relative;
        }
        
        .cert-title {
          font-family: 'Playfair Display', serif !important;
          font-style: italic !important;
          font-size: 32pt !important;
          color: #78350f !important;
          margin: 10px 0 20px 0 !important;
          font-weight: 950;
        }
        
        .cert-sub {
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-size: 11pt;
          color: #b45309;
          font-weight: 800;
          margin-top: 10px;
        }
        
        .student-name {
          font-family: 'Playfair Display', serif;
          font-size: 30pt;
          font-weight: bold;
          color: #1e3a8a;
          margin: 15px auto;
          border-bottom: 2px solid #e2e8f0;
          display: inline-block;
          padding-bottom: 5px;
          min-width: 400px;
        }
        
        .cert-text {
          font-size: 12pt;
          color: #475569;
          line-height: 1.6;
          margin: 15px auto;
          max-width: 650px;
        }
        
        .highlight {
          font-weight: bold;
          color: #1e293b;
        }
        
        .footer-grid {
          display: flex;
          justify-content: space-between;
          margin-top: 30px;
          padding: 0 50px 10px 50px;
          font-size: 10pt;
          color: #64748b;
        }
        
        .signature {
          border-top: 1px dashed #cbd5e1;
          padding-top: 5px;
          width: 180px;
          font-weight: bold;
        }
      </style>
      <div class="certificate-frame">
        <div class="cert-sub">Honorary Certificate of Performance</div>
        <div class="cert-title">CBT Assessment Excellence</div>
        <div class="cert-text">This document proudly certifies that</div>
        <div class="student-name">${user.name}</div>
        <div class="cert-text">
          has successfully compiled and passed the national CBT term curriculum examination for
          <br />
          <strong class="highlight">${resItem.examTitle}</strong>
          with an outstanding score of <strong class="highlight" style="color: #10b981; font-size: 14pt;">${resItem.percentage}%</strong>,
          answering <strong class="highlight">${resItem.correctAnswers} out of ${resItem.totalQuestions}</strong> questions correctly to satisfy term requirements.
        </div>
        <div class="footer-grid">
          <div style="text-align: left;">
            <div style="font-weight: bold; color: #1e293b;">${new Date(resItem.date).toLocaleDateString()}</div>
            <div style="margin-top: 4px;">Issued Date</div>
          </div>
          <div class="signature">
            <div style="color: #1e293b;">Verified System</div>
            <div style="margin-top: 4px; font-weight: normal; color: #64748b;">Registrar General</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(tempDiv);
    handlePrintPDF("temp-pass-certificate-container", `CBT Certificate - ${resItem.examTitle}`, true);
    
    // Clean up temporary container after some delay to let print setup finish cloning
    setTimeout(() => {
      try {
        tempDiv.remove();
      } catch (e) {}
    }, 5000);
  };
  
  // Quick AI Practice State
  const [practiceSubject, setPracticeSubject] = useState("Mathematics");
  const [practiceTopic, setPracticeTopic] = useState("");
  const [practiceCount, setPracticeCount] = useState(5);
  const [practiceIntro, setPracticeIntro] = useState(true);
  const [isCustomCount, setIsCustomCount] = useState(false);
  const [generatingPractice, setGeneratingPractice] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<Question[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<{ [key: number]: 'A' | 'B' | 'C' | 'D' }>({});
  const [practiceCompleted, setPracticeCompleted] = useState(false);
  const [practiceScore, setPracticeScore] = useState(0);
  const [subjects, setSubjects] = useState<string[]>([]);

  const [notifications, setNotifications] = useState<any[]>([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // 1. Fetch publish exams
      const examRes = await fetch("/api/exams");
      const examData = await examRes.json();
      if (examRes.ok) {
        const raw = examData.exams || [];
        setAllExams(raw);
        // Only show published exams on standard search listings
        setExams(raw.filter((e: Exam) => e.isPublished));
      }

      // 2. Fetch results
      const resRes = await fetch(`/api/results/student/${user.id}`);
      const resData = await resRes.json();
      if (resRes.ok) {
        setResults(resData.results || []);
      }

      // 3. Fetch notifications
      const notifRes = await fetch(`/api/notifications/user/${user.id}`);
      const notifData = await notifRes.json();
      if (notifRes.ok) {
        setNotifications(notifData.notifications || []);
      }

      // 4. Fetch terminal report cards
      try {
        const reportRes = await fetch("/api/report-sheets");
        const reportData = await reportRes.json();
        if (reportRes.ok && reportData.reportSheets) {
          setReportSheets(reportData.reportSheets);
        }
      } catch (err) {
        console.error("Report sheets fetching error:", err);
      }

      // 5. Fetch subjects list
      try {
        const subRes = await fetch("/api/subjects");
        const subData = await subRes.json();
        if (subRes.ok && subData.subjects) {
          setSubjects(subData.subjects);
        }
      } catch (err) {
        console.error("Subjects list fetching error:", err);
      }
    } catch (err) {
      console.error("Failed to load student dashboard info:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleGeneratePractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceTopic.trim()) {
      alert("Please provide a topic descriptor for practice questions!");
      return;
    }
    setGeneratingPractice(true);
    setPracticeQuestions([]);
    setPracticeIndex(0);
    setPracticeAnswers({});
    setPracticeCompleted(false);

    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: practiceSubject,
          topic: practiceTopic,
          classLevel: user.classLevel || "Grade 1",
          count: practiceCount,
          difficulty: "Medium",
        }),
      });

      const data = await res.json();
      if (res.ok && data.questions) {
        setPracticeQuestions(data.questions);
        setPracticeIntro(false);
      } else {
        alert(data.error || "Failed using Google engines to compute questions. Try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed connecting to AI generator backend. Please retry.");
    } finally {
      setGeneratingPractice(false);
    }
  };

  const submitPracticeAnswers = () => {
    let score = 0;
    practiceQuestions.forEach((q, idx) => {
      if (practiceAnswers[idx] === q.correctAnswer) {
        score++;
      }
    });
    setPracticeScore(score);
    setPracticeCompleted(true);
  };

  // Compile subject chart data
  const chartData = results.map((r) => ({
    name: r.examTitle.substring(0, 15) + "...",
    Score: r.percentage,
    Correct: r.correctAnswers,
  }));

  const filteredExams = exams.filter(
    (e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full font-sans bg-slate-50 text-slate-800">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-indigo-900 text-white flex flex-col shrink-0 border-b md:border-b-0 md:border-r border-indigo-950">
        
        {/* Brand Container */}
        <div className="p-6 flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-cyan-400 to-indigo-505 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 bg-indigo-500">
            <span className="text-2xl font-bold font-sans">B</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-white font-sans">Brain</span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1">
          {[
            { id: "exams", label: "Take CBT exams", icon: <GraduationCap className="w-4 h-4" /> },
            { id: "report_card", label: "My Term report card", icon: <FileText className="w-4 h-4" /> },
            { id: "results", label: "Scores and reports", icon: <TrendingUp className="w-4 h-4" /> },
            { id: "practice", label: "Study revision", icon: <Sparkles className="w-4 h-4" /> },
            { id: "scheme", label: "Scheme of Work", icon: <Layers className="w-4 h-4" /> },
            { id: "library", label: "My Library Portal", icon: <FolderOpen className="w-4 h-4" /> },
            { id: "notifications", label: "Alert", icon: <CheckCircle className="w-4 h-4" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const unreadCount = tab.id === "notifications" ? notifications.filter((n) => !n.read).length : 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-xs font-bold transition text-left cursor-pointer ${
                  isActive
                    ? "bg-indigo-805 bg-indigo-800 text-white"
                    : "text-indigo-300 hover:bg-indigo-850 hover:bg-indigo-800 hover:text-white"
                }`}
              >
                <span className={isActive ? "text-cyan-400" : "text-indigo-300"}>{tab.icon}</span>
                <span className="flex-1">{tab.label}</span>
                {unreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full mr-2">
                    {unreadCount}
                  </span>
                )}
                {isActive && <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* Quick summary box in side-rail */}
        <div className="p-6 border-t border-indigo-950/45">
          <div className="bg-indigo-800/50 rounded-2xl p-4 border border-indigo-700/50">
            <div className="text-[10px] text-indigo-300 uppercase font-black tracking-wider mb-1">Pass Ratio</div>
            <div className="text-xl font-bold text-white">
              {results.length > 0
                ? `${Math.round((results.filter(r => r.percentage >= 50).length / results.length) * 100)}%`
                : "0%"}
            </div>
            <div className="text-[9px] text-indigo-400 font-semibold mt-1">
              Average Grade: {results.length > 0
                ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
                : 0}%
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Iframe Hint Banner */}
        {isIframe && (
          <div className="bg-indigo-600 text-white px-6 py-2.5 flex items-center justify-between text-xs font-semibold shrink-0 shadow-sm transition-all duration-300">
            <span className="flex items-center gap-1.5 leading-tight">
              <span className="text-sm font-sans">💡</span>
              <span>Running inside the preview window? For flawless hardware printing, A4 PDF downloads, and microphone voice control, open the app natively in a new browser tab.</span>
            </span>
            <button
              onClick={() => window.open(window.location.href, "_blank")}
              className="bg-white text-indigo-700 hover:bg-slate-100 font-bold px-3 py-1 rounded-md cursor-pointer transition text-[11px] whitespace-nowrap shrink-0 border-none ml-3"
            >
              Open in New Tab
            </button>
          </div>
        )}
        
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-6 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <div className="bg-slate-100 px-4 py-2 rounded-lg text-xs font-semibold text-slate-500">
              ⚡ Student Dashboard
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-sm font-bold text-slate-900">{user.name}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Active Student</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center font-bold text-indigo-800 text-base">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={onLogout}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Page Content Container */}
        <div className="flex-grow p-6 md:p-8 space-y-6 overflow-y-auto">
          <div className="flex items-end justify-between border-b border-slate-100 pb-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {activeTab === "exams" && "Take CBT exams"}
                {activeTab === "report_card" && "My Terminal report card"}
                {activeTab === "results" && "Scores and reports"}
                {activeTab === "practice" && "Study revision"}
                {activeTab === "scheme" && "Curriculum Scheme of Work"}
                {activeTab === "library" && "My Personal Library"}
                {activeTab === "notifications" && "Alert"}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {activeTab === "exams" && "Prepare or join ongoing published timed computer-based tests."}
                {activeTab === "report_card" && "View your official terminal results, cognitive rankings, and printed progress sheets."}
                {activeTab === "results" && "Track performance grades, subject progressions, and print certificates."}
                {activeTab === "practice" && "Generate custom revision drills directly for self-study revision drills. Note: Only educators can create/publish official CBT exams."}
                {activeTab === "scheme" && "Read terminal subjects outlines, study lesson notes, download worksheets and track weekly homework tasks."}
                {activeTab === "library" && "Persistent database of all your class notes, custom worksheets, exam study modules, and resources."}
                {activeTab === "notifications" && "Check updates, invitations, and alerts sent from your educators."}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === "exams" && (
                <motion.div
                  key="exams"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* =======================================================
                       ADVANCED STUDENT DASHBOARD: INTEGRATED OVERVIEW SUITE
                     ======================================================= */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Column 1: Study Streak & Achievements Badges */}
                    <div className="p-6 bg-white border border-slate-150 rounded-3xl shadow-xs space-y-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Streak & Level Badges</h3>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-black uppercase">Level 1 Scholar</span>
                      </div>

                      {/* Spark Flame Streak Card */}
                      <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-white space-y-2 shadow-sm relative overflow-hidden">
                        <div className="absolute right-2 bottom-0 text-white/10 font-black text-6xl pointer-events-none -z-1 font-sans">
                          STREAK
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Flame className="w-6 h-6 text-white animate-pulse" />
                          <span className="text-lg font-black">{studyStreak} Days Study Streak!</span>
                        </div>
                        <p className="text-[11px] text-amber-50 leading-snug">
                          You are doing incredibly well! Keep up your daily review drills to earn the Habit Titan badge.
                        </p>
                        
                        {/* Interactive daily tasks checklist */}
                        <div className="pt-3 border-t border-white/25 mt-2 space-y-1.5 text-[10px] font-bold">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="rounded border-none accent-orange-700" />
                            <span>Complete Today's Review Drill</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="rounded border-none accent-orange-700" />
                            <span>Read Chemistry Nomenclature Notes</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" className="rounded border-none accent-orange-700" />
                            <span>Watch 'Quadratic Equations' Video lesson</span>
                          </div>
                        </div>
                      </div>

                      {/* Badges Grid */}
                      <div className="space-y-2">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">Earned Achievement Badges</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-2 bg-slate-50 border border-slate-150 rounded-xl text-center flex flex-col items-center justify-center">
                            <span className="text-lg mb-1 leading-none">🧠</span>
                            <span className="text-[9px] font-black leading-none block text-slate-800">Cognitive Champion</span>
                          </div>
                          <div className="p-2 bg-indigo-50 border border-indigo-150 rounded-xl text-center flex flex-col items-center justify-center">
                            <span className="text-lg mb-1 leading-none">🔥</span>
                            <span className="text-[9px] font-black leading-none block text-indigo-900">Habit Titan</span>
                          </div>
                          <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-center flex flex-col items-center justify-center">
                            <span className="text-lg mb-1 leading-none">📘</span>
                            <span className="text-[9px] font-black leading-none block text-amber-900">Syllabus Crusher</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 2 & 3: Performance Trend Score Chart */}
                    <div className="lg:col-span-2 p-6 bg-white border border-slate-150 rounded-3xl shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Progress Overview</h4>
                          <span className="text-sm font-black text-slate-800">Your Recent CBT Scores Comparison</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-450 uppercase block font-black">AVERAGE COMPILATION</span>
                          <span className="text-base font-black text-indigo-600">
                            {results.length > 0
                              ? `${Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)}%`
                              : "0%"}
                          </span>
                        </div>
                      </div>

                      {/* Performance Plot Recharts Area */}
                      <div className="h-44 w-full">
                        {results.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-1 leading-none">
                            <TrendingUp className="w-8 h-8 text-slate-350" />
                            <span>No tests taken yet. Completed CBT scores will map here.</span>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} stroke="#cbd5e1" />
                              <YAxis tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} domain={[0, 100]} stroke="#cbd5e1" />
                              <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                              <Bar dataKey="Score" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={34} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* =======================================================
                       ADVANCED LEARNING FEATURES CENTER (VIDEO, EXITS, SUBMIT)
                     ======================================================= */}
                  <div className="p-6 bg-white border border-slate-150 rounded-3xl shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest text-indigo-650 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-indigo-600" />
                          Academic Learning & Study Portal
                        </h3>
                        <p className="text-[11px] text-slate-450 font-bold mt-0.5">Access video tutorials, upload study materials or notes, and submit homework assignments.</p>
                      </div>

                      {/* Tab buttons switcher */}
                      <div className="flex bg-slate-55 bg-slate-100 p-1 rounded-xl">
                        {[
                          { id: "videos" as const, label: "Video Tutorials", icon: <Tv className="w-3.5 h-3.5" /> },
                          { id: "materials" as const, label: "Study Textbooks & Note upload", icon: <UploadCloud className="w-3.5 h-3.5" /> },
                          { id: "assignments" as const, label: "Homework Submissions", icon: <Calendar className="w-3.5 h-3.5" /> }
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setActiveLearningTab(t.id)}
                            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg text-xs font-bold transition cursor-pointer border-none ${
                              activeLearningTab === t.id
                                ? "bg-white text-indigo-950 shadow-xs"
                                : "text-slate-500 hover:text-slate-900"
                            }`}
                          >
                            {t.icon}
                            <span>{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <AnimatePresence mode="wait">
                        
                        {/* TAB A: PLAYABLE VIDEO LECTURES */}
                        {activeLearningTab === "videos" && (
                          <motion.div
                            key="videos"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-1 md:grid-cols-3 gap-6"
                          >
                            {videoLessons.map((vid) => (
                              <div key={vid.id} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
                                {/* Simulated player block */}
                                <div className="aspect-video bg-slate-950 flex flex-col items-center justify-center relative group">
                                  {vid.isPlaying ? (
                                    <video
                                      src={vid.url}
                                      controls
                                      autoPlay
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <>
                                      <img 
                                        src={vid.thumbnail} 
                                        alt={vid.title} 
                                        className="w-full h-full object-cover opacity-60 group-hover:scale-102 transition duration-300" 
                                      />
                                      <button
                                        onClick={() => {
                                          setVideoLessons(prev => prev.map(v => v.id === vid.id ? { ...v, isPlaying: true } : { ...v, isPlaying: false }));
                                        }}
                                        className="absolute w-12 h-12 bg-indigo-650 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition cursor-pointer border-none"
                                      >
                                        <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                                      </button>
                                      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                                        {vid.duration}
                                      </span>
                                    </>
                                  )}
                                </div>

                                <div className="p-4 space-y-1">
                                  <span className="text-[10px] bg-indigo-100 text-indigo-700 rounded-md py-0.5 px-2 font-black uppercase tracking-wider">
                                    {vid.subject}
                                  </span>
                                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 line-clamp-2 pt-1">{vid.title}</h4>
                                  <p className="text-[10px] text-slate-400 font-semibold pt-1">Instructor: {vid.instructor}</p>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}

                        {/* TAB B: NOTES & STUDY MATERIALS UPLOAD */}
                        {activeLearningTab === "materials" && (
                          <motion.div
                            key="materials"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              
                              {/* Left sidebar: Notes drag-and-drop file uploader */}
                              <div className="p-5 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center space-y-3 flex flex-col items-center justify-center min-h-[160px]">
                                <UploadCloud className="w-10 h-10 text-indigo-500 animate-bounce" />
                                <div>
                                  <h5 className="text-xs font-black text-slate-800">Upload Personal Study Notes</h5>
                                  <p className="text-[10px] text-slate-500 leading-normal max-w-[240px] mt-0.5">Select a file (PDF, DOCX, PNG) from your device to save to your cloud portal folder.</p>
                                </div>
                                <label className="inline-block py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-xl cursor-pointer shadow-xs transition">
                                  Choose File
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const newMat = {
                                          id: "mat_" + Math.random().toString(36).substring(2, 9),
                                          title: file.name,
                                          subject: "Self Uploaded Notes",
                                          fileSize: (file.size / (1024 * 1024)).toFixed(2) + " MB",
                                          downloads: 0,
                                          isPremium: false
                                        };
                                        setStudyMaterials(p => [newMat, ...p]);
                                        alert(`🎉 File "${file.name}" uploaded successfully! Added to study resources workbook.`);
                                      }
                                    }}
                                  />
                                </label>
                              </div>

                              {/* Right column: Current study materials list */}
                              <div className="space-y-3">
                                <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">Available Library Study Guides</span>
                                {studyMaterials.map((mat) => (
                                  <div key={mat.id} className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between gap-4 transition">
                                    <div className="text-xs space-y-0.5 max-w-[70%]">
                                      <h5 className="font-extrabold text-slate-800 truncate">{mat.title}</h5>
                                      <p className="text-[10px] text-indigo-600 font-bold block">{mat.subject} • {mat.fileSize}</p>
                                    </div>
                                    <button
                                      onClick={() => {
                                        alert(`📥 Commencing secure browser download: ${mat.title}. Check downloads folder.`);
                                        setStudyMaterials(p => p.map(docItem => docItem.id === mat.id ? { ...docItem, downloads: docItem.downloads + 1 } : docItem));
                                      }}
                                      className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                    >
                                      Download ({mat.downloads})
                                    </button>
                                  </div>
                                ))}
                              </div>

                            </div>
                          </motion.div>
                        )}

                        {/* TAB C: HOMEWORK ASSIGNMENT SUBMISSIONS */}
                        {activeLearningTab === "assignments" && (
                          <motion.div
                            key="assignments"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-6"
                          >
                            {/* Homework checklist left panel */}
                            <div className="space-y-3 leading-none">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">Assigned Homework Assignments</span>
                              {assignments.map((asg) => {
                                let badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
                                if (asg.status === "Graded") {
                                  badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                } else if (asg.status === "Pending") {
                                  badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-200";
                                }

                                return (
                                  <div 
                                    key={asg.id} 
                                    onClick={() => {
                                      if (asg.status === "Unsubmitted") {
                                        setSelectedAsgId(asg.id);
                                        setAsgSubmitStatus("");
                                      } else {
                                        alert(`Assignment is already state: "${asg.status}". Cannot rewrite completed submission.`);
                                      }
                                    }}
                                    className={`p-3.5 border rounded-xl flex flex-col gap-2.5 transition cursor-pointer ${
                                      selectedAsgId === asg.id && asg.status === "Unsubmitted"
                                        ? "bg-indigo-55 bg-indigo-50/50 border-indigo-400"
                                        : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] bg-slate-200 py-0.5 px-2 rounded-md font-extrabold text-slate-700">
                                        {asg.subject}
                                      </span>
                                      <span className={`text-[9px] uppercase font-black border tracking-wider rounded-md py-0.5 px-2 ${badgeColor}`}>
                                        {asg.status}
                                      </span>
                                    </div>
                                    <h5 className="text-xs sm:text-sm font-black text-slate-800 mt-1 leading-snug">{asg.title}</h5>
                                    <p className="text-[10px] text-slate-450 font-semibold">Due: {asg.dueDate}</p>
                                    
                                    {asg.grade && (
                                      <div className="p-2.5 bg-emerald-50 text-emerald-900 border border-emerald-150 rounded-lg text-xs leading-normal">
                                        <p className="font-extrabold">Final Grade achieved: {asg.grade}</p>
                                        <p className="text-[10px] text-emerald-800 italic mt-0.5">Teacher Feedback: {asg.feedback}</p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Submissions interactive form right panel */}
                            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                              <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                                <Edit3 className="w-4 h-4 text-indigo-600" />
                                Homework Submit Console
                              </h5>
                              
                              <div className="space-y-1">
                                <span className="text-[11px] text-slate-400 block font-bold">Selected Assignment Target:</span>
                                <strong className="text-xs text-indigo-700 font-extrabold block">
                                  {assignments.find(a => a.id === selectedAsgId)?.title || "Select homework task left"}
                                </strong>
                              </div>

                              <form 
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  if (!asgAnswerText.trim()) {
                                    alert("Please input your homework text answer first!");
                                    return;
                                  }
                                  
                                  setAsgSubmitStatus("compressing payload...");
                                  setTimeout(() => {
                                    setAssignments(prev => prev.map(a => a.id === selectedAsgId ? { ...a, status: "Pending" } : a));
                                    setAsgSubmitStatus("✅ Submitted! Waiting for academic scoring.");
                                    setAsgAnswerText("");
                                  }, 1500);
                                }}
                                className="space-y-3"
                              >
                                <div>
                                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Your Answers Summary:</label>
                                  <textarea
                                    required
                                    rows={4}
                                    value={asgAnswerText}
                                    placeholder="Paste or write your homework answers essay here..."
                                    onChange={(ev) => setAsgAnswerText(ev.target.value)}
                                    className="w-full p-3 text-xs bg-white border border-slate-250 rounded-xl focus:border-indigo-600 outline-none font-semibold"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] text-slate-500 font-bold block">Optional File attachment:</label>
                                  <input 
                                    type="file" 
                                    className="text-[11px] font-semibold text-slate-500 bg-white p-2 border border-slate-200 rounded-lg w-full" 
                                  />
                                </div>

                                <button
                                  type="submit"
                                  className="w-full py-2.5 bg-gradient-to-r from-indigo-650 to-indigo-800 text-white hover:from-indigo-700 hover:to-indigo-900 font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-indigo-100 cursor-pointer border-none"
                                >
                                  Submit Assignment
                                </button>
                              </form>

                              {asgSubmitStatus && (
                                <p className="text-xs p-2.5 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-150 font-bold mt-2">
                                  {asgSubmitStatus}
                                </p>
                              )}
                            </div>

                          </motion.div>
                        )}

                      </AnimatePresence>
                    </div>
                  </div>

                  {/* =======================================================
                       CLASSIC CBT JOIN & EXAMS INDEX RENDERINGS
                     ======================================================= */}
                  
                  {/* Join Assigned Exam Section */}
                  <div className="p-6 bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-3xl shadow-lg space-y-4">
                    <div>
                      <h3 className="text-base font-extrabold font-sans">Join Assigned CBT Exam</h3>
                      <p className="text-xs text-indigo-100 font-medium">Have an active exam link or code? Paste it here or enter the code to go straight to the exam.</p>
                    </div>

                    <form onSubmit={handleJoinExamDirect} className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-grow flex items-center">
                        <input
                          type="text"
                          required
                          placeholder="Paste exam link here (e.g., https://.../?examId=...) or insert Code"
                          value={examJoinInput}
                          onChange={(e) => setExamJoinInput(e.target.value)}
                          className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/60 rounded-xl py-3 pl-4 pr-12 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-300 transition"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                          <VoiceInputButton value={examJoinInput} onTranscript={setExamJoinInput} className="bg-white/10 text-white hover:bg-white/20" size="xs" />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="bg-cyan-400 hover:bg-cyan-500 text-slate-900 font-extrabold px-6 py-3 rounded-xl text-xs transition shadow-md whitespace-nowrap cursor-pointer border-none"
                      >
                        Start CBT Exam
                      </button>
                    </form>
                    {joinError && (
                      <p className="text-xs bg-rose-500/20 text-rose-200 p-2.5 rounded-lg border border-rose-500/30 font-medium font-sans">
                        ⚠️ {joinError}
                      </p>
                    )}
                  </div>

                  {/* Subject searching tool */}
                  <div className="p-6 bg-white border border-slate-150 rounded-3xl shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">Active Published CBT Exams</h3>
                        <p className="text-xs text-slate-500">Select any ongoing test to enter into the timed testing block.</p>
                      </div>
                      <div className="relative flex items-center w-full sm:w-64">
                        <input
                          type="text"
                          placeholder="Search exam... (math, chemistry)"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl py-2 pl-3 pr-10 text-xs w-full focus:outline-none focus:border-indigo-600"
                        />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                          <VoiceInputButton value={searchQuery} onTranscript={setSearchQuery} size="xs" />
                        </div>
                      </div>
                    </div>

                    {filteredExams.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 space-y-3">
                        <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold leading-relaxed">No timed exams published matching search criteria.</p>
                        <p className="text-[10px] text-slate-400 max-w-sm mx-auto font-medium">Ask your educator or lecturer to publish standard CBT links using the School dashboard.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredExams.map((exam) => (
                          <div
                            key={exam.id}
                            className="p-5 bg-white border border-slate-100 rounded-3xl space-y-4 hover:border-indigo-300 transition hover:shadow-md"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] bg-indigo-50 text-indigo-750 py-0.5 px-2.5 rounded-full font-bold uppercase tracking-wide border border-indigo-100">
                                {exam.subject}
                              </span>
                              <span className="text-xs text-slate-400 font-mono font-bold">
                                ⏱ {exam.duration} Min
                              </span>
                            </div>

                            <div>
                              <h4 className="text-sm font-black text-slate-800 line-clamp-1">{exam.title}</h4>
                              <p className="text-[10px] text-slate-400 font-bold tracking-wide uppercase mt-0.5">Author: {exam.creatorName}</p>
                            </div>

                            <div className="flex items-center justify-between text-xs font-semibold pt-1">
                              <span className="text-slate-500">
                                {exam.questions.length} questions
                              </span>
                              <button
                                onClick={() => onTakeExam(exam)}
                                className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-md"
                              >
                                Join Timed Exam
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "report_card" && (
                <motion.div
                  key="report_card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Select Term */}
                  <div className="p-6 bg-white border border-slate-150 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <h3 className="text-base font-extrabold text-slate-900 font-sans">Official Terminal Progress Booklet</h3>
                      <p className="text-xs text-slate-500 font-medium">Toggle between terms or check your academic year cumulative sum.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Select View:</span>
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "Cumulative") {
                            setLocalCumulative(true);
                          } else {
                            setLocalCumulative(false);
                            setLocalSelectedTerm(val);
                          }
                        }}
                        className="bg-slate-50 border rounded-xl py-2 px-3 text-xs focus:outline-none font-bold text-slate-700"
                      >
                        <option value="First Term">First Term Report</option>
                        <option value="Second Term">Second Term Report</option>
                        <option value="Third Term">Third Term Report</option>
                        <option value="Cumulative">⭐ Year Cumulative Report</option>
                      </select>
                    </div>
                  </div>

                  {/* Render Local Cumulative or Standard Terminal Card */}
                  {localCumulative ? (
                    /* STUDENT PORTAL CUMULATIVE ACADEMIC YEAR REPORT */
                    <div id="student_cumulative_report_view" className="p-6 sm:p-8 bg-white border border-slate-150 rounded-3xl shadow-xs space-y-6">
                      <div className="border-b pb-4 text-center space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center">B</span>
                          <span className="text-xl font-black tracking-tight text-slate-950">Brain Academic Portal</span>
                        </div>
                        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight uppercase">Cumulative Academic Performance Ledger</h2>
                        <p className="text-xs text-slate-500 font-semibold font-sans">{user.name.toUpperCase()} • Comprehensive Annual Aggregation</p>
                      </div>

                      {(() => {
                        const myReports = reportSheets.filter(r => r.studentName.trim().toLowerCase() === user.name.trim().toLowerCase());
                        const uniqueSubjects = new Set<string>();
                        myReports.forEach(r => {
                          if (r.scores) Object.keys(r.scores).forEach(s => uniqueSubjects.add(s));
                        });

                        if (uniqueSubjects.size === 0) {
                          return (
                            <div className="p-10 text-center text-slate-400">
                              No academic terminal report sheets registered on database files for your student name yet to calculate cumulative totals.
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-6">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs font-semibold">
                                <thead>
                                  <tr className="border-b border-slate-200 text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                                    <th className="py-2">Subject Name</th>
                                    <th className="py-2">First Term</th>
                                    <th className="py-2">Second Term</th>
                                    <th className="py-2">Third Term</th>
                                    <th className="py-2">Aggregated Score</th>
                                    <th className="py-2">Yearly Average</th>
                                    <th className="py-2">Performance Grade</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Array.from(uniqueSubjects).map(subject => {
                                    const first = myReports.find(r => r.term === "First Term")?.scores?.[subject]?.total;
                                    const second = myReports.find(r => r.term === "Second Term")?.scores?.[subject]?.total;
                                    const third = myReports.find(r => r.term === "Third Term")?.scores?.[subject]?.total;

                                    const list = [first, second, third].filter(v => v !== undefined) as number[];
                                    const totalSum = list.reduce((a, b) => a + b, 0);
                                    const avg = list.length > 0 ? Math.round((totalSum / list.length) * 10) / 10 : 0;

                                    let finalGrade = "F";
                                    if (avg >= 75) finalGrade = "A (Excellent)";
                                    else if (avg >= 65) finalGrade = "B (Very Good)";
                                    else if (avg >= 50) finalGrade = "C (Good)";
                                    else if (avg >= 40) finalGrade = "D (Fair)";
                                    else finalGrade = "F (Improvement Required)";

                                    return (
                                      <tr key={subject} className="border-b border-slate-100 last:border-none font-medium text-slate-700">
                                        <td className="py-3 font-bold text-slate-800">{subject}</td>
                                        <td className="py-3 font-mono">{first !== undefined ? `${first}/100` : "-"}</td>
                                        <td className="py-3 font-mono">{second !== undefined ? `${second}/100` : "-"}</td>
                                        <td className="py-3 font-mono">{third !== undefined ? `${third}/100` : "-"}</td>
                                        <td className="py-3 font-mono font-bold text-slate-900">{totalSum}</td>
                                        <td className="py-3 font-mono font-bold text-indigo-600">{avg}%</td>
                                        <td className="py-3">
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            avg >= 65 ? "bg-emerald-50 text-emerald-700" :
                                            avg >= 50 ? "bg-blue-50 text-blue-700" :
                                            avg >= 40 ? "bg-amber-50 text-amber-700" :
                                            "bg-rose-50 text-rose-700"
                                          }`}>
                                            {finalGrade}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between text-xs font-bold gap-3 text-slate-500">
                              <p>Registration Number: <strong className="text-slate-800">{user.regNumber || "REG/2026/001"}</strong></p>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handlePrintPDF("student_cumulative_report_view", "Student Cumulative Academic Performance Ledger")}
                                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition cursor-pointer border-none flex items-center justify-center gap-1.5 font-bold"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  Print Directly
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadPDFDirectly("student_cumulative_report_view", "Student Cumulative Academic Performance Ledger")}
                                  className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition cursor-pointer border-none flex items-center justify-center gap-1.5 font-bold"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  Download PDF
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    /* TERMINAL PROGRESS REPORT CARD */
                    (() => {
                      const activeSheet = reportSheets.find(
                        r => r.studentName.trim().toLowerCase() === user.name.trim().toLowerCase() && r.term === localSelectedTerm
                      );

                      if (!activeSheet) {
                        return (
                          <div className="p-12 text-center bg-white border border-slate-150 rounded-3xl text-slate-400 space-y-2">
                            <FileText className="w-8 h-8 mx-auto text-slate-355" />
                            <p className="text-xs font-bold leading-relaxed">No report sheet uploaded on server for {localSelectedTerm} yet.</p>
                            <p className="text-[10px] text-slate-400 font-medium">Please ask Mr. Austin (Educator) or your teacher to compile/collated report booklet for {localSelectedTerm}!</p>
                          </div>
                        );
                      }

                      return (
                        <div id="student_report_card_view" className="p-6 sm:p-8 bg-white border border-slate-150 rounded-3xl shadow-xs space-y-6">
                          {/* Report Header */}
                          <div className="border-b pb-4 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                            <div className="space-y-1">
                              <h2 className="text-lg font-black text-slate-900 tracking-tight">WISDOM INTERNATIONAL ACADEMY</h2>
                              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Wisdom is knowledge, and understanding • Enugu, Nigeria</p>
                              <p className="text-xs font-bold text-indigo-600 mt-1">{localSelectedTerm.toUpperCase()} PROGRESS ASSESSMENT LAPEL</p>
                            </div>
                            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center font-black text-indigo-700 text-2xl">W</div>
                          </div>

                          {/* Student Details Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600">
                            <div>
                              <p className="text-[9px] uppercase text-slate-400">Student Name</p>
                              <p className="text-slate-800 truncate">{activeSheet.studentName}</p>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase text-slate-400">Class Level</p>
                              <p className="text-slate-800">{activeSheet.classLevel}</p>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase text-slate-400">Term Average</p>
                              <p className="text-indigo-600 font-mono font-black">{activeSheet.studentAverage}%</p>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase text-slate-400">Reg No</p>
                              <p className="text-slate-800 font-mono">{user.regNumber || "REG/2026/01"}</p>
                            </div>
                          </div>

                          {/* Grades Table */}
                          <div className="overflow-x-auto pb-2">
                            <table className="w-full text-left text-xs font-semibold">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-400 font-bold text-[9px] uppercase">
                                  <th className="py-2">Subject Domain</th>
                                  <th className="py-2">First CA (20)</th>
                                  <th className="py-2">Second CA (20)</th>
                                  <th className="py-2">Exam (60)</th>
                                  <th className="py-2">Total Score (100)</th>
                                  <th className="py-2">Class Avg</th>
                                  <th className="py-2">Grade</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(activeSheet.scores || {}).map(([subject, data]: [string, any]) => (
                                  <tr key={subject} className="border-b border-slate-100 last:border-none font-medium text-slate-700">
                                    <td className="py-2.5 font-bold font-sans text-slate-800">{subject}</td>
                                    <td className="py-2.5 font-mono">{data.ca1}</td>
                                    <td className="py-2.5 font-mono">{data.ca2}</td>
                                    <td className="py-2.5 font-mono">{data.exam}</td>
                                    <td className="py-2.5 font-mono font-bold text-slate-900">{data.total}</td>
                                    <td className="py-2.5 font-mono text-slate-400">{data.classAverage || data.total}</td>
                                    <td className="py-2.5 font-sans">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        data.total >= 75 ? "bg-emerald-50 text-emerald-700" :
                                        data.total >= 65 ? "bg-teal-50 text-teal-750" :
                                        data.total >= 50 ? "bg-indigo-50 text-indigo-700" :
                                        "bg-rose-50 text-rose-700"
                                      }`}>
                                        {data.grade}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Remarks */}
                          <div className="border-t pt-4 space-y-3">
                            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl leading-relaxed text-slate-700 text-xs font-medium">
                              <strong>🗣️ Class Teacher's Remark:</strong> "{activeSheet.teacherRemark || "A very promising performance. Promoted with pride."}"
                            </div>
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl leading-relaxed text-slate-700 text-xs font-medium">
                              <strong>🎓 Principal's remark:</strong> "{activeSheet.principalRemark || "Excellent learning metrics. Keep studying harder for greater excellence."}"
                            </div>
                          </div>

                          {/* Print Action button */}
                          <div className="pt-4 border-t flex items-center justify-between text-xs text-slate-400">
                            <span>Brain System collator verified on: {new Date().toLocaleDateString()}</span>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  handlePrintPDF("student_report_card_view", `${activeSheet.studentName} Terminal Progress Report`);
                                }}
                                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer border-none flex items-center justify-center gap-1.5"
                              >
                                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                                Print Directly
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleDownloadPDFDirectly("student_report_card_view", `${activeSheet.studentName} Terminal Progress Report`);
                                }}
                                className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition cursor-pointer border-none flex items-center justify-center gap-1.5"
                              >
                                <FileText className="w-3.5 h-3.5 text-rose-600" />
                                Download PDF
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </motion.div>
              )}

              {activeTab === "results" && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Bar graph overview of score trend */}
                  {results.length > 0 && (
                    <div className="p-6 bg-white border border-slate-150 rounded-3xl shadow-sm space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Grading & Score progression Chart</h4>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                            <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                            <Legend />
                            <Bar dataKey="Score" fill="#4f46e5" name="Percentage Grade (%)" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* List of historical evaluations */}
                  <div className="p-6 bg-white border border-slate-150 rounded-3xl shadow-sm space-y-4">
                    <h3 className="text-base font-extrabold text-slate-900 font-sans">Your Academics History log</h3>
                    <p className="text-xs text-slate-500 font-medium">Review your past scores, correct answers, and print pass credentials.</p>

                    {results.length === 0 ? (
                      <div className="p-10 text-center text-slate-400 space-y-2">
                        <ListTodo className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold leading-relaxed">No exams completed yet under this student account.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {results.map((resItem) => (
                          <div
                            key={resItem.id}
                            className="p-4 bg-white border border-slate-100 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-indigo-200 transition"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] bg-slate-100 text-slate-700 py-0.5 px-2 rounded-full font-bold">
                                  {resItem.subject}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold">{new Date(resItem.date).toLocaleDateString()}</span>
                              </div>
                              <h4 className="text-xs font-black text-slate-800">{resItem.examTitle}</h4>
                              <p className="text-[10px] text-slate-400 font-semibold">Correct: {resItem.correctAnswers}/{resItem.totalQuestions} questions</p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <p className="text-base font-black text-slate-900">{resItem.percentage}%</p>
                                <p className={`text-[10px] font-bold ${resItem.percentage >= 50 ? 'text-indigo-650' : 'text-rose-500'}`}>
                                  {resItem.percentage >= 50 ? '🥈 Passed' : '⚠️ Retake'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handlePrintPassCertificate(resItem)}
                                className="p-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                                title="Print Pass Certificate"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "practice" && (
                <motion.div
                  key="practice"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* AI Practice form generator */}
                  {practiceIntro ? (
                    <div className="p-8 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl space-y-6 border border-slate-800">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
                        <h3 className="text-xl font-black">Study Revision Drill (Self-Study Revision)</h3>
                      </div>
                      <p className="text-xs text-indigo-200 leading-relaxed max-w-lg">
                        Select a subject and enter any topic. Our system will instantly construct private revision questions for your personal revision study.
                        <strong className="block text-cyan-300 mt-1">Note: Only educators/teachers can build and publish standard, timed CBT Exams.</strong>
                      </p>

                      <form onSubmit={handleGeneratePractice} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-slate-900">
                        <div>
                          <label className="text-xs font-bold text-indigo-200 block mb-1">Subject domain</label>
                          <select
                            value={practiceSubject}
                            onChange={(e) => setPracticeSubject(e.target.value)}
                            className="bg-white border-none rounded-xl py-2.5 px-3 text-xs w-full font-semibold focus:outline-none"
                          >
                            {subjects.length > 0 ? (
                              subjects.map((sub) => (
                                <option key={sub} value={sub}>{sub}</option>
                              ))
                            ) : (
                              <>
                                <option>Mathematics</option>
                                <option>Physics</option>
                                <option>Chemistry</option>
                                <option>Biology</option>
                                <option>English Language</option>
                                <option>Phonics</option>
                                <option>Artificial Intelligence</option>
                                <option>Accounting</option>
                                <option>Economics</option>
                                <option>ICT</option>
                              </>
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-indigo-200 block mb-1">Specific topic context (enter "all topics" for comprehensive exam)</label>
                          <div className="relative flex items-center">
                            <input
                              required
                              type="text"
                              placeholder="e.g. 'all topics', 'Algebra', 'Calculus', 'Electrolysis'"
                              value={practiceTopic}
                              onChange={(e) => setPracticeTopic(e.target.value)}
                              className="bg-white border-none rounded-xl py-2.5 pl-3 pr-10 text-xs w-full focus:outline-none"
                            />
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center text-slate-700">
                              <VoiceInputButton value={practiceTopic} onTranscript={setPracticeTopic} size="xs" />
                            </div>
                          </div>
                          <p className="text-[10px] text-indigo-300 mt-1 font-medium">Tip: Type <strong>"all topics"</strong> to test on everything for this subject.</p>
                        </div>

                        <div className="sm:col-span-2 font-sans">
                          <div className="flex items-center justify-between sm:w-64 mb-1.5">
                            <label className="text-xs font-bold text-indigo-200 block">Total questions count</label>
                            
                            {/* Interactive toggle switch icon button */}
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomCount(!isCustomCount);
                                if (!isCustomCount) {
                                  // Switch to custom (default to a nice 15 count or keep currently set)
                                  if (practiceCount === 3 || practiceCount === 5 || practiceCount === 10) {
                                    setPracticeCount(15);
                                  }
                                } else {
                                  // Revert to default standard preset
                                  setPracticeCount(5);
                                }
                              }}
                              className="text-[10px] font-black tracking-tight text-cyan-300 hover:text-cyan-200 flex items-center gap-1 bg-white/10 hover:bg-white/15 px-2 py-1 rounded-lg border border-white/10 cursor-pointer transition active:scale-95 select-none"
                              title={isCustomCount ? "Use standard presets" : "Input any custom count"}
                            >
                              {isCustomCount ? (
                                <>
                                  <Sliders className="w-3 h-3 text-cyan-300 shrink-0" />
                                  <span>Use Presets</span>
                                </>
                              ) : (
                                <>
                                  <Edit3 className="w-3 h-3 text-cyan-300 shrink-0 animate-pulse" />
                                  <span>Custom Count</span>
                                </>
                              )}
                            </button>
                          </div>

                          {isCustomCount ? (
                            <div className="flex items-center gap-2 max-w-xs">
                              <div className="relative flex items-center">
                                <input
                                  type="number"
                                  min={1}
                                  max={50}
                                  required
                                  value={practiceCount}
                                  onChange={(e) => {
                                    const val = Math.max(1, Math.min(50, Number(e.target.value) || 1));
                                    setPracticeCount(val);
                                  }}
                                  className="bg-white border-none rounded-xl py-2.5 pl-3 pr-16 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-300 w-full sm:w-48 placeholder-slate-400"
                                  placeholder="e.g. 15"
                                />
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none select-none">
                                  questions
                                </span>
                              </div>
                              <span className="text-[10px] text-indigo-300 font-bold hidden sm:inline">(Capacity: 1 - 50)</span>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <select
                                value={practiceCount}
                                onChange={(e) => setPracticeCount(Number(e.target.value))}
                                className="bg-white border-none rounded-xl py-2.5 px-3 text-xs w-full sm:w-48 font-semibold text-slate-800 focus:outline-none"
                              >
                                <option value={3}>3 Quick practice questions</option>
                                <option value={5}>5 Standard questions</option>
                                <option value={10}>10 Detailed questions</option>
                              </select>
                              <span className="text-[10px] text-indigo-300 font-medium pl-1">
                                Click <strong>"Custom Count"</strong> above to enter any questions count!
                              </span>
                            </div>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={generatingPractice}
                          className="sm:col-span-2 mt-2 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 font-extrabold text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {generatingPractice ? "Generating revision questions..." : "Generate Revision Questions"}
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="p-6 bg-white border border-slate-150 rounded-3xl shadow-sm space-y-6">
                      {/* Active AI Quiz Session */}
                      {!practiceCompleted ? (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 py-0.5 px-2.5 rounded-full font-bold uppercase pb-1 md:pb-0.5">
                                Revision Study: {practiceSubject}
                              </span>
                              <span className="text-xs text-slate-400 ml-2">Topic: {practiceTopic}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const currentQ = practiceQuestions[practiceIndex];
                                  if (currentQ) {
                                    const text = `Question: ${currentQ.question}. Option A: ${currentQ.optionA}. Option B: ${currentQ.optionB}. Option C: ${currentQ.optionC}. Option D: ${currentQ.optionD}.`;
                                    speakText(text, isPlayingPracticeTTS, setIsPlayingPracticeTTS);
                                  }
                                }}
                                className={`px-2 py-1 rounded-lg flex items-center gap-1.5 text-[11px] font-bold cursor-pointer transition border-none ${
                                  isPlayingPracticeTTS
                                    ? "bg-rose-500 text-white hover:bg-rose-600 animate-pulse"
                                    : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                                }`}
                                title="Listen to question structure"
                              >
                                <Volume2 className={`w-3.5 h-3.5 ${isPlayingPracticeTTS ? "animate-bounce text-white" : "text-amber-700"}`} />
                                {isPlayingPracticeTTS ? "Stop" : "🔊 Listen"}
                              </button>
                              <span className="text-xs text-slate-500 font-mono font-bold">
                                Q {practiceIndex + 1} of {practiceQuestions.length}
                              </span>
                            </div>
                          </div>

                          <h4 className="text-base font-extrabold text-slate-800 leading-relaxed">
                            <span dangerouslySetInnerHTML={{ __html: renderFormattedMath(practiceQuestions[practiceIndex]?.question) }} />
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                              { k: 'A' as const, label: practiceQuestions[practiceIndex]?.optionA },
                              { k: 'B' as const, label: practiceQuestions[practiceIndex]?.optionB },
                              { k: 'C' as const, label: practiceQuestions[practiceIndex]?.optionC },
                              { k: 'D' as const, label: practiceQuestions[practiceIndex]?.optionD },
                            ].map((o) => {
                              const isSelected = practiceAnswers[practiceIndex] === o.k;
                              return (
                                <button
                                  key={o.k}
                                  onClick={() =>
                                    setPracticeAnswers((p) => ({ ...p, [practiceIndex]: o.k }))
                                  }
                                  className={`p-3.5 rounded-xl border text-left font-semibold text-xs flex items-center gap-2.5 transition cursor-pointer ${
                                    isSelected
                                      ? "bg-slate-900 text-white border-slate-900 shadow-md"
                                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold font-mono border text-[11px] ${isSelected ? "bg-white text-slate-900 border-white" : "bg-white text-slate-500 border-slate-200"}`}>{o.k}</span>
                                  <span dangerouslySetInnerHTML={{ __html: renderFormattedMath(o.label) }} />
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <button
                              disabled={practiceIndex === 0}
                              onClick={() => setPracticeIndex((p) => p - 1)}
                              className="py-1.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-40 cursor-pointer"
                            >
                              Previous Task
                            </button>

                            {practiceIndex === practiceQuestions.length - 1 ? (
                              <button
                                onClick={submitPracticeAnswers}
                                className="py-1.5 px-5 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-700 rounded-lg transition shadow-md shadow-indigo-100 cursor-pointer"
                              >
                                Finish & Submit
                              </button>
                            ) : (
                              <button
                                onClick={() => setPracticeIndex((p) => p + 1)}
                                className="py-1.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                              >
                                Next question
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6 text-center py-6">
                          <Trophy className="w-16 h-16 text-indigo-600 mx-auto animate-bounce" />
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">Revision COMPLETE!</h3>
                            <p className="text-xs text-slate-500 mt-1">Excellent job attempting revision questions for {practiceTopic}.</p>
                          </div>

                          <div className="p-4 bg-slate-50 rounded-2xl max-w-xs mx-auto border border-slate-150">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Your Grade Score</span>
                            <span className="text-4xl font-extrabold text-slate-800">{practiceScore} / {practiceQuestions.length}</span>
                            <span className="text-xs block text-slate-500 font-medium mt-1">({Math.round((practiceScore / practiceQuestions.length) * 100)}%)</span>
                          </div>

                          {/* Quick review correction card */}
                          <div className="text-left space-y-4 max-w-xl mx-auto pt-4 border-t border-slate-100">
                            <h4 className="text-sm font-bold text-slate-800">Quiz Question Corrections:</h4>
                            {practiceQuestions.map((q, qIndex) => {
                              const studentAnswer = practiceAnswers[qIndex];
                              const correct = studentAnswer === q.correctAnswer;
                              return (
                                <div key={qIndex} className="p-3.5 bg-white border border-slate-150 rounded-3xl text-xs space-y-2">
                                  <p className="font-semibold text-slate-800" dangerouslySetInnerHTML={{ __html: `${qIndex + 1}. ${renderFormattedMath(q.question)}` }} />
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    <span className={`py-1 px-2 rounded-md font-bold ${correct ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                      Your Choice: Option {studentAnswer || "None"}
                                    </span>
                                    {!correct && (
                                      <span className="py-1 px-2 bg-emerald-100 text-emerald-800 rounded-md font-bold">
                                        Correct choice: Option {q.correctAnswer}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <button
                            onClick={() => {
                              setPracticeIntro(true);
                              setPracticeQuestions([]);
                            }}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            New Revision Setup
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "library" && (
                <motion.div
                  key="library"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <MyLibrary user={user} />
                </motion.div>
              )}

              {activeTab === "scheme" && (
                <motion.div
                  key="scheme"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <SchemeOfWorkDashboard user={user} userPerspective="student" />
                </motion.div>
              )}

              {activeTab === "notifications" && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="p-6 bg-white border border-slate-150 rounded-3xl shadow-sm space-y-4">
                    <h3 className="text-base font-extrabold text-slate-900 font-sans">Active notifications and invites</h3>
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">Your notification feed is currently clear.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-4 rounded-3xl border flex items-start justify-between gap-4 transition ${
                              n.read ? "bg-slate-50 border-slate-100 text-slate-500" : "bg-indigo-50/50 border-indigo-150 text-slate-800"
                            }`}
                          >
                            <div className="text-xs space-y-0.5">
                              <h5 className="font-extrabold text-slate-900">{n.title}</h5>
                              <p className="font-medium text-slate-600">{n.message}</p>
                              <span className="text-[9px] text-slate-400 font-medium block pt-1">Date: {new Date(n.date).toLocaleString()}</span>
                            </div>
                            {!n.read && (
                              <button
                                onClick={() => handleMarkAsRead(n.id)}
                                className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                              >
                                Mark Read
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
