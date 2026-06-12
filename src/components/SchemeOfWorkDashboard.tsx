import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  GraduationCap,
  Clock,
  Printer,
  FileText,
  Search,
  Filter,
  CheckCircle,
  Plus,
  Edit2,
  Trash2,
  Download,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  FileClock,
  Award,
  Sparkles,
  Bookmark,
  Share2,
  Upload
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { EDUCATION_LEVELS, generateWeeklyScheme, validateSyllabusUniqueness } from "../data/nigerianCurriculum";
import { WeeklySchemeUnit, SchemeOfWork } from "../types";

export interface SchemeOfWorkDashboardProps {
  user: any;
  userPerspective: "teacher" | "student" | "admin";
}

export default function SchemeOfWorkDashboard({ user, userPerspective }: SchemeOfWorkDashboardProps) {
  // 1. SELECTOR STATES
  const [selectedLevelId, setSelectedLevelId] = useState<string>("junior_secondary");
  const [selectedClass, setSelectedClass] = useState<string>("JSS 1");
  const [selectedTerm, setSelectedTerm] = useState<"First Term" | "Second Term" | "Third Term">("First Term");
  const [selectedSubject, setSelectedSubject] = useState<string>("Mathematics");

  // 2. SEARCH & FILTER
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedWeeks, setExpandedWeeks] = useState<{ [key: number]: boolean }>({ 1: true });

  // 3. PERSISTENT SCHEMES DATABASE
  const [loadedWeeks, setLoadedWeeks] = useState<WeeklySchemeUnit[]>([]);
  
  // Modals / Editing States
  const [editingWeekIndex, setEditingWeekIndex] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<WeeklySchemeUnit>>({});
  const [showAddCustomTopicModal, setShowAddCustomTopicModal] = useState<boolean>(false);
  const [newTopicFormData, setNewTopicFormData] = useState<Partial<WeeklySchemeUnit>>({
    week: 11,
    topic: "",
    subtopic: "",
    objectives: "",
    teachingActivities: "",
    studentActivities: "",
    assessment: "",
    notes: "",
    homework: ""
  });

  // Bulk CSV Scheme Import States
  const [showBulkImportModal, setShowBulkImportModal] = useState<boolean>(false);
  const [bulkCsvText, setBulkCsvText] = useState<string>("");
  const [bulkImportError, setBulkImportError] = useState<string>("");
  const [bulkImportSuccess, setBulkImportSuccess] = useState<string>("");

  // Yearly Update Simulation State
  const [academicYear, setAcademicYear] = useState<string>("2026/2027");
  const [curriculumStatus, setCurriculumStatus] = useState<string>("NERDC Standard Approved (Updated June 2026)");

  // 4. LOAD & PERSIST CORE SCHEME OF WORK DATA
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [uniquenessReport, setUniquenessReport] = useState<{
    isValid: boolean;
    duplicateCount: number;
    report: string;
    duplicates: string[];
  } | null>(null);

  // Reset loaded state when selectors change
  useEffect(() => {
    setIsLoaded(false);
    setUniquenessReport(null);
  }, [selectedLevelId, selectedClass, selectedTerm, selectedSubject]);

  const handleLoadScheme = async () => {
    try {
      const resp = await fetch(`/api/schemes?classLevel=${encodeURIComponent(selectedClass)}&subject=${encodeURIComponent(selectedSubject)}&term=${encodeURIComponent(selectedTerm)}`);
      const data = await resp.json();
      if (resp.ok && data.schemes && data.schemes.length > 0) {
        setLoadedWeeks(data.schemes[0].weeks);
      } else {
        const storageKey = `sow_${selectedLevelId}_${selectedClass.replace(/\s+/g, "_")}_${selectedSubject.replace(/\s+/g, "_")}_${selectedTerm.replace(/\s+/g, "_")}`;
        const savedData = localStorage.getItem(storageKey);
        let freshWeeks;
        if (savedData) {
          try {
            freshWeeks = JSON.parse(savedData);
          } catch(e) {
            freshWeeks = generateWeeklyScheme(selectedLevelId, selectedClass, selectedSubject, selectedTerm);
          }
        } else {
          freshWeeks = generateWeeklyScheme(selectedLevelId, selectedClass, selectedSubject, selectedTerm);
        }
        setLoadedWeeks(freshWeeks);

        // Auto seed newly created/generated local schemes to database
        await fetch("/api/schemes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classLevel: selectedClass,
            subject: selectedSubject,
            term: selectedTerm,
            weeks: freshWeeks
          })
        });
      }
    } catch (err) {
      console.error("Failed to load schema from API, falling back:", err);
      const fallback = generateWeeklyScheme(selectedLevelId, selectedClass, selectedSubject, selectedTerm);
      setLoadedWeeks(fallback);
    }

    // Perform curriculum uniqueness verification dynamically
    const report = validateSyllabusUniqueness(selectedLevelId, selectedClass, selectedSubject);
    setUniquenessReport(report);

    setIsLoaded(true);
  };

  // Sync back to localstorage and database on change
  const saveCurrentWeeksState = async (newWeeks: WeeklySchemeUnit[]) => {
    setLoadedWeeks(newWeeks);
    const storageKey = `sow_${selectedLevelId}_${selectedClass.replace(/\s+/g, "_")}_${selectedSubject.replace(/\s+/g, "_")}_${selectedTerm.replace(/\s+/g, "_")}`;
    localStorage.setItem(storageKey, JSON.stringify(newWeeks));

    try {
      await fetch("/api/schemes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classLevel: selectedClass,
          subject: selectedSubject,
          term: selectedTerm,
          weeks: newWeeks
        })
      });
    } catch (e) {
      console.error("Failed to upload scheme of work:", e);
    }
  };

  // Switch class configuration lists
  const currentLevelConfig = EDUCATION_LEVELS.find((l) => l.id === selectedLevelId) || EDUCATION_LEVELS[2];

  const handleLevelChange = (levelId: string) => {
    setSelectedLevelId(levelId);
    const config = EDUCATION_LEVELS.find((l) => l.id === levelId) || EDUCATION_LEVELS[2];
    setSelectedClass(config.classes[0]);
    setSelectedSubject(config.subjects[0]);
  };

  // Expand / Collapse Helper
  const toggleWeekExpansion = (weekNum: number) => {
    setExpandedWeeks((prev) => ({
      ...prev,
      [weekNum]: !prev[weekNum]
    }));
  };

  const expandAll = () => {
    const allExp: { [key: number]: boolean } = {};
    loadedWeeks.forEach((w) => {
      allExp[w.week] = true;
    });
    setExpandedWeeks(allExp);
  };

  const collapseAll = () => {
    setExpandedWeeks({});
  };

  // 5. TEACHER ACTIONS
  // Toggle week taught status
  const handleToggleTaught = (weekNum: number) => {
    const updated = loadedWeeks.map((w) => {
      if (w.week === weekNum) {
        const isTaught = !w.isTaught;
        return {
          ...w,
          isTaught,
          taughtDate: isTaught ? new Date().toLocaleDateString("en-NG", { dateStyle: "long" }) : undefined
        };
      }
      return w;
    });
    saveCurrentWeeksState(updated);
  };

  // Edit week structure
  const handleStartEdit = (index: number) => {
    setEditingWeekIndex(index);
    setEditFormData(loadedWeeks[index]);
  };

  const handleSaveEdit = (index: number) => {
    const updated = [...loadedWeeks];
    updated[index] = { ...updated[index], ...editFormData } as WeeklySchemeUnit;
    saveCurrentWeeksState(updated);
    setEditingWeekIndex(null);
  };

  const parseCSVText = (csv: string): WeeklySchemeUnit[] => {
    const lines = csv.split(/\r?\n/);
    if (lines.length < 2) throw new Error("CSV has no content or headers");

    const headerLine = lines[0].toLowerCase();
    let delimiter = ",";
    if (headerLine.includes("\t")) delimiter = "\t";
    else if (headerLine.includes(";")) delimiter = ";";

    const headers = lines[0].split(delimiter).map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
    
    const findIndex = (aliases: string[]) => {
      return headers.findIndex(h => aliases.some(alias => h.includes(alias)));
    };

    const weekIdx = findIndex(["week"]);
    const topicIdx = findIndex(["topic"]);
    const subtopicIdx = findIndex(["subtopic", "sub-topic"]);
    const objectivesIdx = findIndex(["objective", "learning objective", "learningobjectives"]);
    const teachingIdx = findIndex(["teaching", "teacher"]);
    const studentIdx = findIndex(["student"]);
    const assessmentIdx = findIndex(["assessment", "evaluate"]);
    const notesIdx = findIndex(["notes", "recap", "summary"]);
    const homeworkIdx = findIndex(["homework", "assignment"]);

    if (topicIdx === -1) {
      throw new Error("Could not find a 'Topic' header in your CSV file. Please make sure the first row contains column headers.");
    }

    const units: WeeklySchemeUnit[] = [];

    const splitCSVLine = (line: string, delim: string) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === delim && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = splitCSVLine(line, delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
      if (cols.length < 1) continue;

      const weekNum = weekIdx !== -1 ? (Number(cols[weekIdx]) || i) : i;
      const topic = cols[topicIdx] || `WeekTopic ${i}`;
      const subtopic = subtopicIdx !== -1 ? cols[subtopicIdx] : "Syllabus details";
      const objectives = objectivesIdx !== -1 ? cols[objectivesIdx] : "Cognitive understanding class-wide";
      const teachingActivities = teachingIdx !== -1 ? cols[teachingIdx] : "Teacher guides learning content details.";
      const studentActivities = studentIdx !== -1 ? cols[studentIdx] : "Students pay attention and complete exercises.";
      const assessment = assessmentIdx !== -1 ? cols[assessmentIdx] : "Evaluation class exercises";
      const notes = notesIdx !== -1 ? cols[notesIdx] : `Key highlights on ${topic}`;
      const homework = homeworkIdx !== -1 ? cols[homeworkIdx] : "Practice textbook questions.";

      units.push({
        week: weekNum,
        topic,
        subtopic,
        objectives,
        teachingActivities,
        studentActivities,
        assessment,
        notes,
        homework
      });
    }

    if (units.length === 0) throw new Error("No valid rows could be parsed from the CSV text");
    return units;
  };

  // Add custom week topic
  const handleAddCustomWeek = (e: React.FormEvent) => {
    e.preventDefault();
    const nextWeekNum = loadedWeeks.length > 0 ? Math.max(...loadedWeeks.map((w) => w.week)) + 1 : 1;
    const newUnit: WeeklySchemeUnit = {
      week: nextWeekNum,
      topic: newTopicFormData.topic || "Custom Topic",
      subtopic: newTopicFormData.subtopic || "Custom Subtopic Outline",
      objectives: newTopicFormData.objectives || "Define relevant customized academic highlights",
      teachingActivities: newTopicFormData.teachingActivities || "Teacher guides learning content.",
      studentActivities: newTopicFormData.studentActivities || "Students ask relevant syllabus questions.",
      assessment: newTopicFormData.assessment || "Weekly homework check and evaluation standard quiz",
      notes: newTopicFormData.notes || "Syllabus notes and review checklists",
      homework: newTopicFormData.homework || "Complete assigned textbook review questions"
    };

    const updated = [...loadedWeeks, newUnit];
    saveCurrentWeeksState(updated);
    setShowAddCustomTopicModal(false);
    // Reset form
    setNewTopicFormData({
      week: nextWeekNum + 1,
      topic: "",
      subtopic: "",
      objectives: "",
      teachingActivities: "",
      studentActivities: "",
      assessment: "",
      notes: "",
      homework: ""
    });
  };

  // Save personal educator teacher notes
  const handleUpdateTeacherNote = (weekNum: number, noteText: string) => {
    const updated = loadedWeeks.map((w) => {
      if (w.week === weekNum) {
        return { ...w, teacherNote: noteText };
      }
      return w;
    });
    saveCurrentWeeksState(updated);
  };

  // Student track topic studied
  const handleToggleStudied = (weekNum: number) => {
    const key = `studied_${selectedLevelId}_${selectedClass}_${selectedSubject}_${weekNum}`;
    const wasStudied = localStorage.getItem(key) === "true";
    localStorage.setItem(key, wasStudied ? "false" : "true");
    // Simple state trigger
    const updated = [...loadedWeeks];
    saveCurrentWeeksState(updated);
  };

  const checkIsStudiedByStudent = (weekNum: number) => {
    const key = `studied_${selectedLevelId}_${selectedClass}_${selectedSubject}_${weekNum}`;
    return localStorage.getItem(key) === "true";
  };

  // --- AI GENERATION ENGINE & STATE ---
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatingType, setGeneratingType] = useState<"lesson_note" | "lesson_plan" | "exam" | null>(null);
  const [generatingWeek, setGeneratingWeek] = useState<number | null>(null);
  const [generatedNote, setGeneratedNote] = useState<any | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<any | null>(null);
  const [generatedExam, setGeneratedExam] = useState<any | null>(null);
  const [showGeneratedModal, setShowGeneratedModal] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [savedExamSuccess, setSavedExamSuccess] = useState<boolean>(false);
  const [isSavingExam, setIsSavingExam] = useState<boolean>(false);

  const handleGenerateAIContent = async (type: "lesson_note" | "lesson_plan" | "exam", weekUnit: WeeklySchemeUnit) => {
    setIsGenerating(true);
    setGeneratingType(type);
    setGeneratingWeek(weekUnit.week);
    setApiError(null);
    setGeneratedNote(null);
    setGeneratedPlan(null);
    setGeneratedExam(null);
    setSavedExamSuccess(false);
    setShowGeneratedModal(true);

    try {
      let endpoint = "";
      let payload = {};

      if (type === "lesson_note") {
        endpoint = "/api/ai/lesson-note";
        payload = {
          subject: selectedSubject,
          classLevel: selectedClass,
          topic: weekUnit.topic,
          subTopic: weekUnit.subtopic || weekUnit.topic,
          periods: "2 Periods",
          difficulty: "Medium",
          teacherId: user?.id || "usr_teacher",
          week: weekUnit.week,
          date: new Date().toLocaleDateString("en-NG")
        };
      } else if (type === "lesson_plan") {
        endpoint = "/api/ai/lesson-plan";
        payload = {
          schoolName: "NERDC Approved Portal",
          teacherName: user?.name || "Educator",
          classLevel: selectedClass,
          subject: selectedSubject,
          topic: weekUnit.topic,
          subTopic: weekUnit.subtopic || weekUnit.topic,
          date: new Date().toLocaleDateString("en-NG"),
          duration: "45 Minutes",
          ageOfPupils: "Primary/Secondary Class Age",
          numberOfPupils: "35",
          teacherId: user?.id || "usr_teacher",
          week: weekUnit.week,
          term: selectedTerm
        };
      } else if (type === "exam") {
        endpoint = "/api/ai/generate-questions";
        payload = {
          subject: selectedSubject,
          topic: weekUnit.topic,
          classLevel: selectedClass,
          count: 10,
          difficulty: "Medium"
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate AI materials. Please ensure you have sufficient balance (N50 per lesson plan) or valid credentials.");
      }

      if (type === "lesson_note") {
        if (!data.lessonNote) throw new Error("Server returned an empty lesson note object.");
        setGeneratedNote(data.lessonNote);
      } else if (type === "lesson_plan") {
        if (!data.lessonPlan) throw new Error("Server returned an empty lesson plan object.");
        setGeneratedPlan(data.lessonPlan);
      } else if (type === "exam") {
        if (!data.questions || data.questions.length === 0) throw new Error("Server returned empty questions.");
        setGeneratedExam(data.questions);
      }

    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "An unexpected error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGeneratedExam = async () => {
    if (!generatedExam || generatedExam.length === 0) return;
    setIsSavingExam(true);
    setSavedExamSuccess(false);
    setApiError(null);

    try {
      const payload = {
        title: `${selectedClass} - ${selectedSubject} Quiz (${loadedWeeks.find(u => u.week === generatingWeek)?.topic || "Week " + generatingWeek})`,
        subject: selectedSubject,
        level: selectedLevelId === "junior_secondary" ? "Junior Secondary School" : selectedLevelId === "senior_secondary" ? "Senior Secondary School" : "Primary School",
        duration: 40,
        totalMarks: generatedExam.length * 5,
        instructions: "Read questions and options carefully. Select the absolute correct response.",
        questions: generatedExam,
        creatorId: user?.id || "usr_teacher",
        creatorName: user?.name || "AI Generated"
      };

      const response = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save exam to user portal.");
      }

      setSavedExamSuccess(true);
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Failed to save the generated questions to active exams.");
    } finally {
      setIsSavingExam(false);
    }
  };

  const handleDownloadNoteWord = (note: any) => {
    const noteTitle = `${note.classLevel} - ${note.subject} Lesson Note: ${note.topic}`;
    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${noteTitle}</title>
      <style>body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; line-height: 1.6; }</style>
      </head>
      <body>
        <h1 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px;">${noteTitle}</h1>
        <p><strong>Subtopic Focus:</strong> ${note.subTopic}</p>
        <p><strong>Periods Assigned:</strong> ${note.periods}</p>
        <p><strong>Evaluated Difficulty:</strong> ${note.difficulty}</p>
        <p><strong>Regulatory Standard:</strong> Fully aligned with NERDC Approved School Syllabuses</p>
        <hr style="border-top: 1px solid #e2e8f0;"/>
        <h2 style="color: #0f172a;">1. Detailed Lesson Notes</h2>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">${note.content.detailedNote.replace(/\n/g, "<br/>")}</div>
        <h2 style="color: #0f172a;">2. Pedagogical Clarification & Explanations</h2>
        <p>${note.content.explanation.replace(/\n/g, "<br/>")}</p>
        <h2 style="color: #0f172a;">3. Solved Classroom Examples</h2>
        <ul>${note.content.examples.map((ex: any) => `<li style="margin-bottom: 8px;">${ex}</li>`).join("")}</ul>
        <h2 style="color: #0f172a;">4. In-class Activities</h2>
        <ul>${note.content.classActivities.map((act: any) => `<li style="margin-bottom: 8px;">${act}</li>`).join("")}</ul>
        <h2 style="color: #0f172a;">5. Formative Assessments & Questions</h2>
        <ol>${note.content.evaluation.map((ev: any) => `<li style="margin-bottom: 8px;">${ev}</li>`).join("")}</ol>
        <h2 style="color: #0f172a;">6. Remedial Assignment / Homework Task</h2>
        <p>${note.content.assignment}</p>
        <h2 style="color: #0f172a;">7. Summarized Recapitulation</h2>
        <p>${note.content.summary}</p>
      </body>
      </html>
    `;
    const blob = new Blob(["\ufeff" + html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.topic.toLowerCase().replace(/\s+/g, "_")}_lesson_note.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPlanWord = (plan: any) => {
    const planTitle = `${plan.classLevel} - ${plan.subject} Lesson Plan: ${plan.topic}`;
    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${planTitle}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; line-height: 1.6; }
        table { border-collapse: collapse; width: 100%; margin-top: 15px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
        th { background: #f1f5f9; }
      </style>
      </head>
      <body>
        <h1 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 8px;">${planTitle}</h1>
        <p><strong>Teacher Name:</strong> ${plan.teacherName}</p>
        <p><strong>School Platform:</strong> ${plan.schoolName}</p>
        <p><strong>Scheduled Duration:</strong> ${plan.duration}</p>
        <p><strong>Ages of Target Pupils:</strong> ${plan.ageOfPupils} Years</p>
        <p><strong>Paces / Headcount of Pupils:</strong> ${plan.numberOfPupils}</p>
        <hr style="border-top: 1px solid #e2e8f0;"/>
        <h2 style="color: #0f172a;">1. Main Lesson Objectives</h2>
        <ul>${plan.plan.lessonObjectives.map((obj: any) => `<li>${obj}</li>`).join("")}</ul>
        <h2 style="color: #0f172a;">2. Visual / Instructional Materials</h2>
        <ul>${plan.plan.instructionalMaterials.map((mat: any) => `<li>${mat}</li>`).join("")}</ul>
        <h2 style="color: #0f172a;">3. Behavioral Expectations & Objectives</h2>
        <ul>${plan.plan.behaviouralObjectives.map((obj: any) => `<li>${obj}</li>`).join("")}</ul>
        <p><strong>Entry Behavior Standard:</strong> ${plan.plan.entryBehaviour}</p>
        <p><strong>Previous Knowledge Context:</strong> ${plan.plan.previousKnowledge}</p>
        <h2 style="color: #0f172a;">4. Active Classroom Introduction Plan</h2>
        <p>${plan.plan.introduction}</p>
        <h2 style="color: #0f172a;">5. Standard Step-by-Step Lesson Presentation</h2>
        <table>
          <thead>
            <tr>
              <th>Step Index</th>
              <th>Teacher's Learning/Presentation Steps</th>
              <th>Student's Active Roles</th>
              <th>Focus Learning Objectives</th>
            </tr>
          </thead>
          <tbody>
            ${plan.plan.presentationSteps.map((step: any) => `
              <tr>
                <td><strong>${step.step}</strong></td>
                <td>${step.teachersActivities}</td>
                <td>${step.studentsActivities}</td>
                <td>${step.learningPoints}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <h2 style="color: #0f172a;">6. Summary Recapitulation</h2>
        <p>${plan.plan.summary}</p>
        <h2 style="color: #0f172a;">7. Assessment / Evaluation Procedure</h2>
        <p>${plan.plan.evaluation}</p>
        <h2 style="color: #0f172a;">8. Action homework assignment</h2>
        <p>${plan.plan.assignment}</p>
      </body>
      </html>
    `;
    const blob = new Blob(["\ufeff" + html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.topic.toLowerCase().replace(/\s+/g, "_")}_lesson_plan.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 6. PRINT AND EXPORT HELPER SUITE
  const handlePrint = () => {
    window.print();
  };

  // Dynamic Word Export (.docx wrapper format in HTML standard)
  const handleWordDownload = () => {
    const title = `${selectedClass} - ${selectedSubject} - ${selectedTerm} Scheme of Work`;
    let docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; line-height: 1.5; color: #333; }
          h1 { color: #1e3a8a; font-size: 24px; text-transform: uppercase; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; }
          h2 { color: #0d9488; font-size: 18px; margin-top: 24px; }
          h3 { color: #4f46e5; font-size: 14px; margin-top: 10px; }
          .meta-info { margin-bottom: 30px; font-weight: bold; background: #f3f4f6; padding: 15px; border-radius: 8px; }
          .week-card { border: 1px solid #e5e7eb; padding: 15px; margin-bottom: 20px; border-radius: 8px; page-break-inside: avoid; }
          .week-num { font-size: 16px; font-weight: bold; color: #1e3a8a; margin-bottom: 8px; }
          .table-header { font-weight: bold; background-color: #f1f5f9; color: #1e293b; }
          p { margin: 5px 0; }
          ul { margin: 5px 0; padding-left: 20px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta-info">
          <p>Academic Term: ${selectedTerm}</p>
          <p>Education Level: ${currentLevelConfig.name}</p>
          <p>Class Target: ${selectedClass}</p>
          <p>Syllabus Year: ${academicYear}</p>
          <p>Regulatory Standard: Approved by NERDC Nigeria</p>
        </div>
    `;

    loadedWeeks.forEach((w) => {
      docHtml += `
        <div class="week-card">
          <div class="week-num">WEEK ${w.week}: ${w.topic}</div>
          <p><strong>Sub-topic:</strong> ${w.subtopic}</p>
          <h3>1. Learning Objectives</h3>
          <p>${w.objectives.replace(/\n/g, "<br/>")}</p>
          <h3>2. Teaching Activities</h3>
          <p>${w.teachingActivities.replace(/\n/g, "<br/>")}</p>
          <h3>3. Student Activities</h3>
          <p>${w.studentActivities.replace(/\n/g, "<br/>")}</p>
          <h3>4. Assessment Procedures</h3>
          <p>${w.assessment.replace(/\n/g, "<br/>")}</p>
          <h3>5. Teacher Notes / Summaries</h3>
          <p>${w.notes.replace(/\n/g, "<br/>")}</p>
          <h3>6. Assigned Homework</h3>
          <p>${w.homework.replace(/\n/g, "<br/>")}</p>
        </div>
      `;
    });

    docHtml += `</body></html>`;

    const blob = new Blob(["\ufeff" + docHtml], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = `${title.toLowerCase().replace(/\s+/g, "_")}.doc`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  };

  // Filter weeks matches search index
  const filteredWeeks = loadedWeeks.filter((w) => {
    const q = searchQuery.toLowerCase();
    return (
      w.topic.toLowerCase().includes(q) ||
      w.subtopic.toLowerCase().includes(q) ||
      w.notes.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-6">
      
      {/* HEADER ROW BAR WITH BRAND DECORATIONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 bg-white border border-slate-200 rounded-3xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Layers className="w-5 h-5" />
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold py-0.5 px-2 rounded-md uppercase tracking-widest">
              NERDC Curriculum Portal
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Scheme of Work Management Portal
          </h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Configure fully approved Nigerian schemes of work, track taught weeks, download study materials, and build editable worksheets.
          </p>
        </div>

        {/* YEAR SELECTOR INTERACTION */}
        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 self-start lg:self-auto">
          <div className="text-left">
            <span className="text-[9px] text-slate-400 font-black block uppercase tracking-wider">ACADEMIC YEAR</span>
            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                setCurriculumStatus(`NERDC Standard Approved (Updated Year ${e.target.value.split("/")[0]})`);
              }}
              className="bg-transparent border-none text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="2026/2027">2026/2027 Session</option>
              <option value="2027/2028">2027/2028 Session</option>
              <option value="2028/2029">2028/2029 Session</option>
            </select>
          </div>
          <div className="border-l border-slate-200 h-6 pl-3 text-left">
            <span className="text-[9px] text-slate-400 font-black block uppercase tracking-wider">STATUS STATUS</span>
            <span className="text-[10px] text-emerald-600 font-bold block">{curriculumStatus}</span>
          </div>
        </div>
      </div>

      {/* CURRICULUM SELECTORS - FILTER PANEL */}
      <div className="p-6 bg-indigo-950 text-white rounded-3xl shadow-md space-y-5">
        <h3 className="text-xs font-extrabold tracking-widest text-[#a5b4fc] uppercase flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" />
          Quick Academic Level & Target Filters
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Level selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black tracking-wider text-indigo-200 block">Education level</label>
            <div className="flex flex-wrap gap-1.5 bg-indigo-900/40 p-1.5 rounded-2xl border border-indigo-900">
              {EDUCATION_LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => handleLevelChange(lvl.id)}
                  className={`py-1.5 px-3 rounded-xl text-[10px] font-black tracking-wide border-none transition cursor-pointer shrink-0 ${
                    selectedLevelId === lvl.id
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 shadow-sm"
                      : "text-indigo-200 hover:bg-indigo-900 hover:text-white"
                  }`}
                >
                  {lvl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Class selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black tracking-wider text-indigo-200 block">Class selector</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-indigo-900 border border-indigo-800 text-xs font-bold p-2.5 rounded-xl text-white outline-none focus:border-amber-400"
            >
              {currentLevelConfig.classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Term selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black tracking-wider text-indigo-200 block">Term Selector</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value as any)}
              className="w-full bg-indigo-900 border border-indigo-800 text-xs font-bold p-2.5 rounded-xl text-white outline-none focus:border-amber-400"
            >
              <option value="First Term">First Term Schedule</option>
              <option value="Second Term">Second Term Schedule</option>
              <option value="Third Term">Third Term Schedule</option>
            </select>
          </div>

          {/* Subject selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-black tracking-wider text-indigo-200 block">Subject Selector</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full bg-indigo-900 border border-indigo-800 text-xs font-bold p-2.5 rounded-xl text-white outline-none focus:border-amber-400"
            >
              {currentLevelConfig.subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Manual Load Core Trigger Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleLoadScheme}
            className={`w-full sm:w-auto px-6 py-3 font-extrabold text-xs rounded-2xl shadow-lg transition duration-250 flex items-center justify-center gap-2 border-none cursor-pointer ${
              isLoaded 
                ? "bg-indigo-900 text-indigo-200 cursor-default cursor-not-allowed opacity-80" 
                : "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 active:scale-95 text-slate-950 font-black shadow-amber-500/20"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{isLoaded ? "Scheme Loaded & Active" : `View ${selectedSubject} Scheme of Work`}</span>
          </button>
        </div>
      </div>

      {/* CORE SCHEME LISTINGS AND UTILITY TOOLBARS */}
      {!isLoaded ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-3xl text-center space-y-4 shadow-xs">
          <div className="p-4 bg-indigo-50 text-indigo-700 rounded-2xl">
            <Layers className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-1 max-w-md">
            <h4 className="text-sm font-extrabold text-slate-805">
              Approved Syllabus Ready to Load
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              You have selected <span className="font-bold text-indigo-700">{selectedClass}</span>, <span className="font-bold text-indigo-700">{selectedTerm}</span>, and subject <span className="font-bold text-indigo-700">{selectedSubject}</span>. Click the button below to load the approved NERDC curriculum timeline.
            </p>
          </div>
          <button
            onClick={handleLoadScheme}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 border-none cursor-pointer font-black"
          >
            <BookOpen className="w-4 h-4" />
            <span>Load Weeks Scheme of Work</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Term Unique Curriculum Status Alert */}
          {uniquenessReport && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-3xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-slate-800">
              <div className="flex items-start sm:items-center gap-2.5 text-left">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black tracking-wide text-emerald-950 uppercase">
                    NERDC Syllabus Integrity Verified
                  </p>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                    {uniquenessReport.report}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg">
                  <Sparkles className="w-3" />
                  Deduplicated Term Timeline
                </span>
              </div>
            </div>
          )}

          {/* Search, expand/collapse, print toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-3xl shadow-xs">
          
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              placeholder="Search topics, subtopics or skills..."
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-250 rounded-2xl text-slate-800 outline-none focus:bg-white focus:border-indigo-650 font-medium"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={expandAll}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black rounded-lg transition border-none cursor-pointer"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black rounded-lg transition border-none cursor-pointer"
            >
              Collapse All
            </button>
            
            <div className="h-4 border-l border-slate-200 mx-1 secret-print-none hidden sm:block" />

            <button
              onClick={handlePrint}
              className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg transition border-none cursor-pointer flex items-center gap-1"
            >
              <Printer className="w-3 h-3" />
              <span>Print Scheme</span>
            </button>

            <button
              onClick={handleWordDownload}
              className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg transition border-none cursor-pointer flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Download MS Word</span>
            </button>

            {/* Educator action */}
            {(userPerspective === "teacher" || userPerspective === "admin") && (
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setShowAddCustomTopicModal(true)}
                  className="py-1.5 px-3 bg-gradient-to-r from-violet-600 to-indigo-700 text-white hover:from-violet-700 hover:to-indigo-805 text-[10px] font-black rounded-lg transition border-none cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Week</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBulkImportError("");
                    setBulkImportSuccess("");
                    setBulkCsvText("");
                    setShowBulkImportModal(true);
                  }}
                  className="py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white hover:from-emerald-700 hover:to-teal-800 text-[10px] font-black rounded-lg transition border-none cursor-pointer flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import CSV Scheme</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MAIN CURRICULUM TIMELINE ACCORDIONS */}
        <div className="space-y-4">
          {filteredWeeks.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-2">
              <BookOpen className="w-10 h-10 text-slate-350 mx-auto animate-pulse" />
              <p className="text-xs text-slate-500 font-extrabold block">No weekly scheme items match your current filter query.</p>
              <button
                onClick={() => setSearchQuery("")}
                className="py-1 px-3 bg-indigo-55 text-indigo-750 font-black text-[10px] rounded-lg border-none cursor-pointer"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            filteredWeeks.map((weekUnit, index) => {
              const isExpanded = !!expandedWeeks[weekUnit.week];
              const isWeekTaught = !!weekUnit.isTaught;
              const isStudied = checkIsStudiedByStudent(weekUnit.week);

              return (
                <div
                  key={weekUnit.week}
                  className={`bg-white border rounded-3xl overflow-hidden shadow-xs transition duration-300 ${
                    isWeekTaught ? "border-emerald-250 bg-emerald-50/5" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Collapsible header */}
                  <div
                    onClick={() => toggleWeekExpansion(weekUnit.week)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none bg-slate-50/50"
                  >
                    <div className="flex items-start gap-3">
                      
                      {/* Check mark badge */}
                      {isWeekTaught ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
                          ✓
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 font-mono">
                          W{weekUnit.week}
                        </div>
                      )}

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-450 font-black tracking-widest uppercase">
                            Week {weekUnit.week} Scheme Plan
                          </span>
                          {isWeekTaught && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-850 font-extrabold uppercase tracking-wide py-0.5 px-2 rounded-md">
                              Taught on {weekUnit.taughtDate || "Today"}
                            </span>
                          )}
                          {isStudied && (
                            <span className="text-[9px] bg-amber-100 text-amber-900 font-extrabold uppercase tracking-wide py-0.5 px-2 rounded-md">
                              Studied By You
                            </span>
                          )}
                        </div>
                        
                        {editingWeekIndex === index ? (
                          <div className="pt-2 flex flex-col gap-2 w-full sm:w-[450px]">
                            <input
                              type="text"
                              value={editFormData.topic || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, topic: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-white border border-slate-300 text-xs font-black p-1.5 rounded-lg w-full"
                              placeholder="Topic"
                            />
                            <input
                              type="text"
                              value={editFormData.subtopic || ""}
                              onChange={(e) => setEditFormData({ ...editFormData, subtopic: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-white border border-slate-300 text-xs font-semibold p-1.5 rounded-lg w-full"
                              placeholder="Subtopic"
                            />
                          </div>
                        ) : (
                          <>
                            <h4 className="text-sm sm:text-base font-extrabold text-slate-850">
                              {weekUnit.topic}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-semibold italic">
                              Subtopic focus: {weekUnit.subtopic}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                      
                      {/* Studied toggle for student */}
                      {userPerspective === "student" && (
                        <button
                          onClick={() => handleToggleStudied(weekUnit.week)}
                          className={`py-1 px-3 ml-2 text-[10px] font-extrabold rounded-lg transition-all border-none cursor-pointer ${
                            isStudied
                              ? "bg-amber-100 text-amber-900"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                          }`}
                        >
                          {isStudied ? "✓ Study Completed" : "Mark studied"}
                        </button>
                      )}

                      {/* Taught toggle for teacher */}
                      {(userPerspective === "teacher" || userPerspective === "admin") && (
                        <button
                          onClick={() => handleToggleTaught(weekUnit.week)}
                          className={`py-1.5 px-3 text-[10px] font-black rounded-lg transition-all border-none cursor-pointer flex items-center gap-1 ${
                            isWeekTaught
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : "bg-slate-150 hover:bg-slate-200 text-slate-700 border border-slate-300"
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{isWeekTaught ? "Taught" : "Mark taught"}</span>
                        </button>
                      )}

                      {/* Edit control */}
                      {(userPerspective === "teacher" || userPerspective === "admin") && (
                        <>
                          {editingWeekIndex === index ? (
                            <button
                              onClick={() => handleSaveEdit(index)}
                              className="py-1 px-2.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black transition border-none cursor-pointer"
                            >
                              Save
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(index)}
                              className="p-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition border-none cursor-pointer hover:text-slate-900"
                              title="Edit week content"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}

                      <div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Expanded detail grids */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden border-t border-slate-150"
                      >
                        <div className="p-6 md:p-8 bg-white grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 text-xs leading-relaxed text-slate-705">
                          
                          {/* Objectives & Teaching and Student Activities */}
                          <div className="space-y-4">
                            <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-2">
                              <h5 className="font-extrabold text-indigo-950 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-indigo-600" />
                                1. Learning Objectives
                              </h5>
                              {editingWeekIndex === index ? (
                                <textarea
                                  value={editFormData.objectives || ""}
                                  onChange={(e) => setEditFormData({ ...editFormData, objectives: e.target.value })}
                                  rows={3}
                                  className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-lg"
                                />
                              ) : (
                                <p className="whitespace-pre-line text-slate-700 font-medium">
                                  {weekUnit.objectives}
                                </p>
                              )}
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                              <h5 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">
                                2. Classroom Teaching Activities
                              </h5>
                              {editingWeekIndex === index ? (
                                <textarea
                                  value={editFormData.teachingActivities || ""}
                                  onChange={(e) => setEditFormData({ ...editFormData, teachingActivities: e.target.value })}
                                  rows={3}
                                  className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-lg"
                                />
                              ) : (
                                <p className="whitespace-pre-line text-slate-650 font-medium">
                                  {weekUnit.teachingActivities}
                                </p>
                              )}
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                              <h5 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">
                                3. Pupil/Student Class Activities
                              </h5>
                              {editingWeekIndex === index ? (
                                <textarea
                                  value={editFormData.studentActivities || ""}
                                  onChange={(e) => setEditFormData({ ...editFormData, studentActivities: e.target.value })}
                                  rows={3}
                                  className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-lg"
                                />
                              ) : (
                                <p className="whitespace-pre-line text-slate-650 font-medium">
                                  {weekUnit.studentActivities}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Evaluation, Notes, Homework */}
                          <div className="space-y-4">
                            <div className="p-4 bg-[#f8fafc] border border-slate-200 rounded-2xl space-y-2">
                              <h5 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">
                                4. System & Classroom Assessment
                              </h5>
                              {editingWeekIndex === index ? (
                                <textarea
                                  value={editFormData.assessment || ""}
                                  onChange={(e) => setEditFormData({ ...editFormData, assessment: e.target.value })}
                                  rows={3}
                                  className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-lg"
                                />
                              ) : (
                                <p className="whitespace-pre-line text-slate-650 font-medium whitespace-pre-wrap">
                                  {weekUnit.assessment}
                                </p>
                              )}
                            </div>

                            <div className="p-4 bg-[#fffbfa] border border-[#fed7aa] rounded-2xl space-y-2">
                              <h5 className="font-extrabold text-amber-950 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                                5. Subject Summary Study Review
                              </h5>
                              {editingWeekIndex === index ? (
                                <textarea
                                  value={editFormData.notes || ""}
                                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                                  rows={4}
                                  className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-lg"
                                />
                              ) : (
                                <p className="whitespace-pre-line text-slate-700 font-medium">
                                  {weekUnit.notes}
                                </p>
                              )}
                            </div>

                            <div className="p-4 bg-[#fdf2f8] border border-pink-200 rounded-2xl space-y-1.5">
                              <h4 className="font-extrabold text-pink-905 uppercase tracking-wider text-[10px]">
                                6. Term Homework & Drills
                              </h4>
                              {editingWeekIndex === index ? (
                                <textarea
                                  value={editFormData.homework || ""}
                                  onChange={(e) => setEditFormData({ ...editFormData, homework: e.target.value })}
                                  rows={3}
                                  className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-lg"
                                />
                              ) : (
                                <p className="text-slate-650 font-medium whitespace-pre-wrap">
                                  {weekUnit.homework}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* AI POWERED CONTENT GENERATOR PANEL */}
                          <div className="md:col-span-2 pt-5 border-t border-indigo-150 flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-50 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="p-1 px-2 bg-indigo-50 text-indigo-700 font-extrabold rounded-lg text-[10px] flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-650 animate-pulse" />
                                  AI Academic Co-Pilot
                                </span>
                                <h5 className="text-[11px] uppercase font-black tracking-wide text-slate-800">
                                  Topic Lesson & Exam Generator
                                </h5>
                              </div>
                              <span className="text-[9px] text-indigo-400 font-extrabold tracking-wide uppercase">
                                Google Gemini Pro Integration
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                              Quickly generate customized lesson plans, comprehensive notes, or interactive school board examinations based on the approved NERDC topic <strong className="text-slate-800">"{weekUnit.topic}"</strong>.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                              <button
                                onClick={() => handleGenerateAIContent("lesson_note", weekUnit)}
                                className="py-2.5 px-4 bg-gradient-to-r from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-150 text-indigo-950 font-black text-xs rounded-xl transition duration-250 border border-indigo-200/50 flex items-center justify-center gap-2 cursor-pointer hover:border-indigo-300"
                              >
                                <FileText className="w-4 h-4 text-indigo-600" />
                                <span>Generate Lesson Note</span>
                              </button>

                              <button
                                onClick={() => handleGenerateAIContent("lesson_plan", weekUnit)}
                                className="py-2.5 px-4 bg-gradient-to-r from-violet-50 to-violet-100 hover:from-violet-100 hover:to-violet-150 text-violet-950 font-black text-xs rounded-xl transition duration-250 border border-violet-200/50 flex items-center justify-center gap-2 cursor-pointer hover:border-violet-300"
                              >
                                <Calendar className="w-4 h-4 text-violet-600" />
                                <span>Generate Lesson Plan</span>
                              </button>

                              <button
                                onClick={() => handleGenerateAIContent("exam", weekUnit)}
                                className="py-2.5 px-4 bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-150 text-amber-950 font-black text-xs rounded-xl transition duration-250 border border-amber-200/50 flex items-center justify-center gap-2 cursor-pointer hover:border-amber-300"
                              >
                                <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
                                <span>Generate Exam Setup</span>
                              </button>
                            </div>
                          </div>

                          {/* TEACHER PERSONAL WORK SPACE NOTES PANEL */}
                          <div className="md:col-span-2 pt-4 border-t border-slate-100 flex flex-col gap-2">
                            <span className="text-[10px] text-slate-400 font-black block uppercase tracking-wider">
                              {userPerspective === "teacher" || userPerspective === "admin"
                                ? "Personal Lesson Annotations (Confidential Teacher Notes)"
                                : "Personal Student Study Annotations"}
                            </span>
                            <textarea
                              rows={2}
                              value={weekUnit.teacherNote || ""}
                              onChange={(e) => handleUpdateTeacherNote(weekUnit.week, e.target.value)}
                              placeholder={`Type personal thoughts, scheduling details, or notes regarding class presentation for week ${weekUnit.week} here... (Saves automatically)`}
                              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-medium text-slate-800"
                            />
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

      </div>
    )}

      {/* MODAL: ADD CUSTOM TOPIC SCHEME */}
      <AnimatePresence>
        {showAddCustomTopicModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-2xl p-6 md:p-8 border border-slate-200 space-y-6"
            >
              <div className="flex items-center justify-between border-b pb-4 border-slate-100">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                    <Plus className="w-5 h-5 text-indigo-650 animate-bounce" />
                    Insert Custom Curriculum Topic
                  </h3>
                  <p className="text-xs text-slate-400">Append custom weekly syllabus highlights matching approved school calendar guidelines.</p>
                </div>
                <button
                  onClick={() => setShowAddCustomTopicModal(false)}
                  className="py-1 px-3 bg-slate-50 rounded-lg hover:bg-slate-100 text-slate-400 text-xs font-black transition border-none cursor-pointer"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleAddCustomWeek} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-450 uppercase font-black tracking-wide">Dynamic Week Assigned</label>
                    <input
                      type="number"
                      required
                      value={newTopicFormData.week || ""}
                      onChange={(e) => setNewTopicFormData({ ...newTopicFormData, week: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500"
                      disabled
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-450 uppercase font-black tracking-wide">Curriculum Topic Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ratio and Proportion applications"
                      value={newTopicFormData.topic || ""}
                      onChange={(e) => setNewTopicFormData({ ...newTopicFormData, topic: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-555 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 uppercase font-black tracking-wide">Sub-topic outline Focus</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Concept of direct and inverse variations"
                    value={newTopicFormData.subtopic || ""}
                    onChange={(e) => setNewTopicFormData({ ...newTopicFormData, subtopic: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-555 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 uppercase font-black tracking-wide">Learning Objectives (Bullet points)</label>
                  <textarea
                    rows={2}
                    placeholder="By the end of this lesson, students should be able to..."
                    value={newTopicFormData.objectives || ""}
                    onChange={(e) => setNewTopicFormData({ ...newTopicFormData, objectives: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-555 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-450 uppercase font-black tracking-wide">Teaching Activities</label>
                    <textarea
                      rows={2}
                      placeholder="List teacher steps..."
                      value={newTopicFormData.teachingActivities || ""}
                      onChange={(e) => setNewTopicFormData({ ...newTopicFormData, teachingActivities: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-555 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-450 uppercase font-black tracking-wide">Student Activities</label>
                    <textarea
                      rows={2}
                      placeholder="List student tasks..."
                      value={newTopicFormData.studentActivities || ""}
                      onChange={(e) => setNewTopicFormData({ ...newTopicFormData, studentActivities: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-555 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-450 uppercase font-black tracking-wide">Assessment Procedures</label>
                    <textarea
                      rows={2}
                      placeholder="Assessment quiz questions..."
                      value={newTopicFormData.assessment || ""}
                      onChange={(e) => setNewTopicFormData({ ...newTopicFormData, assessment: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-555 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-450 uppercase font-black tracking-wide">Homework Assignment</label>
                    <textarea
                      rows={2}
                      placeholder="Homework text drills..."
                      value={newTopicFormData.homework || ""}
                      onChange={(e) => setNewTopicFormData({ ...newTopicFormData, homework: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-555 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 uppercase font-black tracking-wide">Full Lesson Summary Note content</label>
                  <textarea
                    rows={3}
                    placeholder="Type lesson outlines or handbook topics here..."
                    value={newTopicFormData.notes || ""}
                    onChange={(e) => setNewTopicFormData({ ...newTopicFormData, notes: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-555 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer border-none"
                >
                  Confirm and Insert into Scheme
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: BULK CSV IMPORT SCHEME */}
      <AnimatePresence>
        {showBulkImportModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-2xl p-6 md:p-8 border border-slate-200 space-y-6"
            >
              <div className="flex items-center justify-between border-b pb-4 border-slate-100">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                    <Upload className="w-5 h-5 text-emerald-600 animate-bounce" />
                    Import CSV Scheme of Work
                  </h3>
                  <p className="text-xs text-slate-400">Class: <strong>{selectedClass}</strong> | Subject: <strong>{selectedSubject}</strong> | Term: <strong>{selectedTerm}</strong></p>
                </div>
                <button
                  onClick={() => setShowBulkImportModal(false)}
                  className="py-1 px-3 bg-slate-50 rounded-lg hover:bg-slate-100 text-slate-400 text-xs font-black transition border-none cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-xl text-xs space-y-2 text-emerald-850">
                  <p className="font-extrabold text-emerald-950">Format Guidelines:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Requires headers: <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono font-bold text-[10px]">Week, Topic</code> (mandatory)</li>
                    <li>Optional headers: <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono font-bold text-[10px]">Subtopic, Objectives, Teaching Activities, Student Activities, Assessment, Notes, Homework</code></li>
                    <li>Supports any comma-separated or tab-separated text block.</li>
                  </ul>
                  <button
                    onClick={() => {
                      const sample = "Week,Topic,Subtopic,Objectives,Teaching Activities,Student Activities,Assessment,Notes,Homework\n" +
                        "1,Our Body,Body parts,Identify names of body parts,Teacher points out different body parts with flashcards,Students sing names of body parts and draw hands,Quiz naming parts,Key summary of introduction of human physical architecture,Practice naming major body parts\n" +
                        "2,Bathing Regularly,Care of standard skin,Explain the importance of daily showering,Teacher displays soap and water,Students mimic cleaning movements,Discussion grading,Skin hygiene rules for safety and general health,Bath twice daily task homework";
                      setBulkCsvText(sample);
                    }}
                    className="py-1 px-2.5 bg-emerald-200 hover:bg-emerald-300 text-emerald-800 text-[10px] font-black rounded border-none cursor-pointer mt-1"
                  >
                    Load Sample CSV
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-500">Spreadsheet File Upload (Instant scanner)</label>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const text = evt.target?.result as string;
                          setBulkCsvText(text);
                        };
                        reader.readAsText(file);
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-500">Or Paste CSV Text Block</label>
                  <textarea
                    rows={8}
                    value={bulkCsvText}
                    onChange={(e) => setBulkCsvText(e.target.value)}
                    placeholder="Week,Topic,Subtopic,Objectives,..."
                    className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white outline-none"
                  />
                </div>

                {bulkImportError && (
                  <p className="text-xs text-rose-600 font-extrabold bg-rose-50 border border-rose-100 p-2.5 rounded-xl">{bulkImportError}</p>
                )}
                {bulkImportSuccess && (
                  <p className="text-xs text-emerald-600 font-extrabold bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">{bulkImportSuccess}</p>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setBulkImportError("");
                      setBulkImportSuccess("");
                      if (!bulkCsvText.trim()) {
                        setBulkImportError("Please upload a file or paste CSV text first.");
                        return;
                      }
                      
                      const parsed = parseCSVText(bulkCsvText);
                      await saveCurrentWeeksState(parsed);
                      setBulkImportSuccess(`Succeeded! Parsed and stored ${parsed.length} weeks of Scheme of Work inside the centralized database!`);
                      
                      setTimeout(() => {
                        setShowBulkImportModal(false);
                      }, 1500);
                    } catch (e: any) {
                      setBulkImportError(e.message || "Failed parsing CSV data structure");
                    }
                  }}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer border-none"
                >
                  Import and Publish to Central Database
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: AI GENERATOR VIEWER PANEL */}
      <AnimatePresence>
        {showGeneratedModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-4xl p-6 md:p-8 border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b pb-4 border-indigo-50">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-xl">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </span>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
                      Generated {generatingType === "lesson_note" ? "Lesson Note" : generatingType === "lesson_plan" ? "Lesson Plan" : "Exam Worksheet"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Target Topic: {loadedWeeks.find(u => u.week === generatingWeek)?.topic || "Primary Curriculum"} • {selectedClass} • {selectedSubject}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGeneratedModal(false)}
                  className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-black rounded-lg transition border-none cursor-pointer"
                >
                  Close Viewer
                </button>
              </div>

              {/* MODAL WORKSPACE CONTENT */}
              <div className="flex-1 overflow-y-auto py-6 space-y-6 text-xs text-slate-700 font-medium">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                      <Sparkles className="w-6 h-6 text-indigo-600 animate-ping absolute inset-3" />
                    </div>
                    <div className="text-center space-y-1">
                      <h4 className="text-sm font-black text-slate-800">
                        Gemini AI generating curriculum materials...
                      </h4>
                      <p className="text-xs text-slate-400 font-semibold max-w-sm">
                        Please hold on while we structure, format, and review the materials according to approved NERDC Nigerian academic sequences.
                      </p>
                    </div>
                  </div>
                ) : apiError ? (
                  <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-rose-900 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="p-3 bg-rose-100 text-rose-700 rounded-full">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-md">
                      <h4 className="text-sm font-black uppercase tracking-wider font-extrabold text-rose-950">AI Content Generation Failed</h4>
                      <p className="text-xs font-semibold leading-relaxed text-rose-700">
                        {apiError}
                      </p>
                    </div>
                    <button
                      onClick={() => handleGenerateAIContent(generatingType!, loadedWeeks.find(u => u.week === generatingWeek)!)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl border-none cursor-pointer transition"
                    >
                      Retry Generation
                    </button>
                  </div>
                ) : (
                  <>
                    {/* LESSON NOTE TEMPLATE VIEW */}
                    {generatingType === "lesson_note" && generatedNote && (
                      <div className="space-y-6">
                        <div className="flex flex-wrap gap-2 justify-end secret-print-none">
                          <button
                            onClick={() => handleDownloadNoteWord(generatedNote)}
                            className="py-2 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-black rounded-xl transition border-none cursor-pointer flex items-center gap-1.5"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download MS Word (.doc)</span>
                          </button>
                          <button
                            onClick={() => window.print()}
                            className="py-2 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-black rounded-xl transition border-none cursor-pointer flex items-center gap-1.5"
                          >
                            <Printer className="w-4 h-4" />
                            <span>Print Note Booklet</span>
                          </button>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-200">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">SUBJECT</span>
                              <span className="font-bold text-slate-800">{generatedNote.subject}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">CLASS</span>
                              <span className="font-bold text-slate-800">{generatedNote.classLevel}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">PERIODS</span>
                              <span className="font-bold text-slate-800">{generatedNote.periods}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-extrabold">DIFFICULTY</span>
                              <span className="font-extrabold text-indigo-650">{generatedNote.difficulty}</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-sm font-black text-indigo-900 border-l-4 border-indigo-600 pl-2">
                              Detailed Core Lesson Notes
                            </h4>
                            <div className="p-4 bg-white border border-slate-150 rounded-xl whitespace-pre-line text-slate-700 leading-relaxed font-semibold">
                              {generatedNote.content?.detailedNote}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-sm font-black text-slate-804">
                              Methodological Explanations
                            </h4>
                            <p className="p-4 bg-white border border-slate-150 rounded-xl text-slate-650 font-medium leading-relaxed">
                              {generatedNote.content?.explanation}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-white border border-slate-150 rounded-xl space-y-2">
                              <h5 className="font-black text-rose-900 uppercase text-[10px] tracking-wider">Solved Class Examples</h5>
                              <ul className="list-disc pl-4 space-y-1.5">
                                {generatedNote.content?.examples?.map((ex: any, idx: number) => (
                                  <li key={idx} className="text-slate-650 font-semibold">{ex}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="p-4 bg-white border border-slate-150 rounded-xl space-y-2">
                              <h5 className="font-black text-indigo-905 uppercase text-[10px] tracking-wider">Pupil Activities Suite</h5>
                              <ul className="list-disc pl-4 space-y-1.5">
                                {generatedNote.content?.classActivities?.map((act: any, idx: number) => (
                                  <li key={idx} className="text-slate-650 font-semibold">{act}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2">
                            <h5 className="font-black text-emerald-950 uppercase text-[10px] tracking-wider">Formative Class Evaluations (Questions)</h5>
                            <ol className="list-decimal pl-4 space-y-1.5">
                              {generatedNote.content?.evaluation?.map((ev: any, idx: number) => (
                                <li key={idx} className="text-slate-700 font-bold">{ev}</li>
                              ))}
                            </ol>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-[#fffefe] border border-slate-200 rounded-xl">
                              <h5 className="font-black text-slate-450 uppercase text-[9px] tracking-wider block mb-1">Homework Drill Assignment</h5>
                              <p className="text-slate-650 font-semibold italic">{generatedNote.content?.assignment}</p>
                            </div>
                            <div className="p-4 bg-[#fffefe] border border-slate-200 rounded-xl">
                              <h5 className="font-black text-slate-450 uppercase text-[9px] tracking-wider block mb-1">Lesson Summary checklist</h5>
                              <p className="text-slate-650 font-semibold">{generatedNote.content?.summary}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* LESSON PLAN TEMPLATE VIEW */}
                    {generatingType === "lesson_plan" && generatedPlan && (
                      <div className="space-y-6">
                        <div className="flex flex-wrap gap-2 justify-end secret-print-none">
                          <button
                            onClick={() => handleDownloadPlanWord(generatedPlan)}
                            className="py-2 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-black rounded-xl transition border-none cursor-pointer flex items-center gap-1.5"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download Plan Document (.doc)</span>
                          </button>
                        </div>

                        <div className="p-6 bg-indigo-950/5 rounded-2xl border border-indigo-100 space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-indigo-100">
                            <div>
                              <span className="text-[10px] text-indigo-400 block uppercase tracking-wider font-extrabold">TEACHER</span>
                              <span className="font-bold text-indigo-950 text-xs">{generatedPlan.teacherName}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-indigo-400 block uppercase tracking-wider font-extrabold">DURATION</span>
                              <span className="font-bold text-indigo-950 text-xs">{generatedPlan.duration}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-indigo-400 block uppercase tracking-wider font-extrabold">CLASS AGE</span>
                              <span className="font-bold text-indigo-950 text-xs">{generatedPlan.ageOfPupils} Years</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-indigo-400 block uppercase tracking-wider font-extrabold">PUPIL COUNT</span>
                              <span className="font-bold text-indigo-950 text-xs">{generatedPlan.numberOfPupils} Students</span>
                            </div>
                          </div>

                          <div className="p-4 bg-white border border-slate-150 rounded-xl space-y-2">
                            <h5 className="font-black text-indigo-950 uppercase text-[10px] tracking-wider">Lesson Objectives</h5>
                            <ul className="list-disc pl-4 space-y-1">
                              {generatedPlan.plan?.lessonObjectives?.map((obj: any, idx: number) => (
                                <li key={idx} className="text-slate-700 font-semibold">{obj}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 bg-white border border-slate-150 rounded-xl space-y-2">
                              <h5 className="font-black text-slate-500 uppercase text-[10px]">Instructional Materials</h5>
                              <ul className="list-disc pl-4 text-slate-655">
                                {generatedPlan.plan?.instructionalMaterials?.map((mat: any, idx: number) => (
                                  <li key={idx}>{mat}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="p-4 bg-white border border-slate-150 rounded-xl space-y-2">
                              <h5 className="font-black text-slate-500 uppercase text-[10px]">Behavioral Objectives</h5>
                              <ul className="list-disc pl-4 text-slate-655">
                                {generatedPlan.plan?.behaviouralObjectives?.map((bobj: any, idx: number) => (
                                  <li key={idx}>{bobj}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="p-4 bg-white border border-slate-150 rounded-xl text-slate-650 space-y-1">
                            <span className="text-[10px] text-indigo-505 font-extrabold tracking-wider block uppercase">Introduction Plan</span>
                            <p className="font-semibold">{generatedPlan.plan?.introduction}</p>
                          </div>

                          <div className="space-y-2">
                            <h5 className="font-black text-indigo-950 uppercase text-[11px] tracking-wider">Presentation Flow Steps</h5>
                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black tracking-wide text-slate-500">
                                    <th className="p-3">Step</th>
                                    <th className="p-3">Teacher's Activities</th>
                                    <th className="p-3">Students' Tasks</th>
                                    <th className="p-3">Method Objectives</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {generatedPlan.plan?.presentationSteps?.map((step: any, idx: number) => (
                                    <tr key={idx} className="border-b border-slate-150 last:border-0 hover:bg-slate-50/50">
                                      <td className="p-3 font-bold text-indigo-900 shrink-0">{step.step}</td>
                                      <td className="p-3 text-slate-750 font-semibold">{step.teachersActivities}</td>
                                      <td className="p-3 text-slate-600">{step.studentsActivities}</td>
                                      <td className="p-3 text-slate-505 italic">{step.learningPoints}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 bg-white border border-slate-150 rounded-xl space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Format Evaluation</span>
                              <p className="text-slate-650 font-bold leading-relaxed">{generatedPlan.plan?.evaluation}</p>
                            </div>
                            <div className="p-4 bg-white border border-slate-150 rounded-xl space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Homework Assignment</span>
                              <p className="text-slate-650 font-bold leading-relaxed">{generatedPlan.plan?.assignment}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* EXAM WORKSHEET TEMPLATE VIEW */}
                    {generatingType === "exam" && generatedExam && (
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                          <p className="text-[11px] text-indigo-950 font-black flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                            Generated exactly {generatedExam.length} curriculum standard examination questions!
                          </p>

                          <button
                            onClick={handleSaveGeneratedExam}
                            disabled={isSavingExam || savedExamSuccess}
                            className={`py-2 px-4 rounded-xl font-black text-xs transition duration-200 border-none cursor-pointer flex items-center gap-1.5 shadow-xs ${
                              savedExamSuccess
                                ? "bg-emerald-100 text-emerald-800 cursor-default"
                                : "bg-indigo-600 hover:bg-indigo-700 hover:scale-102 hover:shadow-indigo-500/20 text-white"
                            }`}
                          >
                            {isSavingExam ? (
                              <span>Saving...</span>
                            ) : savedExamSuccess ? (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                <span>Successfully Saved to Portal!</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                <span>Save Exam to School Portal</span>
                              </>
                            )}
                          </button>
                        </div>

                        {savedExamSuccess && (
                          <div className="p-4 bg-emerald-100/40 border border-emerald-250 text-emerald-950 rounded-2xl text-xs font-black">
                            ✓ This Exam is now fully deployed inside the active Exams list! Teachers can organize scheduling, and students can login and sit this exact computerized evaluation test immediately.
                          </div>
                        )}

                        <div className="p-6 bg-[#fffdfb] rounded-2xl border border-amber-200 space-y-5">
                          <h4 className="text-xs font-black uppercase text-amber-950 tracking-wider flex items-center gap-1">
                            Curriculum Term Exam Worksheet
                          </h4>

                          <div className="space-y-5">
                            {generatedExam.map((q: any, idx: number) => (
                              <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-xs">
                                <div className="flex items-start justify-between gap-4">
                                  <span className="font-black text-slate-800 text-xs">
                                    Question {idx + 1}: <span className="font-semibold text-slate-700">{q.question}</span>
                                  </span>
                                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold py-0.5 px-2 rounded-lg shrink-0">
                                    5 Marks
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-650 font-bold text-[11px] pl-2">
                                  <div className={`p-2 rounded-lg border bg-slate-50 ${q.correctAnswer === "A" ? "border-emerald-500 bg-emerald-50/20 font-black text-emerald-950" : "border-slate-150"}`}>
                                    A) {q.optionA}
                                  </div>
                                  <div className={`p-2 rounded-lg border bg-slate-50 ${q.correctAnswer === "B" ? "border-emerald-500 bg-emerald-50/20 font-black text-emerald-950" : "border-slate-150"}`}>
                                    B) {q.optionB}
                                  </div>
                                  <div className={`p-2 rounded-lg border bg-slate-50 ${q.correctAnswer === "C" ? "border-emerald-500 bg-emerald-50/20 font-black text-emerald-950" : "border-slate-150"}`}>
                                    C) {q.optionC}
                                  </div>
                                  <div className={`p-2 rounded-lg border bg-slate-50 ${q.correctAnswer === "D" ? "border-emerald-500 bg-emerald-50/20 font-black text-emerald-950" : "border-slate-150"}`}>
                                    D) {q.optionD}
                                  </div>
                                </div>

                                {q.explanation && (
                                  <div className="p-2.5 bg-emerald-50 text-emerald-955 rounded-lg text-[10px] font-semibold border border-emerald-100">
                                    <strong>Curriculum Guidance / Answer Explanation:</strong> {q.explanation}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="border-t pt-4 border-slate-100 flex justify-end gap-3 secret-print-none">
                <button
                  onClick={() => setShowGeneratedModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl border-none cursor-pointer"
                >
                  Close Viewer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
