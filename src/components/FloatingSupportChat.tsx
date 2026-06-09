import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Phone, Send, X, MessageCircle, ChevronDown, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { VoiceInputButton } from "./VoiceInputButton";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export default function FloatingSupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // Direct Feedback Form Tab inside the chat widget!
  const [chatMode, setChatMode] = useState<"chat" | "ticket">("chat");
  const [ticketName, setTicketName] = useState("");
  const [ticketEmail, setTicketEmail] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketStatus, setTicketStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load welcome message on start
  useEffect(() => {
    setMessages([
      {
        id: "wel_1",
        role: "model",
        text: "Hi there! I am your Brain Direct AI Assistant 🧠. You can ask me anything about lesson note creations, publishing CBT exams, wallet payments, or write down high-priority complaints. How can I serve your school today?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  }, []);

  // Sync scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userMsgText = inputText.trim();
    setInputText("");

    // Add user message to state
    const userMsgId = "msg_" + Math.random().toString(36).substring(2, 9);
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const response = await fetch("/api/feedback/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userMsgText,
          history: messages.map(m => ({ role: m.role, text: m.text }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          {
            id: "msg_" + Math.random().toString(36).substring(2, 9),
            role: "model",
            text: data.text || "I am connected! Let me know if there's any other question about Brain you would like answered.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      } else {
        throw new Error();
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: "msg_" + Math.random().toString(36).substring(2, 9),
          role: "model",
          text: "I apologize, our secure server is experiencing high traffic. Please feel free to WhatsApp us directly at 08062078597 for instant personal support!",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketName || !ticketEmail || !ticketMessage) return;

    setTicketStatus("loading");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: ticketName,
          email: ticketEmail,
          message: ticketMessage
        })
      });

      if (res.ok) {
        setTicketStatus("success");
        // Clear fields
        setTicketName("");
        setTicketEmail("");
        setTicketMessage("");
        
        // Push ticket message as user message in chat summary
        setMessages((prev) => [
          ...prev,
          {
            id: "tkt_user_" + Math.random().toString(36).substring(2, 9),
            role: "user",
            text: `[Feedback Support Ticket Logged] Message details: ${ticketMessage}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          },
          {
            id: "tkt_rep_" + Math.random().toString(36).substring(2, 9),
            role: "model",
            text: "✅ Excellent! I have securely recorded and logged your support feedback into our central management database. Austin and the tech operations team will review it shortly. Feel free to continue chatting!",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);

        setTimeout(() => {
          setTicketStatus("idle");
          setChatMode("chat");
        }, 1200);
      } else {
        setTicketStatus("error");
      }
    } catch {
      setTicketStatus("error");
    }
  };

  return (
    <div id="floating_support_room" className="fixed bottom-6 right-6 z-50 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.92 }}
            className="w-[360px] sm:w-[390px] h-[520px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white p-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black text-white text-base">
                      B
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-purple-600 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm">Austin Support Room</h4>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
                    </div>
                    <p className="text-[10px] text-purple-100 font-semibold">Online Support Representative</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 px-2 hover:bg-white/10 rounded-xl transition cursor-pointer text-white/85"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Support Mode selection */}
            <div className="flex border-b border-slate-100 bg-slate-50 text-xs text-slate-500 font-bold shrink-0">
              <button
                onClick={() => setChatMode("chat")}
                className={`flex-1 py-2.5 text-center transition ${
                  chatMode === "chat" ? "bg-white text-violet-700 border-b-2 border-violet-600" : "hover:text-slate-700"
                }`}
              >
                💬 Support AI Chat
              </button>
              <button
                onClick={() => setChatMode("ticket")}
                className={`flex-1 py-2.5 text-center transition ${
                  chatMode === "ticket" ? "bg-white text-violet-700 border-b-2 border-violet-600" : "hover:text-slate-700"
                }`}
              >
                📝 Submit Ticket Feedback
              </button>
            </div>

            {/* Main Interactive Screen */}
            <div className="flex-1 min-h-0 bg-slate-50 flex flex-col justify-between">
              {chatMode === "chat" ? (
                <>
                  {/* Messages list */}
                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                    {messages.map((msg) => {
                      const isModel = msg.role === "model";
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isModel ? "justify-start" : "justify-end"} items-end gap-1.5`}
                        >
                          {isModel && (
                            <div className="w-6 h-6 rounded-lg bg-violet-600 text-[10px] font-black text-white flex items-center justify-center shrink-0">
                              B
                            </div>
                          )}
                          <div
                            className={`max-w-[78%] p-3 rounded-2xl text-xs leading-relaxed transition-all shadow-xs ${
                              isModel
                                ? "bg-white text-slate-800 rounded-bl-none border border-slate-100"
                                : "bg-violet-600 text-white rounded-br-none"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            <span
                              className={`text-[9px] block text-right mt-1 font-semibold ${
                                isModel ? "text-slate-400" : "text-white/70"
                              }`}
                            >
                              {msg.timestamp}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {isTyping && (
                      <div className="flex justify-start items-end gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-violet-600 text-[10px] font-black text-white flex items-center justify-center shrink-0">
                          B
                        </div>
                        <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-bl-none text-xs text-slate-400 font-semibold shadow-xs flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Direct Contact triggers details inside chat for speed */}
                  <div className="px-3 py-1.5 bg-violet-50/60 border-t border-b border-violet-100 flex items-center justify-between gap-1.5 shrink-0 text-[10px] text-violet-700 font-bold">
                    <span>Direct:</span>
                    <a
                      href="https://wa.me/2348062078597?text=Hello%20Brain%20Direct%20Support"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg hover:bg-emerald-250 transition"
                    >
                      <MessageCircle className="w-3 h-3" /> WhatsApp Support
                    </a>
                    <a
                      href="tel:08062078597"
                      className="flex items-center gap-1 bg-violet-100 text-violet-800 px-2 py-1 rounded-lg hover:bg-violet-250 transition"
                    >
                      <Phone className="w-3 h-3" /> Call 08062078597
                    </a>
                  </div>

                  {/* Typing input */}
                  <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
                    <div className="relative flex-1 flex items-center">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type a message or use speech-to-text..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-3 pr-10 text-xs font-semibold focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600"
                      />
                      <div className="absolute right-2">
                        <VoiceInputButton
                          value={inputText}
                          onTranscript={(val) => setInputText(val)}
                          size="xs"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="w-8.5 h-8.5 bg-violet-600 rounded-xl flex items-center justify-center text-white shadow-xs hover:bg-violet-750 active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 transition cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </>
              ) : (
                /* Ticket Submission Feedback form */
                <form onSubmit={handleTicketSubmit} className="flex-1 p-4 flex flex-col justify-between overflow-y-auto">
                  <div className="space-y-3.5">
                    <div className="p-3 bg-violet-50 text-violet-800 rounded-2xl text-[11px] font-semibold leading-relaxed border border-violet-100">
                      Submit high-priority requests or constructive reviews here. Austin and our technical support group will review every item and save it directly.
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Your Name</label>
                      <div className="relative flex items-center">
                        <input
                          required
                          type="text"
                          value={ticketName}
                          onChange={(e) => setTicketName(e.target.value)}
                          placeholder="e.g. Principal Abigail"
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 pr-10 text-xs font-semibold focus:outline-none focus:border-violet-600"
                        />
                        <div className="absolute right-2">
                          <VoiceInputButton value={ticketName} onTranscript={(val) => setTicketName(val)} size="xs" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Reply Email</label>
                      <div className="relative flex items-center">
                        <input
                          required
                          type="email"
                          value={ticketEmail}
                          onChange={(e) => setTicketEmail(e.target.value)}
                          placeholder="abigail@wisdomacademy.com"
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 pr-10 text-xs font-semibold focus:outline-none focus:border-violet-600"
                        />
                        <div className="absolute right-2">
                          <VoiceInputButton value={ticketEmail} onTranscript={(val) => setTicketEmail(val)} size="xs" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Complaint / Message Details</label>
                      <div className="relative flex items-start">
                        <textarea
                          required
                          rows={4}
                          value={ticketMessage}
                          onChange={(e) => setTicketMessage(e.target.value)}
                          placeholder="Describe feature request or complaint details..."
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 pr-10 text-xs font-semibold focus:outline-none focus:border-violet-600 resize-none"
                        />
                        <div className="absolute right-2 top-2">
                          <VoiceInputButton value={ticketMessage} onTranscript={(val) => setTicketMessage(val)} size="xs" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 shrink-0">
                    {ticketStatus === "success" ? (
                      <div className="bg-emerald-50 text-emerald-800 p-2 text-center rounded-xl text-xs font-bold border border-emerald-200 flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" /> Message Recorded Successfully!
                      </div>
                    ) : ticketStatus === "error" ? (
                      <div className="bg-rose-50 text-rose-800 p-2 text-center rounded-xl text-xs font-bold border border-rose-200">
                        Error submitting feed. Try again or use AI Chat instead!
                      </div>
                    ) : (
                      <button
                        type="submit"
                        disabled={ticketStatus === "loading"}
                        className="w-full py-3 bg-gradient-to-r from-violet-600 to-pink-600 text-white text-xs font-black rounded-xl hover:opacity-90 active:scale-95 transition cursor-pointer shadow-md uppercase tracking-wider disabled:opacity-50"
                      >
                        {ticketStatus === "loading" ? "Submitting Inquiry..." : "Log Feed Ticket To System"}
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Circle Launcher Toggle */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-violet-600 via-purple-600 to-pink-600 text-white flex items-center justify-center shadow-2xl scale-100 hover:shadow-violet-300 hover:shadow-xl cursor-pointer border border-white/20 relative"
        title="Open online support chat widget"
      >
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-pink-500 border border-white text-[9px] text-white font-semibold justify-center items-center">!</span>
        </span>
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageSquare className="w-6 h-6 text-white" />
        )}
      </motion.button>
    </div>
  );
}
