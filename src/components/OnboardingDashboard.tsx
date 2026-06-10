import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  GraduationCap, 
  School, 
  BookOpen, 
  CheckCircle, 
  Wallet, 
  FileText, 
  ArrowRight, 
  User,
  Check,
  CheckSquare,
  Award,
  Users
} from 'lucide-react';

interface OnboardingDashboardProps {
  user: any;
  role: 'student' | 'teacher' | 'admin';
  onComplete: (updatedData: any) => void;
}

export default function OnboardingDashboard({ user, role, onComplete }: OnboardingDashboardProps) {
  // We determine the workspace mode based on the perspective role
  const isTeacherMode = role === 'teacher' || role === 'admin';
  const [step, setStep] = useState<number>(1);
  
  // Form states based on role
  // --- Teacher States ---
  const [schoolName, setSchoolName] = useState<string>(user?.schoolName || 'High-Fliers International Academy');
  const [selectedClasses, setSelectedClasses] = useState<string[]>(['Senior Secondary 1', 'Senior Secondary 2']);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Mathematics', 'English Language']);
  const [teachingExperience, setTeachingExperience] = useState<string>('3-5 Years');

  // --- Student States ---
  const [studentName, setStudentName] = useState<string>(user?.name || '');
  const [studentClass, setStudentClass] = useState<string>(user?.classLevel || 'Senior Secondary Section 3');
  const [studentRegNum, setStudentRegNum] = useState<string>(
    user?.regNumber || `REG-2026-STU-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [academicTrack, setAcademicTrack] = useState<string>('Science');
  const [favSubject, setFavSubject] = useState<string>('Mathematics');

  // --- Support Lists ---
  const classOptions = [
    'Primary Section 4',
    'Primary Section 5',
    'Primary Section 6',
    'Junior Secondary 1',
    'Junior Secondary 2',
    'Junior Secondary 3',
    'Senior Secondary 1',
    'Senior Secondary 2',
    'Senior Secondary 3',
  ];

  const subjectOptions = [
    'Mathematics',
    'English Language',
    'Physics',
    'Chemistry',
    'Biology',
    'Civic Education',
    'Agricultural Science',
    'Economics',
    'Literature in English',
    'Government',
  ];

  const toggleClass = (cls: string) => {
    if (selectedClasses.includes(cls)) {
      setSelectedClasses(selectedClasses.filter(c => c !== cls));
    } else {
      setSelectedClasses([...selectedClasses, cls]);
    }
  };

  const toggleSubject = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== sub));
    } else {
      setSelectedSubjects([...selectedSubjects, sub]);
    }
  };

  const currentRoleLabel = isTeacherMode ? 'Educator/Teacher' : 'Assessed Student';

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    // Collect updated user state
    const onboardingPayload: any = {
      hasCompletedOnboarding: true,
    };

    if (isTeacherMode) {
      onboardingPayload.name = user?.name || 'Austin Nwaigbo';
      onboardingPayload.schoolName = schoolName;
      onboardingPayload.classLevels = selectedClasses;
      onboardingPayload.subjects = selectedSubjects;
      onboardingPayload.experience = teachingExperience;
    } else {
      onboardingPayload.name = studentName || user?.name || 'New Student';
      onboardingPayload.classLevel = studentClass;
      onboardingPayload.regNumber = studentRegNum;
      onboardingPayload.academicTrack = academicTrack;
      onboardingPayload.favoriteSubject = favSubject;
    }

    // Call callback to proceed safely
    onComplete(onboardingPayload);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Visual background ambient details */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl bg-slate-950/40 backdrop-blur-xl rounded-3xl border border-slate-850/60 shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10"
      >
        {/* Left Side: Welcoming Content */}
        <div className="w-full md:w-5/12 bg-gradient-to-b from-indigo-950/80 via-slate-950/90 to-slate-950 p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-850/60 text-slate-100">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl text-indigo-400 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Academic Co-Pilot Onboarding
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                Welcome to <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Brain AI</span>
              </h1>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                We design curriculum-aligned NERDC resources and modern computer-based examinations that make teaching & learning highly efficient.
              </p>
            </div>

            {/* Micro progress overview details */}
            <div className="space-y-4 pt-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>1</span>
                <div>
                  <h4 className={`text-[11px] font-bold uppercase tracking-wider ${step >= 1 ? 'text-indigo-400' : 'text-slate-500'}`}>Academic Identity</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Basic institution configurations</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>2</span>
                <div>
                  <h4 className={`text-[11px] font-bold uppercase tracking-wider ${step >= 2 ? 'text-indigo-400' : 'text-slate-500'}`}>{isTeacherMode ? 'Syllabus Focus' : 'Pathway Stream'}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">{isTeacherMode ? 'Classes & Subjects taught' : 'Focus tracks & preferences'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>3</span>
                <div>
                  <h4 className={`text-[11px] font-bold uppercase tracking-wider ${step >= 3 ? 'text-indigo-400' : 'text-slate-500'}`}>AI & CBT Integration</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Understand smart tools</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${step >= 4 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>4</span>
                <div>
                  <h4 className={`text-[11px] font-bold uppercase tracking-wider ${step >= 4 ? 'text-indigo-400' : 'text-slate-500'}`}>Portal Wallet Setup</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Fund trial simulations</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 mt-6 flex flex-col space-y-2 text-[10px] text-slate-500 font-bold">
            <span className="uppercase tracking-widest text-[9px] text-slate-400">YOUR WORKSPACE PERSPECTIVE</span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center p-1 bg-indigo-500/10 text-indigo-400 rounded-lg">
                {isTeacherMode ? <GraduationCap className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
              </span>
              <span className="text-slate-350">{currentRoleLabel}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Forms Wizard */}
        <div className="flex-1 p-8 sm:p-10 flex flex-col justify-between bg-slate-950/35 overflow-y-auto max-h-[85vh] md:max-h-none min-h-[420px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className="space-y-5"
            >
              {/* HEADER STEP VIEW */}
              <div className="border-b border-slate-900 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest block">STEP {step} OF 4</span>
                  <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                    {step === 1 && (isTeacherMode ? "Institution & Profile Setup" : "Student Candidate Profile")}
                    {step === 2 && (isTeacherMode ? "Select Syllabuses Interest" : "Academic Focus Track")}
                    {step === 3 && (isTeacherMode ? "NERDC Approved Scheme Builder" : "Computer-Based Assessment Suite")}
                    {step === 4 && (isTeacherMode ? "Activate Academic Wallet" : "Activate Lesson Portal Wallet")}
                  </h2>
                </div>
                {/* Visual percentage indicators */}
                <div className="text-xs font-black text-indigo-400 font-mono">
                  {Math.round((step / 4) * 100)}%
                </div>
              </div>

              {/* STEP 1: IDENTITIES */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Verify and populate your personal academic data to ensure reports and documents sync with correct names.
                  </p>
                  
                  {isTeacherMode ? (
                    // Teacher identities Setup
                    <div className="space-y-4 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Institution Name</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            className="w-full bg-slate-900/40 border border-slate-800 hover:border-slate-700/80 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 transition font-medium" 
                            placeholder="e.g., King's College Lagos"
                            value={schoolName}
                            onChange={(e) => setSchoolName(e.target.value)}
                          />
                          <School className="w-4 h-4 text-slate-650 absolute right-3.5 top-3 pt-0.5" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Years of Instruction Experience</label>
                        <select 
                          className="w-full bg-slate-900/40 border border-slate-800 hover:border-slate-700/80 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 transition font-black"
                          value={teachingExperience}
                          onChange={(e) => setTeachingExperience(e.target.value)}
                        >
                          <option value="1-2 Years">1 - 2 Years (Associate)</option>
                          <option value="3-5 Years">3 - 5 Years (Professional)</option>
                          <option value="6-10 Years">6 - 10 Years (Senior Instuctor)</option>
                          <option value="10+ Years">10+ Years (Principal Facilitator)</option>
                        </select>
                      </div>

                      <div className="bg-indigo-950/10 border border-indigo-500/10 p-4 rounded-xl flex items-start gap-3">
                        <Award className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <h4 className="text-[11px] font-bold text-indigo-300">Authorized NERDC Syllabus Publisher</h4>
                          <p className="text-[10px] text-indigo-400/85 leading-relaxed">Registered as an approved academic planner. This credentials you to instantly publish examinations.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Student identities Setup
                    <div className="space-y-4 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Student Full Name</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            className="w-full bg-slate-900/40 border border-slate-800 hover:border-slate-700 border-indigo-500 rounded-xl px-4 py-2.5 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 transition font-bold" 
                            placeholder="e.g. Austin Nwaigbo Jr."
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                          />
                          <User className="w-4 h-4 text-slate-650 absolute right-3.5 top-3 pt-0.5" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Class Level Section</label>
                          <select 
                            className="w-full bg-slate-900/40 border border-slate-800 hover:border-slate-700/80 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 transition font-black"
                            value={studentClass}
                            onChange={(e) => setStudentClass(e.target.value)}
                          >
                            <option value="Primary 6">Primary Section 6</option>
                            <option value="Junior Secondary Section 1">Junior Secondary Section 1</option>
                            <option value="Junior Secondary Section 2">Junior Secondary Section 2</option>
                            <option value="Junior Secondary Section 3">Junior Secondary Section 3</option>
                            <option value="Senior Secondary Section 1">Senior Secondary Section 1</option>
                            <option value="Senior Secondary Section 2">Senior Secondary Section 2</option>
                            <option value="Senior Secondary Section 3">Senior Secondary Section 3</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Assigned Reg Number</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-900/40 border border-slate-850 text-slate-450 rounded-xl px-4 py-2.5 text-xs font-mono select-none" 
                            value={studentRegNum}
                            readOnly
                          />
                        </div>
                      </div>

                      <div className="bg-indigo-950/10 border border-indigo-500/10 p-3.5 rounded-xl text-[10px] text-indigo-400 leading-relaxed font-semibold">
                        💡 Your registration number is automatically bound to your examination files on the central portal to log scores safely.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: SYLLABUS FOCUS / TRACKS */}
              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    {isTeacherMode 
                      ? "Select the specific curriculum classes and subjects you manage. We will automatically curate your Scheme of Work dashboards." 
                      : "Choose your primary academic stream of focus and input your favorite subject. This customizes review question sets."
                    }
                  </p>

                  {isTeacherMode ? (
                    // Teacher Subject/Class selections
                    <div className="space-y-4 pt-1 max-h-[300px] overflow-y-auto pr-1">
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Target Student Classes (Multi-select)</label>
                        <div className="flex flex-wrap gap-2">
                          {classOptions.map((cls) => {
                            const selected = selectedClasses.includes(cls);
                            return (
                              <button
                                key={cls}
                                type="button"
                                onClick={() => toggleClass(cls)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border cursor-pointer hover:border-semibold transition flex items-center gap-1 ${
                                  selected 
                                    ? 'bg-indigo-600 text-white border-indigo-600' 
                                    : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:border-slate-705'
                                }`}
                              >
                                {selected && <Check className="w-3 h-3" />}
                                {cls}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Subjects of Expertise (Multi-select)</label>
                        <div className="flex flex-wrap gap-2">
                          {subjectOptions.map((sub) => {
                            const selected = selectedSubjects.includes(sub);
                            return (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => toggleSubject(sub)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border cursor-pointer hover:border-semibold transition flex items-center gap-1 ${
                                  selected 
                                    ? 'bg-violet-600 text-white border-violet-600' 
                                    : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:border-slate-705'
                                }`}
                              >
                                {selected && <Check className="w-3 h-3" />}
                                {sub}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Student academic stream selection
                    <div className="space-y-4 pt-1">
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'Science', label: 'Basic Sciences Track', desc: 'Physics, Chemistry, Biology' },
                          { id: 'Commercial', label: 'Commercial Track', desc: 'Financial Accounts, Economics' },
                          { id: 'Art', label: 'Arts & Humanities Track', desc: 'Literature, Government, History' },
                          { id: 'Arts', label: 'Art Track', desc: 'Fine Arts, Global History, Literature' },
                        ].map((stream) => {
                          const active = academicTrack === stream.id;
                          return (
                            <button
                              key={stream.id}
                              type="button"
                              onClick={() => setAcademicTrack(stream.id)}
                              className={`p-3 rounded-2xl border text-left cursor-pointer transition flex flex-col gap-1 ${
                                active 
                                  ? 'bg-indigo-600/10 border-indigo-600 text-white shadow-md' 
                                  : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:border-slate-700/80'
                              }`}
                            >
                              <span className="text-xs font-extrabold text-white">{stream.label}</span>
                              <span className="text-[9px] text-slate-400 leading-normal">{stream.desc}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-1.5 pt-2">
                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block font-sans">Favorite Subject Area</label>
                        <select 
                          className="w-full bg-slate-900/40 border border-slate-800 hover:border-slate-700/80 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 transition font-black"
                          value={favSubject}
                          onChange={(e) => setFavSubject(e.target.value)}
                        >
                          {subjectOptions.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: FEATURE TOUR */}
              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Unlock curriculum-aligned digital resources instantly. Here is how you utilize our most high-powered tool modules.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {isTeacherMode ? (
                      <>
                        <div className="p-4 bg-slate-900/30 rounded-2xl border border-slate-850 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1 px-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg text-xs font-black">AI Note</span>
                            <h4 className="text-xs font-black text-slate-100">Click & Write Scheme</h4>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                            Generate approved, formatted Nigerian curriculum lesson notes instantly with one button click on any scheme week.
                          </p>
                        </div>

                        <div className="p-4 bg-slate-900/30 rounded-2xl border border-slate-850 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1 px-2.5 bg-violet-500/10 text-violet-400 rounded-lg text-xs font-black">CBT Exam</span>
                            <h4 className="text-xs font-black text-slate-100">Instant Exam Deployment</h4>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                            Generate interactive examinations aligned with NERDC rules. Save directly to the student registry with instantaneous scoring.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-4 bg-slate-900/30 rounded-2xl border border-slate-850 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1 px-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-wider">Attempt Gate</span>
                            <h4 className="text-xs font-black text-slate-100">Two Timed Attempts</h4>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                            Attempt school examinations directly from your tablet or mobile computer panel with safe logging of grades and feedback sheets.
                          </p>
                        </div>

                        <div className="p-4 bg-slate-900/30 rounded-2xl border border-slate-850 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1 px-2 bg-pink-500/10 text-pink-400 rounded-lg text-[9px] font-black uppercase tracking-wider">Practice Drills</span>
                            <h4 className="text-xs font-black text-slate-100">Revision & Practice</h4>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                            Run customized AI-driven academic revision quizzes covering specific curriculum topics that you selected in Step 2.
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-1.5">
                    <h5 className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                      ★ Active Platform Standards
                    </h5>
                    <p className="text-[10px] text-slate-450 leading-relaxed font-medium">
                      All files, documents, and class evaluations operate with standard offline persistence syncing with your local browser database automatically.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 4: WALLET GATES */}
              {step === 4 && (
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed font-sans">
                    Enable standard wallets. Smart curriculum actions consume small digital credits (₦50) to offset backend academic processor workloads safely.
                  </p>

                  <div className="p-6 bg-indigo-950/20 border border-indigo-500/10 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                    <div className="p-3 bg-indigo-600/10 rounded-full text-indigo-400 animate-pulse">
                      <Wallet className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-white font-extrabold text-sm font-sans uppercase tracking-tight">
                        ₦{isTeacherMode ? "25,000" : "5,000"} Start Trial Coins Pre-loaded
                      </h4>
                      <p className="text-[11px] text-indigo-300 leading-relaxed max-w-sm">
                        As a new academic portal user, your standard wallet and test registry is pre-seeded with complimentary educational simulator assets.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] text-slate-400 font-semibold">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Zero expensive card subcription gates</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>₦50 tiny plan generation charges</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>₦50 exam takeoff candidate charges</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Instant offline Paystack simulation</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* FOOTER CONTROLS */}
          <div className="border-t border-slate-900 pt-6 flex items-center justify-between gap-4 mt-8">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs font-extrabold cursor-pointer border border-transparent hover:border-slate-800 transition flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleNext}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 tracking-wide transition cursor-pointer hover:shadow-lg hover:shadow-indigo-600/10"
            >
              <span>{step === 4 ? "Complete Setup" : "Continue"}</span>
              <ChevronRight className="w-4 h-4 animate-pulse" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
