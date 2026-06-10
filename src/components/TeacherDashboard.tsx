import React, { useState, useEffect } from "react";
import { BookOpen, GraduationCap, Clock, Award, HelpCircle, ArrowRight, TrendingUp, Sparkles, LogOut, CheckCircle, Wallet, Plus, Upload, Download, Copy, Printer, Check, Trash2, Edit3, MessageSquare, AlertCircle, FileSpreadsheet, School, FileText, Volume2, FolderOpen, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Exam, Question, LessonPlan, LessonNote, Transaction } from "../types";
import { renderFormattedMath } from "../lib/mathUtils";
import { VoiceInputButton } from "./VoiceInputButton";
import { speakText, stopSpeech } from "../utils/tts";
import MyLibrary from "./MyLibrary";
import SchemeOfWorkDashboard from "./SchemeOfWorkDashboard";

const renderFormattedList = (text: string | undefined) => {
  if (!text) return null;
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let finalLines = lines;
  if (lines.length === 1 && /\b\d+[\.\)]\s+/.test(lines[0])) {
    const splitList = lines[0].split(/\s+(?=\b\d+[\.\)]\s+)/);
    if (splitList.length > 1) {
      finalLines = splitList.map(s => s.trim());
    }
  }

  const cleanedLines = finalLines.map((line) => {
    return line.replace(/^(?:\d+[\.\)]|[\-•\*\d]+\.\s*|\[\s*\d+\s*\]\s*)/i, "").trim();
  });

  if (cleanedLines.length === 0) return null;

  return (
    <ol className="list-decimal list-outside pl-5 space-y-1.5 mt-1 font-medium text-slate-700 select-text">
      {cleanedLines.map((line, idx) => (
        <li key={idx} className="pl-1 leading-relaxed text-xs" dangerouslySetInnerHTML={{ __html: renderFormattedMath(line) }} />
      ))}
    </ol>
  );
};

interface TeacherDashboardProps {
  user: any;
  onLogout: () => void;
}

export default function TeacherDashboard({ user, onLogout }: TeacherDashboardProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [lessonNotes, setLessonNotes] = useState<LessonNote[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<"exams" | "planner" | "notes" | "ai_questions" | "wallet" | "results" | "reports" | "library" | "scheme">("exams");
  const [selectedDownloadItem, setSelectedDownloadItem] = useState<{ type: "plan" | "note" | "exam" | "report"; data: any } | null>(null);
  const [isPlayingDownloadTTS, setIsPlayingDownloadTTS] = useState(false);
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);
  
  // Local active states
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(user.walletBalance || 0);

  // 6. SCHOOL CONFIGURATION & REPORT CARD STATES
  const [schoolConfig, setSchoolConfig] = useState<any>({
    schoolName: "Brain International Academy",
    location: "Lagos, Nigeria",
    term: "First Term",
    timesOpened: 120,
    schoolLogo: "https://api.dicebear.com/7.x/identicon/svg?seed=wisdom",
    schoolMotto: "wisdom, knowledge, and understanding"
  });

  const [reportSheets, setReportSheets] = useState<any[]>([]);
  const [selectedReportClassLevel, setSelectedReportClassLevel] = useState<string>("Grade 1");
  const [spreadsheetTerm, setSpreadsheetTerm] = useState<string>("First Term");
  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [showReportFormModal, setShowReportFormModal] = useState(false);
  const [isCollating, setIsCollating] = useState(false);
  const [collateMessage, setCollateMessage] = useState("");
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);
  const [showSpreadsheetView, setShowSpreadsheetView] = useState(false);
  const [showCumulativeView, setShowCumulativeView] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [aiFromNoteContent, setAiFromNoteContent] = useState("");
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Sub-tabs for Academics/Reports Management
  const [reportSubTab, setReportSubTab] = useState<'reports' | 'roster' | 'bulkGrading'>('reports');
  const [singleStudentName, setSingleStudentName] = useState("");
  const [singleStudentReg, setSingleStudentReg] = useState("");
  const [rosterBulkText, setRosterBulkText] = useState("");
  const [rosterStatusMsg, setRosterStatusMsg] = useState("");
  
  const [gradingSubject, setGradingSubject] = useState("Mathematics");
  const [gradingTerm, setGradingTerm] = useState("First Term");
  const [gradingScores, setGradingScores] = useState<any[]>([]);
  const [gradingStatusMsg, setGradingStatusMsg] = useState("");
  const [isSavingGrading, setIsSavingGrading] = useState(false);

  const syncGradingScoresList = () => {
    const classStudents = allUsers.filter(
      (u) => u.role === "student" && u.classLevel === selectedReportClassLevel
    );
    
    const list = classStudents.map((u) => {
      const sheet = reportSheets.find(
        (r) => r.studentName.trim().toLowerCase() === u.name.trim().toLowerCase() &&
               r.classLevel === selectedReportClassLevel &&
               r.term === gradingTerm
      );
      
      const savedSubjectScore = sheet?.scores?.[gradingSubject] || {};
      
      return {
        studentId: u.id,
        studentName: u.name,
        regNumber: u.regNumber || "REG/2026/01",
        ca1: savedSubjectScore.ca1 !== undefined ? savedSubjectScore.ca1 : 0,
        ca2: savedSubjectScore.ca2 !== undefined ? savedSubjectScore.ca2 : 0,
        exam: savedSubjectScore.exam !== undefined ? savedSubjectScore.exam : 0,
      };
    });
    
    setGradingScores(list);
  };

  useEffect(() => {
    if (activeTab === "reports" && reportSubTab === "bulkGrading") {
      syncGradingScoresList();
    }
  }, [activeTab, reportSubTab, allUsers, reportSheets, selectedReportClassLevel, gradingSubject, gradingTerm]);

  // Manual input form states for report sheet
  const [manualStudentName, setManualStudentName] = useState("");
  const [manualClassLevel, setManualClassLevel] = useState("Grade 1");
  const [manualSubject, setManualSubject] = useState("Mathematics");
  const [manualCa1, setManualCa1] = useState(0);
  const [manualCa2, setManualCa2] = useState(0);
  const [manualExam, setManualExam] = useState(0);
  const [manualAttendance, setManualAttendance] = useState(115);
  const [manualTeacherRemark, setManualTeacherRemark] = useState("");
  const [manualPrincipalRemark, setManualPrincipalRemark] = useState("");

  // 1. CBT EXAM GENERATION WIZARD STATE
  const [examTitle, setExamTitle] = useState("");
  const [examSubject, setExamSubject] = useState("Mathematics");
  const [examLevel, setExamLevel] = useState<'Primary School' | 'Junior Secondary School' | 'Senior Secondary School'>("Senior Secondary School");
  const [examDuration, setExamDuration] = useState(30);
  const [examInstructions, setExamInstructions] = useState("");
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  
  // Individual Question Editor Form (Manual input)
  const [manQuestion, setManQuestion] = useState("");
  const [manA, setManA] = useState("");
  const [manB, setManB] = useState("");
  const [manC, setManC] = useState("");
  const [manD, setManD] = useState("");
  const [manCorrect, setManCorrect] = useState<'A' | 'B' | 'C' | 'D'>("A");
  const [manTopic, setManTopic] = useState("");

  // Bulk CSV Text Import State
  const [csvText, setCsvText] = useState("");
  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");

  // 2. AI LESSON PLAN FORM STATE
  const [spinSchool, setSpinSchool] = useState("Brain International Academy");
  const [spinTeacher, setSpinTeacher] = useState(user.name);
  const [spinClass, setSpinClass] = useState("Junior Secondary School 2");
  const [spinSubject, setSpinSubject] = useState("Mathematics");
  const [spinTopic, setSpinTopic] = useState("");
  const [spinSubTopic, setSpinSubTopic] = useState("");
  const [spinDuration, setSpinDuration] = useState("40 Minutes");
  const [spinAge, setSpinAge] = useState("13 Years");
  const [spinCount, setSpinCount] = useState("35 Pupils");
  const [spinWeek, setSpinWeek] = useState<string>("1");
  const [spinDate, setSpinDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedFilterWeekPlan, setSelectedFilterWeekPlan] = useState<string>("ALL");
  const [activePlan, setActivePlan] = useState<LessonPlan | null>(null);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [planFontSize, setPlanFontSize] = useState<string>("11.5pt");
  const [noteFontSize, setNoteFontSize] = useState<string>("11.5pt");

  // 3. AI LESSON NOTE FORM STATE
  const [noteSubject, setNoteSubject] = useState("Physics");
  const [noteClass, setNoteClass] = useState("Senior Secondary School 1");
  const [noteTopic, setNoteTopic] = useState("");
  const [noteSubTopic, setNoteSubTopic] = useState("");
  const [notePeriods, setNotePeriods] = useState("2 Periods");
  const [noteDifficulty, setNoteDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>("Medium");
  const [noteWeek, setNoteWeek] = useState<string>("1");
  const [noteDate, setNoteDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedFilterWeekNote, setSelectedFilterWeekNote] = useState<string>("ALL");
  const [activeNote, setActiveNote] = useState<LessonNote | null>(null);
  const [creatingNote, setCreatingNote] = useState(false);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [isNoteEditMode, setIsNoteEditMode] = useState(false);

  // 4. AI PRACTICE CBT QUESTION GENERATOR STATE (Educator bank)
  const [aiSubject, setAiSubject] = useState("Chemistry");
  const [aiTopic, setAiTopic] = useState("");
  const [aiClass, setAiClass] = useState("Grade 1");
  const [aiCount, setAiCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState("Medium");
  const [generatingAiBank, setGeneratingAiBank] = useState(false);
  const [aiBankQuestions, setAiBankQuestions] = useState<Question[]>([]);

  // 5. WALLET SIMULATOR FUND STATE
  const [fundAmount, setFundAmount] = useState(2500);
  const [fundingSim, setFundingSim] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [transferRef, setTransferRef] = useState("");
  const [opayCopied, setOpayCopied] = useState(false);
  const [submittingOpayProof, setSubmittingOpayProof] = useState(false);

  // Notification lists
  const [copiedLink, setCopiedLink] = useState("");
  const [isPlayingPlanTTS, setIsPlayingPlanTTS] = useState(false);
  const [isPlayingNoteTTS, setIsPlayingNoteTTS] = useState(false);

  const fetchTeacherData = async () => {
    setLoading(true);
    try {
      // Fetch exams created
      const exRes = await fetch("/api/exams");
      const exData = await exRes.json();
      if (exRes.ok) {
        setExams(exData.exams || []);
      }

      // Fetch lesson plans created
      const planRes = await fetch(`/api/teachers/${user.id}/lesson-plans`);
      const planData = await planRes.json();
      if (planRes.ok) {
        setLessonPlans(planData.lessonPlans || []);
        if (planData.lessonPlans?.length > 0 && !activePlan) {
          setActivePlan(planData.lessonPlans[0]);
        }
      }

      // Fetch lesson notes
      const noteRes = await fetch(`/api/teachers/${user.id}/lesson-notes`);
      const noteData = await noteRes.json();
      if (noteRes.ok) {
        setLessonNotes(noteData.lessonNotes || []);
        if (noteData.lessonNotes?.length > 0 && !activeNote) {
          setActiveNote(noteData.lessonNotes[0]);
          setEditingNoteText(noteData.lessonNotes[0]?.content?.detailedNote || "");
        }
      }

      // Fetch wallet transactions log
      const txRes = await fetch(`/api/transactions/user/${user.id}`);
      const txData = await txRes.json();
      if (txRes.ok) {
        setTransactions(txData.transactions || []);
      }

      // Fetch all candidate results for this teacher's exams
      const rsRes = await fetch("/api/results");
      const rsData = await rsRes.json();
      if (rsRes.ok) {
        setStudentResults(rsData.results || []);
      }

      // Fetch school config
      try {
        const configRes = await fetch("/api/school-config");
        const configData = await configRes.json();
        if (configRes.ok && configData.schoolConfig) {
          setSchoolConfig(configData.schoolConfig);
          setSpreadsheetTerm(configData.schoolConfig.term || "First Term");
        }
      } catch (e) {
        console.error("Failed to load schoolConfig:", e);
      }

      // Fetch report cards
      try {
        const reportRes = await fetch("/api/report-sheets");
        const reportData = await reportRes.json();
        if (reportRes.ok && reportData.reportSheets) {
          setReportSheets(reportData.reportSheets);
        }
      } catch (e) {
        console.error("Failed to load reportSheets:", e);
      }

      // Fetch subjects catalog
      try {
        const subRes = await fetch("/api/subjects");
        const subData = await subRes.json();
        if (subRes.ok && subData.subjects) {
          setSubjects(subData.subjects);
        }
      } catch (e) {
        console.error("Failed to load subjects list:", e);
      }

      // Fetch user profile with latest wallet (re-sync)
      const lpRes = await fetch('/api/admin/stats');
      const lpData = await lpRes.json();
      if (lpRes.ok) {
        if (lpData.users) {
          setAllUsers(lpData.users);
        }
        const lpUser = lpData.users?.find((u: any) => u.id === user.id);
        if (lpUser) {
          setWalletBalance(lpUser.walletBalance);
        }
      }
    } catch (err) {
      console.error("Failed to load educator dashboard files:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, [user]);

  // --- SCHOOL REPORT CARD HANDLERS ---
  const handleSaveSchoolConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await fetch("/api/school-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schoolConfig)
      });
      const data = await resp.json();
      if (resp.ok && data.schoolConfig) {
        setSchoolConfig(data.schoolConfig);
        alert("School configuration saved successfully!");
      } else {
        alert(data.error || "Failed to save configuration.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to save school config.");
    }
  };

  const handleCollateResults = async () => {
    setIsCollating(true);
    setCollateMessage("");
    try {
      const resp = await fetch("/api/report-sheets/collate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classLevel: selectedReportClassLevel })
      });
      const data = await resp.json();
      if (resp.ok) {
        setCollateMessage(data.message || "Automated CBT Collation Succeeded!");
        // Reload report sheets from DB
        const reportRes = await fetch("/api/report-sheets");
        const reportData = await reportRes.json();
        if (reportData.reportSheets) {
          setReportSheets(reportData.reportSheets);
        }
      } else {
        setCollateMessage(data.error || "Failed to automate collation.");
      }
    } catch (e: any) {
      setCollateMessage(e.message || "Failed to automate collation.");
    } finally {
      setIsCollating(false);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm("Are you sure you want to permanently remove this student report card?")) return;
    try {
      const resp = await fetch("/api/report-sheets/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (resp.ok) {
        setReportSheets(reportSheets.filter((r) => r.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveManualReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentName.trim()) {
      alert("Please enter student name.");
      return;
    }

    // Prepare scores
    const caTotal = Number(manualCa1) + Number(manualCa2);
    const totalMark = caTotal + Number(manualExam);

    let grade = "Poor";
    if (totalMark >= 75) grade = "Excellent";
    else if (totalMark >= 65) grade = "Very Good";
    else if (totalMark >= 50) grade = "Good";
    else if (totalMark >= 40) grade = "Fair";

    // Set auto remarks if empty
    let tr = manualTeacherRemark;
    let pr = manualPrincipalRemark;
    if (!tr) {
      if (totalMark >= 75) tr = "Outstanding performance, exceptional intellectual aptitude!";
      else if (totalMark >= 50) tr = "Good term report. Keep striving for distinction.";
      else tr = "Requires more focus and close coaching in core concepts.";
    }
    if (!pr) {
      if (totalMark >= 75) pr = "An inspiring student record. Promoted with praise.";
      else if (totalMark >= 50) pr = "Highly encouraging marks. Continue reading.";
      else pr = "Must improve class attendance and study guidelines.";
    }

    const reportToUpdate = editingReport || {
      id: "report_" + Math.random().toString(36).substring(2, 9),
      studentId: "std_" + Math.random().toString(36).substring(2, 9),
      studentName: manualStudentName.trim(),
      classLevel: manualClassLevel,
      term: schoolConfig.term || "First Term",
      scores: {},
      studentAverage: 0,
      classAverage: 0,
      attendance: Number(manualAttendance),
      psychomotor: { punctuality: 4, neatness: 5, honesty: 4, cooperation: 5, selfControl: 4 },
      cognitive: { attentiveness: 5, participation: 4, comprehension: 5 },
      teacherRemark: tr,
      principalRemark: pr
    };

    // Update or insert the subject scores
    const updatedScores = { ...(reportToUpdate.scores || {}) };
    updatedScores[manualSubject] = {
      ca1: Number(manualCa1),
      ca2: Number(manualCa2),
      totalCa: caTotal,
      exam: Number(manualExam),
      total: totalMark,
      highestInClass: totalMark, // Adjusted by DB calculation, but fallback is itself
      lowestInClass: totalMark,
      position: 1,
      grade,
      classAverage: totalMark
    };

    // Recalculate Student Average
    const scoreItems = Object.values(updatedScores) as any[];
    const sum = scoreItems.reduce((acc, current) => acc + current.total, 0);
    const average = scoreItems.length > 0 ? Math.round((sum / scoreItems.length) * 10) / 10 : 0;

    const payload = {
      ...reportToUpdate,
      scores: updatedScores,
      studentName: manualStudentName.trim(),
      classLevel: manualClassLevel,
      attendance: Number(manualAttendance),
      studentAverage: average,
      teacherRemark: tr,
      principalRemark: pr
    };

    try {
      const resp = await fetch("/api/report-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (resp.ok && data.reportSheet) {
        // Refresh Report Cards
        const reportRes = await fetch("/api/report-sheets");
        const reportData = await reportRes.json();
        if (reportData.reportSheets) {
          setReportSheets(reportData.reportSheets);
        }
        setShowReportFormModal(false);
        setEditingReport(null);
        setManualStudentName("");
        setManualCa1(0);
        setManualCa2(0);
        setManualExam(0);
        setManualTeacherRemark("");
        setManualPrincipalRemark("");
        alert("Student report card successfully updated.");
      } else {
        alert(data.error || "Failed to update manual report.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditReportClick = (sheet: any) => {
    setEditingReport(sheet);
    setManualStudentName(sheet.studentName);
    setManualClassLevel(sheet.classLevel);
    setManualAttendance(sheet.attendance || 115);
    setManualTeacherRemark(sheet.teacherRemark || "");
    setManualPrincipalRemark(sheet.principalRemark || "");
    const subjectList = Object.keys(sheet.scores || {});
    if (subjectList.length > 0) {
      const mainSubj = subjectList[0];
      setManualSubject(mainSubj);
      setManualCa1(sheet.scores[mainSubj]?.ca1 || 0);
      setManualCa2(sheet.scores[mainSubj]?.ca2 || 0);
      setManualExam(sheet.scores[mainSubj]?.exam || 0);
    } else {
      setManualSubject("Mathematics");
      setManualCa1(0);
      setManualCa2(0);
      setManualExam(0);
    }
    setShowReportFormModal(true);
  };

  // --- EXAM CREATION ---
  const handleAddNewQuestionManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manQuestion || !manA || !manB || !manC || !manD) {
      alert("Please fill all question fields and choices!");
      return;
    }

    const newQ: Question = {
      question: manQuestion,
      optionA: manA,
      optionB: manB,
      optionC: manC,
      optionD: manD,
      correctAnswer: manCorrect,
      subject: examSubject,
      topic: manTopic || examTitle || "General",
      marks: 5,
    };

    setExamQuestions((prev) => [...prev, newQ]);

    // Reset single input form
    setManQuestion("");
    setManA("");
    setManB("");
    setManC("");
    setManD("");
    setManTopic("");
  };

  // Parse raw or uploaded CSV text content with detailed validation checks
  const processCSVText = (text: string) => {
    setCsvError("");
    setCsvSuccess("");

    try {
      const lines = text.split("\n");
      const parsedRows: Question[] = [];
      let parseCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Strip simple quotes, matches columns perfectly
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((val) =>
          val.replace(/^"|"$/g, "").trim()
        );

        if (cols.length < 6) {
          // If headers mismatch skip
          if (i === 0 && cols[0].toLowerCase().includes("question")) continue;
          throw new Error(`Parse error on line ${i + 1}: Expected at least 6 columns, found ${cols.length}. Format: Question, Option A, Option B, Option C, Option D, Correct Answer [A-D], Subject, Topic, Marks, Explanation`);
        }

        // Map cells
        const qText = cols[0];
        const aText = cols[1];
        const bText = cols[2];
        const cText = cols[3];
        const dText = cols[4];
        const correctLetter = cols[5]?.toUpperCase().trim();

        if (!["A", "B", "C", "D"].includes(correctLetter)) {
          if (i === 0 && (qText.toLowerCase().includes("question") || correctLetter.includes("CORRECT"))) continue;
          throw new Error(`Parse error on line ${i + 1}: Correct Answer value MUST be exactly A, B, C, or D (Found "${correctLetter}")`);
        }

        parsedRows.push({
          question: qText,
          optionA: aText,
          optionB: bText,
          optionC: cText,
          optionD: dText,
          correctAnswer: correctLetter as "A" | "B" | "C" | "D",
          subject: cols[6] || examSubject,
          topic: cols[7] || "Imported Topic",
          marks: Number(cols[8]) || 5,
          explanation: cols[9] || "Correct option is derived through step-by-step standard curriculum formula verification.",
        });
        parseCount++;
      }

      if (parsedRows.length === 0) {
        throw new Error("No valid question records detected in the uploaded CSV file.");
      }

      setExamQuestions((prev) => [...prev, ...parsedRows]);
      setCsvSuccess(`Successfully loaded ${parseCount} questions from the CSV file!`);
    } catch (err: any) {
      setCsvError(err.message || "CSV parse malfunction. Verify standard headers.");
    }
  };

  const readAndParseCSV = (file: File) => {
    setUploadedFileName(file.name);
    setCsvError("");
    setCsvSuccess("");

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvError("Invalid file format. Please upload a spreadsheet .csv file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        processCSVText(text);
      }
    };
    reader.onerror = () => {
      setCsvError("Failed to read the uploaded CSV file.");
    };
    reader.readAsText(file);
  };

  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readAndParseCSV(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readAndParseCSV(file);
    }
  };

  const handleDownloadSampleCSV = () => {
    const csvContent = "Question,Option A,Option B,Option C,Option D,Correct Answer,Subject,Topic,Marks\n"
      + '"What is the value of Pi to two decimal places?","3.14","3.12","3.16","3.18","A","Mathematics","Geometry",5\n'
      + '"Which gas do plants absorb during photosynthesis?","Oxygen","Carbon Dioxide","Nitrogen","Hydrogen","B","Biology","Plant Nutrition",5\n'
      + '"Who formulated the Laws of Motion?","Albert Einstein","Isaac Newton","Galileo Galilei","Marie Curie","B","Physics","Mechanics",5';
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "cbt_bulk_upload_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const removeQuestionAt = (idx: number) => {
    setExamQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePublishExamFinal = async (examId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/exams/${examId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Exam successfully published!");
        // Reinitialise triggers
        fetchTeacherData();
      } else {
        alert(data.error || "Pub-gate rejected request.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Failure connecting to API server.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (!window.confirm("Are you absolutely sure you want to delete this CBT exam? This will also remove any student submissions for it and cannot be reverted.")) {
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/exams/${examId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Exam deleted successfully.");
        fetchTeacherData(); // Refresh list
      } else {
        alert(data.error || "Failed to delete exam.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting exam.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadConsolidatedExamResults = (currExam: Exam) => {
    // Filter results that belong to this exam
    const assocScores = studentResults.filter((r) => r.examId === currExam.id);
    if (assocScores.length === 0) {
      alert(`There are currently no candidate results captured for "${currExam.title}".`);
      return;
    }

    // Header row
    let csvContent = "Candidate ID,Candidate Name,CBT Exam Title,Subject,Score Achieved,Total Possible,Percentage (%),Date/Time Finished\r\n";
    
    // Data rows
    assocScores.forEach((r) => {
      const escapedId = `"${(r.studentId || "Anonymous").replace(/"/g, '""')}"`;
      const escapedName = `"${(r.studentName || "Anonymous Candidate").replace(/"/g, '""')}"`;
      const escapedTitle = `"${(currExam.title || "CBT Exam").replace(/"/g, '""')}"`;
      const escapedSubject = `"${(currExam.subject || "").replace(/"/g, '""')}"`;
      const rawScore = r.score;
      const totalMarks = currExam.questions?.length * 5; 
      const pct = r.percentage;
      const finishedAt = `"${(r.date || "").replace(/"/g, '""')}"`;
      
      csvContent += `${escapedId},${escapedName},${escapedTitle},${escapedSubject},${rawScore},${totalMarks},${pct}%,${finishedAt}\r\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `consolidated_results_${currExam.title.toLowerCase().replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAllGlobalResults = () => {
    if (studentResults.length === 0) {
      alert("There are currently no student exam records available across all exams.");
      return;
    }

    // Header row
    let csvContent = "Candidate ID,Candidate Name,CBT Exam ID,CBT Exam Title,Subject,Score Achieved,Percentage (%),Date/Time Finished\r\n";
    
    // Data rows
    studentResults.forEach((r) => {
      const escapedId = `"${(r.studentId || "Anonymous").replace(/"/g, '""')}"`;
      const escapedName = `"${(r.studentName || "Anonymous Candidate").replace(/"/g, '""')}"`;
      const escapedExamId = `"${(r.examId || "N/A").replace(/"/g, '""')}"`;
      const escapedTitle = `"${(r.examTitle || "CBT Exam").replace(/"/g, '""')}"`;
      const escapedSubject = `"${(r.subject || "N/A").replace(/"/g, '""')}"`;
      const rawScore = r.score;
      const pct = r.percentage;
      const finishedAt = `"${(r.date || "").replace(/"/g, '""')}"`;
      
      csvContent += `${escapedId},${escapedName},${escapedExamId},${escapedTitle},${escapedSubject},${rawScore},${pct}%,${finishedAt}\r\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `consolidated_all_exams_results_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateCBTExamWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle || examQuestions.length === 0) {
      alert("Please fill exam details and add at least 1 question before finalizing!");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: examTitle,
          subject: examSubject,
          level: examLevel,
          duration: examDuration,
          totalMarks: examQuestions.length * 5,
          instructions: examInstructions,
          questions: examQuestions,
          creatorId: user.id,
          creatorName: user.name,
        }),
      });

      const data = await resp.json();
      if (resp.ok) {
        alert("CBT Exam Draft successfully saved! Proceed to publish under the exam listing.");
        // RESET WIZARD
        setExamTitle("");
        setExamInstructions("");
        setExamQuestions([]);
        fetchTeacherData();
      } else {
        alert(data.error || "Execution failed.");
      }
    } catch (e) {
      console.error(e);
      alert("Could not trigger saving CBT exam.");
    } finally {
      setLoading(false);
    }
  };

  // --- DYNAMIC AI GENERATION TRIGGERS ---
  const triggerGenerateLessonPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spinTopic) {
      alert("Please provide the Lesson topic descriptor!");
      return;
    }
    setCreatingPlan(true);

    try {
      const res = await fetch("/api/ai/lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: spinSchool,
          teacherName: spinTeacher,
          classLevel: spinClass,
          subject: spinSubject,
          topic: spinTopic,
          subTopic: spinSubTopic,
          duration: spinDuration,
          ageOfPupils: spinAge,
          numberOfPupils: spinCount,
          teacherId: user.id,
          week: spinWeek,
          date: spinDate,
        }),
      });

      const data = await res.json();
      if (res.ok && data.lessonPlan) {
        setLessonPlans((prev) => [data.lessonPlan, ...prev]);
        setActivePlan(data.lessonPlan);
        setSpinTopic("");
        setSpinSubTopic("");
      } else {
        alert(data.error || "Failed using Gemini engine to compute lesson structure.");
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setCreatingPlan(false);
    }
  };

  const triggerGenerateLessonNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTopic) {
      alert("Please specify class note topic context!");
      return;
    }
    setCreatingNote(true);

    try {
      const res = await fetch("/api/ai/lesson-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: noteSubject,
          classLevel: noteClass,
          topic: noteTopic,
          subTopic: noteSubTopic,
          periods: notePeriods,
          difficulty: noteDifficulty,
          teacherId: user.id,
          week: noteWeek,
          date: noteDate,
        }),
      });

      const data = await res.json();
      if (res.ok && data.lessonNote) {
        setLessonNotes((prev) => [data.lessonNote, ...prev]);
        setActiveNote(data.lessonNote);
        setEditingNoteText(data.lessonNote.content.detailedNote);
        setNoteTopic("");
        setNoteSubTopic("");
      } else {
        alert(data.error || "Error compiling note content.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingNote(false);
    }
  };

  const handleSelectFilterWeekPlan = (week: string) => {
    setSelectedFilterWeekPlan(week);
    if (week !== "ALL") {
      setSpinWeek(week);
    }
  };

  const handleSelectFilterWeekNote = (week: string) => {
    setSelectedFilterWeekNote(week);
    if (week !== "ALL") {
      setNoteWeek(week);
    }
  };

  const triggerGenerateAIEducatorQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic) {
      alert("Please enter a topic to trigger questions extraction!");
      return;
    }
    setGeneratingAiBank(true);
    setAiBankQuestions([]);

    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: aiSubject,
          topic: aiTopic,
          classLevel: aiClass,
          count: aiCount,
          difficulty: aiDifficulty,
          noteContent: aiFromNoteContent || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.questions) {
        setAiBankQuestions(data.questions);
      } else {
        alert(data.error || "Failed extracting AI objective questions.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingAiBank(false);
    }
  };

  // Convert AI Question Bank instantly into Exam Builder
  const handleConvertBankToExamDraft = () => {
    if (aiBankQuestions.length === 0) return;
    setExamQuestions((prev) => [...prev, ...aiBankQuestions]);
    setExamTitle(`${aiTopic} Evaluation Bank`);
    setExamSubject(aiSubject);
    setAiBankQuestions([]);
    setActiveTab("exams");
    alert("Instantly mapped AI questions into active Exam draft builder!");
  };

  // Wallet funding sandbox trigger
  const handleFundWalletSandbox = async () => {
    setFundingSim(true);
    try {
      const response = await fetch("/api/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          amount: fundAmount,
          isSimulation: true,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setWalletBalance(data.walletBalance);
        alert(`Successfully funded wallet with ₦${fundAmount.toLocaleString()}! Start publishing exams immediately.`);
        fetchTeacherData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFundingSim(false);
    }
  };

  // Wallet funding via OPay Direct Transfer
  const handleOpayTransferSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim()) {
      alert("Please enter the Sender Account Name.");
      return;
    }
    if (!transferRef.trim()) {
      alert("Please enter the Bank Transfer reference ID or screenshot code.");
      return;
    }
    
    setSubmittingOpayProof(true);
    try {
      const response = await fetch("/api/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          amount: fundAmount,
          isSimulation: false,
          paystackReference: `OPay Direct Transfer from ${senderName.toUpperCase()} (Ref: ${transferRef})`,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setWalletBalance(data.walletBalance);
        alert(`🎉 OPay Payment Confirmed!\n\nYour transfer of ₦${fundAmount.toLocaleString()} to NWAIGBO AUGUSTINE CHIMAOBI has been verified and your school wallet credited successfully!`);
        setSenderName("");
        setTransferRef("");
        fetchTeacherData();
      } else {
        alert(data.error || "Failed to verify OPay payment. Please check details and try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Connection timeout while contacting OPay network. Please try again.");
    } finally {
      setSubmittingOpayProof(false);
    }
  };

  const handleCopyOpayAccount = () => {
    navigator.clipboard.writeText("8062078597");
    setOpayCopied(true);
    setTimeout(() => {
      setOpayCopied(false);
    }, 2500);
  };

  // High-fidelity print/Save PDF engine that works beautifully inside iframe environments on and across laptops, iPads, and phones
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

  // Microsoft Word document raw markup export helper (Office 2019+ and cross-device compatible)
  const handleWordExportHtml = (elementId: string, filename: string, isLandscape: boolean = false) => {
    const originalElement = document.getElementById(elementId);
    if (!originalElement) return;

    // Clone element to safely modify without mutating the active React UI
    const clonedElement = originalElement.cloneNode(true) as HTMLElement;

    // Direct presentation attribute injections guarantee borders display in MS Word app on iPhones/mobile + laptops
    clonedElement.querySelectorAll("table").forEach((table) => {
      table.setAttribute("border", "1");
      table.setAttribute("cellspacing", "0");
      table.setAttribute("cellpadding", "4");
      table.setAttribute("style", "border-collapse: collapse; width: 100%; border: 1.0pt solid #111111; margin: 8px 0;");
    });

    clonedElement.querySelectorAll("th").forEach((th) => {
      th.setAttribute("style", "border: 1.0pt solid #111111; background-color: #f1f5f9; font-weight: bold; padding: 4px; font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000000; text-align: left;");
    });

    clonedElement.querySelectorAll("td").forEach((td) => {
      td.setAttribute("style", "border: 1.0pt solid #111111; padding: 4px; font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000000; text-align: left;");
    });

    clonedElement.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((header) => {
      header.setAttribute("style", "font-family: 'Times New Roman', Times, serif; font-weight: bold; color: #000000; margin-top: 8px; margin-bottom: 4px;");
    });

    clonedElement.querySelectorAll("p, li").forEach((el) => {
      el.setAttribute("style", "font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.15; color: #000000; margin-bottom: 2px;");
    });

    const htmlText = clonedElement.innerHTML;
    
    // MS Word landscape / portrait XML standard orientation layout stylesheet
    const stylesCss = isLandscape
      ? `
      <style>
        @page Section1 { size: 11in 8.5in; margin: 0.5in 0.5in 0.5in 0.5in; mso-header-margin: 0.2in; mso-footer-margin: 0.2in; mso-page-orientation: landscape; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000000; background-color: #ffffff; line-height: 1.15; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Times New Roman', Times, serif; font-weight: bold; color: #000000; margin: 4px 0; }
        h1 { font-size: 14pt; }
        h2 { font-size: 13pt; }
        table { border-collapse: collapse; width: 100%; border: 1.0pt solid #111111 !important; }
        th, td { border: 1.0pt solid #111111 !important; padding: 4px; }
        th { background-color: #f1f5f9; font-weight: bold; }
        p, li { line-height: 1.15; margin: 0 0 2px 0; font-size: 12pt; font-family: 'Times New Roman', Times, serif; }
        div.Section1 { page: Section1; }
      </style>
      `
      : `
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000000; background-color: #ffffff; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Times New Roman', Times, serif; font-weight: bold; color: #000000; }
        h1 { font-size: 15pt; margin-bottom: 4pt; }
        h2 { font-size: 13pt; margin-top: 8pt; margin-bottom: 4pt; }
        h3 { font-size: 12pt; margin-top: 6pt; }
        table { border-collapse: collapse; width: 100%; border: 1.0pt solid #111111; margin-top: 6px; margin-bottom: 6px; }
        th, td { border: 1.0pt solid #111111; padding: 4px 6px; text-align: left; }
        th { background-color: #f1f5f9; font-weight: bold; font-size: 12pt; }
        td { font-size: 11pt; }
        p, li { line-height: 1.15; margin-bottom: 2px; font-size: 12pt; font-family: 'Times New Roman', Times, serif; }
        @page Section1 { size: 8.5in 11in; margin: 0.5in; mso-page-orientation: portrait; }
        div.Section1 { page: Section1; }
      </style>
      `;

    const docXhtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${filename.replace(/\.[^/.]+$/, "")}</title>
          ${stylesCss}
        </head>
        <body style="background:white; color:black; padding:20px; font-family:Arial,sans-serif;-webkit-print-color-adjust:exact; print-color-adjust:exact;">
          <div class="Section1">
            ${htmlText}
          </div>
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + docXhtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = url;
    fileDownload.download = filename;
    fileDownload.click();
    setTimeout(() => {
      document.body.removeChild(fileDownload);
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full font-sans bg-slate-50 text-slate-800">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-gradient-to-b from-slate-950 via-indigo-950 to-violet-955 text-white flex flex-col shrink-0 border-b md:border-b-0 md:border-r border-indigo-950">
        
        {/* Brand Container */}
        <div className="p-6 flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-amber-400 via-pink-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/30">
            <span className="text-2xl font-black font-sans text-white">B</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-400 to-cyan-400">Brain</span>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          {[
            { id: "exams", label: "CBT Exam Engine", icon: <GraduationCap className="w-4 h-4" /> },
            { id: "planner", label: "Lesson Planner", icon: <BookOpen className="w-4 h-4" /> },
            { id: "notes", label: "Lesson Notes", icon: <Sparkles className="w-4 h-4" /> },
            { id: "ai_questions", label: "Question Pool", icon: <Award className="w-4 h-4" /> },
            { id: "library", label: "My Personal Library", icon: <FolderOpen className="w-4 h-4" /> },
            { id: "scheme", label: "Scheme of Work", icon: <Layers className="w-4 h-4" /> },
            { id: "results", label: "Student CBT Results", icon: <TrendingUp className="w-4 h-4" /> },
            { id: "reports", label: "Term Report Cards", icon: <School className="w-4 h-4" /> },
            { id: "wallet", label: "School Wallet Portal", icon: <Wallet className="w-4 h-4" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const activeClass = 
              tab.id === "exams" ? "bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white shadow-lg shadow-pink-500/30 scale-[1.03] border-none" :
              tab.id === "planner" ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-550/30 scale-[1.03] border-none" :
              tab.id === "notes" ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30 scale-[1.03] border-none" :
              tab.id === "ai_questions" ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 scale-[1.03] border-none" :
              tab.id === "library" ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg shadow-teal-550/30 scale-[1.03] border-none" :
              tab.id === "scheme" ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-[1.03] border-none" :
              tab.id === "results" ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 scale-[1.03] border-none" :
              tab.id === "reports" ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-pink-500/30 scale-[1.03] border-none" :
              "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 scale-[1.03] border-none";
            
            const activeDotColor = 
              tab.id === "exams" ? "bg-pink-300" :
              tab.id === "planner" ? "bg-emerald-300" :
              tab.id === "notes" ? "bg-green-300" :
              tab.id === "ai_questions" ? "bg-violet-300" :
              tab.id === "library" ? "bg-teal-300" :
              tab.id === "scheme" ? "bg-purple-300" :
              tab.id === "results" ? "bg-amber-300" :
              tab.id === "reports" ? "bg-rose-300" :
              "bg-cyan-300";

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-xs font-black transition-all-300 text-left cursor-pointer ${
                  isActive
                    ? activeClass
                    : "text-indigo-200 hover:bg-indigo-900 hover:text-white"
                }`}
              >
                <span className={isActive ? "text-white" : "text-indigo-300"}>{tab.icon}</span>
                <span className="flex-1">{tab.label}</span>
                {isActive ? (
                  <div className={`w-2 h-2 rounded-full ${activeDotColor} shrink-0 animate-pulse`} />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-805/40 opacity-0 group-hover:opacity-100" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick summary box in side-rail */}
        <div className="p-6 border-t border-indigo-950/45">
          <div className="bg-indigo-800/50 rounded-2xl p-4 border border-indigo-700/50">
            <div className="text-[10px] text-indigo-300 uppercase font-black tracking-wider mb-1">Wallet Balance</div>
            <div className="text-xl font-bold text-white">
              ₦{walletBalance.toLocaleString()}
            </div>
            <button
              onClick={() => setActiveTab("wallet")}
              className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-750 text-center rounded-lg text-[10px] font-bold cursor-pointer text-white transition-all bg-indigo-500"
            >
              Fund Wallet
            </button>
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
              🎓 Educator Console
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-sm font-bold text-slate-900">{user.name}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Lecturer Role</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center font-bold text-indigo-805 text-base">
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

        <div className="flex-grow p-6 md:p-8 space-y-6 overflow-y-auto">
          <div className="flex items-end justify-between border-b border-slate-100 pb-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {activeTab === "exams" && "CBT Assessment Builder"}
                {activeTab === "planner" && "Lesson Planner"}
                {activeTab === "notes" && "Notebook Authoring"}
                {activeTab === "ai_questions" && "Assessment Pool"}
                {activeTab === "library" && "Personal Library Portal"}
                {activeTab === "scheme" && "Nigerian Curriculum Scheme of Work"}
                {activeTab === "results" && "Student CBT Exam Results"}
                {activeTab === "reports" && "Academic Report Sheets & Collation"}
                {activeTab === "wallet" && "Transactions & Billing"}
              </h1>
              <p className="text-xs text-slate-500 font-medium font-sans">
                {activeTab === "exams" && "Build, upload manually or via bulk spreadsheets, share links with students."}
                {activeTab === "planner" && "Instantly structure complete educational syllabuses and lessons."}
                {activeTab === "notes" && "Write detailed outlines, definition glossaries, and practice worksheets."}
                {activeTab === "ai_questions" && "Access questions, mock simulations, or custom syllabus blocks."}
                {activeTab === "library" && "Indefinite persistent storage and instant custom AI research planners."}
                {activeTab === "scheme" && "Access officially authorized NERDC school syllabus timelines, track taught lessons, and download Word worksheets."}
                {activeTab === "results" && "Consolidated student score reports on CBT examinations. View raw mark indexes, grades, or compile all student results on a single file."}
                {activeTab === "reports" && "Configure profile, automate term collation from CBT marks, or input student sheet grades manually."}
                {activeTab === "wallet" && "Monitor balance limits, secure payments, fund with mock gateways."}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="wait">
              
              {/* CBT MODULE */}
              {activeTab === "exams" && (
                <motion.div
                  key="exams"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-6">
                    <h3 className="text-base font-extrabold text-slate-900">Construct & Host CBT Assessments</h3>
                    
                    {/* Save new exam form */}
                    <form onSubmit={handleCreateCBTExamWizardSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Exam Title</label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. Thermodynamics 2nd Term Mock exam"
                            value={examTitle}
                            onChange={(e) => setExamTitle(e.target.value)}
                            className="bg-slate-50 rounded-xl py-2 px-3 border border-slate-200 text-xs w-full focus:outline-none focus:border-teal-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Target subject domain</label>
                          <select
                            value={examSubject}
                            onChange={(e) => setExamSubject(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs w-full font-semibold focus:outline-none"
                          >
                            {subjects.map((sub) => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Target School Level</label>
                          <select
                            value={examLevel}
                            onChange={(e: any) => setExamLevel(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs w-full font-semibold focus:outline-none"
                          >
                            <option value="Primary School">Primary School</option>
                            <option value="Junior Secondary School">Junior Secondary School</option>
                            <option value="Senior Secondary School">Senior Secondary School</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Exam duration limits (Minutes)</label>
                          <input
                            required
                            type="number"
                            min={2}
                            max={180}
                            value={examDuration}
                            onChange={(e) => setExamDuration(Number(e.target.value))}
                            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs w-full focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-xs font-bold text-slate-700">Special Instructions for Student</label>
                          <textarea
                            rows={2}
                            placeholder="e.g. Ensure you submit before duration threshold. Absolute silence."
                            value={examInstructions}
                            onChange={(e) => setExamInstructions(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs w-full focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Spreadsheet bulk file upload console */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <Upload className="w-4 h-4 text-pink-600" />
                            Option A: Bulk Spreadsheet CSV Upload
                          </span>
                          <button
                            type="button"
                            onClick={handleDownloadSampleCSV}
                            className="text-[11px] font-bold text-pink-600 hover:text-pink-850 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" /> Download Sample CSV Template
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                          Upload a `.csv` file directly. Required column order: <em>Question, Option A, Option B, Option C, Option D, Correct Answer (A/B/C/D), Subject, Topic, Marks</em>.
                        </p>

                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => {
                            const fileInput = document.getElementById("csv-file-input");
                            if (fileInput) fileInput.click();
                          }}
                          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition duration-200 flex flex-col items-center justify-center space-y-2 ${
                            isDragging
                              ? "border-pink-500 bg-pink-50/30"
                              : "border-slate-200 bg-white hover:border-pink-300 hover:bg-slate-50/40"
                          }`}
                        >
                          <input
                            id="csv-file-input"
                            type="file"
                            accept=".csv"
                            onChange={handleCSVFileChange}
                            className="hidden"
                          />
                          <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-pink-600">
                            <FileSpreadsheet className="w-5 h-5 text-pink-600" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-700">
                              {uploadedFileName ? `Selected: ${uploadedFileName}` : "Drag and drop your spreadsheet CSV here"}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              or click to browse from device folder
                            </p>
                          </div>
                        </div>

                        {csvError && (
                          <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-fadeIn">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>{csvError}</span>
                          </div>
                        )}
                        {csvSuccess && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-fadeIn">
                            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                            <span>{csvSuccess}</span>
                          </div>
                        )}
                      </div>

                      {/* Manual input selector question-by-question */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-3">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <Plus className="w-4 h-4 text-teal-600" />
                          Option B: Manual Exam Question adder
                        </span>
                        
                        <div className="space-y-3 text-xs">
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              placeholder="Enter some question inquiry text..."
                              value={manQuestion}
                              onChange={(e) => setManQuestion(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-3 pr-10 text-xs focus:outline-none"
                            />
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                              <VoiceInputButton value={manQuestion} onTranscript={setManQuestion} size="xs" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="relative flex items-center">
                              <input type="text" placeholder="Choice A option value" value={manA} onChange={(e) => setManA(e.target.value)} className="bg-white border rounded-xl p-2 pr-10 w-full focus:outline-none" />
                              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                                <VoiceInputButton value={manA} onTranscript={setManA} size="xs" />
                              </div>
                            </div>
                            <div className="relative flex items-center">
                              <input type="text" placeholder="Choice B option value" value={manB} onChange={(e) => setManB(e.target.value)} className="bg-white border rounded-xl p-2 pr-10 w-full focus:outline-none" />
                              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                                <VoiceInputButton value={manB} onTranscript={setManB} size="xs" />
                              </div>
                            </div>
                            <div className="relative flex items-center">
                              <input type="text" placeholder="Choice C option value" value={manC} onChange={(e) => setManC(e.target.value)} className="bg-white border rounded-xl p-2 pr-10 w-full focus:outline-none" />
                              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                                <VoiceInputButton value={manC} onTranscript={setManC} size="xs" />
                              </div>
                            </div>
                            <div className="relative flex items-center">
                              <input type="text" placeholder="Choice D option value" value={manD} onChange={(e) => setManD(e.target.value)} className="bg-white border rounded-xl p-2 pr-10 w-full focus:outline-none" />
                              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                                <VoiceInputButton value={manD} onTranscript={setManD} size="xs" />
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="text-[10px] font-bold block mb-1">Correct Choice</span>
                              <select value={manCorrect} onChange={(e: any) => setManCorrect(e.target.value)} className="bg-white border rounded-lg py-1 px-2">
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                              </select>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold block mb-1">Sub-topic</span>
                              <div className="relative flex items-center">
                                <input type="text" placeholder="e.g. Fractions" value={manTopic} onChange={(e) => setManTopic(e.target.value)} className="bg-white border rounded-lg py-1 px-2 pr-10 focus:outline-none" />
                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                                  <VoiceInputButton value={manTopic} onTranscript={setManTopic} size="xs" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddNewQuestionManual}
                          className="py-1.5 px-4 bg-teal-100 hover:bg-teal-200 text-teal-800 font-bold text-[11px] rounded-lg border border-teal-200 cursor-pointer"
                        >
                          Append Quest item
                        </button>
                      </div>

                      {/* Added questions preview before final saves */}
                      {examQuestions.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Active Exam Questions List ({examQuestions.length} added)
                          </h4>
                          <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-150 p-3 rounded-xl bg-slate-50/50">
                            {examQuestions.map((q, qidx) => (
                              <div key={qidx} className="flex items-start justify-between p-3 bg-white rounded-lg border border-slate-200 text-xs gap-3">
                                <div className="space-y-1">
                                  <p className="font-bold text-slate-800">{qidx + 1}. {q.question}</p>
                                  <p className="text-[10px] text-slate-500 font-semibold">
                                    Option A: {q.optionA} | B: {q.optionB} | Choice correctAnswer: <strong>{q.correctAnswer}</strong>
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeQuestionAt(qidx)}
                                  className="text-rose-600 hover:text-rose-800 shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition duration-250 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Combine into draft CBT Exam
                      </button>
                    </form>
                  </div>

                  {/* Operational listings of Exams already made */}
                  <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
                    <h3 className="text-base font-extrabold text-slate-900">Your created CBT drafts</h3>
                    
                    {exams.length === 0 ? (
                      <p className="text-xs text-slate-400">You have no hosted CBT exam. Complete wizard fields to start hosting.</p>
                    ) : (
                      <div className="space-y-3">
                        {exams.map((ex) => (
                          <div
                            key={ex.id}
                            className="p-4 bg-slate-55 border border-slate-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                          >
                            <div className="space-y-0.5">
                              <span className="text-[9px] bg-slate-200 text-slate-700 py-0.5 px-2 rounded-full font-bold uppercase block w-fit mb-1">{ex.subject}</span>
                              <h4 className="text-xs font-black text-slate-800">{ex.title}</h4>
                              <p className="text-[10px] text-slate-400 font-semibold">Contains {ex.questions?.length} quest indices • Timing limit: {ex.duration} Min</p>
                            </div>

                            <div className="flex items-center gap-2">
                              {ex.isPublished ? (
                                <>
                                  <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 py-1.5 px-3 rounded-xl font-bold">
                                    Published & Hosted Active link
                                  </span>
                                  <button
                                    onClick={() => {
                                      const dynamicLink = `${window.location.origin}/?examId=${ex.id}`;
                                      navigator.clipboard.writeText(dynamicLink);
                                      setCopiedLink(ex.id);
                                      setTimeout(() => setCopiedLink(""), 2500);
                                    }}
                                    className="p-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-bold text-xs"
                                    title="Copy Student Link"
                                  >
                                    {copiedLink === ex.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handlePublishExamFinal(ex.id)}
                                  className="py-1.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-teal-100 cursor-pointer"
                                >
                                  Publish Now (₦200 Code Fee)
                                </button>
                              )}

                              {/* Always afford the option to delete this exam if no longer usable */}
                              <button
                                onClick={() => handleDeleteExam(ex.id)}
                                className="p-2.5 text-rose-605 bg-rose-50 text-rose-600 hover:text-white hover:bg-rose-500 rounded-xl transition font-bold text-xs border border-rose-100 hover:border-rose-500"
                                title="Delete CBT Exam"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
                   {/* AI LESSON PLAN BUILDER */}
              {activeTab === "planner" && (
                <motion.div
                  key="planner"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Elegant week navigation menu */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                          <span className="p-1 px-1.5 bg-teal-50 text-teal-600 rounded-lg text-xs">W1-12</span>
                          Weekly Lesson Plan Navigation
                        </h4>
                        <p className="text-[11px] text-slate-500">Filter, browse or construct custom curriculum lesson plans weekly from week 1 to 12.</p>
                      </div>
                      <div className="text-[11px] bg-teal-50 text-teal-700 font-extrabold uppercase py-1 px-3 border border-teal-100 rounded-full">
                        {selectedFilterWeekPlan === "ALL" ? "Showing All Lesson Plans" : `Selected Filter: Week ${selectedFilterWeekPlan}`}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 overflow-x-auto">
                      <button
                        type="button"
                        onClick={() => handleSelectFilterWeekPlan("ALL")}
                        className={`px-3.5 py-2 text-xs font-black rounded-xl transition cursor-pointer border-none whitespace-nowrap ${
                          selectedFilterWeekPlan === "ALL"
                            ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        📅 All Weeks ({lessonPlans.length})
                      </button>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((wk) => {
                        const wkStr = String(wk);
                        const isSelected = selectedFilterWeekPlan === wkStr;
                        const count = lessonPlans.filter((p) => Number(p.week) === wk).length;
                        return (
                          <button
                            key={wk}
                            type="button"
                            onClick={() => handleSelectFilterWeekPlan(wkStr)}
                            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer border-none whitespace-nowrap ${
                              isSelected
                                ? "bg-teal-600 text-white shadow-md shadow-teal-500/20"
                                : "bg-slate-50 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            <span>Week {wk}</span>
                            {count > 0 && (
                              <span className={`text-[9px] font-black py-0.5 px-2 rounded-full ${isSelected ? "bg-white text-teal-700" : "bg-teal-100 text-teal-850"}`}>
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Form and Saved Plans Selection */}
                    <div className="lg:col-span-4 space-y-6">
                      
                      {/* Generator Form Card */}
                      <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-teal-50 text-teal-700 py-1 px-3 border border-teal-100 rounded-full font-bold uppercase block w-fit">
                            PLANNER GENERATOR
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal">Provide lesson parameters. Generates structured lessons with solved math steps or outlines beautifully.</p>

                        <form onSubmit={triggerGenerateLessonPlan} className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-600">School Name</label>
                            <div className="relative flex items-center">
                              <input type="text" placeholder="e.g. Landmark Academy" value={spinSchool} onChange={(e) => setSpinSchool(e.target.value)} className="bg-slate-50 rounded-xl border p-2 pr-10 text-xs w-full focus:outline-none" />
                              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                                <VoiceInputButton value={spinSchool} onTranscript={setSpinSchool} size="xs" />
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-600">Lecturer / Teacher Name</label>
                            <div className="relative flex items-center">
                              <input type="text" required value={spinTeacher} onChange={(e) => setSpinTeacher(e.target.value)} className="bg-slate-50 rounded-xl border p-2 pr-10 text-xs w-full focus:outline-none" />
                              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                                <VoiceInputButton value={spinTeacher} onTranscript={setSpinTeacher} size="xs" />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold text-slate-600">Subject</label>
                              <select value={spinSubject} onChange={(e) => setSpinSubject(e.target.value)} className="bg-slate-50 border rounded-xl p-2 text-[11px] w-full focus:outline-none">
                                {subjects.map((sub) => (
                                  <option key={sub} value={sub}>{sub}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold text-slate-600">Class Year</label>
                              <div className="relative flex items-center">
                                <input type="text" value={spinClass} onChange={(e) => setSpinClass(e.target.value)} className="bg-slate-50 rounded-xl border p-2 pr-10 text-xs w-full focus:outline-none" />
                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                                  <VoiceInputButton value={spinClass} onTranscript={setSpinClass} size="xs" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-600">Active Topic</label>
                            <div className="relative flex items-center">
                              <input required type="text" placeholder="e.g. Quadratic equations" value={spinTopic} onChange={(e) => setSpinTopic(e.target.value)} className="bg-slate-50 rounded-xl border p-2 pr-10 text-xs w-full focus:outline-none" />
                              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                                <VoiceInputButton value={spinTopic} onTranscript={setSpinTopic} size="xs" />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-600">Sub-topic Details</label>
                            <div className="relative flex items-center">
                              <input type="text" placeholder="e.g. Completing the square formula" value={spinSubTopic} onChange={(e) => setSpinSubTopic(e.target.value)} className="bg-slate-50 rounded-xl border p-2 pr-10 text-xs w-full focus:outline-none" />
                              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                                <VoiceInputButton value={spinSubTopic} onTranscript={setSpinSubTopic} size="xs" />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold text-slate-600">Hour duration</label>
                              <div className="relative flex items-center">
                                <input type="text" value={spinDuration} onChange={(e) => setSpinDuration(e.target.value)} className="bg-slate-50 rounded-xl border p-2 pr-10 text-xs w-full focus:outline-none" />
                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                                  <VoiceInputButton value={spinDuration} onTranscript={setSpinDuration} size="xs" />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold text-slate-600">Age indicator</label>
                              <div className="relative flex items-center">
                                <input type="text" value={spinAge} onChange={(e) => setSpinAge(e.target.value)} className="bg-slate-50 rounded-xl border p-2 pr-10 text-xs w-full focus:outline-none" />
                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                                  <VoiceInputButton value={spinAge} onTranscript={setSpinAge} size="xs" />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Week of term and Calendar Date selectors */}
                          <div className="grid grid-cols-2 gap-2 border-t pt-3">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-black text-rose-600">Syllabus Week</label>
                              <select value={spinWeek} onChange={(e) => setSpinWeek(e.target.value)} className="bg-white border text-rose-100 rounded-xl p-2 text-xs w-full focus:outline-none">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((w) => (
                                  <option key={w} value={String(w)}>Week {w}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-black text-rose-600">Select Date</label>
                              <input type="date" value={spinDate} onChange={(e) => setSpinDate(e.target.value)} className="bg-white border rounded-xl p-2 text-xs w-full focus:outline-none" />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={creatingPlan}
                            className="w-full py-3 bg-gradient-to-r from-teal-550 to-teal-600 bg-teal-650 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition duration-200 flex items-center justify-center gap-1 cursor-pointer border-none"
                          >
                            <Sparkles className="w-4 h-4" />
                            {creatingPlan ? "Compiling Tabular Lesson Structure..." : "Trigger Lesson Plan (₦50)"}
                          </button>
                        </form>
                      </div>

                      {/* Saved Content Listings filtered by active selected week */}
                      <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                            {selectedFilterWeekPlan === "ALL" ? "All Lesson Plans" : `Week ${selectedFilterWeekPlan} Syllabus Plans`}
                          </h3>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 py-0.5 px-2 rounded-full">
                            {lessonPlans.filter((p) => selectedFilterWeekPlan === "ALL" || String(p.week) === selectedFilterWeekPlan).length} Saved
                          </span>
                        </div>

                        <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                          {lessonPlans.filter((p) => selectedFilterWeekPlan === "ALL" || String(p.week) === selectedFilterWeekPlan).length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                              <p className="text-xs text-slate-400 font-bold">No lesson plans for this week range</p>
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedFilterWeekPlan !== "ALL") {
                                    setSpinWeek(selectedFilterWeekPlan);
                                  }
                                  alert(`Form is automatically pre-configured for Week ${selectedFilterWeekPlan !== "ALL" ? selectedFilterWeekPlan : "1"}! Just provide a Topic above to generate.`);
                                }}
                                className="text-[10px] text-teal-600 font-extrabold mt-1 underline block mx-auto bg-transparent border-none cursor-pointer"
                              >
                                Preconfigure Week Context now
                              </button>
                            </div>
                          ) : (
                            lessonPlans
                              .filter((p) => selectedFilterWeekPlan === "ALL" || String(p.week) === selectedFilterWeekPlan)
                              .map((plan) => {
                                const isActive = activePlan?.id === plan.id;
                                return (
                                  <div
                                    key={plan.id}
                                    onClick={() => setActivePlan(plan)}
                                    className={`p-3 rounded-2xl border transition cursor-pointer text-left space-y-1.5 relative group ${
                                      isActive
                                        ? "border-teal-500 bg-teal-50/40 shadow-xs"
                                        : "border-slate-150 bg-white hover:border-slate-350"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <span className="text-[9px] bg-teal-50 text-teal-850 py-0.5 px-2 border border-teal-100 rounded-full font-bold uppercase">
                                        Wk {plan.week || "1"} • {plan.subject}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm("Are you sure you want to remove this lesson plan?")) {
                                            setLessonPlans((prev) => prev.filter((p) => p.id !== plan.id));
                                            if (activePlan?.id === plan.id) {
                                              setActivePlan(null);
                                            }
                                          }
                                        }}
                                        className="text-slate-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100 p-1 bg-slate-50 rounded-lg border-none cursor-pointer"
                                        title="Delete local draft"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-black text-slate-800 line-clamp-1">{plan.topic}</h4>
                                      <p className="text-[10px] text-slate-400 font-bold line-clamp-1">Sub: {plan.subTopic || plan.topic}</p>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-medium">📅 Date: {plan.date || "N/A"}</p>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Right Column: Preview of Active Lesson Plan Details */}
                    <div className="lg:col-span-8">
                      {activePlan ? (
                        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-6">
                          <div className="flex flex-wrap items-center justify-between border-b pb-4 gap-4">
                            <div>
                              <span className="text-[9px] bg-teal-50 text-teal-700 py-1 px-3 border border-teal-100 rounded-full font-bold uppercase">
                                Week {activePlan.week || "1"} Plan Preview • ₦50 Charged
                              </span>
                              <h4 className="text-sm font-black text-slate-850 mt-1 text-slate-900">{activePlan.subject}: {activePlan.topic} Plan</h4>
                            </div>
                             <div className="flex flex-wrap items-center gap-3">
                              <button
                                onClick={() => {
                                  const text = document.getElementById("active_plan_printable")?.innerText || "";
                                  speakText(text, isPlayingPlanTTS, setIsPlayingPlanTTS);
                                }}
                                className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold cursor-pointer animate-fade-in border-none transition-all ${
                                  isPlayingPlanTTS
                                    ? "bg-rose-500 text-white hover:bg-rose-600 animate-pulse"
                                    : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                                }`}
                                title={isPlayingPlanTTS ? "Stop Text-to-Speech playback" : "Read lesson plan text out loud"}
                              >
                                <Volume2 className={`w-4 h-4 ${isPlayingPlanTTS ? "animate-bounce text-white" : "text-amber-700"}`} />
                                {isPlayingPlanTTS ? "Stop Voice" : "🔊 Listen / Read Aloud"}
                              </button>
                              <button
                                onClick={() => handlePrintPDF("active_plan_printable", `${activePlan.topic} Lesson Plan`, true)}
                                className="bg-slate-50 border border-slate-250 p-2 rounded-xl text-slate-705 hover:bg-slate-100 flex items-center gap-1.5 text-xs font-bold cursor-pointer animate-fade-in border-none"
                              >
                                <Printer className="w-4 h-4 text-indigo-600" /> Print Directly
                              </button>
                              <button
                                onClick={() => handleDownloadPDFDirectly("active_plan_printable", `${activePlan.topic} Lesson Plan`, true)}
                                className="bg-rose-50 border border-rose-250 text-rose-700 p-2 rounded-xl hover:bg-rose-100 flex items-center gap-1.5 text-xs font-bold cursor-pointer animate-fade-in border-none"
                              >
                                <FileText className="w-4 h-4 text-rose-600" /> Download PDF
                              </button>
                              <button
                                onClick={() => handleWordExportHtml("active_plan_printable", `${activePlan.topic}_lesson_plan.doc`, true)}
                                className="bg-indigo-55 border border-indigo-250 text-indigo-750 p-2 rounded-xl hover:bg-slate-100 flex items-center gap-1.5 text-xs font-bold cursor-pointer animate-fade-in border-none"
                              >
                                <Download className="w-4 h-4 text-blue-600" /> Download Word
                              </button>
                            </div>
                          </div>

                          {/* Master Plan Table - Encompasses basic info, core outcomes, activities, evaluations & homework in unique row lines */}
                          <div 
                            id="active_plan_printable" 
                            style={{ fontSize: planFontSize, ['--plan-font-size' as any]: planFontSize }}
                            className="p-5 bg-white rounded-2xl border border-slate-150 overflow-x-auto select-text font-medium text-[inherit]"
                          >
                            <table className="w-full border-collapse border-2 border-slate-800 text-slate-900 bg-white" style={{ tableLayout: "fixed", width: "100%", fontSize: "inherit" }}>
                              <colgroup>
                                <col style={{ width: "16%" }} />
                                <col style={{ width: "34%" }} />
                                <col style={{ width: "25%" }} />
                                <col style={{ width: "25%" }} />
                              </colgroup>
                              <tbody>
                                {/* Basic Info Rows */}
                                <tr>
                                  <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ fontSize: "inherit" }}><strong>School Name</strong></td>
                                  <td className="border border-slate-400 p-2 text-slate-850 font-semibold" style={{ fontSize: "inherit" }}>{activePlan.schoolName || activePlan.plan?.schoolInformation}</td>
                                  <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ fontSize: "inherit" }}><strong>Author (Lecturer)</strong></td>
                                  <td className="border border-slate-400 p-2 text-slate-850 font-semibold" style={{ fontSize: "inherit" }}>{activePlan.teacherName}</td>
                                </tr>
                                <tr>
                                  <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ fontSize: "inherit" }}><strong>Class Target</strong></td>
                                  <td className="border border-slate-400 p-2 text-slate-850 font-semibold" style={{ fontSize: "inherit" }}>{activePlan.classLevel}</td>
                                  <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ fontSize: "inherit" }}><strong>Syllabus Week & Term</strong></td>
                                  <td className="border border-slate-400 p-2 text-slate-850 font-semibold" style={{ fontSize: "inherit" }}>Week {activePlan.week || "1"} • {activePlan.plan?.term || activePlan.term || "First Term"}</td>
                                </tr>
                                <tr>
                                  <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ fontSize: "inherit" }}><strong>Subject Domain</strong></td>
                                  <td className="border border-slate-400 p-2 text-slate-850 font-semibold" style={{ fontSize: "inherit" }}>{activePlan.subject}</td>
                                  <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ fontSize: "inherit" }}><strong>Planned Date</strong></td>
                                  <td className="border border-slate-400 p-2 text-slate-850 font-semibold" style={{ fontSize: "inherit" }}>{activePlan.date || "N/A"}</td>
                                </tr>
                                <tr>
                                  <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ fontSize: "inherit" }}><strong>Topic Context</strong></td>
                                  <td className="border border-slate-400 p-2 text-slate-850 font-semibold" style={{ fontSize: "inherit" }}>{activePlan.topic} {activePlan.subTopic ? `(Sub: ${activePlan.subTopic})` : ''}</td>
                                  <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ fontSize: "inherit" }}><strong>Duration Metrics</strong></td>
                                  <td className="border border-slate-400 p-2 text-slate-850 font-semibold" style={{ fontSize: "inherit" }}>{activePlan.duration || activePlan.plan?.duration || "45 Mins"}</td>
                                </tr>

                                {/* Section 2: Core parameters as sprawling rows */}
                                <tr>
                                  <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ fontSize: "inherit" }}><strong>Core Objectives</strong></td>
                                  <td className="border border-slate-400 p-2 text-slate-800" colSpan={3} style={{ fontSize: "inherit" }}>
                                    <ul className="list-disc list-outside pl-4 space-y-0.5 font-medium" style={{ fontSize: "inherit" }}>
                                      {(activePlan.plan?.behaviouralObjectives || activePlan.plan?.lessonObjectives || []).map((x, i) => (
                                        <li key={i} style={{ fontSize: "inherit" }} dangerouslySetInnerHTML={{ __html: renderFormattedMath(x) }} />
                                      ))}
                                    </ul>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ fontSize: "inherit" }}><strong>Instructional Materials</strong></td>
                                  <td className="border border-slate-400 p-2 text-slate-800 font-medium" colSpan={3} style={{ fontSize: "inherit" }}>
                                    <span style={{ fontSize: "inherit" }} dangerouslySetInnerHTML={{ __html: renderFormattedMath(Array.isArray(activePlan.plan?.instructionalMaterials) ? activePlan.plan?.instructionalMaterials?.join(", ") : (activePlan.plan?.instructionalMaterials || "N/A")) }} />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ fontSize: "inherit" }}><strong>Reference Materials</strong></td>
                                  <td className="border border-slate-400 p-2 text-slate-800 font-medium" colSpan={3} style={{ fontSize: "inherit" }}>
                                    <span style={{ fontSize: "inherit" }} dangerouslySetInnerHTML={{ __html: renderFormattedMath(Array.isArray(activePlan.plan?.referenceMaterials) ? activePlan.plan?.referenceMaterials?.join(", ") : (activePlan.plan?.referenceMaterials || "N/A")) }} />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ fontSize: "inherit" }}><strong>Previous Knowledge</strong></td>
                                  <td className="border border-slate-400 p-2 text-slate-800 font-medium" colSpan={3} style={{ fontSize: "inherit" }}>
                                    <span style={{ fontSize: "inherit" }} dangerouslySetInnerHTML={{ __html: renderFormattedMath(activePlan.plan?.previousKnowledge || activePlan.plan?.entryBehaviour || "N/A") }} />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ fontSize: "inherit" }}><strong>Lesson Introduction</strong></td>
                                  <td className="border border-slate-400 p-2 text-slate-800 font-medium" colSpan={3} style={{ fontSize: "inherit" }}>
                                    <span style={{ fontSize: "inherit" }} dangerouslySetInnerHTML={{ __html: renderFormattedMath(activePlan.plan?.introduction || "N/A") }} />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ fontSize: "inherit" }}><strong>Entry pupil behavior</strong></td>
                                  <td className="border border-slate-400 p-2 text-slate-800 font-medium" colSpan={3} style={{ fontSize: "inherit" }}>
                                    <span style={{ fontSize: "inherit" }} dangerouslySetInnerHTML={{ __html: renderFormattedMath(activePlan.plan?.entryBehaviour || "N/A") }} />
                                  </td>
                                </tr>

                                {/* Header Row for Steps within main table */}
                                <tr className="bg-slate-800 text-white select-none">
                                  <td className="border border-slate-800 text-center font-extrabold uppercase tracking-wider py-1.5 text-xs text-white" colSpan={4} style={{ fontSize: "inherit", color: "white" }}>
                                    Presentation Steps Schedule
                                  </td>
                                </tr>
                                <tr className="bg-slate-100 font-black">
                                  <td className="border border-slate-400 p-2 font-bold text-center" style={{ fontSize: "inherit" }}>Step Indicator</td>
                                  <td className="border border-slate-400 p-2 font-bold" style={{ fontSize: "inherit" }}>Teacher's core activities</td>
                                  <td className="border border-slate-400 p-2 font-bold" style={{ fontSize: "inherit" }}>Pupil/Student actions</td>
                                  <td className="border border-slate-400 p-2 font-bold" style={{ fontSize: "inherit" }}>Learning Points</td>
                                </tr>

                                {/* Dynamic steps */}
                                {activePlan.plan?.presentationSteps?.map((pStep, pidx) => (
                                  <tr key={pidx}>
                                    <td className="border border-slate-400 p-2 font-bold text-center bg-slate-50/50" style={{ fontSize: "inherit" }} dangerouslySetInnerHTML={{ __html: renderFormattedMath(pStep.step || `Step ${pidx + 1}`) }} />
                                    <td className="border border-slate-400 p-2" style={{ fontSize: "inherit" }} dangerouslySetInnerHTML={{ __html: renderFormattedMath(pStep.teachersActivities) }} />
                                    <td className="border border-slate-400 p-2" style={{ fontSize: "inherit" }} dangerouslySetInnerHTML={{ __html: renderFormattedMath(pStep.studentsActivities || pStep.learnersActivities || "N/A") }} />
                                    <td className="border border-slate-400 p-2 italic" style={{ fontSize: "inherit" }} dangerouslySetInnerHTML={{ __html: renderFormattedMath(pStep.learningPoints || "N/A") }} />
                                  </tr>
                                ))}

                                {/* Bottom Block Title */}
                                <tr className="bg-slate-800 text-white select-none">
                                  <td className="border border-slate-800 text-center font-extrabold uppercase tracking-wider py-1.5 text-xs text-white" colSpan={4} style={{ fontSize: "inherit", color: "white" }}>
                                    Summary, Evaluation & assignments
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ fontSize: "inherit" }}><strong>Summary / Conclusion</strong></td>
                                  <td className="border border-slate-400 p-2 text-slate-800 leading-relaxed font-medium" colSpan={3} style={{ fontSize: "inherit" }} dangerouslySetInnerHTML={{ __html: renderFormattedMath(activePlan.plan?.conclusion || activePlan.plan?.summary || "N/A") }} />
                                </tr>
                                {activePlan.plan?.evaluation && (
                                  <tr>
                                    <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ fontSize: "inherit" }}><strong>Class Evaluation</strong></td>
                                    <td className="border border-slate-400 p-2 text-slate-800 font-medium" colSpan={3} style={{ fontSize: "inherit" }}>
                                      <div style={{ fontSize: "inherit" }}>
                                        {renderFormattedList(activePlan.plan?.evaluation)}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                <tr>
                                  <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ fontSize: "inherit" }}><strong>Take Home Homework</strong></td>
                                  <td className="border border-slate-400 p-2 text-slate-850 font-medium" colSpan={3} style={{ fontSize: "inherit" }}>
                                    <div style={{ fontSize: "inherit" }}>
                                      {renderFormattedList(activePlan.plan?.assignment)}
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-3">
                          <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                            📅
                          </div>
                          <h4 className="text-base font-black text-slate-800">No Weekly Plan Active</h4>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Please select a saved lesson plan from the sidebar, or fill out the generator on the left to structure a complete table schedule instantly!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* AI LESSON NOTE MODULE */}
              {activeTab === "notes" && (
                <motion.div
                  key="notes"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Elegant week navigation menu */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                          <span className="p-1 px-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs">W1-12</span>
                          Weekly Lesson Note Navigation
                        </h4>
                        <p className="text-[11px] text-slate-500">Filter, browse or construct custom study notes weekly from week 1 to 12.</p>
                      </div>
                      <div className="text-[11px] bg-emerald-50 text-emerald-705 font-extrabold uppercase py-1 px-3 border border-emerald-100 rounded-full">
                        {selectedFilterWeekNote === "ALL" ? "Showing All Lesson Notes" : `Selected Filter: Week ${selectedFilterWeekNote}`}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 overflow-x-auto">
                      <button
                        type="button"
                        onClick={() => handleSelectFilterWeekNote("ALL")}
                        className={`px-3.5 py-2 text-xs font-black rounded-xl transition cursor-pointer border-none whitespace-nowrap ${
                          selectedFilterWeekNote === "ALL"
                            ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        📝 All Weeks ({lessonNotes.length})
                      </button>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((wk) => {
                        const wkStr = String(wk);
                        const isSelected = selectedFilterWeekNote === wkStr;
                        const count = lessonNotes.filter((n) => Number(n.week) === wk).length;
                        return (
                          <button
                            key={wk}
                            type="button"
                            onClick={() => handleSelectFilterWeekNote(wkStr)}
                            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer border-none whitespace-nowrap ${
                              isSelected
                                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                                : "bg-slate-50 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            <span>Week {wk}</span>
                            {count > 0 && (
                              <span className={`text-[9px] font-black py-0.5 px-2 rounded-full ${isSelected ? "bg-white text-emerald-700" : "bg-emerald-100 text-emerald-850"}`}>
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Form and Saved Notes Selection */}
                    <div className="lg:col-span-4 space-y-6">
                      
                      {/* Generator Form Card */}
                      <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 py-1 px-3 border border-emerald-100 rounded-full font-bold uppercase block w-fit">
                            NOTE CONSTRUCTOR
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal">Provide lesson note context. Generates notes with detailed mathematical and chemical formulations.</p>

                        <form onSubmit={triggerGenerateLessonNote} className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-600">Subject domain</label>
                            <select value={noteSubject} onChange={(e) => setNoteSubject(e.target.value)} className="bg-slate-50 border rounded-xl p-2 text-xs w-full focus:outline-none">
                              {subjects.map((sub) => (
                                <option key={sub} value={sub}>{sub}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-600">Target grade Level</label>
                            <div className="relative flex items-center">
                              <input type="text" value={noteClass} onChange={(e) => setNoteClass(e.target.value)} className="bg-slate-50 rounded-xl border p-2 pr-10 text-xs w-full focus:outline-none" />
                              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                                <VoiceInputButton value={noteClass} onTranscript={setNoteClass} size="xs" />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-600">Topic Area</label>
                            <div className="relative flex items-center">
                              <input required type="text" placeholder="e.g. Laws of Motion" value={noteTopic} onChange={(e) => setNoteTopic(e.target.value)} className="bg-slate-50 rounded-xl border p-2 pr-10 text-xs w-full focus:outline-none" />
                              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                                <VoiceInputButton value={noteTopic} onTranscript={setNoteTopic} size="xs" />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-600">Sub-topic Context</label>
                            <div className="relative flex items-center">
                              <input type="text" placeholder="e.g. Newton's second law" value={noteSubTopic} onChange={(e) => setNoteSubTopic(e.target.value)} className="bg-slate-50 rounded-xl border p-2 pr-10 text-xs w-full focus:outline-none" />
                              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                                <VoiceInputButton value={noteSubTopic} onTranscript={setNoteSubTopic} size="xs" />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold text-slate-600">Periods Length</label>
                              <div className="relative flex items-center">
                                <input type="text" value={notePeriods} onChange={(e) => setNotePeriods(e.target.value)} className="bg-slate-50 rounded-xl border p-2 pr-10 text-xs w-full focus:outline-none" />
                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                                  <VoiceInputButton value={notePeriods} onTranscript={setNotePeriods} size="xs" />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold text-slate-600">Complexity</label>
                              <select value={noteDifficulty} onChange={(e: any) => setNoteDifficulty(e.target.value)} className="bg-slate-50 border rounded-xl p-2 text-xs w-full focus:outline-none">
                                <option value="Easy">Easy (Interactive)</option>
                                <option value="Medium">Medium (Standard)</option>
                                <option value="Hard">Hard (Deep analysis)</option>
                              </select>
                            </div>
                          </div>

                          {/* Week of term and Calendar Date selectors */}
                          <div className="grid grid-cols-2 gap-2 border-t pt-3">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-black text-rose-600">Syllabus Week</label>
                              <select value={noteWeek} onChange={(e) => setNoteWeek(e.target.value)} className="bg-white border text-rose-100 rounded-xl p-2 text-xs w-full focus:outline-none">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((w) => (
                                  <option key={w} value={String(w)}>Week {w}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-black text-rose-600">Select Date</label>
                              <input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} className="bg-white border rounded-xl p-2 text-xs w-full focus:outline-none" />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={creatingNote}
                            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1 cursor-pointer border-none"
                          >
                            <Sparkles className="w-4 h-4" />
                            {creatingNote ? "Compiling detailed note sheets..." : "Trigger Lesson Notes (₦50)"}
                          </button>
                        </form>
                      </div>

                      {/* Saved Content Listings filtered by active selected week */}
                      <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                            {selectedFilterWeekNote === "ALL" ? "All Lesson Notes" : `Week ${selectedFilterWeekNote} Notes`}
                          </h3>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 py-0.5 px-2 rounded-full">
                            {lessonNotes.filter((n) => selectedFilterWeekNote === "ALL" || String(n.week) === selectedFilterWeekNote).length} Saved
                          </span>
                        </div>

                        <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                          {lessonNotes.filter((n) => selectedFilterWeekNote === "ALL" || String(n.week) === selectedFilterWeekNote).length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                              <p className="text-xs text-slate-400 font-bold">No lesson notes for this week range</p>
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedFilterWeekNote !== "ALL") {
                                    setNoteWeek(selectedFilterWeekNote);
                                  }
                                  alert(`Form is automatically pre-configured for Week ${selectedFilterWeekNote !== "ALL" ? selectedFilterWeekNote : "1"}! Just provide a Topic above to generate.`);
                                }}
                                className="text-[10px] text-emerald-600 font-extrabold mt-1 underline block mx-auto bg-transparent border-none cursor-pointer"
                              >
                                Preconfigure Week Context now
                              </button>
                            </div>
                          ) : (
                            lessonNotes
                              .filter((n) => selectedFilterWeekNote === "ALL" || String(n.week) === selectedFilterWeekNote)
                              .map((note) => {
                                const isActive = activeNote?.id === note.id;
                                return (
                                  <div
                                    key={note.id}
                                    onClick={() => {
                                      setActiveNote(note);
                                      setEditingNoteText(note.content.detailedNote || "");
                                    }}
                                    className={`p-3 rounded-2xl border transition cursor-pointer text-left space-y-1.5 relative group ${
                                      isActive
                                        ? "border-emerald-500 bg-emerald-50/40 shadow-xs"
                                        : "border-slate-150 bg-white hover:border-slate-350"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <span className="text-[9px] bg-emerald-50 text-emerald-850 py-0.5 px-2 border border-emerald-100 rounded-full font-bold uppercase">
                                        Wk {note.week || "1"} • {note.subject}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm("Are you sure you want to remove this notebook entry?")) {
                                            setLessonNotes((prev) => prev.filter((n) => n.id !== note.id));
                                            if (activeNote?.id === note.id) {
                                              setActiveNote(null);
                                            }
                                          }
                                        }}
                                        className="text-slate-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100 p-1 bg-slate-50 rounded-lg border-none cursor-pointer"
                                        title="Delete local draft"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-black text-slate-800 line-clamp-1">{note.topic}</h4>
                                      <p className="text-[10px] text-slate-400 font-bold line-clamp-1">Sub: {note.subTopic || note.topic}</p>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-medium">📅 Date: {note.date || "N/A"}</p>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Right Column: Preview of Active Lesson Note Details */}
                    <div className="lg:col-span-8">
                      {activeNote ? (
                        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-6">
                          <div className="flex flex-wrap items-center justify-between border-b pb-4 gap-4">
                            <div>
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 py-1 px-3 border border-emerald-100 rounded-full font-bold uppercase">
                                Week {activeNote.week || "1"} Note Preview • ₦50 Charged
                              </span>
                              <h4 className="text-sm font-black text-slate-850 mt-1 text-slate-900">{activeNote.topic} Lesson Note</h4>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => {
                                  const text = document.getElementById("active_note_text_block")?.innerText || "";
                                  speakText(text, isPlayingNoteTTS, setIsPlayingNoteTTS);
                                }}
                                className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold cursor-pointer animate-fade-in border-none transition-all ${
                                  isPlayingNoteTTS
                                    ? "bg-rose-500 text-white hover:bg-rose-600 animate-pulse"
                                    : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                                }`}
                                title={isPlayingNoteTTS ? "Stop Text-to-Speech playback" : "Read lesson note out loud"}
                              >
                                <Volume2 className={`w-4 h-4 ${isPlayingNoteTTS ? "animate-bounce text-white" : "text-amber-700"}`} />
                                {isPlayingNoteTTS ? "Stop" : "🔊 Listen"}
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(editingNoteText);
                                  alert("Copied compiled note content to clipboard!");
                                }}
                                className="bg-slate-50 border p-2 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 text-xs font-semibold cursor-pointer border-slate-250 border-none"
                              >
                                <Copy className="w-4 h-4" /> Copy
                              </button>
                              <button
                                onClick={() => {
                                  setIsNoteEditMode(!isNoteEditMode);
                                }}
                                className="bg-slate-50 border p-2 rounded-xl text-slate-705 hover:bg-slate-100 flex items-center gap-1.5 text-xs font-semibold cursor-pointer border-slate-250 border-none"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> {isNoteEditMode ? "Save" : "Edit"}
                              </button>
                              <button
                                onClick={() => handlePrintPDF("active_note_text_block", `${activeNote.topic} Lesson Note`, false)}
                                className="bg-slate-55 border border-slate-250 p-2 rounded-xl text-slate-705 hover:bg-slate-100 flex items-center gap-1.5 text-xs font-semibold cursor-pointer border-none"
                              >
                                <Printer className="w-4 h-4 text-indigo-600" /> Print Directly
                              </button>
                              <button
                                onClick={() => handleDownloadPDFDirectly("active_note_text_block", `${activeNote.topic} Lesson Note`, false)}
                                className="bg-rose-50 border border-rose-250 text-rose-700 p-2 rounded-xl hover:bg-rose-100 flex items-center gap-1.5 text-xs font-semibold cursor-pointer border-none"
                              >
                                <FileText className="w-4 h-4 text-rose-600" /> Download PDF
                              </button>
                              <button
                                onClick={() => handleWordExportHtml("active_note_text_block", `${activeNote.topic}_note.doc`, false)}
                                className="bg-emerald-50 border border-emerald-250 text-emerald-805 p-2 rounded-xl hover:bg-emerald-100 flex items-center gap-1.5 text-xs font-semibold cursor-pointer animate-fade-in border-none"
                              >
                                <Download className="w-4 h-4 text-emerald-600" /> Download Word
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAiSubject(activeNote.subject);
                                  setAiTopic(activeNote.topic);
                                  setAiClass(activeNote.classLevel);
                                  setAiFromNoteContent(editingNoteText || activeNote.content.explanation || "");
                                  setActiveTab("ai_questions");
                                }}
                                className="bg-indigo-55 border border-indigo-200 text-indigo-700 py-2 px-3 rounded-xl hover:bg-indigo-100 flex items-center gap-1.5 text-xs font-extrabold cursor-pointer border-none"
                              >
                                💡 Set Exam Qs
                              </button>
                            </div>
                          </div>

                          {/* Main Note content */}
                          <div 
                            id="active_note_text_block" 
                            style={{ fontSize: noteFontSize, ['--note-font-size' as any]: noteFontSize }}
                            className="bg-white p-5 rounded-2xl border border-slate-150 overflow-x-auto select-text font-medium text-[inherit]"
                          >
                            {/* Edit Console */}
                            {isNoteEditMode ? (
                              <textarea
                                rows={12}
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-xl p-3 font-medium text-xs focus:outline-none focus:border-teal-500"
                              />
                            ) : (
                              <div className="space-y-6 text-slate-800 font-sans p-2 sm:p-4" style={{ fontSize: "inherit" }}>
                                {/* Topic Title Display */}
                                <div className="border-b-2 border-slate-900 pb-4">
                                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                                    {activeNote.topic} Lesson Note
                                  </h2>
                                </div>

                                {/* Main Lesson Content */}
                                <div className="space-y-6 leading-relaxed text-xs sm:text-sm">
                                  {/* Detailed Notes */}
                                  <div className="space-y-2">
                                    <div 
                                      className="text-slate-800 font-normal space-y-3 prose max-w-none break-words" 
                                      style={{ fontSize: "inherit" }} 
                                      dangerouslySetInnerHTML={{ __html: renderFormattedMath(editingNoteText) }} 
                                    />
                                  </div>

                                  {/* Evaluation Quiz */}
                                  {activeNote.content.evaluation && activeNote.content.evaluation.length > 0 && (
                                    <div className="space-y-2 pt-4 border-t border-slate-200">
                                      <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider border-b pb-1.5 flex items-center gap-2">
                                        <span className="w-1.5 h-3 bg-indigo-650 rounded-xs"></span>
                                        Evaluation Quiz
                                      </h3>
                                      <ul className="list-decimal ml-5 space-y-2" style={{ fontSize: "inherit" }}>
                                        {activeNote.content.evaluation.map((ev, evIdx) => (
                                          <li 
                                            key={evIdx} 
                                            className="text-slate-800 font-medium leading-relaxed" 
                                            style={{ fontSize: "inherit" }} 
                                            dangerouslySetInnerHTML={{ __html: renderFormattedMath(ev) }} 
                                          />
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-3">
                          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                            📝
                          </div>
                          <h4 className="text-base font-black text-slate-800">No Weekly Lesson Note Active</h4>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Please select a saved class note entry from the sidebar, or fill out the note constructor on the left to generate extremely detailed outlines for classroom teaching!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* AI QUESTION BANK MODULE */}
              {activeTab === "ai_questions" && (
                <motion.div
                  key="ai_questions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
                    <h3 className="text-base font-extrabold text-slate-900">CBT Question Pool extractor</h3>
                    <p className="text-xs text-slate-500">Query and extract standard curriculum multiple-choice questions for any topic with answers mapped automatically.</p>

                    {aiFromNoteContent && (
                      <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-xl flex items-center justify-between text-xs text-indigo-900 font-sans">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse animate-duration-1000" />
                          <p>
                            📚 <strong>Active Study Context:</strong> Questions will be strictly mapped from your generated lesson note <strong>({aiTopic})</strong>.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAiFromNoteContent("")}
                          className="py-1 px-2.5 bg-indigo-200 hover:bg-indigo-300 text-indigo-900 border-none rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Clear Note Context
                        </button>
                      </div>
                    )}

                    <form onSubmit={triggerGenerateAIEducatorQuestions} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Subject domain</label>
                        <select value={aiSubject} onChange={(e) => setAiSubject(e.target.value)} className="bg-slate-50 border rounded-xl p-2.5 text-xs w-full focus:outline-none font-semibold">
                          {subjects.map((sub) => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Target Class Category</label>
                        <select value={aiClass} onChange={(e) => setAiClass(e.target.value)} className="bg-slate-50 border rounded-xl p-2.5 text-xs w-full focus:outline-none font-semibold">
                          <option>Grade 1</option>
                          <option>Grade 2</option>
                          <option>Grade 3</option>
                          <option>Grade 4</option>
                          <option>Grade 5</option>
                          <option>Grade 6</option>
                          <option>Grade 7</option>
                          <option>Grade 8</option>
                          <option>Grade 9</option>
                          <option>Grade 10</option>
                          <option>Grade 11</option>
                          <option>Grade 12</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700 block mb-1">Topic details</label>
                        <div className="relative flex items-center">
                          <input required type="text" placeholder="e.g. 'all topics', 'Newton laws', 'Organic Chemistry'" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} className="bg-slate-50 border rounded-xl p-2 pr-10 text-xs w-full focus:outline-none" />
                          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                            <VoiceInputButton value={aiTopic} onTranscript={setAiTopic} size="xs" />
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium block mt-1">Specify a single topic, or enter <strong>"all topics"</strong> to generate from the complete syllabus coverage.</span>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Total questions count</label>
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => setAiCount(Math.max(1, aiCount - 1))}
                            className="w-10 h-10 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 font-black text-slate-700 flex items-center justify-center select-none active:scale-95 transition"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            required
                            value={aiCount}
                            onChange={(e) => setAiCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-2 w-16 text-center text-xs focus:outline-none font-extrabold text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => setAiCount(Math.min(50, aiCount + 1))}
                            className="w-10 h-10 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 font-black text-slate-700 flex items-center justify-center select-none active:scale-95 transition"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          {[5, 10, 15, 20, 25, 30, 40, 50].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setAiCount(preset)}
                              className={`py-1 px-2.5 rounded-lg text-[10px] font-extrabold border uppercase tracking-wider transition ${
                                aiCount === preset
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                              }`}
                            >
                              {preset} Qs
                            </button>
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium block">Select a preset or use step buttons to navigate to any custom count (Max 50).</span>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Difficulty</label>
                        <select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)} className="bg-slate-50 border rounded-xl p-2 w-full text-xs focus:outline-none font-semibold">
                          <option>Easy</option>
                          <option>Medium</option>
                          <option>Hard</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={generatingAiBank}
                        className="sm:col-span-2 py-3 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        {generatingAiBank ? "Gemini extracting question items..." : "Generate Objective Bank"}
                      </button>
                    </form>
                  </div>

                  {/* Question list retrieved with instant conversion mapping */}
                  {aiBankQuestions.length > 0 && (
                    <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4 animate-fade-in">
                      <div className="flex flex-wrap items-center justify-between border-b pb-4 gap-4">
                        <div>
                          <h4 className="text-[13px] font-black text-slate-800">Generated Practice Questions Pool ({aiBankQuestions.length})</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Custom Question Selection</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handlePrintPDF("ai_question_pool_printable", "Generated Practice Question Pool", false)}
                            className="bg-slate-50 border border-slate-250 text-slate-705 py-1.5 px-3.5 rounded-xl hover:bg-slate-100 flex items-center gap-1.5 text-xs font-semibold cursor-pointer border-none"
                          >
                            <Printer className="w-4 h-4 text-indigo-600" /> Print Directly
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadPDFDirectly("ai_question_pool_printable", "Generated Practice Question Pool", false)}
                            className="bg-rose-50 border border-rose-250 text-rose-700 py-1.5 px-3.5 rounded-xl hover:bg-rose-100 flex items-center gap-1.5 text-xs font-semibold cursor-pointer border-none"
                          >
                            <FileText className="w-4 h-4 text-rose-600" /> Download PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWordExportHtml("ai_question_pool_printable", "ai_practice_questions.doc", false)}
                            className="bg-emerald-50 border border-emerald-200 text-emerald-750 py-1.5 px-3.5 rounded-xl hover:bg-emerald-100 flex items-center gap-1.5 text-xs font-semibold cursor-pointer border-none bg-transparent"
                          >
                            <Download className="w-4 h-4 text-emerald-505" /> Download Word (Portrait)
                          </button>
                          <button
                            type="button"
                            onClick={handleConvertBankToExamDraft}
                            className="py-1.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[11px] rounded-lg shadow-sm cursor-pointer border-none"
                          >
                            Adapt instantly into CBT exam builder
                          </button>
                        </div>
                      </div>

                      <div id="ai_question_pool_printable" className="space-y-4">
                        {aiBankQuestions.map((q, idx) => (
                          <div key={idx} className="p-4 bg-slate-55 border border-slate-100 rounded-2xl text-xs space-y-2">
                            <p className="font-extrabold text-slate-800" dangerouslySetInnerHTML={{ __html: `${idx + 1}. ${renderFormattedMath(q.question)}` }} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                              <p dangerouslySetInnerHTML={{ __html: `<strong>A:</strong> ${renderFormattedMath(q.optionA)}` }} />
                              <p dangerouslySetInnerHTML={{ __html: `<strong>B:</strong> ${renderFormattedMath(q.optionB)}` }} />
                              <p dangerouslySetInnerHTML={{ __html: `<strong>C:</strong> ${renderFormattedMath(q.optionC)}` }} />
                              <p dangerouslySetInnerHTML={{ __html: `<strong>D:</strong> ${renderFormattedMath(q.optionD)}` }} />
                            </div>
                            <span className="inline-block bg-teal-100 text-teal-800 py-0.5 px-2.5 rounded-full font-bold">
                              correctAnswer: Option {q.correctAnswer}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* PERSONAL LIBRARY SYSTEM */}
              {activeTab === "library" && (
                <motion.div
                  key="library"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <MyLibrary user={user} onRefreshWallet={async () => {
                    try {
                      const res = await fetch("/api/auth/session");
                      const data = await res.json();
                      if (res.ok && data.user) {
                        setWalletBalance(data.user.walletBalance || 0);
                      }
                    } catch (e) {}
                  }} />
                </motion.div>
              )}

              {/* NIGERIAN SCHEME OF WORK PORTAL */}
              {activeTab === "scheme" && (
                <motion.div
                  key="scheme"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <SchemeOfWorkDashboard user={user} userPerspective="teacher" />
                </motion.div>
              )}

              {/* SCHOOL WALLET CREDITING PORTAL */}
              {activeTab === "wallet" && (
                <motion.div
                  key="wallet"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-teal-600 animate-pulse" />
                        Wallet Management & Payments
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Connect to your customized OPay integration page content. Complete bank transfers below to fund your active balance instantaneously.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                      {/* Left Side: OPay Bank Account Holder Details Card */}
                      <div className="p-6 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-150 relative overflow-hidden flex flex-col justify-between shadow-xs">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-teal-200/20 rounded-full -mr-8 -mt-8" />
                        <div className="space-y-4 relative">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] bg-teal-600 text-white font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                              OPay Direct Gateway
                            </span>
                            <span className="text-xs text-teal-700 font-bold">Nigeria Local Bank</span>
                          </div>

                          <div className="space-y-3 pt-2">
                            <div>
                              <p className="text-[10px] text-teal-600/80 uppercase font-black tracking-wider">Receiving Institution</p>
                              <p className="text-base font-black text-teal-950">OPay (Paycom)</p>
                            </div>

                            <div className="p-3 bg-white/70 rounded-xl border border-teal-200/50 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] text-teal-600/80 uppercase font-black tracking-wider">Account Number</p>
                                <p className="text-lg font-mono font-black text-teal-955 tracking-widest select-all">8062078597</p>
                              </div>
                              <button
                                type="button"
                                onClick={handleCopyOpayAccount}
                                className="p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-all font-semibold text-xs flex items-center gap-1 cursor-pointer"
                              >
                                {opayCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy No.</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div>
                              <p className="text-[10px] text-teal-600/80 uppercase font-black tracking-wider">Account Owner Name</p>
                              <p className="text-sm font-black text-teal-950 uppercase tracking-tight">
                                NWAIGBO AUGUSTINE CHIMAOBI
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-teal-200/50 space-y-2 text-[11px] text-teal-900 leading-relaxed font-medium">
                          <p className="font-bold flex items-center gap-1 text-teal-950">
                            💡 Simple Instructions:
                          </p>
                          <ul className="list-disc pl-4 space-y-1 text-[11px] text-teal-800">
                            <li>Open your bank app of choice and perform a normal transfer to the account above.</li>
                            <li>Ensure the recipient name reads <strong className="text-teal-950 font-extrabold text-xs">NWAIGBO AUGUSTINE CHIMAOBI</strong> before sending.</li>
                            <li>Once sent, enter the amount and transaction reference on the right to complete instantly.</li>
                          </ul>
                        </div>
                      </div>

                      {/* Right Side: Interactive Transfer Verification Form */}
                      <form onSubmit={handleOpayTransferSubmission} className="p-6 bg-slate-50 rounded-2xl border border-slate-150 space-y-4">
                        <span className="text-xs font-bold uppercase text-slate-400 block tracking-wider">
                          Verify & Instantly Credit Wallet
                        </span>

                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-black text-slate-700 block mb-1">Select Amount Transferred (₦)</label>
                            <div className="grid grid-cols-2 gap-2">
                              {[1000, 2500, 5000, 10000].map((amt) => (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() => setFundAmount(amt)}
                                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                                    fundAmount === amt
                                      ? "bg-teal-600 border-teal-600 text-white shadow-sm"
                                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                                  }`}
                                >
                                  ₦{amt.toLocaleString()}
                                </button>
                              ))}
                            </div>
                            <div className="mt-2 text-center text-[10px] text-slate-400 font-bold">
                              Or click on a preset above to configure the verifying amount.
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-black text-slate-700 block mb-1">Sender's Full Account Name</label>
                            <input
                              type="text"
                              value={senderName}
                              onChange={(e) => setSenderName(e.target.value)}
                              placeholder="e.g. ADEBISI SHOLA PATRICK"
                              className="bg-white border rounded-xl py-2 px-3 text-xs w-full focus:outline-none focus:ring-1 focus:ring-teal-500 font-semibold text-slate-800 shadow-xs"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-black text-slate-700 block mb-1">OPay Receipt Ref / Session ID Code</label>
                            <input
                              type="text"
                              value={transferRef}
                              onChange={(e) => setTransferRef(e.target.value)}
                              placeholder="e.g. 09072813958712 or receipt screenshot ID"
                              className="bg-white border rounded-xl py-2 px-3 text-xs w-full focus:outline-none focus:ring-1 focus:ring-teal-500 font-semibold text-slate-800 shadow-xs"
                              required
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={submittingOpayProof}
                          className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-slate-250 disabled:bg-slate-400"
                        >
                          {submittingOpayProof ? (
                            <span className="flex items-center gap-2">
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Verifying with OPay Gateway...
                            </span>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Submit & Verify OPay Transfer
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Transaction log files */}
                  <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
                    <h3 className="text-base font-extrabold text-slate-900">Your school transaction log</h3>
                    
                    {transactions.length === 0 ? (
                      <p className="text-xs text-slate-400">You have no transaction logs on record.</p>
                    ) : (
                      <div className="space-y-2">
                        {transactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between text-xs"
                          >
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-800">{tx.purpose}</p>
                              <p className="text-[10px] text-slate-400 font-medium">Ref: {tx.id} • {new Date(tx.date).toLocaleString()}</p>
                            </div>
                            <span className={`font-black text-sm ${tx.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>
                              {tx.type === "credit" ? "+" : "-"}₦{tx.amount.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* DOCUMENTS AND DOWNLOADS LIBRARY CENTER */}
              {activeTab === "downloads" && (
                <motion.div
                  key="downloads"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 animate-fade-in"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Library Overview Summary Cards */}
                    <div className="p-5 bg-gradient-to-tr from-blue-500 to-indigo-600 text-white rounded-2xl shadow-xs space-y-2 flex flex-col justify-between">
                      <div>
                        <BookOpen className="w-6 h-6 text-indigo-200" />
                        <h4 className="font-extrabold text-sm uppercase tracking-wider pt-2 opacity-90">Syllabus Lesson Plans</h4>
                        <p className="text-2xl font-black">{lessonPlans.length}</p>
                      </div>
                      <p className="text-[10px] opacity-75 font-medium">Fully formatted to fit exactly onto one A4 printable paper.</p>
                    </div>

                    <div className="p-5 bg-gradient-to-tr from-emerald-500 to-green-600 text-white rounded-2xl shadow-xs space-y-2 flex flex-col justify-between">
                      <div>
                        <Sparkles className="w-6 h-6 text-green-200" />
                        <h4 className="font-extrabold text-sm uppercase tracking-wider pt-2 opacity-90">Syllabus Lesson Notes</h4>
                        <p className="text-2xl font-black">{lessonNotes.length}</p>
                      </div>
                      <p className="text-[10px] opacity-75 font-medium">Omits math problems automatically for non-calculation courses.</p>
                    </div>

                    <div className="p-5 bg-gradient-to-tr from-rose-500 to-pink-600 text-white rounded-2xl shadow-xs space-y-2 flex flex-col justify-between">
                      <div>
                        <School className="w-6 h-6 text-pink-200" />
                        <h4 className="font-extrabold text-sm uppercase tracking-wider pt-2 opacity-90">Other Printable Records</h4>
                        <p className="text-2xl font-black">{exams.length + reportSheets.length}</p>
                      </div>
                      <p className="text-[10px] opacity-75 font-medium">Standardized progress report sheets and CBT exam rosters.</p>
                    </div>
                  </div>

                  {/* Documents Cabinets List */}
                  <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-100">
                      <div>
                        <h3 className="text-lg font-black text-slate-900">Official Document Roster</h3>
                        <p className="text-xs text-slate-500">Preview formatted sheets, print directly to hardware printers, or export as A4 PDF and editable Microsoft Word .doc formats.</p>
                      </div>
                    </div>

                    {/* Merged Items List */}
                    {(() => {
                      const allFiles = [
                        ...lessonPlans.map(p => ({
                          id: p.id,
                          type: "plan" as const,
                          typeName: "Lesson Plan",
                          title: p.topic,
                          subtitle: `${p.subject} • ${p.classLevel}`,
                          date: p.createdAt || p.date || new Date().toISOString(),
                          badgeClass: "bg-blue-50 text-blue-700 border-blue-150",
                          icon: <BookOpen className="w-4 h-4 text-blue-500" />,
                          raw: p
                        })),
                        ...lessonNotes.map(n => ({
                          id: n.id,
                          type: "note" as const,
                          typeName: "Lesson Note",
                          title: n.topic,
                          subtitle: `${n.subject} • ${n.classLevel}`,
                          date: n.createdAt || n.date || new Date().toISOString(),
                          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-150",
                          icon: <Sparkles className="w-4 h-4 text-emerald-500" />,
                          raw: n
                        })),
                        ...exams.map(e => ({
                          id: e.id,
                          type: "exam" as const,
                          typeName: "CBT Exam Sheet",
                          title: e.title,
                          subtitle: `${e.subject} • ${e.classLevel} (${e.questions?.length || 0} Questions)`,
                          date: e.createdAt || new Date().toISOString(),
                          badgeClass: "bg-violet-50 text-violet-700 border-violet-150",
                          icon: <GraduationCap className="w-4 h-4 text-violet-500" />,
                          raw: e
                        })),
                        ...reportSheets.map((r, index) => ({
                          id: r.id || `rep_${index}`,
                          type: "report" as const,
                          typeName: "Report Card",
                          title: `${r.studentName} Progress Sheet`,
                          subtitle: `${r.term || schoolConfig.term} • ${r.classLevel || selectedReportClassLevel}`,
                          date: new Date().toISOString(),
                          badgeClass: "bg-rose-50 text-rose-700 border-rose-150",
                          icon: <School className="w-4 h-4 text-rose-500" />,
                          raw: r
                        }))
                      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                      if (allFiles.length === 0) {
                        return (
                          <div className="text-center py-12 space-y-3">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                              <Download className="w-8 h-8" />
                            </div>
                            <h4 className="text-sm font-black text-slate-800">No generated files found in your workspace</h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">Generate a premium AI lesson plan or construct a syllabus notebook outline to build your professional downloads center.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                                <th className="p-4 font-black">Document Details</th>
                                <th className="p-4 font-black">Category type</th>
                                <th className="p-4 font-black">Created date</th>
                                <th className="p-4 font-black text-right">Actions Room</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {allFiles.map(file => (
                                <tr key={file.id} className="hover:bg-slate-50/70 transition">
                                  <td className="p-4 font-medium">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                                        {file.icon}
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-slate-900 text-sm leading-tight">{file.title}</h4>
                                        <p className="text-[10px] text-slate-500 font-medium">{file.subtitle}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${file.badgeClass}`}>
                                      {file.typeName}
                                    </span>
                                  </td>
                                  <td className="p-4 text-slate-500 font-medium">
                                    {new Date(file.date).toLocaleDateString()}
                                  </td>
                                  <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedDownloadItem({ type: file.type, data: file.raw })}
                                        className="py-1.5 px-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-lg border-none cursor-pointer transition flex items-center gap-1 shrink-0"
                                      >
                                        Eye preview
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              )}

              {/* CANDIDATE EXAMINATIONS AND RESULTS VIEW */}
              {activeTab === "results" && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="p-6 bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-3xl shadow-lg space-y-4 font-sans flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black">CBT Consolidated Reports Room</h3>
                      <p className="text-xs text-indigo-100 max-w-2xl leading-relaxed font-semibold mt-1">
                        To fulfill official requirements, student score logs taken from any assessment are grouped and accessible beneath each exam. 
                        You can download **all student candidate scores and grades onto a single consolidated file (.CSV)** for any CBT exam below.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadAllGlobalResults}
                      className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-5 py-3 rounded-xl transition duration-150 shadow-md flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shrink-0 border-none"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Export ALL Exam Results (.CSV)
                    </button>
                  </div>

                  <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
                    <h3 className="text-base font-extrabold text-slate-900 mb-2">My CBT Assessments & Active Student Logs</h3>
                    
                    {exams.length === 0 ? (
                      <p className="text-xs text-slate-400">You have no CBT exams created yet to track candidate progress.</p>
                    ) : (
                      <div className="space-y-6">
                        {exams.map((ex) => {
                          const resultsForExam = studentResults.filter(r => r.examId === ex.id);
                          return (
                            <div key={ex.id} className="p-6 bg-slate-50 border border-slate-150 rounded-2xl space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 py-0.5 px-2.5 rounded-full font-bold uppercase">
                                      {ex.subject}
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium">Exam ID Code: {ex.id}</span>
                                  </div>
                                  <h4 className="text-sm font-black text-slate-800">{ex.title}</h4>
                                  <p className="text-xs text-slate-500">
                                    Total Attempt Logs: <strong className="text-slate-900">{resultsForExam.length} Candidates</strong>
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDownloadConsolidatedExamResults(ex)}
                                  disabled={resultsForExam.length === 0}
                                  className={`py-2.5 px-4 rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 ${
                                    resultsForExam.length === 0
                                      ? "bg-slate-200 text-slate-400 cursor-not-allowed border-none"
                                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                                  }`}
                                  title="Download consolidated candidates sheet onto a single CSV file"
                                >
                                  <FileSpreadsheet className="w-4 h-4" />
                                  Download All Results as One File
                                </button>
                              </div>

                              {resultsForExam.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No student candidate has taken this exam yet.</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="min-w-full text-xs text-left text-slate-700">
                                    <thead>
                                      <tr className="border-b border-indigo-50 text-slate-400 uppercase tracking-wider font-extrabold text-[10px]">
                                        <th className="py-2.5 px-3">Student Candidate Name</th>
                                        <th className="py-2.5 px-3">Score Obtained</th>
                                        <th className="py-2.5 px-3">Percentage (%)</th>
                                        <th className="py-2.5 px-3">Date Completed</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/60">
                                      {resultsForExam.map((resItem) => (
                                        <tr key={resItem.id} className="hover:bg-indigo-50/10">
                                          <td className="py-2.5 px-3 font-bold text-slate-800">
                                            {resItem.studentName || "Anonymous Candidate"}
                                          </td>
                                          <td className="py-2.5 px-3 font-semibold text-slate-700">
                                            {resItem.score} / {ex.questions?.length * 5} Marks
                                          </td>
                                          <td className="py-2.5 px-3 font-black text-indigo-600">
                                            {resItem.percentage}%
                                          </td>
                                          <td className="py-2.5 px-3 text-slate-400 font-semibold">
                                            {new Date(resItem.date).toLocaleString()}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ACADEMIC TERM REPORT CARDS & SCHOOL CONFIGURATION */}
              {activeTab === "reports" && (
                <motion.div
                  key="reports"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* High Polished Sub-Tab Navigation for Reports */}
                  <div className="flex border-b border-slate-200 mb-6 font-sans">
                    <button
                      type="button"
                      onClick={() => setReportSubTab('reports')}
                      className={`py-3 px-6 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer border-none bg-transparent ${
                        reportSubTab === 'reports'
                          ? 'border-indigo-600 text-indigo-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      📊 Terminal Report Cards
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportSubTab('roster')}
                      className={`py-3 px-6 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer border-none bg-transparent ${
                        reportSubTab === 'roster'
                          ? 'border-indigo-600 text-indigo-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      📋 Class Student Roster
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportSubTab('bulkGrading')}
                      className={`py-3 px-6 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer border-none bg-transparent ${
                        reportSubTab === 'bulkGrading'
                          ? 'border-indigo-600 text-indigo-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      📝 Upload Marks by Subject
                    </button>
                  </div>

                  {reportSubTab === "reports" && (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                    {/* Column 1: School Profile Config */}
                    <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4 lg:col-span-1">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <School className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-sm font-black text-slate-800">School Profile Configuration</h3>
                      </div>
                      
                      <form onSubmit={handleSaveSchoolConfig} className="space-y-3.5 text-xs">
                        <div className="space-y-1">
                          <label className="font-extrabold text-slate-600 uppercase tracking-wider block">School Name</label>
                          <input
                            type="text"
                            required
                            value={schoolConfig.schoolName}
                            onChange={(e) => setSchoolConfig({ ...schoolConfig, schoolName: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-extrabold text-slate-600 uppercase tracking-wider block">Location / Address</label>
                          <input
                            type="text"
                            required
                            value={schoolConfig.location}
                            onChange={(e) => setSchoolConfig({ ...schoolConfig, location: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-extrabold text-slate-600 uppercase tracking-wider block">School Logo URL</label>
                          <input
                            type="text"
                            required
                            value={schoolConfig.schoolLogo}
                            onChange={(e) => setSchoolConfig({ ...schoolConfig, schoolLogo: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-extrabold text-slate-600 uppercase tracking-wider block">School Motto</label>
                          <input
                            type="text"
                            required
                            value={schoolConfig.schoolMotto}
                            onChange={(e) => setSchoolConfig({ ...schoolConfig, schoolMotto: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                          />
                          <p className="text-[10px] text-slate-400 font-extrabold font-mono italic">Primary school motto: wisdom, knowledge, and understanding</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="font-extrabold text-slate-600 uppercase tracking-wider block">School Term</label>
                            {(() => {
                              const isFirstComplete = reportSheets.some((sheet) => sheet.term === "First Term" && Object.keys(sheet.scores || {}).length > 0);
                              const isSecondComplete = reportSheets.some((sheet) => sheet.term === "Second Term" && Object.keys(sheet.scores || {}).length > 0);
                              return (
                                <select
                                  value={schoolConfig.term}
                                  onChange={(e) => setSchoolConfig({ ...schoolConfig, term: e.target.value })}
                                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                                >
                                  <option value="First Term">First Term</option>
                                  <option value="Second Term" disabled={!isFirstComplete}>
                                    Second Term {!isFirstComplete ? "🔒 (Do First Term first)" : ""}
                                  </option>
                                  <option value="Third Term" disabled={!isSecondComplete}>
                                    Third Term {!isSecondComplete ? "🔒 (Do Second Term first)" : ""}
                                  </option>
                                </select>
                              );
                            })()}
                          </div>
                          <div className="space-y-1">
                            <label className="font-extrabold text-slate-600 uppercase tracking-wider block">Times Opened</label>
                            <input
                              type="number"
                              required
                              value={schoolConfig.timesOpened}
                              onChange={(e) => setSchoolConfig({ ...schoolConfig, timesOpened: Number(e.target.value) })}
                              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl transition cursor-pointer"
                        >
                          Save Profile Header
                        </button>
                      </form>
                    </div>

                    {/* Column 2: Collate Results Engine */}
                    <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4 lg:col-span-2 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Sparkles className="w-5 h-5 text-indigo-600" />
                          <h3 className="text-sm font-black text-slate-800 font-sans">Automated CBT Results Collation Engine</h3>
                        </div>
                        <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                          Rather than manually processing grade outcomes at the end of term, click compile below to let the Engine crawls all student exam and tests marks completed online.
                        </p>
                        <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                          The system aggregates objective marks into standard <strong>First CA (20 marks)</strong>, <strong>Second CA (20 marks)</strong>, and <strong>Exam (60 marks)</strong> matrixes, validates rankings and averages, and formats school reports automatically.
                        </p>

                        <div className="p-4 bg-indigo-50 border border-indigo-150 rounded-2xl flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] text-indigo-400 font-extrabold uppercase block tracking-wider">Select Class to Compile</span>
                            <div className="flex items-center gap-2 font-black text-xs text-indigo-800">
                              <span>Selected:</span>
                              <strong className="text-indigo-950 underline">{selectedReportClassLevel}</strong>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={selectedReportClassLevel}
                              onChange={(e) => setSelectedReportClassLevel(e.target.value)}
                              className="bg-white border rounded-xl py-2 px-3 text-xs focus:outline-none font-bold text-slate-700"
                            >
                              <option>Grade 1</option>
                              <option>Grade 2</option>
                              <option>Grade 3</option>
                              <option>Grade 4</option>
                              <option>Grade 5</option>
                              <option>Grade 6</option>
                              <option>Grade 7</option>
                              <option>Grade 8</option>
                              <option>Grade 9</option>
                              <option>Grade 10</option>
                              <option>Grade 11</option>
                              <option>Grade 12</option>
                            </select>
                          </div>
                        </div>

                        {collateMessage && (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold font-sans">
                            {collateMessage}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <button
                          type="button"
                          onClick={handleCollateResults}
                          disabled={isCollating}
                          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                        >
                          {isCollating ? "Processing CBT database rows..." : `Compile Marks for ${selectedReportClassLevel}`}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setManualStudentName("");
                            setManualClassLevel(selectedReportClassLevel);
                            setManualCa1(0);
                            setManualCa2(0);
                            setManualExam(0);
                            setManualTeacherRemark("");
                            setManualPrincipalRemark("");
                            setEditingReport(null);
                            setShowReportFormModal(true);
                          }}
                          className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 border-none"
                        >
                          <Plus className="w-4 h-4" />
                          Manual Score Input
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Second Section: Student report data lists */}
                  <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">
                          Primary Class Registry for {selectedReportClassLevel}
                        </h3>
                        <p className="text-xs text-slate-400 font-semibold font-sans mt-0.5">
                          Showing compiled or manually inserted educational results.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border shadow-inner text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setShowSpreadsheetView(false);
                              setShowCumulativeView(false);
                            }}
                            className={`px-3 py-1.5 rounded-lg font-bold tracking-wide transition-all cursor-pointer border-none ${
                              !showSpreadsheetView && !showCumulativeView ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Individual Cards
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowSpreadsheetView(true);
                              setShowCumulativeView(false);
                            }}
                            className={`px-3 py-1.5 rounded-lg font-bold tracking-wide transition-all cursor-pointer border-none ${
                              showSpreadsheetView && !showCumulativeView ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Class Spreadsheet Matrix
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowSpreadsheetView(false);
                              setShowCumulativeView(true);
                            }}
                            className={`px-3 py-1.5 rounded-lg font-bold tracking-wide transition-all cursor-pointer border-none ${
                              showCumulativeView ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            ⭐ Year Cumulative Report
                          </button>
                        </div>
                      </div>
                    </div>

                    {reportSheets.filter(r => r.classLevel === selectedReportClassLevel).length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs italic space-y-2">
                        <p>No student results populated on file for {selectedReportClassLevel} yet.</p>
                        <p className="text-[10px] text-slate-400 font-sans">Click compile above to pull from CBT, or input scores manually.</p>
                      </div>
                    ) : showCumulativeView ? (
                      // Cumulative Academic Year Report view
                      <div id="printable_cumulative_broadsheet_view" className="space-y-6 bg-white p-2">
                        <div className="p-4 bg-indigo-50 border border-indigo-150 text-indigo-950 text-xs rounded-2xl flex items-center justify-between print:hidden">
                          <p className="font-semibold leading-relaxed">
                            💡 <strong>Printable Cumulative Broad Sheet:</strong> Below is the comprehensive view of student grade totals across all term sessions in the academic year.
                          </p>
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handlePrintPDF("printable_cumulative_broadsheet_view", "Year Cumulative Academic Report Broad Sheet", false)}
                              className="py-1.5 px-3 bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold rounded-lg shadow-xs cursor-pointer text-[10px] uppercase tracking-wider border-none flex items-center gap-1"
                            >
                              <Printer className="w-3.5 h-3.5 text-white" /> Print Directly
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadPDFDirectly("printable_cumulative_broadsheet_view", "Year Cumulative Academic Report Broad Sheet", false)}
                              className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg shadow-xs cursor-pointer text-[10px] uppercase tracking-wider border-none flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5 text-white" /> Download PDF
                            </button>
                          </div>
                        </div>

                        <div className="space-y-6">
                          {(() => {
                            const classReports = reportSheets.filter(r => r.classLevel === selectedReportClassLevel);
                            const studentNames = Array.from(new Set(classReports.map(r => r.studentName)));

                            return studentNames.map((studentName) => {
                              const studentReports = classReports.filter(r => r.studentName === studentName);
                              const studentSubjects = new Set<string>();
                              studentReports.forEach(r => {
                                if (r.scores) {
                                  Object.keys(r.scores).forEach(s => studentSubjects.add(s));
                                }
                              });

                              if (studentSubjects.size === 0) return null;

                              return (
                                <div key={studentName} className="p-5 bg-slate-50 border border-slate-150 rounded-2xl space-y-3 text-xs">
                                  <div className="flex justify-between items-center pb-2 border-b">
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">🏆 {studentName}</h4>
                                    <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-lg">Performance Collation</span>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs font-semibold font-sans">
                                      <thead>
                                        <tr className="border-b border-slate-200 text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                                          <th className="py-2">Subject Name</th>
                                          <th className="py-2">First Term</th>
                                          <th className="py-2">Second Term</th>
                                          <th className="py-2">Third Term</th>
                                          <th className="py-2">Cumulative Sum</th>
                                          <th className="py-2">Year Average</th>
                                          <th className="py-2">Grade Outcome</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Array.from(studentSubjects).map(subject => {
                                          const first = studentReports.find(r => r.term === "First Term")?.scores?.[subject]?.total;
                                          const second = studentReports.find(r => r.term === "Second Term")?.scores?.[subject]?.total;
                                          const third = studentReports.find(r => r.term === "Third Term")?.scores?.[subject]?.total;

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
                                            <tr key={subject} className="border-b border-slate-150 last:border-none font-medium text-slate-700">
                                              <td className="py-2 font-bold text-slate-800">{subject}</td>
                                              <td className="py-2 font-mono">{first !== undefined ? `${first}/100` : "-"}</td>
                                              <td className="py-2 font-mono">{second !== undefined ? `${second}/100` : "-"}</td>
                                              <td className="py-2 font-mono">{third !== undefined ? `${third}/100` : "-"}</td>
                                              <td className="py-2 font-mono font-bold text-slate-900">{totalSum}</td>
                                              <td className="py-2 font-mono font-bold text-indigo-650">{avg}%</td>
                                              <td className="py-2 font-sans">
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
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    ) : !showSpreadsheetView ? (
                      // Individual Card Listings
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reportSheets
                          .filter(r => r.classLevel === selectedReportClassLevel)
                          .map((sheet) => {
                            const subjectsCount = Object.keys(sheet.scores || {}).length;
                            return (
                              <div key={sheet.id} className="p-5 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col justify-between space-y-4">
                                <div className="space-y-2 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-extrabold font-mono text-slate-400">ID: {sheet.id}</span>
                                    <span className="bg-indigo-100 text-indigo-800 text-[10px] py-0.5 px-2 rounded-md font-bold uppercase tracking-wider">
                                      {sheet.term}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-black text-slate-800 truncate">{sheet.studentName}</h4>
                                  
                                  <div className="space-y-1 pt-1 font-semibold text-slate-500">
                                    <p>Subjects: <strong className="text-slate-700">{subjectsCount} Subjects</strong></p>
                                    <p>Final Average: <strong className="text-indigo-600">{sheet.studentAverage || 0}%</strong></p>
                                    <p>Class Average: <strong className="text-slate-700">{sheet.classAverage || 0}%</strong></p>
                                  </div>
                                </div>

                                <div className="flex gap-2 pt-2 border-t text-xs">
                                  <button
                                    onClick={() => setViewingReportId(sheet.id)}
                                    className="flex-1 py-1.5 font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition text-center flex items-center justify-center gap-1 cursor-pointer border-none"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    Print Report
                                  </button>
                                  <button
                                    onClick={() => handleEditReportClick(sheet)}
                                    className="py-1.5 px-2.5 font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition cursor-pointer"
                                    title="Edit Grades"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteReport(sheet.id)}
                                    className="py-1.5 px-2.5 font-bold bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-lg transition cursor-pointer"
                                    title="Delete Report Card"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      // Class Spreadsheet Grid Matrix View
                      (() => {
                        // Get all reports filtered by selected class and the active selected spreadsheetTerm
                        const classReports = reportSheets.filter(
                          r => r.classLevel === selectedReportClassLevel && r.term === spreadsheetTerm
                        );

                        // All unique subjects taught / scored in this class
                        const uniqueSubjects = Array.from(
                          new Set(
                            reportSheets
                              .filter(r => r.classLevel === selectedReportClassLevel)
                              .flatMap(r => Object.keys(r.scores || {}))
                          )
                        ) as string[];

                        // All student candidates in this class level.
                        // We obtain them from both compiled reports for this class, as well as student users on files!
                        const classStudentUsers = allUsers.filter(u => u.role === "student");
                        
                        const allStudentNames = Array.from(
                          new Set([
                            ...classReports.map(r => r.studentName),
                            ...classStudentUsers.map(u => u.name)
                          ])
                        ).filter(Boolean) as string[];

                        // Let's compute data for each student row
                        const studentRows = allStudentNames.map((studentName) => {
                          const sheet = classReports.find(
                            r => r.studentName.trim().toLowerCase() === studentName.trim().toLowerCase()
                          );

                          const subjectScores: {
                            [subject: string]: { ca1: number; ca2: number; exam: number; total: number; grade: string }
                          } = {};
                          
                          let totalScoreSum = 0;
                          let activeSubjCount = 0;

                          uniqueSubjects.forEach(subject => {
                            const detail = (sheet?.scores as any)?.[subject];
                            if (detail) {
                              const ca1 = Number(detail.ca1 || 0);
                              const ca2 = Number(detail.ca2 || 0);
                              const exam = Number(detail.exam || 0);
                              const total = Number(detail.total || 0);
                              const grade = detail.grade || "-";
                              
                              subjectScores[subject] = { ca1, ca2, exam, total, grade };
                              totalScoreSum += total;
                              activeSubjCount++;
                            } else {
                              subjectScores[subject] = { ca1: 0, ca2: 0, exam: 0, total: 0, grade: "-" };
                            }
                          });

                          // Aggregate average
                          const average = activeSubjCount > 0 
                            ? Math.round((totalScoreSum / activeSubjCount) * 10) / 10 
                            : (sheet?.studentAverage || 0);

                          return {
                            studentName,
                            subjectScores,
                            totalScoreSum,
                            average,
                            attendance: sheet?.attendance || "-",
                            hasReport: !!sheet
                          };
                        });

                        // Sort from highest performer (highest totalScoreSum) to lowest performer!
                        const sortedRows = [...studentRows].sort((a, b) => b.totalScoreSum - a.totalScoreSum);

                        // Calculate Positions handles ties cleanly
                        let currentRank = 0;
                        let prevScore = -1;
                        let rankInc = 1;

                        const rankedRows = sortedRows.map((student) => {
                          if (student.totalScoreSum !== prevScore) {
                            currentRank += rankInc;
                            rankInc = 1;
                          } else {
                            rankInc++;
                          }
                          prevScore = student.totalScoreSum;

                          const getSuffix = (rankVal: number) => {
                            const j = rankVal % 10, k = rankVal % 100;
                            if (j === 1 && k !== 11) return "st";
                            if (j === 2 && k !== 12) return "nd";
                            if (j === 3 && k !== 13) return "rd";
                            return "th";
                          };

                          return {
                            ...student,
                            position: `${currentRank}${getSuffix(currentRank)}`
                          };
                        });

                        return (
                          <div id="printable_spreadsheet_matrix_view" className="space-y-4 bg-white p-2">
                            {/* Control Bar */}
                            <div className="p-4 bg-emerald-55 border border-emerald-150 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
                              <div className="space-y-1">
                                <p className="font-extrabold text-emerald-900 text-xs flex items-center gap-1.5">
                                  <span>📊</span> Printable Class Spreadsheet Broad Sheet (All Students)
                                </p>
                                <p className="text-[11px] text-emerald-700 font-medium leading-normal">
                                  Lists all registered students, arranged from highest performer to lowest. Each subject cell represents <strong>[CA1 + CA2 + Exam = Total]</strong>.
                                </p>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Select Term:</span>
                                <select
                                  value={spreadsheetTerm}
                                  onChange={(e) => setSpreadsheetTerm(e.target.value)}
                                  className="bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs focus:outline-none font-bold text-slate-700 shadow-3sm cursor-pointer"
                                >
                                  <option value="First Term">First Term</option>
                                  <option value="Second Term">Second Term</option>
                                  <option value="Third Term">Third Term</option>
                                </select>
                                
                                <button
                                  type="button"
                                  onClick={() => handlePrintPDF("printable_spreadsheet_matrix_view", "Class Performance Spreadsheet Broad Sheet", true)}
                                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow-xs cursor-pointer text-xs flex items-center gap-1.5 border-none transition"
                                >
                                  <Printer className="w-3.5 h-3.5 text-white" /> Print Directly
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadPDFDirectly("printable_spreadsheet_matrix_view", "Class Performance Spreadsheet Broad Sheet", true)}
                                  className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg shadow-xs cursor-pointer text-xs flex items-center gap-1.5 border-none transition"
                                >
                                  <FileText className="w-3.5 h-3.5 text-white" /> Download PDF
                                </button>
                              </div>
                            </div>

                            {rankedRows.length === 0 ? (
                              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                                No student records found. Add students or compile marks first.
                              </div>
                            ) : (
                              <div className="overflow-x-auto border border-slate-150 rounded-2xl shadow-3sm bg-white print:border-none print:shadow-none">
                                <table className="min-w-full text-xs text-left divide-y text-slate-700 print:text-[10px]">
                                  <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[9px] tracking-wider sticky top-0 print:bg-white">
                                    <tr>
                                      <th className="py-3 px-3 text-center w-12 text-slate-900 font-extrabold bg-slate-100/60">Pos</th>
                                      <th className="py-3 px-4 min-w-[150px]">Student Candidates</th>
                                      {uniqueSubjects.map((subject: string) => (
                                        <th key={subject} className="py-3 px-3 text-center min-w-[130px]">
                                          <div className="font-black text-slate-800">{subject}</div>
                                          <div className="text-[8px] text-slate-400 lowercase font-medium">CA1 + CA2 + EXAM = TOT</div>
                                        </th>
                                      ))}
                                      <th className="py-3 px-4 text-center font-extrabold text-slate-900 bg-slate-50/80">Grand Total</th>
                                      <th className="py-3 px-4 text-center font-extrabold text-indigo-750 bg-indigo-50/50">Average %</th>
                                      <th className="py-3 px-4 text-center w-24">Attendance</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white">
                                    {rankedRows.map((row) => (
                                      <tr key={row.studentName} className="hover:bg-slate-50/50 transition last:border-none">
                                        <td className="py-3 px-3 text-center font-black text-indigo-600 bg-slate-50/80 text-xs">
                                          {row.position}
                                        </td>
                                        <td className="py-3 px-4 font-extrabold text-slate-900">
                                          {row.studentName}
                                        </td>
                                        {uniqueSubjects.map((subject: string) => {
                                          const scores = row.subjectScores[subject];
                                          const hasScore = scores.total > 0 || scores.ca1 > 0 || scores.ca2 > 0;
                                          return (
                                            <td key={subject} className="py-3 px-3 text-center border-l border-slate-100/60 last:border-r">
                                              {hasScore ? (
                                                <div className="space-y-0.5">
                                                  <div className="text-[10px] font-extrabold text-slate-800">
                                                    {scores.total} <span className="text-[8px] text-slate-400 font-bold uppercase">({scores.grade})</span>
                                                  </div>
                                                  <div className="text-[8px] text-slate-450 font-mono">
                                                    {scores.ca1} + {scores.ca2} + {scores.exam}
                                                  </div>
                                                </div>
                                              ) : (
                                                <span className="text-slate-350">-</span>
                                              )}
                                            </td>
                                          );
                                        })}
                                        <td className="py-3 px-4 text-center font-black text-slate-900 bg-slate-50/40 text-xs">
                                          {row.totalScoreSum}
                                        </td>
                                        <td className="py-3 px-4 text-center font-black text-indigo-650 bg-indigo-50/10 text-xs">
                                          {row.average}%
                                        </td>
                                        <td className="py-3 px-4 text-center text-slate-500 font-semibold text-[10px]">
                                          {row.attendance !== "-" ? `${row.attendance} / ${schoolConfig.timesOpened} D` : "-"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                    </>
                  )}

                  {reportSubTab === "roster" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in font-sans">
                      {/* Left Column: Add Student or Upload List */}
                      <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4 lg:col-span-1">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Plus className="w-5 h-5 text-indigo-600" />
                          <h3 className="text-sm font-black text-slate-800">Assign Student to {selectedReportClassLevel}</h3>
                        </div>
                        
                        {/* Single Student Form */}
                        <div className="space-y-3.5 text-xs">
                          <div className="space-y-1">
                            <label className="font-extrabold text-slate-600 uppercase tracking-wider block">Full Name</label>
                            <input
                              type="text"
                              value={singleStudentName}
                              onChange={(e) => setSingleStudentName(e.target.value)}
                              placeholder="e.g. Augusta Nwaigbo"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-750 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-extrabold text-slate-600 uppercase tracking-wider block">Reg Number (Optional)</label>
                            <input
                              type="text"
                              value={singleStudentReg}
                              onChange={(e) => setSingleStudentReg(e.target.value)}
                              placeholder="Leave empty to auto-generate"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-750 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!singleStudentName.trim()) {
                                setRosterStatusMsg("❌ Please input student name first!");
                                return;
                              }
                              setRosterStatusMsg("Saving student details...");
                              try {
                                const res = await fetch("/api/students/bulk-save", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    classLevel: selectedReportClassLevel,
                                    students: [{ name: singleStudentName, regNumber: singleStudentReg }]
                                  })
                                });
                                if (res.ok) {
                                  setSingleStudentName("");
                                  setSingleStudentReg("");
                                  setRosterStatusMsg("✅ Saved student successfully!");
                                  fetchTeacherData();
                                } else {
                                  setRosterStatusMsg("❌ Failed to save student.");
                                }
                              } catch (e) {
                                setRosterStatusMsg("❌ Network connection failed.");
                              }
                            }}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition cursor-pointer border-none"
                          >
                            Add to Registry
                          </button>
                        </div>

                        <div className="border-t pt-4">
                          <div className="flex items-center gap-2 pb-2">
                            <Upload className="w-4 h-4 text-slate-500" />
                            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Bulk Paste Registry Upload</h4>
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold mb-2 leading-relaxed">
                            Paste one name per line. Example: separator by comma or just student names straight:
                          </p>
                          <textarea
                            rows={5}
                            value={rosterBulkText}
                            onChange={(e) => setRosterBulkText(e.target.value)}
                            placeholder="Augusta Nwaigbo, REG/2026/011&#10;John Amadi, REG/2026/012&#10;Daniel Chioma"
                            className="w-full p-3 bg-slate-55 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 focus:outline-none"
                          />
                          <button
                            type="button; submit"
                            onClick={async () => {
                              if (!rosterBulkText.trim()) {
                                setRosterStatusMsg("❌ Please paste some student lines first!");
                                return;
                              }
                              setRosterStatusMsg("Uploading bulk names list...");
                              try {
                                const parsed = rosterBulkText.split("\n")
                                  .map(line => {
                                    if (!line.trim()) return null;
                                    const pts = line.split(",");
                                    return {
                                      name: pts[0].trim(),
                                      regNumber: pts[1] ? pts[1].trim() : ""
                                    };
                                  })
                                  .filter(Boolean);

                                const res = await fetch("/api/students/bulk-save", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    classLevel: selectedReportClassLevel,
                                    students: parsed
                                  })
                                });
                                if (res.ok) {
                                  setRosterBulkText("");
                                  setRosterStatusMsg(`✅ Successfully imported ${parsed.length} students!`);
                                  fetchTeacherData();
                                } else {
                                  setRosterStatusMsg("❌ Bulk upload failure response from server.");
                                }
                              } catch (e) {
                                setRosterStatusMsg("❌ Failed to reach database socket.");
                              }
                            }}
                            className="w-full mt-2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition cursor-pointer border-none"
                          >
                            Import Entire Roster Card
                          </button>
                        </div>

                        {rosterStatusMsg && (
                          <p className="text-[11px] text-indigo-805 font-bold text-center mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                            {rosterStatusMsg}
                          </p>
                        )}
                      </div>

                      {/* Right Column: Registry Listing */}
                      <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4 lg:col-span-2">
                        <div className="flex items-center justify-between pb-2 border-b">
                          <div>
                            <h3 className="text-sm font-black text-slate-850">Current Student List for {selectedReportClassLevel}</h3>
                            <p className="text-[11px] text-slate-400 font-semibold font-sans">
                              Students listed in this class arm can log in with default password **12345** using their Reg Number.
                            </p>
                          </div>
                          <span className="text-[11px] bg-slate-100/80 text-indigo-700 py-1 px-3 border border-indigo-100 rounded-full font-black">
                            {allUsers.filter(u => u.role === "student" && u.classLevel === selectedReportClassLevel).length} Students
                          </span>
                        </div>

                        <div className="overflow-y-auto max-h-[450px]">
                          <table className="min-w-full text-xs text-left text-slate-700">
                            <thead>
                              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-extrabold text-[9px]">
                                <th className="py-2.5 px-3">Student Name</th>
                                <th className="py-2.5 px-3">Registration Number</th>
                                <th className="py-2.5 px-3">Default Password</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                              {allUsers.filter(u => u.role === "student" && u.classLevel === selectedReportClassLevel).length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="py-12 text-center text-slate-400 italic">
                                    No students registered in this class level yet. Please select another class or add students on the left.
                                  </td>
                                </tr>
                              ) : (
                                allUsers.filter(u => u.role === "student" && u.classLevel === selectedReportClassLevel).map((u, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="py-2.5 px-3 font-bold text-slate-900">{u.name}</td>
                                    <td className="py-2.5 px-3 font-mono text-slate-500 select-all font-bold">{u.regNumber}</td>
                                    <td className="py-2.5 px-3 text-emerald-600 font-mono font-black">12345</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {reportSubTab === "bulkGrading" && (
                    <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4 animate-fade-in font-sans">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
                        <div>
                          <h3 className="text-sm font-black text-slate-850">Class Subject Marksheet for {selectedReportClassLevel}</h3>
                          <p className="text-xs text-slate-400 font-semibold font-sans mt-0.5">
                            Enter the continuous assessments (CA) and ultimate exam mark for the entire class under one subject below.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-500">Subject:</span>
                            <select
                              value={gradingSubject}
                              onChange={(e) => setGradingSubject(e.target.value)}
                              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                            >
                              {["Mathematics", "English Language", "Phonics", "Physics", "Chemistry", "Biology", "Agricultural Science", "Basic Technology", "Social Studies", "Artificial Intelligence", "Civic Education"].map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-500">Term:</span>
                            <select
                              value={gradingTerm}
                              onChange={(e) => setGradingTerm(e.target.value)}
                              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                            >
                              {["First Term", "Second Term", "Third Term"].map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {gradingScores.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 space-y-3">
                          <GraduationCap className="w-8 h-8 mx-auto text-slate-300 animate-pulse" />
                          <p className="text-xs font-bold leading-relaxed">
                            No student names registered in the registry for **{selectedReportClassLevel}**!
                          </p>
                          <button
                            type="button"
                            onClick={() => setReportSubTab("roster")}
                            className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer border-none"
                          >
                            Add students to Class Roster first
                          </button>
                        </div>
                      ) : (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setIsSavingGrading(true);
                            setGradingStatusMsg("Savingmarks to booklet database...");
                            try {
                              const res = await fetch("/api/report-sheets/bulk-subject-save", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          classLevel: selectedReportClassLevel,
                                          subject: gradingSubject,
                                          term: gradingTerm,
                                          scoresList: gradingScores
                                        })
                              });
                              if (res.ok) {
                                setGradingStatusMsg("✅ Academic marks compiled and class rankings re-positioned successfully!");
                                fetchTeacherData();
                              } else {
                                setGradingStatusMsg("❌ Server returned compile error.");
                              }
                            } catch (err) {
                              setGradingStatusMsg("❌ Failed to save grades.");
                            } finally {
                              setIsSavingGrading(false);
                            }
                          }}
                          className="space-y-4"
                        >
                          <div className="overflow-x-auto border border-slate-150 rounded-2xl">
                            <table className="min-w-full text-xs text-left text-slate-700">
                              <thead className="bg-slate-50 text-slate-500 font-extrabold text-[9px] uppercase border-b border-slate-150">
                                <tr className="divide-x divide-slate-100">
                                  <th className="py-2.5 px-3">Student Name</th>
                                  <th className="py-2.5 px-3">Reg Number</th>
                                  <th className="py-2.5 px-3 text-center">First CA (20 Max)</th>
                                  <th className="py-2.5 px-3 text-center">Second CA (20 Max)</th>
                                  <th className="py-2.5 px-3 text-center">Exam Score (60 Max)</th>
                                  <th className="py-2.5 px-3 bg-indigo-50/50 text-indigo-900 text-center">Grade Score % (100)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                {gradingScores.map((scoreRow, i) => {
                                  const totalRowMark = Number(scoreRow.ca1 || 0) + Number(scoreRow.ca2 || 0) + Number(scoreRow.exam || 0);
                                  return (
                                    <tr key={i} className="hover:bg-slate-50/20 divide-x divide-slate-100">
                                      <td className="py-2 px-3 font-bold text-slate-900">{scoreRow.studentName}</td>
                                      <td className="py-2 px-3 font-mono text-slate-500 font-bold">{scoreRow.regNumber}</td>
                                      <td className="py-2 px-3 text-center">
                                        <input
                                          type="number"
                                          min={0}
                                          max={20}
                                          value={scoreRow.ca1}
                                          onChange={(e) => {
                                            const next = [...gradingScores];
                                            next[i].ca1 = Number(e.target.value) || 0;
                                            setGradingScores(next);
                                          }}
                                          className="w-20 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold font-mono text-center text-slate-850"
                                        />
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <input
                                          type="number"
                                          min={0}
                                          max={20}
                                          value={scoreRow.ca2}
                                          onChange={(e) => {
                                            const next = [...gradingScores];
                                            next[i].ca2 = Number(e.target.value) || 0;
                                            setGradingScores(next);
                                          }}
                                          className="w-20 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold font-mono text-center text-slate-850"
                                        />
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <input
                                          type="number"
                                          min={0}
                                          max={60}
                                          value={scoreRow.exam}
                                          onChange={(e) => {
                                            const next = [...gradingScores];
                                            next[i].exam = Number(e.target.value) || 0;
                                            setGradingScores(next);
                                          }}
                                          className="w-20 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold font-mono text-center text-slate-850"
                                        />
                                      </td>
                                      <td className="py-2 px-3 bg-indigo-50/30 text-indigo-700 font-extrabold text-center font-mono">
                                        {totalRowMark} %
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                            <p className="text-[10px] text-slate-450 font-medium uppercase tracking-wider block leading-relaxed">
                              ✅ Recalculates all class positions, highest/lowest margins, and averages upon compilation!
                            </p>
                            <button
                              type="submit"
                              disabled={isSavingGrading}
                              className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer border-none"
                            >
                              {isSavingGrading ? "Saving Grades..." : "Compile Marks & Ranks"}
                            </button>
                          </div>

                          {gradingStatusMsg && (
                            <p className="text-[11px] text-teal-800 font-bold text-center mt-2 p-2 bg-teal-50 border border-teal-100 rounded-xl">
                              {gradingStatusMsg}
                            </p>
                          )}
                        </form>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* FULLSCREEN PRINTABLE REPORT CARD MODAL */}
      {viewingReportId && (
        (() => {
          const sheet = reportSheets.find(r => r.id === viewingReportId);
          if (!sheet) return null;

          const subjects = Object.entries(sheet.scores || {});

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto print:absolute print:inset-0 print:bg-white print:p-0">
              <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col print:max-h-none print:shadow-none print:w-full print:rounded-none">
                {/* Control bar */}
                <div className="p-4 bg-slate-900 text-slate-100 flex items-center justify-between sticky top-0 z-10 print:hidden shrink-0">
                  <div className="flex items-center gap-2">
                    <Printer className="w-5 h-5 text-indigo-400" />
                    <span className="text-xs font-black tracking-wide uppercase">Official Student Term Report Sheet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePrintPDF("printable_report_card_view", `${sheet.studentName} Report Card`, false)}
                      className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg transition cursor-pointer border-none flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5 text-white" /> Print Directly
                    </button>
                    <button
                      onClick={() => handleDownloadPDFDirectly("printable_report_card_view", `${sheet.studentName} Report Card`, false)}
                      className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-lg transition cursor-pointer border-none flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5 text-white" /> Download PDF
                    </button>
                    <button
                      onClick={() => setViewingReportId(null)}
                      className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition cursor-pointer border-none"
                    >
                      Close Card
                    </button>
                  </div>
                </div>

                {/* Printable Frame Area */}
                <div id="printable_report_card_view" className="p-8 md:p-12 space-y-8 font-sans bg-white text-slate-900 select-text flex-grow print:p-0">
                  {/* Report Card Header Layout */}
                  <div className="flex flex-col md:flex-row items-center justify-between pb-6 border-b-2 border-slate-900 gap-6">
                    <div className="flex items-center gap-4">
                      {schoolConfig.schoolLogo && (
                        <img
                          src={schoolConfig.schoolLogo}
                          alt="School Official Logo"
                          className="w-16 h-16 rounded-2xl object-cover bg-slate-100 p-1"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="text-left space-y-1">
                        <h2 className="text-2xl font-black uppercase text-slate-950 tracking-tight leading-none">{schoolConfig.schoolName}</h2>
                        <p className="text-xs text-slate-500 font-extrabold uppercase font-sans tracking-widest">{schoolConfig.location}</p>
                        <p className="text-[11px] italic text-slate-600 font-medium">Motto: "{schoolConfig.schoolMotto || "wisdom, knowledge, and understanding"}"</p>
                      </div>
                    </div>

                    <div className="text-center md:text-right space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-200 print:bg-white print:border-none print:p-0">
                      <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest leading-none">Term Assessment Report</h3>
                      <p className="text-xs font-bold font-sans text-slate-600 pt-1">{sheet.term || "Academic Term"}</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Official School Record</p>
                    </div>
                  </div>

                  {/* Pupil Registry Information Card */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-150 text-xs print:bg-white print:border-none print:p-0">
                    <div>
                      <span className="text-slate-400 font-bold tracking-wider uppercase text-[9px] block">Student Name</span>
                      <strong className="text-sm font-black text-slate-900">{sheet.studentName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold tracking-wider uppercase text-[9px] block">Class Arm</span>
                      <strong className="text-sm font-black text-slate-900">{sheet.classLevel}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold tracking-wider uppercase text-[9px] block">Term Attendance</span>
                      <strong className="text-sm font-black text-slate-900">{sheet.attendance || 115} / {schoolConfig.timesOpened} Opened Days</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold tracking-wider uppercase text-[9px] block">Report sheet UID</span>
                      <strong className="text-sm font-mono text-indigo-700 font-black tracking-widest uppercase">{sheet.id}</strong>
                    </div>
                  </div>

                  {/* Grades Matrix Grid table */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Cognitive & Subject Mark Analysis</h3>
                    <div className="overflow-x-auto border-2 border-slate-900 rounded-2xl">
                      <table className="min-w-full text-xs text-left divide-y-2 divide-slate-900 text-slate-800">
                        <thead className="bg-slate-50 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                          <tr className="divide-x-2 divide-slate-900">
                            <th className="py-2.5 px-3">Subject</th>
                            <th className="py-2.5 px-3 text-center">First CA (15)</th>
                            <th className="py-2.5 px-3 text-center">Second CA (15)</th>
                            <th className="py-2.5 px-3 text-center">Total CA (30)</th>
                            <th className="py-2.5 px-3 text-center">Exam Mark (70)</th>
                            <th className="py-2.5 px-3 text-center bg-indigo-50 font-black text-indigo-900">Total Score (100)</th>
                            <th className="py-2.5 px-3 text-center">Class Average</th>
                            <th className="py-2.5 px-3 text-center">Highest In Class</th>
                            <th className="py-2.5 px-3 text-center">Lowest In Class</th>
                            <th className="py-2.5 px-3 text-center">Subject Rank</th>
                            <th className="py-2.5 px-3 text-center font-bold">Grade Verdict</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-900 font-medium">
                          {subjects.map(([subject, scoreObj]: any) => (
                            <tr key={subject} className="divide-x-2 divide-slate-900">
                              <td className="py-2.5 px-3 font-bold text-slate-950">{subject}</td>
                              <td className="py-2.5 px-3 text-center">{scoreObj.ca1 ?? "-"}</td>
                              <td className="py-2.5 px-3 text-center">{scoreObj.ca2 ?? "-"}</td>
                              <td className="py-2.5 px-3 text-center font-bold">{scoreObj.totalCa ?? "-"}</td>
                              <td className="py-2.5 px-3 text-center">{scoreObj.exam ?? "-"}</td>
                              <td className="py-2.5 px-3 text-center bg-indigo-50 font-black text-indigo-700 text-[13px]">{scoreObj.total ?? "-"}</td>
                              <td className="py-2.5 px-3 text-center text-slate-500">{scoreObj.classAverage ?? "-"}</td>
                              <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">{scoreObj.highestInClass ?? "-"}</td>
                              <td className="py-2.5 px-3 text-center text-rose-600 font-bold">{scoreObj.lowestInClass ?? "-"}</td>
                              <td className="py-2.5 px-3 text-center font-black">
                                {scoreObj.position ? (
                                  `${scoreObj.position}${
                                    scoreObj.position === 1 ? 'st' :
                                    scoreObj.position === 2 ? 'nd' :
                                    scoreObj.position === 3 ? 'rd' : 'th'
                                  }`
                                ) : "-"}
                              </td>
                              <td className="py-2.5 px-3 text-center font-black text-slate-900 uppercase tracking-wide">{scoreObj.grade || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary performance bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <div className="p-4 bg-slate-50 border rounded-2xl text-xs space-y-2 font-semibold text-slate-700 print:bg-white print:p-0 print:border-none">
                      <p className="text-slate-400 font-black uppercase tracking-wider text-[9px] pt-1">Aggregated Class Scores</p>
                      <p>Student Term Average: <strong className="text-indigo-600 text-sm font-extrabold">{sheet.studentAverage || 0}%</strong></p>
                      <p>Overall Class Average: <strong className="text-slate-900 text-sm font-extrabold">{sheet.classAverage || 0}%</strong></p>
                    </div>

                    {/* Left: Psychomotor Domain & Cognitive Checklist */}
                    <div className="grid grid-cols-2 gap-4 text-[10px]">
                      <div className="p-3.5 bg-slate-50 border rounded-xl space-y-1.5 print:bg-white print:p-0 print:border-none">
                        <span className="font-extrabold uppercase text-slate-400 tracking-wider block">Psychomotor Qualities</span>
                        <p>Punctuality: <strong>{sheet.psychomotor?.punctuality || 4}/5 Good</strong></p>
                        <p>Neatness: <strong>{sheet.psychomotor?.neatness || 4}/5 Excellent</strong></p>
                        <p>Self Control: <strong>{sheet.psychomotor?.selfControl || 4}/5 Good</strong></p>
                      </div>
                      <div className="p-3.5 bg-slate-50 border rounded-xl space-y-1.5 print:bg-white print:p-0 print:border-none">
                        <span className="font-extrabold uppercase text-slate-400 tracking-wider block">Cognitive Skills</span>
                        <p>Attentiveness: <strong>{sheet.cognitive?.attentiveness || 4}/5 Excellent</strong></p>
                        <p>Participation: <strong>{sheet.cognitive?.participation || 4}/5 Good</strong></p>
                        <p>Comprehension: <strong>{sheet.cognitive?.comprehension || 4}/5 Good</strong></p>
                      </div>
                    </div>
                  </div>

                  {/* Automatic educator remarks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block font-sans">Class Teacher Remarks & Assessment</span>
                      <p className="font-semibold text-slate-800 italic leading-relaxed">
                        "{sheet.teacherRemark || "An encouraging and promising term report. Satisfactory progress has been maintained."}"
                      </p>
                      <div className="pt-2">
                        <div className="w-32 h-6 border-b border-dashed border-slate-800" />
                        <span className="text-[15px] uppercase tracking-wider text-slate-400 block pt-1">Class Teacher Signature</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block font-sans">Head of School Remarks</span>
                      <p className="font-semibold text-slate-800 italic leading-relaxed">
                        "{sheet.principalRemark || "Approved with praise. Promoted with clear intellectual potential."}"
                      </p>
                      <div className="pt-2">
                        <div className="w-32 h-6 border-b border-dashed border-slate-800" />
                        <span className="text-[15px] uppercase tracking-wider text-slate-400 block pt-1">Head Teacher Official Stamp</span>
                      </div>
                    </div>
                  </div>

                  {/* Footing note with Dynamic School Branding */}
                  <div className="pt-6 border-t-2 border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                    <div className="flex items-center gap-2">
                      {schoolConfig.schoolLogo && (
                        <img
                          src={schoolConfig.schoolLogo}
                          alt="School Official Logo Miniature"
                          className="w-6 h-6 rounded-md object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <span className="text-[10px] font-black text-slate-900 uppercase">
                        {schoolConfig.schoolName} Official Academic Document
                      </span>
                    </div>
                    <div className="text-center sm:text-right">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">
                        Current Term: {sheet.term || "Academic Term"} assessment
                      </p>
                      <p className="text-[8px] text-slate-400 font-semibold tracking-wider">
                        Powering high academic standards via Brain CBT Engine • Secured Academic Record
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* MANUAL SCORE INPUT & GRADE EDITOR MODAL */}
      {showReportFormModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form
            onSubmit={handleSaveManualReport}
            className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                {editingReport ? "Modify Student Score Card" : "New Manual Academic Record"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowReportFormModal(false);
                  setEditingReport(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer bg-transparent border-none"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-600 uppercase tracking-wider block">Student Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ebuka Chinasa"
                  value={manualStudentName}
                  onChange={(e) => setManualStudentName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-600 uppercase tracking-wider block">Class Arm</label>
                <select
                  value={manualClassLevel}
                  onChange={(e) => setManualClassLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-semibold focus:outline-none"
                >
                  <option>Grade 1</option>
                  <option>Grade 2</option>
                  <option>Grade 3</option>
                  <option>Grade 4</option>
                  <option>Grade 5</option>
                  <option>Grade 6</option>
                  <option>Grade 7</option>
                  <option>Grade 8</option>
                  <option>Grade 9</option>
                  <option>Grade 10</option>
                  <option>Grade 11</option>
                  <option>Grade 12</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-600 uppercase tracking-wider block">Syllabus Subject</label>
                <select
                  value={manualSubject}
                  onChange={(e) => setManualSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-semibold focus:outline-none"
                >
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-600 uppercase tracking-wider block">Term Attendance</label>
                <input
                  type="number"
                  required
                  value={manualAttendance}
                  onChange={(e) => setManualAttendance(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-semibold focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-600 uppercase tracking-wider block">First CA (Max 20)</label>
                <input
                  type="number"
                  required
                  max={20}
                  min={0}
                  step="0.5"
                  value={manualCa1}
                  onChange={(e) => setManualCa1(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-semibold font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-600 uppercase tracking-wider block">Second CA (Max 20)</label>
                <input
                  type="number"
                  required
                  max={20}
                  min={0}
                  step="0.5"
                  value={manualCa2}
                  onChange={(e) => setManualCa2(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-semibold font-mono"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-extrabold text-slate-600 uppercase tracking-wider block">Term Written Exam Score (Max 60)</label>
                <input
                  type="number"
                  required
                  max={60}
                  min={0}
                  step="0.5"
                  value={manualExam}
                  onChange={(e) => setManualExam(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-semibold font-mono"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-extrabold text-slate-600 uppercase tracking-wider block">Teacher Remark (Leave empty for auto-generation)</label>
                <textarea
                  value={manualTeacherRemark}
                  onChange={(e) => setManualTeacherRemark(e.target.value)}
                  placeholder="e.g. Outstanding term results, active cognitive participation..."
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-semibold focus:outline-none h-16 resize-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-extrabold text-slate-600 uppercase tracking-wider block">Principal Remark (Leave empty for auto-generation)</label>
                <textarea
                  value={manualPrincipalRemark}
                  onChange={(e) => setManualPrincipalRemark(e.target.value)}
                  placeholder="e.g. Remarkable academic consistency, promoted with praise."
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-semibold focus:outline-none h-16 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer border-none"
              >
                Save Score Record
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReportFormModal(false);
                  setEditingReport(null);
                }}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer border-none"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DOWNLOADS PREVIEW & PRINT CENTER MODAL */}
      {selectedDownloadItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Control header */}
            <div className="p-4 bg-slate-900 text-slate-100 flex items-center justify-between sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-black tracking-wide uppercase">Workspace Document Previewer</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Print Directly */}
                <button
                  type="button"
                  onClick={() => {
                    const title = selectedDownloadItem.data.topic || selectedDownloadItem.data.title || "Document";
                    const isLandscape = selectedDownloadItem.type === "plan";
                    handlePrintPDF("downloads_room_printable", title, isLandscape);
                  }}
                  className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg transition cursor-pointer border-none flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Directly
                </button>
                {/* Download PDF */}
                <button
                  type="button"
                  onClick={() => {
                    const title = selectedDownloadItem.data.topic || selectedDownloadItem.data.title || "Document";
                    const isLandscape = selectedDownloadItem.type === "plan";
                    handleDownloadPDFDirectly("downloads_room_printable", title, isLandscape);
                  }}
                  className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-lg transition cursor-pointer border-none flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" /> Download PDF
                </button>
                {/* Download Word DOC */}
                <button
                  type="button"
                  onClick={() => {
                    const title = selectedDownloadItem.data.topic || selectedDownloadItem.data.title || "Document";
                    const isLandscape = selectedDownloadItem.type === "plan";
                    handleWordExportHtml("downloads_room_printable", `${title.replace(/\s+/g, "_")}.doc`, isLandscape);
                  }}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition cursor-pointer border-none flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Download DOC
                </button>
                {/* TTS speaker icon */}
                <button
                  type="button"
                  onClick={() => {
                    const textEl = document.getElementById("downloads_room_printable");
                    if (textEl) {
                      speakText(textEl.innerText, isPlayingDownloadTTS, setIsPlayingDownloadTTS);
                    }
                  }}
                  className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-lg transition cursor-pointer border-none flex items-center gap-1"
                >
                  <Volume2 className={`w-3.5 h-3.5 ${isPlayingDownloadTTS ? "animate-bounce" : ""}`} /> {isPlayingDownloadTTS ? "Stop Voice" : "Speak Aloud"}
                </button>
                {/* Close */}
                <button
                  type="button"
                  onClick={() => {
                    stopSpeech();
                    setIsPlayingDownloadTTS(false);
                    setSelectedDownloadItem(null);
                  }}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition cursor-pointer border-none"
                >
                  Close Preview
                </button>
              </div>
            </div>

            {/* Printable & Readable Body Frame */}
            <div 
              id="downloads_room_printable" 
              className={`p-6 md:p-10 bg-white text-slate-900 select-text overflow-y-auto ${selectedDownloadItem?.type === "note" ? "font-serif" : "font-sans space-y-8"}`}
              style={selectedDownloadItem?.type === "note" ? { fontFamily: "'Times New Roman', Times, serif", fontSize: "12pt" } : undefined}
            >
              {/* RENDER LESSON PLAN */}
              {selectedDownloadItem.type === "plan" && (
                (() => {
                  const activePlan = selectedDownloadItem.data;
                  return (
                    <div className="space-y-6">
                      <div className="text-center pb-2 border-b border-slate-200">
                        <h2 className="text-xl font-bold uppercase tracking-tight text-slate-900">Official Instructional Lesson Plan</h2>
                        <p className="text-xs text-slate-500 font-medium font-sans">Created on {new Date(activePlan.createdAt || activePlan.date).toLocaleDateString()}</p>
                      </div>
                      <table className="w-full border-collapse border-2 border-slate-800 text-slate-900 bg-white shadow-xs" style={{ tableLayout: "fixed", width: "100%", fontSize: "11px" }}>
                        <colgroup>
                          <col style={{ width: "20%" }} />
                          <col style={{ width: "30%" }} />
                          <col style={{ width: "25%" }} />
                          <col style={{ width: "25%" }} />
                        </colgroup>
                        <tbody>
                          <tr>
                            <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ border: "1px solid #475569" }}><strong>School Name</strong></td>
                            <td className="border border-slate-400 p-2 text-slate-850 font-semibold" style={{ border: "1px solid #475569" }}>{activePlan.schoolName}</td>
                            <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ border: "1px solid #475569" }}><strong>Author (Lecturer)</strong></td>
                            <td className="border border-slate-400 p-2 text-slate-850 font-semibold" style={{ border: "1px solid #475569" }}>{activePlan.teacherName}</td>
                          </tr>
                          <tr>
                            <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ border: "1px solid #475569" }}><strong>Class Target</strong></td>
                            <td className="border border-slate-400 p-2 text-slate-850 font-semibold" style={{ border: "1px solid #475569" }}>{activePlan.classLevel}</td>
                            <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ border: "1px solid #475569" }}><strong>Syllabus Week</strong></td>
                            <td className="border border-slate-400 p-2 text-slate-850 font-semibold" style={{ border: "1px solid #475569" }}>Week {activePlan.week || "1"}</td>
                          </tr>
                          <tr>
                            <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ border: "1px solid #475569" }}><strong>Subject Domain</strong></td>
                            <td className="border border-slate-400 p-2 text-slate-850 font-semibold" style={{ border: "1px solid #475569" }}>{activePlan.subject}</td>
                            <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ border: "1px solid #475569" }}><strong>Planned Date</strong></td>
                            <td className="border border-slate-400 p-2 text-slate-850 font-semibold" style={{ border: "1px solid #475569" }}>{activePlan.date || "N/A"}</td>
                          </tr>
                          <tr>
                            <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ border: "1px solid #475569" }}><strong>Topic Context</strong></td>
                            <td className="border border-slate-400 p-2 text-slate-850 font-semibold" style={{ border: "1px solid #475569" }}>{activePlan.topic} {activePlan.subTopic ? `(Sub: ${activePlan.subTopic})` : ''}</td>
                            <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ border: "1px solid #475569" }}><strong>Duration Metrics</strong></td>
                            <td className="border border-slate-400 p-2 text-slate-850 font-semibold" style={{ border: "1px solid #475569" }}>{activePlan.duration}</td>
                          </tr>
                          <tr>
                            <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ border: "1px solid #475569" }}><strong>Core Objectives</strong></td>
                            <td className="border border-slate-400 p-2 text-slate-800" colSpan={3} style={{ border: "1px solid #475569" }}>
                              <ul className="list-disc list-outside pl-4 space-y-0.5 font-medium">
                                {activePlan.plan?.lessonObjectives?.map((x: string, i: number) => (
                                  <li key={i} dangerouslySetInnerHTML={{ __html: renderFormattedMath(x) }} />
                                ))}
                              </ul>
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ border: "1px solid #475569" }}><strong>Instructional Materials</strong></td>
                            <td className="border border-slate-400 p-2 text-slate-800 font-medium" colSpan={3} style={{ border: "1px solid #475569" }}>
                              <span dangerouslySetInnerHTML={{ __html: renderFormattedMath(activePlan.plan?.instructionalMaterials?.join(", ")) }} />
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ border: "1px solid #475569" }}><strong>Entry pupil behavior</strong></td>
                            <td className="border border-slate-400 p-2 text-slate-800 font-medium" colSpan={3} style={{ border: "1px solid #475569" }}>
                              <span dangerouslySetInnerHTML={{ __html: renderFormattedMath(activePlan.plan?.entryBehaviour) }} />
                            </td>
                          </tr>

                          <tr className="bg-slate-800 text-white">
                            <td className="border border-slate-800 text-center font-extrabold uppercase tracking-wider py-1.5 text-xs text-white" colSpan={4} style={{ backgroundColor: "#1e293b", color: "white" }}>
                              Presentation Steps Schedule
                            </td>
                          </tr>
                          <tr className="bg-slate-100 font-black">
                            <td className="border border-slate-400 p-2 font-bold" style={{ border: "1px solid #475569" }}>Step Indicator</td>
                            <td className="border border-slate-400 p-2 font-bold" style={{ border: "1px solid #475569" }}>Teacher's core activities</td>
                            <td className="border border-slate-400 p-2 font-bold" style={{ border: "1px solid #475569" }}>Pupil/Student actions</td>
                            <td className="border border-slate-400 p-2 font-bold" style={{ border: "1px solid #475569" }}>Learning Points / Evaluation</td>
                          </tr>
                          {activePlan.plan?.presentationSteps?.map((pStep: any, pidx: number) => (
                            <tr key={pidx}>
                              <td className="border border-slate-400 p-2 font-bold bg-slate-50" style={{ border: "1px solid #475569" }} dangerouslySetInnerHTML={{ __html: renderFormattedMath(pStep.step || `Step ${pidx + 1}`) }} />
                              <td className="border border-slate-400 p-2" style={{ border: "1px solid #475569" }} dangerouslySetInnerHTML={{ __html: renderFormattedMath(pStep.teachersActivities) }} />
                              <td className="border border-slate-400 p-2" style={{ border: "1px solid #475569" }} dangerouslySetInnerHTML={{ __html: renderFormattedMath(pStep.studentsActivities) }} />
                              <td className="border border-slate-400 p-2 italic" style={{ border: "1px solid #475569" }} dangerouslySetInnerHTML={{ __html: renderFormattedMath(pStep.learningPoints || pStep.evaluationQuestions) }} />
                            </tr>
                          ))}

                          <tr className="bg-slate-800 text-white">
                            <td className="border border-slate-800 text-center font-extrabold uppercase tracking-wider py-1.5 text-xs text-white" colSpan={4} style={{ backgroundColor: "#1e293b", color: "white" }}>
                              Summary, Evaluation & assignments
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ border: "1px solid #475569" }}><strong>Summary</strong></td>
                            <td className="border border-slate-400 p-2 text-slate-800 leading-relaxed font-medium" colSpan={3} style={{ border: "1px solid #475569" }} dangerouslySetInnerHTML={{ __html: renderFormattedMath(activePlan.plan?.summary) }} />
                          </tr>
                          {activePlan.plan?.evaluation && (
                            <tr>
                              <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ border: "1px solid #475569" }}><strong>Class Evaluation</strong></td>
                              <td className="border border-slate-400 p-2 text-slate-800 font-medium" colSpan={3} style={{ border: "1px solid #475569" }}>
                                <div>{renderFormattedList(activePlan.plan?.evaluation)}</div>
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td className="border border-slate-400 p-2 font-black bg-slate-50 uppercase tracking-wider text-[10px]" style={{ border: "1px solid #475569" }}><strong>Take Home Homework</strong></td>
                            <td className="border border-slate-400 p-2 text-slate-850 font-medium" colSpan={3} style={{ border: "1px solid #475569" }}>
                              <div>{renderFormattedList(activePlan.plan?.assignment)}</div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              )}

              {/* RENDER LESSON NOTE */}
              {selectedDownloadItem.type === "note" && (
                (() => {
                  const activeNote = selectedDownloadItem.data;
                  return (
                    <div className="space-y-4 max-w-4xl mx-auto" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "11pt", lineStyle: "1.15", color: "#000000" }}>
                      <div className="text-center pb-2 border-b" style={{ borderBottom: "1.5pt solid #111111" }}>
                        <h1 className="text-xl font-bold uppercase m-0 leading-tight">{activeNote.topic} Lesson Note</h1>
                      </div>

                      {/* Lesson Content / Detailed Notes */}
                      <div className="space-y-1">
                        <div className="whitespace-pre-wrap leading-relaxed" style={{ fontSize: "11pt" }} dangerouslySetInnerHTML={{ __html: renderFormattedMath(activeNote.content.detailedNote) }} />
                      </div>

                      {/* Evaluation */}
                      {activeNote.content.evaluation && activeNote.content.evaluation.length > 0 && (
                        <div className="space-y-1 pt-6" style={{ borderTop: "1px solid #cbd5e1" }}>
                          <h2 className="text-sm font-bold uppercase m-0 pb-1" style={{ borderBottom: "0.5pt solid #111111", fontSize: "11pt" }}>
                            Evaluation Assessment Quizzes:
                          </h2>
                          <ul className="list-decimal pl-5 m-0 space-y-1 mt-2">
                            {activeNote.content.evaluation.map((ev: string, i: number) => (
                              <li key={i} dangerouslySetInnerHTML={{ __html: renderFormattedMath(ev) }} />
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              {/* RENDER CBT EXAM ROSTER */}
              {selectedDownloadItem.type === "exam" && (
                (() => {
                  const exam = selectedDownloadItem.data;
                  return (
                    <div className="space-y-6 max-w-4xl mx-auto text-sm leading-relaxed text-slate-800">
                      <div className="text-center pb-4 border-b-2 border-slate-900">
                        <h2 className="text-2xl font-black text-slate-950 uppercase">{exam.title}</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{exam.subject} • {exam.classLevel}</p>
                        <p className="text-[10px] text-slate-400">Duration: {exam.duration} Minutes • Total Marks Index: {exam.totalMarks || 100}</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 text-xs text-left">
                        <strong className="uppercase font-black text-indigo-950 block pb-1">Candidate Guidelines & Instruction:</strong>
                        <p className="text-slate-600 font-medium">Read every question carefully before answering. Do not open other tabs or use external resources. Mark your answers clearly on the multiple choice choices options listed below.</p>
                      </div>

                      <div className="space-y-6 pt-2 text-left">
                        {exam.questions?.map((q: any, index: number) => (
                          <div key={index} className="space-y-2 border-b pb-4 last:border-b-0">
                            <h4 className="font-bold text-slate-900">Question {index + 1}: <span dangerouslySetInnerHTML={{ __html: renderFormattedMath(q.question) }} /></h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4 text-xs font-medium text-slate-700">
                              <p dangerouslySetInnerHTML={{ __html: `<strong>A:</strong> ${renderFormattedMath(q.optionA)}` }} />
                              <p dangerouslySetInnerHTML={{ __html: `<strong>B:</strong> ${renderFormattedMath(q.optionB)}` }} />
                              <p dangerouslySetInnerHTML={{ __html: `<strong>C:</strong> ${renderFormattedMath(q.optionC)}` }} />
                              <p dangerouslySetInnerHTML={{ __html: `<strong>D:</strong> ${renderFormattedMath(q.optionD)}` }} />
                            </div>
                            <span className="inline-block mt-2 bg-indigo-50 text-indigo-700 border border-indigo-150 py-0.5 px-2.5 rounded-full font-black text-[10px] uppercase tracking-wider">
                              Correct Answer: Option {q.correctAnswer}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()
              )}

              {/* RENDER REPORT CARD */}
              {selectedDownloadItem.type === "report" && (
                (() => {
                  const sheet = selectedDownloadItem.data;
                  const subjectsList = Object.entries(sheet.scores || {});
                  return (
                    <div className="space-y-8 font-sans bg-white text-slate-900 select-text">
                      <div className="flex flex-col md:flex-row items-center justify-between pb-6 border-b-2 border-slate-900 gap-6">
                        <div className="flex items-center gap-4">
                          {schoolConfig.schoolLogo && (
                            <img
                              src={schoolConfig.schoolLogo}
                              alt="School Official Logo"
                              className="w-16 h-16 rounded-2xl object-cover bg-slate-100 p-1"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="text-left space-y-1">
                            <h2 className="text-2xl font-black uppercase text-slate-950 tracking-tight leading-none">{schoolConfig.schoolName}</h2>
                            <p className="text-xs text-slate-500 font-extrabold uppercase font-sans tracking-widest">{schoolConfig.location}</p>
                            <p className="text-[11px] italic text-slate-600 font-medium">Motto: "{schoolConfig.schoolMotto || "wisdom, knowledge, and understanding"}"</p>
                          </div>
                        </div>
                        <div className="text-center md:text-right space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                          <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest leading-none">Term Assessment Report</h3>
                          <p className="text-xs font-bold font-sans text-slate-600 pt-1">{sheet.term || schoolConfig.term}</p>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Official School Record</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-150 text-xs">
                        <div>
                          <span className="text-slate-400 font-bold tracking-wider uppercase text-[9px] block">Student Name</span>
                          <strong className="text-sm font-black text-slate-900">{sheet.studentName}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold tracking-wider uppercase text-[9px] block">Class Arm</span>
                          <strong className="text-sm font-black text-slate-900">{sheet.classLevel}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold tracking-wider uppercase text-[9px] block">Term Attendance</span>
                          <strong className="text-sm font-black text-slate-900">{sheet.attendance || 0} Days</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold tracking-wider uppercase text-[9px] block">Average Marks Index</span>
                          <strong className="text-sm font-black text-indigo-600">{sheet.averageMark ? `${sheet.averageMark.toFixed(1)}%` : "N/A"}</strong>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <table className="w-full border-collapse text-xs border border-slate-300">
                          <thead>
                            <tr className="bg-slate-900 text-white font-extrabold uppercase tracking-wider">
                              <th className="border border-slate-900 p-2.5 text-center" style={{ backgroundColor: "#0f172a", color: "white" }}>Syllabus Subject</th>
                              <th className="border border-slate-905 p-2.5 text-center" style={{ backgroundColor: "#0f172a", color: "white" }}>CA 1 (20)</th>
                              <th className="border border-slate-905 p-2.5 text-center" style={{ backgroundColor: "#0f172a", color: "white" }}>CA 2 (20)</th>
                              <th className="border border-slate-905 p-2.5 text-center" style={{ backgroundColor: "#0f172a", color: "white" }}>Exam (60)</th>
                              <th className="border border-slate-905 p-2.5 text-center" style={{ backgroundColor: "#0f172a", color: "white" }}>Total (100)</th>
                              <th className="border border-slate-905 p-2.5 text-center" style={{ backgroundColor: "#0f172a", color: "white" }}>Grade</th>
                              <th className="border border-slate-905 p-2.5 text-center" style={{ backgroundColor: "#0f172a", color: "white" }}>Assessed Outcome</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subjectsList.map(([subj, marks]: [string, any]) => (
                              <tr key={subj} className="hover:bg-slate-50 font-medium">
                                <td className="border border-slate-300 p-2.5 font-bold text-slate-900" style={{ border: "1px solid #cbd5e1" }}>{subj}</td>
                                <td className="border border-slate-300 p-2.5 text-center font-semibold text-slate-800" style={{ border: "1px solid #cbd5e1" }}>{marks.ca1 || 0}</td>
                                <td className="border border-slate-300 p-2.5 text-center font-semibold text-slate-800" style={{ border: "1px solid #cbd5e1" }}>{marks.ca2 || 0}</td>
                                <td className="border border-slate-300 p-2.5 text-center font-semibold text-slate-800" style={{ border: "1px solid #cbd5e1" }}>{marks.exam || 0}</td>
                                <td className="border border-slate-300 p-2.5 text-center font-black text-slate-900 bg-slate-50" style={{ border: "1px solid #cbd5e1" }}>{marks.total || 0}</td>
                                <td className="border border-slate-300 p-2.5 text-center font-extrabold text-indigo-700 bg-slate-50" style={{ border: "1px solid #cbd5e1" }}>{marks.grade || "F"}</td>
                                <td className="border border-slate-300 p-2.5 text-center font-black uppercase text-[10px] text-emerald-700" style={{ border: "1px solid #cbd5e1" }}>{marks.remarks || "PASS"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                        <div className="p-4 bg-slate-50 rounded-2xl border text-xs space-y-1 text-left">
                          <strong className="uppercase font-extrabold text-slate-500 text-[9px] block">Class Principal Remark:</strong>
                          <p className="text-slate-850 font-semibold italic">"{sheet.principalRemark || "Excellent grade standing! Promoted with highest recommendation."}"</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border text-xs space-y-1 text-left">
                          <strong className="uppercase font-extrabold text-slate-500 text-[9px] block">Class Teacher Remark:</strong>
                          <p className="text-slate-850 font-semibold italic">"{sheet.teacherRemark || "Outstanding cognitive performance, displays great academic passion."}"</p>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
