import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Sparkles,
  Award,
  Search,
  Trash2,
  Copy,
  Download,
  Printer,
  Edit2,
  RefreshCw,
  FileText,
  CheckCircle2,
  Plus,
  ArrowLeft,
  Calendar,
  Layers,
  Archive,
  ArrowRight,
  Check,
  Save,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  HelpCircle
} from "lucide-react";

interface MyLibraryProps {
  user: any;
  onRefreshWallet?: () => void;
}

interface Document {
  id: string;
  userId: string;
  title: string;
  content: any;
  category: "Lesson Plans" | "Notes" | "Question Pools" | "Schemes of Work" | "Assignments" | "Worksheets" | "Other Generated Resources";
  subject: string;
  classLevel: string;
  createdAt: string;
  updatedAt: string;
  status: "active" | "trash";
  deletedAt?: string;
  topic?: string;
  subTopic?: string;
}

const CATEGORIES = [
  "Lesson Plans",
  "Notes",
  "Question Pools",
  "Schemes of Work",
  "Assignments",
  "Worksheets",
  "Other Generated Resources"
];

const SUBJECTS_LIST = [
  "English Language",
  "Mathematics",
  "Phonics",
  "Physics",
  "Chemistry",
  "Biology",
  "Commerce",
  "Accounting",
  "Economics",
  "Government",
  "Civic Education",
  "Social Studies",
  "Business Studies",
  "Basic Science",
  "Basic Technology",
  "Agricultural Science",
  "ICT",
  "History",
  "Artificial Intelligence"
];

export default function MyLibrary({ user, onRefreshWallet }: MyLibraryProps) {
  // State for documents
  const [documents, setDocuments] = useState<Document[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(6);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingTrash, setViewingTrash] = useState(false);
  const [loading, setLoading] = useState(false);

  // Document Viewing & Editing States
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "Last Updated">("Saved");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");

  // AI Creator Form Wizard State
  const [showCreator, setShowCreator] = useState(false);
  const [wizardCategory, setWizardCategory] = useState("Schemes of Work");
  const [wizardSubject, setWizardSubject] = useState("Mathematics");
  const [wizardLevel, setWizardLevel] = useState("Grade 10");
  const [wizardTopic, setWizardTopic] = useState("");
  const [wizardDetails, setWizardDetails] = useState("");
  const [generatingResource, setGeneratingResource] = useState(false);

  // Notifications State
  const [notification, setNotification] = useState<string | null>(null);

  // Fetch Documents
  const fetchDocs = async () => {
    setLoading(true);
    try {
      const statusFilter = viewingTrash ? "trash" : "active";
      const catQuery = activeCategory !== "all" ? `&category=${encodeURIComponent(activeCategory)}` : "";
      const searchQueryParam = searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery)}` : "";
      
      const res = await fetch(`/api/documents?status=${statusFilter}${catQuery}${searchQueryParam}&page=${page}&limit=${limit}`);
      const data = await res.json();
      if (res.ok) {
        setDocuments(data.documents || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Error loading library documents:", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger loading when filters, tab or pages change
  useEffect(() => {
    fetchDocs();
  }, [page, activeCategory, viewingTrash, searchQuery]);

  // Show Toast Success Notification Helper
  const triggerToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Perform simple Search Trigger
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setPage(1);
      fetchDocs();
    }
  };

  // Generate resource from the AI creator Wizard
  const handleGenerateAIService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wizardTopic.trim()) {
      alert("Please specify a topic for research/generation!");
      return;
    }
    setGeneratingResource(true);

    try {
      // Dynamic route depending on category choice
      let endpoint = "/api/ai/generate-resource";
      let payload: any = {
        category: wizardCategory,
        subject: wizardSubject,
        classLevel: wizardLevel,
        topic: wizardTopic,
        promptDetails: wizardDetails
      };

      // Support fallback routing to specific lesson notes or lesson plan builders if they choose them in wizard
      if (wizardCategory === "Lesson Plans") {
        endpoint = "/api/ai/lesson-plan";
        payload = {
          subject: wizardSubject,
          classLevel: wizardLevel,
          topic: wizardTopic,
          subTopic: wizardTopic,
          duration: "40 Minutes",
          teacherId: user.id
        };
      } else if (wizardCategory === "Notes") {
        endpoint = "/api/ai/lesson-note";
        payload = {
          subject: wizardSubject,
          classLevel: wizardLevel,
          topic: wizardTopic,
          subTopic: wizardTopic,
          periods: "2 Periods",
          difficulty: "Medium",
          teacherId: user.id
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        triggerToast("Document saved successfully.");
        if (onRefreshWallet) onRefreshWallet();
        
        // Reset form wizard state and open newly created document
        setWizardTopic("");
        setWizardDetails("");
        setShowCreator(false);
        setPage(1);
        
        // Retrieve newly saved document from backend
        const listRes = await fetch(`/api/documents?status=active&page=1&limit=1`);
        const listData = await listRes.json();
        if (listRes.ok && listData.documents && listData.documents.length > 0) {
          const freshDoc = listData.documents[0];
          setSelectedDoc(freshDoc);
          
          if (freshDoc.category === "Notes") {
            setEditedBody(freshDoc.content?.content?.detailedNote || JSON.stringify(freshDoc.content, null, 2));
          } else if (freshDoc.category === "Lesson Plans") {
            setEditedBody(JSON.stringify(freshDoc.content, null, 2));
          } else if (freshDoc.category === "Question Pools") {
            setEditedBody(JSON.stringify(freshDoc.content, null, 2));
          } else {
            setEditedBody(freshDoc.content?.body || JSON.stringify(freshDoc.content, null, 2));
          }
          setEditedTitle(freshDoc.title);
        }
        
        fetchDocs();
      } else {
        alert(data.error || `Failed using AI to construct ${wizardCategory}. Please confirm wallet balance.`);
      }
    } catch (e) {
      console.error(e);
      alert("System connection lost. Please try again.");
    } finally {
      setGeneratingResource(false);
    }
  };

  // Soft Delete a Doc (moves to Trash)
  const handleSoftDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to move this resource to the Recycle Bin (Trash)? You can restore it anytime within 30 days!")) {
      return;
    }

    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        triggerToast("Resource successfully moved to Trash.");
        if (selectedDoc?.id === id) {
          setSelectedDoc(null);
          setIsEditing(false);
        }
        fetchDocs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Restore Doc from Trash
  const handleRestoreDoc = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/documents/${id}/restore`, { method: "POST" });
      if (res.ok) {
        triggerToast("Resource restored to standard library space successfully!");
        if (selectedDoc?.id === id) {
          setSelectedDoc(null);
          setIsEditing(false);
        }
        fetchDocs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Permanent Force Delete a Doc
  const handlePermanentDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("CRITICAL WARNING: Are you sure you want to PERMANENTLY erase this document? This operation cannot be undone under any circumstances!")) {
      return;
    }

    try {
      const res = await fetch(`/api/documents/${id}/force`, { method: "DELETE" });
      if (res.ok) {
        triggerToast("Resource erased permanently from servers.");
        if (selectedDoc?.id === id) {
          setSelectedDoc(null);
          setIsEditing(false);
        }
        fetchDocs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Duplicate a document
  const handleDuplicateDoc = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/documents/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        triggerToast("Document duplicated successfully.");
        fetchDocs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save manual edit text change (Autosaving style simulator)
  const handleSaveManualEdit = async () => {
    if (!selectedDoc) return;
    setSaveStatus("Saving...");

    try {
      // Structure content object based on category
      let newContentBody = { ...selectedDoc.content };
      if (selectedDoc.category === "Notes") {
        if (!newContentBody.content) newContentBody.content = {};
        newContentBody.content.detailedNote = editedBody;
      } else if (selectedDoc.category === "Lesson Plans") {
        try {
          newContentBody = JSON.parse(editedBody);
        } catch (je) {
          newContentBody.rawText = editedBody;
        }
      } else if (selectedDoc.category === "Question Pools") {
        try {
          newContentBody = JSON.parse(editedBody);
        } catch (je) {
          newContentBody.rawText = editedBody;
        }
      } else {
        newContentBody.body = editedBody;
      }

      const res = await fetch(`/api/documents/${selectedDoc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editedTitle,
          content: newContentBody
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSaveStatus("Saved");
        const formattedTime = new Date().toLocaleTimeString();
        setLastSavedTime(formattedTime);
        // Update selected document state
        setSelectedDoc(data.document);
        fetchDocs();
      } else {
        setSaveStatus("Last Updated");
        alert(data.error || "Failed to update changes to disk.");
      }
    } catch (e) {
      setSaveStatus("Last Updated");
      console.error(e);
    }
  };

  // Format date helper
  const formatDateFriendly = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Open single document
  const handleOpenDoc = (doc: Document) => {
    setSelectedDoc(doc);
    setIsEditing(false);
    setEditedTitle(doc.title);
    
    // Parse body text based on category
    if (doc.category === "Notes") {
      setEditedBody(doc.content?.content?.detailedNote || doc.content?.detailedNote || JSON.stringify(doc.content, null, 2));
    } else if (doc.category === "Lesson Plans") {
      setEditedBody(JSON.stringify(doc.content?.plan || doc.content, null, 2));
    } else if (doc.category === "Question Pools") {
      setEditedBody(JSON.stringify(doc.content, null, 2));
    } else {
      setEditedBody(doc.content?.body || JSON.stringify(doc.content, null, 2));
    }
    setSaveStatus("Saved");
    setLastSavedTime(doc.updatedAt ? new Date(doc.updatedAt).toLocaleTimeString() : "");
  };

  // Dynamic content renderer to present the details neatly
  const renderDocumentContent = (doc: Document) => {
    if (doc.category === "Notes") {
      const parsedNote = doc.content?.content || doc.content;
      return (
        <div className="space-y-4 text-xs leading-relaxed text-slate-700">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-[11px] text-amber-800 space-y-1">
            <p><strong>Topic:</strong> {doc.topic || parsedNote?.topic || "N/A"}</p>
            <p><strong>Sub-Topic:</strong> {doc.subTopic || parsedNote?.subTopic || "N/A"}</p>
            <p><strong>Subject:</strong> {doc.subject} | <strong>Class:</strong> {doc.classLevel}</p>
            <p><strong>Term/Week:</strong> {parsedNote?.term || "N/A"} - {parsedNote?.week || "N/A"}</p>
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 border-b pb-2 mb-2">1. Behavioural Objectives</h4>
            <ul className="list-disc pl-5 space-y-1">
              {parsedNote?.behaviouralObjectives?.map((ob: string, i: number) => <li key={i}>{ob}</li>) || <li>No objectives outlined</li>}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 border-b pb-2 mb-2">2. Detailed Lesson Note Outline</h4>
            <div className="bg-white rounded-xl p-4 border border-slate-100 whitespace-pre-line text-slate-800 tracking-wide leading-relaxed font-sans font-medium text-xs">
              {parsedNote?.detailedNote || "No note context available"}
            </div>
          </div>
          {parsedNote?.examples && parsedNote.examples.length > 0 && (
            <div>
              <h4 className="font-bold text-sm text-slate-900 border-b pb-2 mb-2">3. Solved Examples & Case Studies</h4>
              <ul className="list-decimal pl-5 space-y-2">
                {parsedNote.examples.map((ex: string, i: number) => <li key={i} className="font-semibold text-slate-800">{ex}</li>)}
              </ul>
            </div>
          )}
          {parsedNote?.evaluation && (
            <div>
              <h4 className="font-bold text-sm text-slate-900 border-b pb-2 mb-2">4. Classroom Evaluation Quiz</h4>
              <div className="bg-slate-50 rounded-xl p-4 border space-y-2 font-mono text-[11px] text-indigo-900">
                {Array.isArray(parsedNote.evaluation) ? (
                  parsedNote.evaluation.map((ev: string, i: number) => <p key={i}>{ev}</p>)
                ) : (
                  <p className="whitespace-pre-line">{parsedNote.evaluation}</p>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (doc.category === "Lesson Plans") {
      const plan = doc.content?.plan || doc.content;
      return (
        <div className="space-y-4 text-xs leading-relaxed text-slate-700">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-[11px] text-indigo-800 space-y-1">
            <p><strong>Topic:</strong> {plan?.topic || "N/A"}</p>
            <p><strong>Duration:</strong> {plan?.duration || "N/A"}</p>
            <p><strong>Subject:</strong> {doc.subject} | <strong>Class:</strong> {doc.classLevel}</p>
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 border-b pb-2 mb-2">Behavioural Objectives</h4>
            <ul className="list-disc pl-5 space-y-1">
              {plan?.behaviouralObjectives?.map((ob: string, i: number) => <li key={i}>{ob}</li>) || <li>No objectives scheduled</li>}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 border-b pb-2 mb-2">Instructional Materials Needed</h4>
            <ul className="list-disc pl-5 space-y-1">
              {plan?.instructionalMaterials?.map((mat: string, i: number) => <li key={i}>{mat}</li>) || <li>None required</li>}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 border-b pb-2 mb-2">Set Induction / Introduction</h4>
            <div className="bg-white p-3 border rounded-xl italic text-slate-800">
              {plan?.introduction || "N/A"}
            </div>
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 border-b pb-2 mb-2">Presentation Steps Grid</h4>
            <div className="space-y-3">
              {plan?.presentationSteps?.map((st: any, i: number) => (
                <div key={i} className="border rounded-xl p-3 bg-slate-50/50 space-y-1">
                  <p className="font-bold text-indigo-700 uppercase tracking-wide text-[10px]">{st.step || `Step ${i + 1}`}</p>
                  <p><strong>Teacher's Activities:</strong> {st.teachersActivities || st.teacherActivities || "N/A"}</p>
                  <p><strong>Learners' Activities:</strong> {st.learnersActivities || st.studentsActivities || "N/A"}</p>
                  {st.learningPoints && <p><strong>Core Learning Points:</strong> {st.learningPoints}</p>}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3 border rounded-xl bg-orange-50/50">
              <h5 className="font-black text-rose-800 mb-1">Classroom Evaluation</h5>
              <p className="whitespace-pre-line text-slate-800">{plan?.evaluation || "N/A"}</p>
            </div>
            <div className="p-3 border rounded-xl bg-emerald-50/50">
              <h5 className="font-black text-emerald-800 mb-1">Home Assignment</h5>
              <p className="whitespace-pre-line text-slate-800">{plan?.assignment || "N/A"}</p>
            </div>
          </div>
        </div>
      );
    }

    if (doc.category === "Question Pools") {
      const pool = doc.content;
      const questions = pool?.questions || pool?.rawJson?.questions || [];
      return (
        <div className="space-y-4 text-xs font-medium text-slate-700">
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-[11px] text-violet-800 space-y-1">
            <p><strong>Subject:</strong> {doc.subject || "General"}</p>
            <p><strong>Class Target:</strong> {doc.classLevel || "General"}</p>
            <p><strong>Total Questions:</strong> {questions.length} Objective CBT Items</p>
          </div>
          <div className="space-y-4 pt-2">
            {questions.map((q: any, i: number) => (
              <div key={i} className="bg-white p-4 border border-slate-100 rounded-2xl space-y-3 shadow-sm">
                <p className="font-black text-slate-900 text-sm">Question {i + 1}: {q.question}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-700 font-sans pl-2">
                  <div className={`p-2 border rounded-xl bg-slate-50 ${q.correctAnswer === "A" ? "border-emerald-300 bg-emerald-50/30 font-bold" : ""}`}>
                    A. {q.optionA}
                  </div>
                  <div className={`p-2 border rounded-xl bg-slate-50 ${q.correctAnswer === "B" ? "border-emerald-300 bg-emerald-50/30 font-bold" : ""}`}>
                    B. {q.optionB}
                  </div>
                  <div className={`p-2 border rounded-xl bg-slate-50 ${q.correctAnswer === "C" ? "border-emerald-300 bg-emerald-50/30 font-bold" : ""}`}>
                    C. {q.optionC}
                  </div>
                  <div className={`p-2 border rounded-xl bg-slate-50 ${q.correctAnswer === "D" ? "border-emerald-300 bg-emerald-50/30 font-bold" : ""}`}>
                    D. {q.optionD}
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-1 font-mono text-[10px] text-emerald-800 bg-emerald-50/30 p-2 rounded-xl border border-emerald-100 w-fit">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Correct Answer Option: <strong>{q.correctAnswer}</strong> | Score: {q.marks || 5} Marks</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Default general layout (Schemes of Work, Assignments, Worksheets, Other Generated Resources)
    const resourceBody = doc.content?.body || JSON.stringify(doc.content, null, 2);
    return (
      <div className="space-y-4">
        <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-[11px] text-teal-800 space-y-1">
          <p><strong>Service Type:</strong> {doc.category}</p>
          <p><strong>Subject:</strong> {doc.subject} | <strong>Class:</strong> {doc.classLevel}</p>
        </div>
        <div className="bg-white p-6 border border-slate-100 rounded-2xl whitespace-pre-line text-xs tracking-wide leading-relaxed font-sans text-slate-800 shadow-sm">
          {resourceBody}
        </div>
      </div>
    );
  };

  // Download raw document content as text file
  const handleDownloadDoc = (doc: Document) => {
    let contentString = "";
    if (doc.category === "Notes") {
      const raw = doc.content?.content || doc.content;
      contentString = `========= NIGERIAN BRAIN SYSTEM NOTES =========\nTitle: ${doc.title}\nSubject: ${doc.subject}\nClass: ${doc.classLevel}\nCreated: ${formatDateFriendly(doc.createdAt)}\n===============================================\n\n\n1. LESSON NOTE DETAILED OUTLINE:\n\n${raw?.detailedNote || ""}\n\n\n2. EXAMPLES:\n\n${JSON.stringify(raw?.examples || [], null, 2)}\n\n\n3. EVALUATION:\n\n${JSON.stringify(raw?.evaluation || "", null, 2)}`;
    } else if (doc.category === "Lesson Plans") {
      const raw = doc.content?.plan || doc.content;
      contentString = `========= NIGERIAN BRAIN SYSTEM LESSON PLAN =========\nTitle: ${doc.title}\nSubject: ${doc.subject}\nClass: ${doc.classLevel}\n======================================================\n\n\nOBJECTIVES:\n${JSON.stringify(raw?.behaviouralObjectives || [], null, 2)}\n\nSTEPS SCHEDULED:\n${JSON.stringify(raw?.presentationSteps || [], null, 2)}`;
    } else if (doc.category === "Question Pools") {
      const raw = doc.content?.questions || [];
      contentString = `========= EXAM QUESTION POOL =========\nTitle: ${doc.title}\nSubject: ${doc.subject}\nClass: ${doc.classLevel}\n=======================================\n\n` + 
        raw.map((q: any, idx: number) => `Q${idx + 1}: ${q.question}\nA. ${q.optionA}\nB. ${q.optionB}\nC. ${q.optionC}\nD. ${q.optionD}\nCorrect: ${q.correctAnswer}`).join("\n\n");
    } else {
      contentString = `========= BRAIN SYSTEM: ${doc.category} =========\nTitle: ${doc.title}\nSubject: ${doc.subject}\nClass: ${doc.classLevel}\n=================================================\n\n${doc.content?.body || JSON.stringify(doc.content, null, 2)}`;
    }

    const blob = new Blob([contentString], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${doc.title.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast("Resource download started successfully.");
  };

  // Modern print handler pre-optimized for A4 page layouts
  const handlePrintDoc = (doc: Document) => {
    let htmlContent = "";
    if (doc.category === "Notes") {
      const raw = doc.content?.content || doc.content;
      htmlContent = `
        <h1 style="color:#111827;font-family:sans-serif;margin-bottom:2px;">${doc.title}</h1>
        <p style="color:#6b7280;font-size:12px;margin-bottom:20px;">Subject: ${doc.subject} | Class Level: ${doc.classLevel} | Generated: ${formatDateFriendly(doc.createdAt)}</p>
        <h3 style="border-bottom:1px solid #e5e7eb;padding-bottom:5px;">1. Detailed Lesson Outline</h3>
        <p style="white-space:pre-line;line-height:1.6;color:#374151;">${raw?.detailedNote || "No note"}</p>
        <h3 style="border-bottom:1px solid #e5e7eb;padding-bottom:5px;margin-top:20px;">2. Solved Examples / Case Studies</h3>
        <ol>${raw?.examples?.map((ex: string) => `<li>${ex}</li>`).join("") || "N/A"}</ol>
        <h3 style="border-bottom:1px solid #e5e7eb;padding-bottom:5px;margin-top:20px;">3. Evaluation Quiz Exercises</h3>
        <p style="white-space:pre-line;">${Array.isArray(raw?.evaluation) ? raw.evaluation.join("<br>") : raw?.evaluation || "N/A"}</p>
      `;
    } else if (doc.category === "Lesson Plans") {
      const raw = doc.content?.plan || doc.content;
      htmlContent = `
        <h1>${doc.title}</h1>
        <p>Subject: ${doc.subject} | Class Target: ${doc.classLevel}</p>
        <h3>Core Behavioral Objectives</h3>
        <ul>${raw?.behaviouralObjectives?.map((ob: string) => `<li>${ob}</li>`).join("") || "N/A"}</ul>
        <h3>Instructional Material</h3>
        <ul>${raw?.instructionalMaterials?.map((mat: string) => `<li>${mat}</li>`).join("") || "None"}</ul>
        <h3>Presentation Progression</h3>
        ${raw?.presentationSteps?.map((st: any, i: number) => `
          <div style="border:1px solid #e5e7eb;padding:10px;margin-bottom:10px;background:#f9fafb;">
            <h4>Step ${i + 1}: ${st.step || ""}</h4>
            <p><strong>Teacher Activity:</strong> ${st.teachersActivities || st.teacherActivities || "N/A"}</p>
            <p><strong>Learner Activity:</strong> ${st.learnersActivities || st.studentsActivities || "N/A"}</p>
          </div>
        `).join("") || ""}
      `;
    } else if (doc.category === "Question Pools") {
      const raw = doc.content?.questions || [];
      htmlContent = `
        <h1>${doc.title}</h1>
        <p>Subject: ${doc.subject} | Class Level: ${doc.classLevel}</p>
        <hr>
        ${raw.map((q: any, i: number) => `
          <div style="margin-bottom:15px;page-break-inside:avoid;">
            <p><strong>Q${i + 1}. ${q.question}</strong></p>
            <p>A. ${q.optionA}<br>B. ${q.optionB}<br>C. ${q.optionC}<br>D. ${q.optionD}</p>
            <p style="color:#059669;font-size:12px;">Correct Option: ${q.correctAnswer}</p>
          </div>
        `).join("")}
      `;
    } else {
      const body = doc.content?.body || JSON.stringify(doc.content, null, 2);
      htmlContent = `
        <h1>${doc.title}</h1>
        <p>Subject: ${doc.subject} | Class: ${doc.classLevel}</p>
        <hr>
        <p style="white-space:pre-line;line-height:1.6;color:#374151;">${body}</p>
      `;
    }

    const printWin = window.open("", "_blank");
    if (!printWin) {
      alert("Popup blocked! Please enable popups to print documents.");
      return;
    }
    
    printWin.document.write(`
      <html>
        <head>
          <title>${doc.title}</title>
          <style>
            body { font-family: sans-serif; color: #1f2937; padding: 20px; line-height: 1.5; }
            h1 { color: #111827; }
            h3 { color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; }
            li { margin-bottom: 8px; }
          </style>
        </head>
        <body onload="window.print();window.close();">
          ${htmlContent}
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Toast Alert Banner */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 flex items-center space-x-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-xl border border-emerald-400 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-gradient-to-tr from-teal-500 to-emerald-600 rounded-xl text-white">
              <BookOpen className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Personal Library Portal</h2>
          </div>
          <p className="text-slate-500 text-xs">
            Indefinite persistent storage and instant custom AI research planners for Nigerian educators.
          </p>
        </div>
        
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setViewingTrash(!viewingTrash)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-[11px] font-black tracking-tight border transition-all ${
              viewingTrash 
                ? "bg-rose-50 border-rose-200 text-rose-700 font-bold" 
                : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{viewingTrash ? "Open Main Library" : "Recycle Bin (Trash)"}</span>
          </button>

          <button
            onClick={() => setShowCreator(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-2.5 rounded-2xl text-[11px] font-black tracking-tight hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New Resource</span>
          </button>
        </div>
      </div>

      {/* Main Container Layout */}
      {!selectedDoc && !showCreator ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Sidebar Category Filters */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider text-slate-400">Library Categories</h3>
              <div className="flex flex-col space-y-1">
                <button
                  onClick={() => { setActiveCategory("all"); setPage(1); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-[11px] font-black transition-all-300 flex items-center justify-between ${
                    activeCategory === "all" 
                      ? "bg-slate-900 text-white shadow-sm" 
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>All Resources</span>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-100/10 rounded-full font-mono">{totalCount}</span>
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); setPage(1); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-[11px] font-black transition-all-300 flex items-center justify-between ${
                      activeCategory === cat 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{cat}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent activity summary box on the left */}
            <div className="bg-slate-900 rounded-3xl p-5 text-white space-y-3">
              <div className="flex items-center space-x-1.5 text-xs font-black text-amber-400 uppercase tracking-widest text-[9px]">
                <Clock className="w-3 h-3 animate-pulse" />
                <span>Recent Library Updates</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Auto-saves triggered on every AI generation step.</p>
              <div className="space-y-2.5 pt-1">
                {documents.slice(0, 3).map((d) => (
                  <div key={d.id} className="border-l-2 border-indigo-500 pl-3.5 space-y-0.5 cursor-pointer hover:opacity-80" onClick={() => handleOpenDoc(d)}>
                    <p className="text-[11px] font-black truncate text-slate-100">{d.title}</p>
                    <p className="text-[9px] text-slate-400 font-mono">{formatDateFriendly(d.createdAt)}</p>
                  </div>
                ))}
                {documents.length === 0 && (
                  <p className="text-[10px] text-slate-500 italic">No resources available.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Main Grid Documents Space */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Search & Filter Options Bar */}
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-3">
              <div className="relative w-full md:flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Query search by Title, Subject, Class Level... (Press Enter)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyPress}
                  className="w-full bg-slate-50 pl-10 pr-4 py-2.5 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>
              <button
                onClick={() => { setPage(1); fetchDocs(); }}
                className="w-full md:w-auto flex items-center justify-center space-x-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-[11px] font-black"
              >
                <span>Search</span>
              </button>
            </div>

            {/* Document Listing Grid */}
            {loading ? (
              <div className="bg-white rounded-3xl p-20 border border-slate-100 flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="w-10 h-10 text-indigo-505 animate-spin" />
                <p className="text-slate-500 text-xs font-black">Loading your personal library database...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="bg-white rounded-3xl p-20 border border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                  <Archive className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="font-black text-slate-950 text-sm">
                    {viewingTrash ? "Your Recycle Bin is empty" : "Your Library is empty"}
                  </h4>
                  <p className="text-slate-500 text-[11px]">
                    {viewingTrash 
                      ? "Deleted documents end up here. If they reside for over 30 days, they are purged permanently." 
                      : "Whenever you generate a lesson plan, classroom notes, assessment questions, schemes of work or assignments, they will immediately show up in this library portal."
                    }
                  </p>
                </div>
                {!viewingTrash && (
                  <button
                    onClick={() => setShowCreator(true)}
                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl text-[11px] font-black"
                  >
                    Generate your first resource now
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => {
                  // Determine beautiful category badge styles
                  const badgeColor = 
                    doc.category === "Lesson Plans" ? "bg-teal-50 border-teal-200 text-teal-800" :
                    doc.category === "Notes" ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
                    doc.category === "Question Pools" ? "bg-violet-50 border-violet-200 text-violet-800" :
                    doc.category === "Schemes of Work" ? "bg-amber-50 border-amber-200 text-amber-800" :
                    "bg-rose-50 border-rose-200 text-rose-800";

                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleOpenDoc(doc)}
                      className="bg-white rounded-3xl p-5 border border-slate-100 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer space-y-4 flex flex-col justify-between group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border ${badgeColor}`}>
                            {doc.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {doc.classLevel}
                          </span>
                        </div>
                        
                        <h4 className="font-extrabold text-[#111827] text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {doc.title}
                        </h4>
                        
                        <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-semibold">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-lg text-[9px] font-black">{doc.subject}</span>
                          <span>•</span>
                          <span className="font-mono">{formatDateFriendly(doc.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-1 border-t border-slate-50 pt-3 mt-1 text-slate-400 group-hover:text-slate-600 transition-colors">
                        {viewingTrash ? (
                          <>
                            <button
                              onClick={(e) => handleRestoreDoc(doc.id, e)}
                              title="Restore"
                              className="p-1.5 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handlePermanentDelete(doc.id, e)}
                              title="Delete Permanently"
                              className="p-1.5 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => handleDuplicateDoc(doc.id, e)}
                              title="Duplicate"
                              className="p-1.5 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownloadDoc(doc); }}
                              title="Download"
                              className="p-1.5 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePrintDoc(doc); }}
                              title="Print"
                              className="p-1.5 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleSoftDelete(doc.id, e)}
                              title="Move to Recycle Bin"
                              className="p-1.5 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Simple Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white border border-slate-100 px-6 py-4 rounded-3xl shadow-sm">
                <span className="text-slate-500 text-[11px] font-black">
                  Showing Page {page} of {totalPages} ({totalCount} Resources available)
                </span>
                
                <div className="flex items-center space-x-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="p-2 border rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:hover:bg-white"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-700" />
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="p-2 border rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:hover:bg-white"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-700" />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      ) : showCreator ? (
        
        /* Interactive Wizard AI resource creator space */
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCreator(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-slate-700" />
              </button>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm md:text-base">Custom AI Resource Creator</h3>
                <p className="text-[10px] text-slate-400">Generate Schemes of Work, assignments, and curriculum materials.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleGenerateAIService} className="space-y-4 font-sans text-xs">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-black text-slate-700">Document Type / Category</label>
                <select
                  value={wizardCategory}
                  onChange={(e) => setWizardCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-550 focus:outline-none"
                >
                  <option value="Schemes of Work">Schemes of Work (Term schedules)</option>
                  <option value="Assignments">Assignments (Questions & homework worksheets)</option>
                  <option value="Worksheets">Worksheets & Classroom Practice Sheets</option>
                  <option value="Lesson Plans">Lesson Plans (A4 full lesson formats)</option>
                  <option value="Notes">Class Notes & Lecture Outline summaries</option>
                  <option value="Other Generated Resources">Other Custom Study Resources</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-black text-slate-700">Subject Field</label>
                <select
                  value={wizardSubject}
                  onChange={(e) => setWizardSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-550 focus:outline-none"
                >
                  {SUBJECTS_LIST.map((subj) => (
                    <option key={subj} value={subj}>{subj}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-black text-slate-700">Class Target Level</label>
                <input
                  type="text"
                  value={wizardLevel}
                  onChange={(e) => setWizardLevel(e.target.value)}
                  placeholder="e.g. SSS 1, Primary 5, Grade 10"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-550 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-black text-slate-700">Detailed Topic Descriptor</label>
                <input
                  type="text"
                  value={wizardTopic}
                  onChange={(e) => setWizardTopic(e.target.value)}
                  placeholder="e.g. Simultaneous Equations, Elasticity, Photosynthesis"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-550 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-black text-slate-700">Additional Instructions & Prompts (Optional)</label>
              <textarea
                value={wizardDetails}
                onChange={(e) => setWizardDetails(e.target.value)}
                placeholder="e.g. Include 5 calculation exercises, outline lesson objectives for Week 1-12, formulate answers at the bottom."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-550 focus:outline-none text-slate-800"
              />
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start space-x-3 text-amber-800">
              <HelpCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="space-y-1 text-[11px]">
                <p className="font-black">Dynamic Wallet Deductions apply:</p>
                <p className="font-medium">
                  Generating Schemes of Work, assignments or worksheets costs <strong>₦20</strong>. Lesson Plans and Notes cost <strong>₦50</strong>. This fee is automatically simulated and deducted from your Brain system wallet portal.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 border-t pt-4">
              <button
                type="button"
                onClick={() => setShowCreator(false)}
                className="px-5 py-3 border rounded-xl text-slate-600 hover:bg-slate-50 font-black transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={generatingResource}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black flex items-center space-x-2 hover:bg-indigo-700 transition"
              >
                {generatingResource ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Writing customized document...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate & Auto-Save</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

      ) : (
        
        /* Expanded Single Document View Overlay and Autosaving workspace */
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row h-[75vh]">
          
          {/* Left panel: editable fields or raw structure display */}
          <div className="w-full md:w-2/5 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-between">
            
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <button
                className="flex items-center space-x-1.5 text-[11px] font-black text-slate-500 hover:text-slate-900"
                onClick={() => { setSelectedDoc(null); setIsEditing(false); }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Library</span>
              </button>

              <div className="flex items-center space-x-1">
                <span className={`w-2 h-2 rounded-full ${saveStatus === "Saving..." ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`} />
                <span className="text-[9px] font-bold text-slate-500 font-mono">
                  {saveStatus === "Saving..." ? "Saving..." : `Saved ${lastSavedTime ? `at ${lastSavedTime}` : ""}`}
                </span>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Resource Title</label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => { setEditedTitle(e.target.value); setIsEditing(true); }}
                  onBlur={handleSaveManualEdit}
                  className="w-full text-sm font-extrabold text-slate-900 border border-transparent hover:border-slate-100 focus:border-indigo-500 focus:outline-none p-2 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <p className="font-bold text-slate-400 text-[9px]">Subject</p>
                  <p className="font-extrabold text-indigo-900">{selectedDoc.subject}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 text-[9px]">Class</p>
                  <p className="font-extrabold text-[#111827]">{selectedDoc.classLevel}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <span>Body/Prose Workspace</span>
                  <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Editable Editor</span>
                </div>
                <textarea
                  value={editedBody}
                  onChange={(e) => { setEditedBody(e.target.value); setIsEditing(true); }}
                  onBlur={handleSaveManualEdit}
                  rows={12}
                  placeholder="Modify elements of this note structure..."
                  className="w-full bg-slate-50 hover:bg-white border rounded-2xl p-4 text-[11px] leading-relaxed font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">ID: {selectedDoc.id}</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(selectedDoc)}
                  className="px-3.5 py-2 hover:bg-white border bg-transparent text-slate-700 rounded-xl text-[10px] font-black flex items-center space-x-1 shadow-sm transition"
                >
                  <Download className="w-3 h-3" />
                  <span>Download file</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintDoc(selectedDoc)}
                  className="px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black flex items-center space-x-1 shadow-md hover:bg-indigo-700 transition"
                >
                  <Printer className="w-3 h-3" />
                  <span>Print Document</span>
                </button>
              </div>
            </div>

          </div>

          {/* Right panel: Beautiful final formatted preview */}
          <div className="w-full md:w-3/5 p-6 md:p-8 overflow-y-auto space-y-6 bg-slate-50/50">
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-base font-black text-slate-900">{editedTitle}</h2>
                  <p className="text-[10px] text-slate-500">Live dynamic format preview reflecting updates instantly.</p>
                </div>
              </div>
              
              {renderDocumentContent(selectedDoc)}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
