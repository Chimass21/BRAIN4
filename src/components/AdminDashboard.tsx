import { useState, useEffect } from "react";
import { Shield, Users, FileSpreadsheet, Percent, Wallet, Ban, Trash2, ArrowRight, TrendingUp, DollarSign, Edit3, Key, Plus, Activity, Search, MessageSquare } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { Exam, Transaction } from "../types";

interface AdminDashboardProps {
  user: any;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Tab control
  const [activeTab, setActiveTab] = useState<"users" | "exams" | "transactions" | "feedback" | "settings">("users");

  // Filter tools
  const [userSearch, setUserSearch] = useState("");
  const [examSearch, setExamSearch] = useState("");

  const fetchAdminStats = async () => {
    try {
      const response = await fetch("/api/admin/stats");
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users || []);
        setExams(data.exams || []);
        setTransactions(data.transactions || []);
      }

      const fbResponse = await fetch("/api/feedback");
      const fbData = await fbResponse.json();
      if (fbResponse.ok) {
        setFeedback(fbData.feedback || []);
      }
    } catch (e) {
      console.error("Failed fetching admin logs:", e);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, [user]);

  // Handle suspending / unsuspending accounts
  const handleToggleSuspension = async (targetUserId: string) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${targetUserId}/suspend`, {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message || "User suspension status toggled successfully!");
        fetchAdminStats();
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // Fund a user's wallet manually as admin
  const handleAdminWalletCredit = async (targetUserId: string) => {
    const amtStr = prompt("Enter amount to manually credit to this educator wallet (₦):", "2000");
    if (!amtStr) return;
    const amount = Number(amtStr);
    
    if (isNaN(amount) || amount <= 0) {
      alert("Invalid funding amount.");
      return;
    }

    try {
      const response = await fetch("/api/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          amount,
          isSimulation: false,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(`Manually credited user account with ₦${amount.toLocaleString()}!`);
        fetchAdminStats();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Exam Publish status
  const handleToggleExamPublish = async (examId: string) => {
    const match = exams.find(e => e.id === examId);
    if (!match) return;
    
    try {
      const response = await fetch(`/api/exams/${examId}/${match.isPublished ? 'unpublish' : 'publish'}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: match.creatorId }),
      });
      const data = await response.json();
      if (response.ok) {
        alert(`Updated CBT publishing state successfully!`);
        fetchAdminStats();
      } else {
        alert(data.error || "Failed resolving publish toggle.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter lists
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredExams = exams.filter(e =>
    e.title.toLowerCase().includes(examSearch.toLowerCase()) ||
    e.subject.toLowerCase().includes(examSearch.toLowerCase())
  );

  // Compute stat sums
  const totalCreditsVolume = transactions
    .filter(t => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalChargesVolume = transactions
    .filter(t => t.type === "charge")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full font-sans bg-slate-50 text-slate-800">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-950 text-white flex flex-col shrink-0 border-b md:border-b-0 md:border-r border-slate-900">
        
        {/* Brand Container */}
        <div className="p-6 flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-rose-505 to-slate-800 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/10 bg-rose-600">
            <span className="text-2xl font-bold font-sans text-white">S</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-white font-sans">Swiftstudy</span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1">
          {[
            { id: "users", label: "Registry Database", icon: <Users className="w-4 h-4" /> },
            { id: "exams", label: "CBT Exam Listings", icon: <FileSpreadsheet className="w-4 h-4" /> },
            { id: "transactions", label: "Transactions Ledger", icon: <Wallet className="w-4 h-4" /> },
            { id: "feedback", label: "Support Feedback Logs", icon: <MessageSquare className="w-4 h-4" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-xs font-bold transition text-left cursor-pointer ${
                  isActive
                    ? "bg-slate-850 text-white border border-slate-800"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <span className={isActive ? "text-rose-400" : "text-slate-400"}>{tab.icon}</span>
                <span className="flex-1">{tab.label}</span>
                {isActive && <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* Security Warning box */}
        <div className="p-6 border-t border-slate-900">
          <div className="bg-rose-950/20 rounded-2xl p-4 border border-rose-900/30">
            <div className="text-[10px] text-rose-400 uppercase font-black tracking-wider mb-1 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Root Security
            </div>
            <div className="text-[10px] text-slate-300 font-semibold leading-relaxed">
              Verify school identity records before issuing custom wallet grants.
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-6 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <div className="bg-slate-100 px-4 py-2 rounded-lg text-xs font-semibold text-slate-500">
              👑 Root Administration
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-sm font-bold text-slate-900">Augusta Nwaigbo</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black">District Admin</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-100 border-2 border-rose-200 flex items-center justify-center font-bold text-rose-800 text-base">
              A
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
                {activeTab === "users" && "Global Registrants Database"}
                {activeTab === "exams" && "CBT Assessments Registry"}
                {activeTab === "transactions" && "Global Ledger Audit"}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {activeTab === "users" && "Manage school registrations, suspend/unsuspend, or issue manual wallet grants."}
                {activeTab === "exams" && "Monitor, supervise, publish, or suspend any academic computer-based assessment."}
                {activeTab === "transactions" && "Trace real-time wallet funding, charge alerts, and service logs."}
              </p>
            </div>
          </div>

          {/* Master stats display block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-sans">
            <div className="p-5 bg-white border border-slate-150 rounded-3xl flex items-center gap-4 shadow-sm">
              <span className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><Users className="w-5 h-5" /></span>
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-400">Database registrants</p>
                <h3 className="text-xl font-black text-slate-900">{users.length} Users</h3>
              </div>
            </div>
            <div className="p-5 bg-white border border-slate-150 rounded-3xl flex items-center gap-4 shadow-sm">
              <span className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><FileSpreadsheet className="w-5 h-5" /></span>
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-400">Total CBT Exams</p>
                <h3 className="text-xl font-black text-slate-900">{exams.length} Items</h3>
              </div>
            </div>
            <div className="p-5 bg-white border border-slate-150 rounded-3xl flex items-center gap-4 shadow-sm">
              <span className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center"><Wallet className="w-5 h-5" /></span>
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-400">Transaction volume</p>
                <h3 className="text-base font-black text-slate-900">₦{(totalCreditsVolume).toLocaleString()} Cred.</h3>
              </div>
            </div>
            <div className="p-5 bg-white border border-slate-150 rounded-3xl flex items-center gap-4 shadow-sm">
              <span className="w-10 h-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center"><Percent className="w-5 h-5" /></span>
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-400">Published Revenues</p>
                <h3 className="text-base font-black text-slate-900">₦{(totalChargesVolume).toLocaleString()} Chg.</h3>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="wait font-sans">
              
              {/* USERS REGISTRY MODULE */}
              {activeTab === "users" && (
                <motion.div
                  key="users"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 font-sans"
                >
                  <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 font-sans">Registered Users Console</h3>
                        <p className="text-xs text-slate-500">Edit wallet balances, apply suspensions, and audits profile parameters.</p>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="bg-slate-50 pl-9 pr-3 py-2 border rounded-xl text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-medium text-slate-700 border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wide border-b">
                            <th className="p-3 text-left">User profile details</th>
                            <th className="p-3 text-left">Assigned Role</th>
                            <th className="p-3 text-left">Wallet Balance</th>
                            <th className="p-3 text-left">Academic Status</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((u) => (
                            <tr key={u.id} className="border-b hover:bg-slate-50/50">
                              <td className="p-3">
                                <div>
                                  <p className="font-bold text-slate-900">{u.name}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold">{u.email}</p>
                                </div>
                              </td>
                              <td className="p-3 font-bold uppercase tracking-wider text-[10px]">
                                <span className={`py-1 px-2.5 rounded-full ${
                                  u.role === 'admin' ? 'bg-rose-100 text-rose-800' :
                                  u.role === 'teacher' ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="p-3 font-semibold">
                                {u.role === 'teacher' ? (
                                  <span className="font-bold">₦{u.walletBalance?.toLocaleString()}</span>
                                ) : (
                                  <span className="text-slate-400 font-bold">N/A</span>
                                )}
                              </td>
                              <td className="p-3">
                                <span className={`py-1 px-2 rounded-full font-bold text-[10px] ${u.isSuspended ? 'bg-red-55 text-red-700' : 'bg-emerald-55 text-emerald-700'}`}>
                                  {u.isSuspended ? 'Suspended' : 'Online / Active'}
                                </span>
                              </td>
                              <td className="p-3 text-right space-x-1.5">
                                {u.role === 'teacher' && (
                                  <button
                                    onClick={() => handleAdminWalletCredit(u.id)}
                                    className="px-2 py-1 bg-teal-50 border border-teal-100 text-teal-700 hover:bg-teal-100 rounded-md font-bold text-[10px]"
                                    title="Credit wallet balance manually"
                                  >
                                    Credit Wallet
                                  </button>
                                )}
                                <button
                                  disabled={u.email === 'admin@brain.com' || u.id === user.id}
                                  onClick={() => handleToggleSuspension(u.id)}
                                  className={`px-2 py-1 text-[10px] font-bold rounded-md border disabled:opacity-45 ${
                                    u.isSuspended ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-100'
                                  }`}
                                >
                                  {u.isSuspended ? 'Activate' : 'Suspend'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* CBT LISTINGS MODULE */}
              {activeTab === "exams" && (
                <motion.div
                  key="exams"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4 font-sans">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">Total CBT Examinations</h3>
                        <p className="text-xs text-slate-500">Query and manage active school test modules.</p>
                      </div>
                      <input
                        type="text"
                        placeholder="Search exam..."
                        value={examSearch}
                        onChange={(e) => setExamSearch(e.target.value)}
                        className="bg-slate-50 border px-3 py-2 rounded-xl text-xs w-full sm:w-48 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-3">
                      {filteredExams.map((ex) => (
                        <div
                          key={ex.id}
                          className="p-4 bg-slate-50 border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-semibold gap-4"
                        >
                          <div className="space-y-0.5">
                            <span className="text-[9px] bg-slate-250 text-slate-700 rounded-full py-0.5 px-2 font-bold uppercase">{ex.subject}</span>
                            <h4 className="text-xs font-black text-slate-800">{ex.title}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold">Author: {ex.creatorName} • Questions indices: {ex.questions?.length}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`py-1 px-3.5 border rounded-xl text-[10px] font-bold uppercase tracking-wider ${ex.isPublished ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                              {ex.isPublished ? 'Published' : 'Draft'}
                            </span>
                            <button
                              onClick={() => handleToggleExamPublish(ex.id)}
                              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold font-sans text-[10px]"
                            >
                              Toggle Publish state
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TRANSACTIONS AUDITING MODULE */}
              {activeTab === "transactions" && (
                <motion.div
                  key="transactions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
                    <h3 className="text-base font-extrabold text-slate-900 font-sans">Global Transactions Audit Ledger</h3>

                    {transactions.length === 0 ? (
                      <p className="text-xs text-slate-400">Database Ledger has no active records.</p>
                    ) : (
                      <div className="space-y-2.5 text-xs font-semibold">
                        {transactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="p-4 bg-slate-50 border rounded-xl flex items-center justify-between font-sans"
                          >
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-800">{tx.purpose}</p>
                              <p className="text-[10px] text-slate-400 font-medium">Ref: {tx.id} • Date Logged: {new Date(tx.date).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <span className={`font-black text-sm block ${tx.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>
                                {tx.type === "credit" ? "+" : "-"}₦{tx.amount.toLocaleString()}
                              </span>
                              <span className="text-[9px] uppercase font-semibold text-slate-400">{tx.type} Logged</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* SUPPORT FEEDBACK LOGS MODULE */}
              {activeTab === "feedback" && (
                <motion.div
                  key="feedback"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 font-sans"
                >
                  <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
                    <h3 className="text-base font-extrabold text-slate-900">Support Feed and Contact Tickets</h3>
                    <p className="text-xs text-slate-500">View detailed inquiries submitted by educators and visitors via direct contact forms and support widgets.</p>

                    {feedback.length === 0 ? (
                      <div className="p-8 bg-slate-50 border rounded-2xl text-center text-xs text-slate-400 font-semibold leading-relaxed">
                        No support inquiries have been filed yet. Submit an inquiry through the website help form or chat widget to populate this tab!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {feedback.map((fb: any, index: number) => (
                          <div
                            key={fb.id || index}
                            className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 text-xs text-slate-700 font-semibold leading-relaxed"
                          >
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 border-b border-slate-200/50 pb-2">
                              <div>
                                <p className="font-extrabold text-slate-800 text-sm">{fb.name}</p>
                                <p className="text-[10px] text-indigo-600 font-bold">{fb.email}</p>
                              </div>
                              <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-0.5 border border-slate-150 rounded-lg shrink-0">
                                {fb.date ? new Date(fb.date).toLocaleString() : "Contact Submission Log"}
                              </span>
                            </div>
                            <p className="text-slate-600 bg-white/60 p-3 rounded-xl border border-slate-100/50 italic font-medium">
                              "{fb.message}"
                            </p>
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
