import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client for persistent storage (e.g. on serverless environments like Netlify)
let SUPABASE_URL = (
  process.env.SUPABASE_URL || 
  process.env.SUPABASE_PROJECT_URL || 
  process.env.VITE_SUPABASE_URL || 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  "https://mgbtbbskwulsfhoqikdt.supabase.co"
).trim();

if (SUPABASE_URL && SUPABASE_URL.endsWith("/")) {
  SUPABASE_URL = SUPABASE_URL.slice(0, -1);
}
if (SUPABASE_URL && SUPABASE_URL.includes("/rest/v1")) {
  SUPABASE_URL = SUPABASE_URL.replace("/rest/v1", "");
}

const SUPABASE_ANON_KEY = (
  process.env.SUPABASE_ANON_KEY || 
  process.env.SUPABASE_API_KEY || 
  process.env.SUPABASE_KEY || 
  process.env.SUPABASE_ANON || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  "sb_publishable_LOEg-t1W9kUOaeRBwRbjaQ_36fsAAPM"
).trim();

let supabase: any = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase Client initialized successfully with URL:", SUPABASE_URL);
  } catch (error) {
    console.error("Failed to initialize Supabase Client:", error);
  }
}

export function hashPassword(password: string): string {
  if (!password) return "";
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Initialize Gemini client on the server as per the API guide.
// We set raw headers for custom telemetries.
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const app = express();
const PORT = 3000;

// Custom CORS middleware to handle netlify or cross-origin app client requests fully
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Middleware to normalize Netlify function path routing to our standard router layout
app.use((req, res, next) => {
  if (req.url && req.url.startsWith("/.netlify/functions/api")) {
    req.url = req.url.replace("/.netlify/functions/api", "/api");
  }
  next();
});

app.use(express.json({ limit: "10mb" }));

// Track pending asynchronous Supabase operations so we can await them before response completion
let pendingSaves: Promise<any>[] = [];

// Intercept outgoing Server JSON and send responses to guarantee asynchronous database writes are fully complete/awaited.
// This prevents serverless runtimes (like AWS Lambda or Netlify Functions) from freezing/aborting execution before writes finish.
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  (res as any).json = async function (data: any) {
    if (pendingSaves.length > 0) {
      try {
        await Promise.all(pendingSaves);
      } catch (err) {
        console.error("Error awaiting pending Supabase saves in res.json interceptor:", err);
      } finally {
        pendingSaves = [];
      }
    }
    return originalJson(data);
  };

  (res as any).send = async function (body: any) {
    if (pendingSaves.length > 0) {
      try {
        await Promise.all(pendingSaves);
      } catch (err) {
        console.error("Error awaiting pending Supabase saves in res.send interceptor:", err);
      } finally {
        pendingSaves = [];
      }
    }
    return originalSend(body);
  };

  next();
});

// Sync database state from Supabase on incoming requests to make sure we have the latest candidate scores/exams across all serverless requests!
// ONLY trigger on API routes to avoid choking static assets/Vite hot reloads.
app.use(async (req, res, next) => {
  if (supabase && req.path.startsWith("/api")) {
    try {
      await loadDatabaseFromSupabase();
    } catch (e) {
      console.error("Middleware database hydration error:", e);
    }
  }
  next();
});

const IS_SERVERLESS = !!(process.env.NETLIFY || process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME);
const REPO_DB_PATH = path.join(process.cwd(), "brain_db.json");
const DB_PATH = IS_SERVERLESS
  ? path.join("/tmp", "brain_db.json")
  : REPO_DB_PATH;

// If on a serverless platform, copy the repository base database to the writable /tmp folder on startup
if (IS_SERVERLESS && !fs.existsSync(DB_PATH) && fs.existsSync(REPO_DB_PATH)) {
  try {
    fs.copyFileSync(REPO_DB_PATH, DB_PATH);
    console.log("Successfully copied seed database to writable /tmp/brain_db.json for serverless startup");
  } catch (err) {
    console.error("Failed to copy seed database to /tmp", err);
  }
}

// Define basic schema shapes
interface DbSchema {
  users: any[];
  exams: any[];
  results: any[];
  lessonPlans: any[];
  lessonNotes: any[];
  transactions: any[];
  notifications: any[];
  subjects: string[];
  schoolConfig?: any;
  reportSheets?: any[];
  feedback?: any[];
  documents?: any[];
}

const INITIAL_SUBJECTS = [
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
  "PHE",
  "CRS",
  "Agricultural Science",
  "Geography",
  "History",
  "ICT",
  "Literature",
  "Home Economics",
  "Artificial Intelligence",
  "Verbal Reasoning",
  "Pre-Vocational (Agric & Home Economics)",
  "Articles",
  "Letter Writing",
  "Further Mathematics",
  "Food & Nutrition"
];

// Load or seed the Database
let db: DbSchema = {
  users: [],
  exams: [],
  results: [],
  lessonPlans: [],
  lessonNotes: [],
  transactions: [],
  notifications: [],
  subjects: [...INITIAL_SUBJECTS],
  schoolConfig: {
    schoolName: "Wisdom International Academy",
    location: "Enugu, Nigeria",
    term: "First Term",
    timesOpened: 120,
    schoolLogo: "https://api.dicebear.com/7.x/identicon/svg?seed=wisdom",
    schoolMotto: "wisdom, knowledge, and understanding"
  },
  reportSheets: [],
  feedback: [],
  documents: [],
};

function generateRegistrationNumber(): string {
  let regStr = "";
  let isUnique = false;
  const currentYear = new Date().getFullYear();
  while (!isUnique) {
    const number = Math.floor(1000 + Math.random() * 9000);
    regStr = `REG/${currentYear}/${number}`;
    isUnique = !db.users.some(u => u && u.regNumber === regStr);
  }
  return regStr;
}

function ensureStudentRegNumbers() {
  let modified = false;
  if (db && db.users) {
    db.users.forEach((u, i) => {
      if (u && u.role === "student") {
        if (!u.regNumber) {
          u.regNumber = `REG/${new Date().getFullYear()}/${2000 + i}`;
          modified = true;
        }
      }
    });
  }
  if (modified) {
    saveDatabase();
  }
  ensureNwaigboAccountsExists();
}

function ensureNwaigboAccountsExists() {
  if (!db || !db.users) return;
  let dbChanged = false;
  const email = "nwaigboaugust@gmail.com";

  // Ensure Admin account
  const adminAccount = db.users.find(u => u.email && u.email.toLowerCase() === email && u.role === "admin");
  if (!adminAccount) {
    db.users.push({
      id: "usr_nwaigbo_admin",
      email: email,
      password: "Chimaobi21",
      name: "Austin Nwaigbo (Admin)",
      role: "admin",
      walletBalance: 50000,
      isSuspended: false,
      createdAt: new Date().toISOString()
    } as any);
    dbChanged = true;
  } else {
    if (adminAccount.password !== "Chimaobi21") {
      adminAccount.password = "Chimaobi21";
      dbChanged = true;
    }
  }

  // Ensure Educator/Teacher account
  const teacherAccount = db.users.find(u => u.email && u.email.toLowerCase() === email && u.role === "teacher");
  if (!teacherAccount) {
    db.users.push({
      id: "usr_nwaigbo_teacher",
      email: email,
      password: "educator",
      name: "Austin Nwaigbo (Educator)",
      role: "teacher",
      walletBalance: 50000,
      isSuspended: false,
      createdAt: new Date().toISOString()
    } as any);
    dbChanged = true;
  } else {
    if (teacherAccount.password !== "educator") {
      teacherAccount.password = "educator";
      dbChanged = true;
    }
  }

  // Ensure Student account
  const studentAccount = db.users.find(u => u.email && u.email.toLowerCase() === email && u.role === "student");
  if (!studentAccount) {
    db.users.push({
      id: "usr_nwaigbo_student",
      email: email,
      password: "12345",
      name: "Austin Nwaigbo (Student)",
      role: "student",
      regNumber: "REG/2026/AUSTIN",
      walletBalance: 0,
      isSuspended: false,
      createdAt: new Date().toISOString(),
      classLevel: "Grade 10"
    } as any);
    dbChanged = true;
  } else {
    if (studentAccount.password !== "12345") {
      studentAccount.password = "12345";
      dbChanged = true;
    }
    if (!studentAccount.regNumber) {
      studentAccount.regNumber = "REG/2026/AUSTIN";
      dbChanged = true;
    }
  }

  // Ensure Guest Admin account (usr_guest_admin)
  const guestAdminAccount = db.users.find(u => u.id === "usr_guest_admin");
  if (!guestAdminAccount) {
    db.users.push({
      id: "usr_guest_admin",
      email: email,
      password: "password",
      name: "Austin Nwaigbo (Guest)",
      role: "admin",
      walletBalance: 50000,
      isSuspended: false,
      createdAt: new Date().toISOString()
    } as any);
    dbChanged = true;
  } else {
    // Sync guest balance if empty
    if (!guestAdminAccount.walletBalance || guestAdminAccount.walletBalance < 1000) {
      guestAdminAccount.walletBalance = 50000;
      dbChanged = true;
    }
  }

  if (dbChanged) {
    saveDatabase();
  }
}

let lastHydratedAt = 0;
const HYDRATION_CACHE_MS = 10000; // 10 seconds cache cooldown to prevent high-frequency sequential API or parallel request clobbering
let activeHydrationPromise: Promise<void> | null = null;

async function loadDatabaseFromSupabase(): Promise<void> {
  if (!supabase) return;
  
  const now = Date.now();
  if (now - lastHydratedAt < HYDRATION_CACHE_MS) {
    return; // Skip loading and serve from the existing warm memory database
  }

  if (activeHydrationPromise) {
    return activeHydrationPromise;
  }

  activeHydrationPromise = (async () => {
    try {
      let timeoutId: any;
      const timeoutPromise = new Promise<any>((resolve) => {
        timeoutId = setTimeout(() => resolve({ timeout: true }), 2000);
      });

      const fetchPromise = (async () => {
        try {
          return await supabase
            .from("brain_state")
            .select("data")
            .eq("id", "primary_state")
            .maybeSingle();
        } catch (err: any) {
          return { error: err };
        }
      })();

      const response = await Promise.race([fetchPromise, timeoutPromise]);
      clearTimeout(timeoutId);

      if (response && response.timeout) {
        console.warn("Supabase read operation timed out (2000ms limit)");
        return;
      }

      const { data: row, error } = response || { data: null, error: null };

      if (error) {
        console.warn("Failed to fetch database state from Supabase, error message:", error.message);
        if (error.message && error.message.toLowerCase().includes("relation") && error.message.toLowerCase().includes("does not exist")) {
          console.warn("\n========================================================");
          console.warn("👉 SUPABASE STORAGE TABLE SETUP NOTICE:");
          console.warn("To enable central cloud persistence, please execute the following SQL statement in your Supabase SQL Editor:");
          console.warn("--------------------------------------------------------");
          console.warn("CREATE TABLE brain_state (\n  id TEXT PRIMARY KEY,\n  data JSONB NOT NULL,\n  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())\n);");
          console.warn("========================================================\n");
        }
      } else if (row && row.data) {
        const fetchedDb = row.data as DbSchema;
        if (fetchedDb && fetchedDb.users) {
          db = fetchedDb;
          // Ensure all root keys exist
          if (!db.users) db.users = [];
          if (!db.exams) db.exams = [];
          if (!db.results) db.results = [];
          if (!db.lessonPlans) db.lessonPlans = [];
          if (!db.lessonNotes) db.lessonNotes = [];
          if (!db.transactions) db.transactions = [];
          if (!db.notifications) db.notifications = [];
          if (!db.documents) db.documents = [];
          if (!db.subjects || db.subjects.length === 0) {
            db.subjects = [...INITIAL_SUBJECTS];
          }
          if (!db.reportSheets) db.reportSheets = [];
          if (!db.feedback) db.feedback = [];
          if (!db.schoolConfig) {
            db.schoolConfig = {
              schoolName: "Wisdom International Academy",
              location: "Enugu, Nigeria",
              term: "First Term",
              timesOpened: 120,
              schoolLogo: "https://api.dicebear.com/7.x/identicon/svg?seed=wisdom",
              schoolMotto: "wisdom, knowledge, and understanding"
            };
          }
          ensureStudentRegNumbers();
          
          lastHydratedAt = Date.now();

          // Keep local backup synced too
          try {
            fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
          } catch (err) {}
        }
      } else {
        console.log("No data stored in Supabase 'brain_state' yet. Will write current seed state to Supabase.");
        await saveDatabaseToSupabase();
        lastHydratedAt = Date.now();
      }
    } catch (err: any) {
      console.error("Critical error loading database from Supabase:", err?.message || err);
    } finally {
      activeHydrationPromise = null;
    }
  })();

  return activeHydrationPromise;
}

async function saveDatabaseToSupabase() {
  if (!supabase) return;
  try {
    let timeoutId: any;
    const timeoutPromise = new Promise<any>((resolve) => {
      timeoutId = setTimeout(() => resolve({ timeout: true }), 2000);
    });

    const upsertPromise = (async () => {
      try {
        return await supabase
          .from("brain_state")
          .upsert({
            id: "primary_state",
            data: db,
            updated_at: new Date().toISOString()
          });
      } catch (err: any) {
        return { error: err };
      }
    })();

    const response = await Promise.race([upsertPromise, timeoutPromise]);
    clearTimeout(timeoutId);

    if (response && response.timeout) {
      console.warn("Supabase write operation timed out (2000ms limit)");
      return;
    }

    const { error } = response || { error: null };

    if (error) {
      console.error("Failed to persist database state to Supabase:", error.message);
      if (error.message && error.message.toLowerCase().includes("relation") && error.message.toLowerCase().includes("does not exist")) {
        console.error("\n========================================================");
        console.error("👉 SUPABASE STORAGE TABLE SETUP NOTICE:");
        console.error("To enable central cloud persistence, please execute the following SQL statement in your Supabase SQL Editor:");
        console.error("--------------------------------------------------------");
        console.error("CREATE TABLE brain_state (\n  id TEXT PRIMARY KEY,\n  data JSONB NOT NULL,\n  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())\n);");
        console.error("========================================================\n");
      }
    } else {
      console.log("Successfully persisted state to Supabase!");
    }
  } catch (err: any) {
    console.error("Critical error saving database to Supabase:", err?.message || err);
  }
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      db = JSON.parse(data);
      // Ensure all root keys exist
      if (!db.users) db.users = [];
      if (!db.exams) db.exams = [];
      if (!db.results) db.results = [];
      if (!db.lessonPlans) db.lessonPlans = [];
      if (!db.lessonNotes) db.lessonNotes = [];
      if (!db.transactions) db.transactions = [];
      if (!db.notifications) db.notifications = [];
      if (!db.documents) db.documents = [];
      if (!db.subjects || db.subjects.length === 0) {
        db.subjects = [...INITIAL_SUBJECTS];
      } else {
        if (!db.subjects.includes("Phonics")) {
          db.subjects.push("Phonics");
        }
        if (!db.subjects.includes("Artificial Intelligence")) {
          db.subjects.push("Artificial Intelligence");
        }
      }
      if (!db.reportSheets) db.reportSheets = [];
      if (!db.feedback) db.feedback = [];
      if (!db.schoolConfig) {
        db.schoolConfig = {
          schoolName: "Wisdom International Academy",
          location: "Enugu, Nigeria",
          term: "First Term",
          timesOpened: 120,
          schoolLogo: "https://api.dicebear.com/7.x/identicon/svg?seed=wisdom",
          schoolMotto: "wisdom, knowledge, and understanding"
        };
      }
      ensureStudentRegNumbers();
    } else {
      seedDatabase();
      ensureStudentRegNumbers();
    }
  } catch (error) {
    console.error("Failed to load details from JSON DB, seeding instead...", error);
    seedDatabase();
    ensureStudentRegNumbers();
  }
}

function saveDatabase() {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Critical: Failed to save database changes to disk!", error);
  }
  
  // Update lastHydratedAt immediately to represent that memory db contains the absolute newest state
  // This blocks other sequential API calls from loading stale state and clobbering the registration
  lastHydratedAt = Date.now();

  if (supabase) {
    const p = saveDatabaseToSupabase();
    pendingSaves.push(p);
  }
}

function seedDatabase() {
  console.log("Seeding fresh demo database...");
  db.users = [
    {
      id: "usr_admin",
      email: "admin@brain.com",
      password: "password",
      name: "Admin Administrator",
      role: "admin",
      walletBalance: 999999,
      isSuspended: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "usr_teacher",
      email: "teacher@brain.com",
      password: "password",
      name: "Mr. Austin (Educator)",
      role: "teacher",
      walletBalance: 1200, // starting with wallet balance for easy trial
      isSuspended: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "usr_student",
      email: "student@brain.com",
      password: "password",
      name: "Augusta Nwaigbo",
      role: "student",
      walletBalance: 0,
      isSuspended: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "usr_google_user",
      email: "nwaigboaugust@gmail.com",
      password: "Chimaobi21",
      name: "August Nwaigbo (Owner)",
      role: "admin", // Bootstrapped admin is nwaigboaugust@gmail.com as instructed!
      walletBalance: 5000,
      isSuspended: false,
      createdAt: new Date().toISOString(),
    }
  ];

  db.notifications = [
    {
      id: "notif_1",
      userId: "usr_teacher",
      title: "Welcome to Brain!",
      message: "Create lesson plans, generate AI-powered CBT questions, and manage CBT exams in seconds.",
      read: false,
      date: new Date().toISOString(),
    },
    {
      id: "notif_2",
      userId: "usr_student",
      title: "Exam Invitation",
      message: "You have been invited to participate in the Physics Mock Exam.",
      read: false,
      date: new Date().toISOString(),
    }
  ];

  db.transactions = [
    {
      id: "tx_1",
      userId: "usr_teacher",
      userName: "Mr. Austin (Educator)",
      amount: 1000,
      type: "credit",
      purpose: "Promo Seeding Bonus",
      date: new Date().toISOString(),
    }
  ];

  db.exams = [
    {
      id: "exam_physics_demo",
      title: "Introduction to Thermodynamics",
      subject: "Physics",
      level: "Senior Secondary School",
      duration: 10,
      totalMarks: 20,
      instructions: "Answer all 4 questions. No calculators allowed. Each question carries 5 marks.",
      questions: [
        {
          question: "Which of the following describes the first law of thermodynamics?",
          optionA: "Energy is conserved; it can only be converted from one form to another.",
          optionB: "Entropy of an isolated system always increases.",
          optionC: "Absolute zero can never be reached.",
          optionD: "Heat transfers spontaneously from cold objects to hot objects.",
          correctAnswer: "A",
          subject: "Physics",
          topic: "Thermodynamics",
          marks: 5,
        },
        {
          question: "What is the SI unit of heat energy?",
          optionA: "Watt",
          optionB: "Joule",
          optionC: "Newton",
          optionD: "Pascal",
          correctAnswer: "B",
          subject: "Physics",
          topic: "Thermodynamics",
          marks: 5,
        },
        {
          question: "Which of the following processes occurs at constant pressure?",
          optionA: "Isochoric",
          optionB: "Isothermal",
          optionC: "Isobaric",
          optionD: "Adiabatic",
          correctAnswer: "C",
          subject: "Physics",
          topic: "Thermodynamics",
          marks: 5,
        },
        {
          question: "In an adiabatic expansion, the temperature of an ideal gas:",
          optionA: "Increases",
          optionB: "Decreases",
          optionC: "Remains constant",
          optionD: "Becomes zero",
          correctAnswer: "B",
          subject: "Physics",
          topic: "Thermodynamics",
          marks: 5,
        }
      ],
      creatorId: "usr_teacher",
      creatorName: "Mr. Austin (Educator)",
      examLink: "https://ais-dev-ztyvz4czqqphjogv3uekw5-210258902427.europe-west1.run.app/?examId=exam_physics_demo",
      isPublished: true,
      createdAt: new Date().toISOString(),
    }
  ];

  db.results = [
    {
      id: "res_demo_1",
      examId: "exam_physics_demo",
      examTitle: "Introduction to Thermodynamics",
      subject: "Physics",
      studentId: "usr_student",
      studentName: "Augusta Nwaigbo",
      score: 15,
      percentage: 75,
      totalQuestions: 4,
      correctAnswers: 3,
      failedQuestions: [
        {
          question: "In an adiabatic expansion, the temperature of an ideal gas:",
          optionA: "Increases",
          optionB: "Decreases",
          optionC: "Remains constant",
          optionD: "Becomes zero",
          selectedAnswer: "C",
          correctAnswer: "B",
        }
      ],
      date: new Date().toISOString(),
    }
  ];

  db.feedback = [
    {
      id: "fb_1",
      name: "Mrs. Abigail Johnson",
      email: "abigail@brains.com",
      message: "The CBT system works absolutely wonderfully! We would love to have more English sound-matching options.",
      date: new Date().toISOString()
    }
  ];

  saveDatabase();
}

// Initial Call
loadDatabase();

// --- API ENDPOINTS ---

// 1. HELPERS FOR GEMINI CALLS WITH AUTOMATIC RESILIENCE RETRY AND MODEL FALLBACKS
async function callGemini(prompt: string, jsonMode = false, schema?: any) {
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const config: any = {
          systemInstruction: "You are Brain, an ultra-smart Nigerian Educational AI expert that provides highly robust lesson plans, lesson notes, and CBT questions precisely in structure.",
        };
        if (jsonMode) {
          config.responseMimeType = "application/json";
          if (schema) {
            config.responseSchema = schema;
          }
        }

        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
          config,
        });
        
        if (response && response.text) {
          return response.text;
        }
        throw new Error("Empty text returned from Gemini API candidate stream.");
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini call failed (Model: ${model}, Attempt: ${attempt}/3):`, err instanceof Error ? err.message : err);
        
        // Wait before retry with exponential backoff
        const delay = attempt * 400;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  if (lastError instanceof Error) {
    console.error("All Gemini models/retries failed:", lastError.message);
    throw new Error(`Gemini AI service error: ${lastError.message}`);
  } else {
    throw new Error("Unknown error while generating content with Gemini after fallback retries.");
  }
}

// --- AUTH API ---
app.get("/api/auth/session", (req, res) => {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return res.json({ user: null });
    }
    return res.json({
      user: {
        id: authUser.id,
        email: authUser.email,
        name: authUser.name,
        role: authUser.role,
        regNumber: authUser.regNumber,
        walletBalance: authUser.walletBalance,
        classLevel: authUser.classLevel,
        schoolName: authUser.schoolName || "",
        experience: authUser.experience || ""
      }
    });
  } catch (error: any) {
    console.error("Critical error in session retrieval:", error);
    return res.json({ user: null });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.cookie("brain_user_id", "", { maxAge: 0, path: "/" });
  return res.json({ success: true, message: "Logged out successfully" });
});

app.post("/api/auth/register", async (req, res) => {
  console.log("=== [REGISTRATION ENDPOINT TRIGGERED] ===");
  try {
    if (!req.body) {
      console.error("[Register Error] Missing payload");
      return res.status(400).json({ error: "Standard registration request payload is missing." });
    }

    const { name, email, password, confirmPassword, role } = req.body;
    console.log(`[Register Request] Name: "${name}", Email: "${email}", Role: "${role}"`);

    if (!name || name.trim().length < 2) {
      console.error("[Register Error] Invalid name length");
      return res.status(400).json({ error: "Unable to create account. Please enter a valid name of at least 2 characters." });
    }

    if (!email) {
      console.error("[Register Error] Email is missing");
      return res.status(400).json({ error: "Invalid email." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error(`[Register Error] Email "${email}" does not match regex`);
      return res.status(400).json({ error: "Invalid email." });
    }

    if (!password || password.length < 8) {
      console.error("[Register Error] Password is too short");
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    if (password !== confirmPassword) {
      console.error("[Register Error] Passwords do not match");
      return res.status(400).json({ error: "Passwords do not match." });
    }

    if (role === "admin") {
      console.error("[Register Error] Attempted direct admin registration");
      return res.status(403).json({ error: "Direct registration of administrator accounts is strictly forbidden." });
    }

    if (!["student", "teacher"].includes(role)) {
      console.error(`[Register Error] Invalid role selection: "${role}"`);
      return res.status(400).json({ error: "Invalid registration profile path selected." });
    }

    const existingUser = db.users.find(u => u && u.email && u.email.toLowerCase() === email.toLowerCase().trim());
    if (existingUser) {
      console.warn(`[Register Warning] Email "${email}" already exists in local database cache`);
      return res.status(400).json({ error: "Email already exists." });
    }

    let resolvedUserId = "usr_" + Math.random().toString(36).substring(2, 9);
    
    // --- INTEGRATING SUPABASE AUTHENTICATION ---
    if (supabase) {
      console.log(`[Supabase Auth] Attempting signup via GoTrue client API for: ${email}`);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: {
          data: {
            name: name.trim(),
            role: role,
            classLevel: role === "student" ? "Senior Secondary Section 3" : undefined,
          }
        }
      });

      if (authError) {
        console.error("[Supabase Auth Signup Error] GoTrue API registration failed:", authError.message, authError);
        return res.status(400).json({ 
          error: `Supabase Authentication Error: ${authError.message}. Code: (${authError.status || 'UNKNOWN'})`
        });
      }

      if (authData && authData.user) {
        resolvedUserId = authData.user.id;
        console.log(`[Supabase Auth Signup Succeeded] Created user ID: ${resolvedUserId}`);
      } else {
        console.warn("[Supabase Auth Signup Warning] Succeeded but returned no user object.");
      }
    } else {
      console.warn("[Register Warning] Supabase client is not initialized. Falling back to local offline user mock mode.");
    }

    const hasRegNum = role === "student";
    // Starting balances preloaded for complementary trial actions (₦25,000 teacher, ₦5,000 student)
    const startBalance = role === "teacher" ? 25000 : 5000;

    const newUser = {
      id: resolvedUserId,
      email: email.toLowerCase().trim(),
      password: hashPassword(password),
      name: name.trim(),
      role: role,
      walletBalance: startBalance,
      regNumber: hasRegNum ? `REG/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}` : undefined,
      classLevel: hasRegNum ? "Senior Secondary Section 3" : undefined,
      isSuspended: false,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    saveDatabase();
    console.log(`[Register Success] Registered ${email} with ID ${newUser.id} inside cached memory database.`);

    res.cookie("brain_user_id", newUser.id, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: false,
      path: "/"
    });

    return res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        regNumber: newUser.regNumber,
        walletBalance: newUser.walletBalance,
        classLevel: newUser.classLevel
      }
    });

  } catch (err: any) {
    console.error("Critical Registration endpoint failure:", err);
    return res.status(500).json({ error: `Unable to create account. Server error: ${err.message || err}` });
  }
});

app.post("/api/auth/login", async (req, res) => {
  console.log("=== [LOGIN ENDPOINT TRIGGERED] ===");
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.error("[Login Error] Email or password missing");
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[Login Attempt] Email: "${normalizedEmail}"`);

    // --- INTEGRATING SUPABASE AUTHENTICATION ---
    let supabaseUserAuthenticated = false;
    let reconciledUserId: string | null = null;

    if (supabase) {
      console.log(`[Supabase Auth] Verifying credentials via GoTrue signInWithPassword for: ${normalizedEmail}`);
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      });

      if (authError) {
        console.warn(`[Supabase Auth Login Warning] GoTrue authentication failed for ${normalizedEmail}. Message:`, authError.message);
        // We do NOT block immediately yet. If it's a seed user who does not exist in Supabase auth yet, we'll fall back to our local hash password check.
      } else if (authData && authData.user) {
        supabaseUserAuthenticated = true;
        reconciledUserId = authData.user.id;
        console.log(`[Supabase Auth Login Succeeded] Authenticated successfully with UUID: ${reconciledUserId}`);
      }
    }

    const matchedUsers = db.users.filter(u => u && u.email && u.email.toLowerCase() === normalizedEmail);
    if (matchedUsers.length === 0) {
      console.error(`[Login Error] No registered cached user found for email: ${normalizedEmail}`);
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Attempt to match the exact user.
    // If we authenticated successfully with Supabase, we match by Supabase ID first.
    let user = matchedUsers.find(u => u && (u.id === reconciledUserId));
    
    // Otherwise fallback to custom password hash matching
    if (!user) {
      const inputHashed = hashPassword(password);
      user = matchedUsers.find(u => u && (u.password === password || u.password === inputHashed));
    }

    // Final fallback to the first matched user if none of the passwords match
    if (!user) {
      user = matchedUsers[0];
    }

    if (user.isSuspended) {
      console.warn(`[Login Warning] User ${user.email} is suspended`);
      return res.status(403).json({ error: "This academic profile has been suspended by system administrators." });
    }

    // Verify Password both plaintext (historic migration fallback), SHA256 hashed, or via Supabase verification
    const inputHashed = hashPassword(password);
    const isValid = supabaseUserAuthenticated || (user.password === password || user.password === inputHashed);

    if (!isValid) {
      console.error(`[Login Error] Invalid password entered for user: ${user.email}`);
      return res.status(401).json({ error: "Invalid email or password." });
    }

    console.log(`[Login Success] User ${user.email} logged in successfully with custom cache ID ${user.id}`);

    res.cookie("brain_user_id", user.id, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: false,
      path: "/"
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        regNumber: user.regNumber,
        walletBalance: user.walletBalance,
        classLevel: user.classLevel,
        schoolName: user.schoolName,
        experience: user.experience
      }
    });

  } catch (err: any) {
    console.error("Login endpoint failure:", err);
    return res.status(500).json({ error: `Server authentication sequence failed: ${err.message || err}` });
  }
});

app.post("/api/auth/reset", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email address is required." });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  // Mock verification reset
  return res.json({ success: true, message: `Password reset instruction guidelines logged to ${email}. Check mailbox.` });
});

app.post("/api/auth/update-profile", (req, res) => {
  const { name } = req.body;
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: "Authentication status invalid." });
  }
  if (name) {
    authUser.name = name;
    saveDatabase();
  }
  return res.json({
    user: {
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
      role: authUser.role,
      walletBalance: authUser.walletBalance
    }
  });
});

// --- DOCUMENTS / PERSONAL LIBRARY SYSTEM ---

function getAuthenticatedUser(req: any) {
  if (!db.users) db.users = [];
  
  const cookieHeader = req.headers.cookie || "";
  let userId: string | null = null;
  const match = cookieHeader.match(/brain_user_id=([^; ]+)/);
  if (match) {
    userId = match[1];
  }

  // Support fallback headers from client token states
  if (!userId) {
    if (req.headers["x-user-id"]) {
      userId = req.headers["x-user-id"] as string;
    } else {
      const auth = req.headers.authorization || "";
      if (auth.startsWith("Bearer ")) {
        userId = auth.substring(7);
      }
    }
  }
  
  if (userId) {
    const user = db.users.find((u) => u && u.id === userId);
    if (user) return user;
  }
  
  return null;
}

// 1. GET ALL DOCUMENTS (Filtered by user, active/trash status, category, search, with pagination)
app.get("/api/documents", (req, res) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: "Authentication required to view resources." });
  }

  if (!db.documents) db.documents = [];

  // Run automatic 30-day trash purging
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const initialCount = db.documents.length;
  db.documents = db.documents.filter(doc => {
    if (doc.status === "trash" && doc.deletedAt) {
      const deletedTime = new Date(doc.deletedAt).getTime();
      return deletedTime >= thirtyDaysAgo;
    }
    return true;
  });
  if (db.documents.length !== initialCount) {
    saveDatabase();
  }

  let userDocs = db.documents.filter(doc => doc.userId === authUser.id);

  // Filter by status ("active", "trash")
  const status = req.query.status || "active";
  userDocs = userDocs.filter(doc => doc.status === status);

  // Filter by category
  const category = req.query.category;
  if (category && category !== "all") {
    userDocs = userDocs.filter(doc => doc.category === category);
  }

  // Search filter
  const search = req.query.search;
  if (search) {
    const s = String(search).toLowerCase();
    userDocs = userDocs.filter(doc => 
      (doc.title && doc.title.toLowerCase().includes(s)) ||
      (doc.subject && doc.subject.toLowerCase().includes(s)) ||
      (doc.classLevel && doc.classLevel.toLowerCase().includes(s))
    );
  }

  // Sort: newest first
  userDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Pagination / Lazy Loading (Performance Requirement)
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Number(req.query.limit) || 10);
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const paginatedDocs = userDocs.slice(startIndex, endIndex);

  res.json({
    success: true,
    documents: paginatedDocs,
    totalCount: userDocs.length,
    page,
    limit,
    totalPages: Math.ceil(userDocs.length / limit)
  });
});

// 2. CREATE A DOCUMENT MANUALLY
app.post("/api/documents", (req, res) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: "Authentication required to save resources." });
  }

  if (!db.documents) db.documents = [];

  const { title, content, category, subject, classLevel } = req.body;
  if (!title || !content || !category) {
    return res.status(400).json({ error: "Title, content, and category are required fields." });
  }

  const docId = "doc_" + Math.random().toString(36).substring(2, 9);
  const newDoc = {
    id: docId,
    userId: authUser.id,
    title,
    content,
    category,
    subject: subject || "General",
    classLevel: classLevel || "General",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "active"
  };

  db.documents.push(newDoc);
  saveDatabase();

  res.json({ success: true, document: newDoc });
});

// 3. UPDATE / EDIT A DOCUMENT
app.put("/api/documents/:id", (req, res) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: "Authentication required to edit resources." });
  }

  if (!db.documents) db.documents = [];

  const doc = db.documents.find(d => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: "Document not found." });
  }

  if (doc.userId !== authUser.id) {
    return res.status(403).json({ error: "Access denied. You can only modify your own documents." });
  }

  const { title, content, subject, classLevel, category } = req.body;
  if (title) doc.title = title;
  if (content !== undefined) doc.content = content;
  if (subject) doc.subject = subject;
  if (classLevel) doc.classLevel = classLevel;
  if (category) doc.category = category;
  
  doc.updatedAt = new Date().toISOString();

  saveDatabase();

  res.json({ success: true, document: doc });
});

// 4. DUPLICATE A DOCUMENT
app.post("/api/documents/:id/duplicate", (req, res) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: "Authentication required to duplicate resources." });
  }

  if (!db.documents) db.documents = [];

  const original = db.documents.find(d => d.id === req.params.id);
  if (!original) {
    return res.status(404).json({ error: "Document not found." });
  }

  if (original.userId !== authUser.id) {
    return res.status(403).json({ error: "Access denied. You can only duplicate your own documents." });
  }

  const docId = "doc_" + Math.random().toString(36).substring(2, 9);
  const copy = JSON.parse(JSON.stringify(original));
  copy.id = docId;
  copy.title = `${original.title} (Copy)`;
  copy.createdAt = new Date().toISOString();
  copy.updatedAt = new Date().toISOString();
  copy.status = "active";
  delete copy.deletedAt;

  db.documents.push(copy);
  saveDatabase();

  res.json({ success: true, document: copy });
});

// 5. MOVE TO TRASH / SOFT DELETE
app.delete("/api/documents/:id", (req, res) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (!db.documents) db.documents = [];

  const doc = db.documents.find(d => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: "Document not found." });
  }

  if (doc.userId !== authUser.id) {
    return res.status(403).json({ error: "Access denied." });
  }

  doc.status = "trash";
  doc.deletedAt = new Date().toISOString();

  saveDatabase();

  res.json({ success: true, document: doc });
});

// 6. RESTORE FROM TRASH
app.post("/api/documents/:id/restore", (req, res) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (!db.documents) db.documents = [];

  const doc = db.documents.find(d => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: "Document not found." });
  }

  if (doc.userId !== authUser.id) {
    return res.status(403).json({ error: "Access denied." });
  }

  doc.status = "active";
  delete doc.deletedAt;

  saveDatabase();

  res.json({ success: true, document: doc });
});

// 7. PERMANENT INDIVIDUAL DELETE FROM TRASH
app.delete("/api/documents/:id/force", (req, res) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (!db.documents) db.documents = [];

  const match = db.documents.find(d => d.id === req.params.id);
  if (!match) {
    return res.status(404).json({ error: "Document not found." });
  }

  if (match.userId !== authUser.id) {
    return res.status(403).json({ error: "Access denied." });
  }

  db.documents = db.documents.filter(d => d.id !== req.params.id);
  saveDatabase();

  res.json({ success: true, message: "Permanently deleted." });
});

// 8. UNIFIED AI RESOURCE GENERATOR (For Schemes of Work, Assignments, Worksheets, or Other Resources)
app.post("/api/ai/generate-resource", async (req, res) => {
  const authUser = getAuthenticatedUser(req);
  if (!authUser) {
    return res.status(401).json({ error: "Authentication required to generate resources." });
  }

  const { category, subject, topic, classLevel, promptDetails } = req.body;
  if (!category || !subject || !topic || !classLevel) {
    return res.status(400).json({ error: "Category, subject, topic, and class level are required." });
  }

  const systemInstructions: Record<string, string> = {
    "Schemes of Work": "You are Brain, an ultra-smart Nigerian Educational AI expert. Generate a comprehensive Scheme of Work detailing week-by-week curriculum topics, objectives, and lesson guides for the whole term. Organize using sequential list outlines (no asterisks).",
    "Assignments": "You are Brain, an ultra-smart Nigerian Educational AI expert. Generate an academic Assignment/Homework task worksheet containing 5-10 detailed questions, word problems, or essay questions. Organize clearly with sequential numbers (no asterisks).",
    "Worksheets": "You are Brain, an ultra-smart Nigerian Educational AI expert. Generate a detailed, high-density class Practice Worksheet with summaries, exercises, and answers. Organize with sequential numbers (no asterisks).",
    "Other Generated Resources": "You are Brain, an ultra-smart Nigerian Educational AI expert. Generate high-quality personalized educational study notes, handouts, summaries, or flashcard content. Organize with sequential numbers (no asterisks)."
  };

  const instructionPrompt = systemInstructions[category] || "Generate a highly detailed educational resource.";

  const prompt = `
Generate a highly detailed, professionally structured ${category} for:
Subject: ${subject}
Class: ${classLevel}
Topic: ${topic}
Additional Details: ${promptDetails || "None"}

Please deliver the response in a JSON object conforming to this exact schema structure:
{
  "title": "${category}: ${topic}",
  "subject": "${subject}",
  "classLevel": "${classLevel}",
  "topic": "${topic}",
  "body": "Highly detailed text/prose of the generated ${category}. Ensure you use proper mathematical/science notations where needed. Avoid using asterisks (*) or hashtags (###) formatting; instead, use sequential heading numbers (e.g., 1. INTRODUCTION, 2. DETAILS) and simple numbered bullet lists (1., 2., 3.)."
}

Return only valid JSON. Do not write markdown tags outside the JSON representation.
`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      subject: { type: Type.STRING },
      classLevel: { type: Type.STRING },
      topic: { type: Type.STRING },
      body: { type: Type.STRING }
    },
    required: ["title", "subject", "classLevel", "topic", "body"]
  };

  try {
    const rawResult = await callGemini(prompt, true, schema);
    if (!rawResult) throw new Error("Gemini returned empty results.");

    const parsedResource = JSON.parse(rawResult.trim());
    
    const docId = "doc_" + Math.random().toString(36).substring(2, 9);
    const completeDoc = {
      id: docId,
      userId: authUser.id,
      title: parsedResource.title,
      content: {
        body: parsedResource.body,
        rawJson: parsedResource
      },
      category: category,
      subject: subject,
      classLevel: classLevel,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "active"
    };

    if (!db.documents) db.documents = [];
    db.documents.push(completeDoc);

    // Minor Debit Charge Simulation if teacher
    const CHARGE = 20;
    if (authUser.role === "teacher") {
      authUser.walletBalance = Math.max(0, authUser.walletBalance - CHARGE);
      db.transactions.push({
        id: "tx_" + Math.random().toString(36).substring(2, 9),
        userId: authUser.id,
        userName: authUser.name,
        amount: CHARGE,
        type: "debit",
        purpose: `AI Resource: ${category} - ${topic}`,
        date: new Date().toISOString()
      });
    }

    saveDatabase();

    res.json({ success: true, document: completeDoc, walletBalance: authUser.walletBalance });
  } catch (error: any) {
    console.error("Resource generation failed:", error);
    res.status(500).json({ error: error.message || `Failed to generate ${category}.` });
  }
});

// --- SUBJECTS API ---
app.get("/api/subjects", (req, res) => {
  res.json({ subjects: db.subjects });
});

app.post("/api/subjects", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Subject name is required." });
  if (db.subjects.includes(name)) return res.status(400).json({ error: "Subject already exists." });

  db.subjects.push(name);
  saveDatabase();
  res.json({ subjects: db.subjects });
});

// --- AI LESSON PLAN GENERATOR ---
app.post("/api/ai/lesson-plan", async (req, res) => {
  const {
    schoolName,
    teacherName,
    classLevel,
    subject,
    topic,
    subTopic,
    date,
    duration,
    ageOfPupils,
    numberOfPupils,
    teacherId,
    week,
    term,
  } = req.body;

  if (!subject || !topic || !classLevel) {
    return res.status(400).json({ error: "Subject, topic, and class level are required to generate a lesson plan." });
  }

  // Support 50 Naira wallet charge for lesson plan writting
  const PLAN_CHARGE = 50;
  const teacher = db.users.find((u) => u.id === teacherId);
  if (teacherId) {
    if (teacher && teacher.walletBalance < PLAN_CHARGE) {
      return res.status(400).json({ error: `Insufficient wallet balance! Generating a lesson plan costs ₦${PLAN_CHARGE}. Your current balance is ₦${teacher.walletBalance}. Please fund your wallet.` });
    }
  }

  const isCalculationSubject = /math|physic|chemist|algebra|geometry|arithmetic|calculus|equation/i.test(subject);

  const prompt = `
Generate a highly concise, professional lesson plan for:
School: ${schoolName || "N/A"}
Teacher name: ${teacherName || "N/A"}
Class: ${classLevel}
Subject: ${subject}
Topic: ${topic}
Sub-topic: ${subTopic || topic}
Week of Term: Week ${week || "1"}
Date: ${date || "N/A"}
Duration: ${duration || "45 Minutes"}
Age of Pupils: ${ageOfPupils || "N/A"}
Number of Pupils: ${numberOfPupils || "N/A"}

Core Framework Requirements:
1. STRICT ONE-PAGE A4 PORTRAIT LAYOUT CONDENSATION:
   The entire lesson plan MUST be highly compact and designed to comfortably fit on exactly one single A4 page. Write short, direct, high-density sentences. Eliminate excessive filler words.

2. MATH & STEP-BY-STEP ARRANGEMENT:
   Anytime calculations, formulas, or solutions to solved examples are provided, organize them step-by-step. Each solution stage or step MUST appear clearly on its own physical line (separated by standard newline \\n). Avoid clustered, squished, or messy inline formatting.

3. SUPERSCRIPTS AND SUBSCRIPTS:
   Use proper mathematical formatting. For superscripts, always use the format x^{2} or x^{y} (using curly braces around the exponent). For subscripts, always use x_{1} or H_{2}O (using curly braces around the index).

4. HORIZONTAL FRACTION FORMATTING (No slanted slashes):
   You are STRICTLY FORBIDDEN from writing mathematical fractions using a slanted slash (e.g. do NOT write 3/4, a/b, or 1/2). Instead, fractions MUST display in a proper horizontal mathematical format using standard LaTeX math fraction structure: \\frac{numerator}{denominator} (e.g. \\frac{3}{4} or \\frac{a}{b}).

5. NO SHORTHAND OR ABBREVIATIONS (NO "C.C." or "cc"):
   You are STRICTLY FORBIDDEN from using "C.C.", "c.c.", or "cc" for volume or any other quantity. Instead, fully spell out the term, using "cm^{3}" (cubic centimeters) or "mL" or "milliliters" explicitly. Every calculation formula, step, constant, and unit must be extremely clear and easily readable by students, leaving absolutely no room for confusion. Do not append any weird characters or trailing strings.

6. COMPREHENSIVE SPECIAL SYMBOLS, PHONETICS & NOTATION:
   You MUST properly use and write standard symbols relevant to the subject matter. Ensure that everything is readable and correctly formed:
   - MATHEMATICS: Use standard mathematical symbols (e.g., ±, ∑, √, ∛, ∝, ∞, ∠, ⊥, ∥, ∩, ∪, ∫, ≈, ≡, ≠, ≤, ≥, °, π, ÷, ×, −, +, =). Format algebraic equations and powers clearly. Superscripts must be formatted like x^{2}, while subscripts must be formatted like x_{1}. Never use slanted slashes for fractions; use LaTeX fractions like \\frac{a}{b}. Include trig ratios like \\sin\\theta, \\cos\\theta, \\tan\\theta.
   - ENGLISH GRAMMAR & PUNCTUATION/LITERATURE: Use proper punctuations and phonetic aids including typographically correct quote marks (“...”, ‘...’), em-dash (—), en-dash (–), and ellipsis (…). Use grammatical annotations (e.g., brackets [ ] for phrases/clauses and underlines for focus elements). Always use standard accent marks where appropriate (e.g., é, è, á, ô).
   - PHONETIC SYMBOLS (IPA): When discussing pronunciation, sounds or phonetics, always use standard International Phonetic Alphabet (IPA) symbols wrapped in phonetic lines /.../ (e.g., vowels: /æ/, /ɑː/, /ɔː/, /ʊ/, /uː/, /ʌ/, /ɜː/, /ə/, /iː/, /ɪ/; diphthongs: /eɪ/, /aɪ/, /ɔɪ/, /əʊ/, /aʊ/, /ɪə/, /eə/, /ʊə/; consonants: /ʃ/, /ʒ/, /tʃ/, /dʒ/, /θ/, /ð/, /ŋ/).
   - PHYSICS SIGNS, SYMBOLS & CONSTANTS: Use standard Unicode Greek letters and physical operation signs (e.g., θ for angle, λ for wavelength, μ for coefficient of friction/magnetic permeability, ρ for density, Ω for electrical resistance, ω for angular velocity, Δ for change in a quantity, π, α, β, γ for nuclear radiations, etc.) with standardized metric units (e.g., m/s^{2}, kg·m/s, N·m, J/kg·K).
   - CHEMISTRY CHEMICAL FORMULAS & REACTION NOTATIONS: Write chemical formulas and molecular compounds beautifully using subscripts (e.g., H_{2}O, CO_{2}, C_{6}H_{12}O_{6}, H_{2}SO_{4}). Write chemical ions and charges with superscripts (e.g., Na^{+}, Ca^{2+}, Cl^{-}, SO_{4}^{2-}). Represent state symbols neatly in parentheses/subscripts (e.g., (aq), (s), (g), (l)). Write reaction paths with correct arrows (e.g., →, ⇌, \\rightleftharpoons, or \\rightarrow).

7. NIGERIAN TEXTBOOKS AND INTERNET REFERENCES (MANDATORY):
   - For "instructionalMaterials", you MUST ALWAYS include relevant physical and digital materials, specifically incorporating "Internet and web research resources via internet-connected devices (laptops, smartphones, or tablets with internet access)".
   - For "referenceMaterials", you MUST ALWAYS list 1 to 3 actual, standard, widely recognized Nigerian textbooks that are directly related to ${subject} and suitable for ${classLevel}. You are STRICTLY FORBIDDEN from putting blank placeholders. Instead, list real Nigerian textbooks like "New General Mathematics for SSS" (by Channon et al.), "Essential Physics for SSS", "Modern Biology for Senior Secondary Schools" (by Sarojini T. Ramalingam), "Practical English Grammar for Nigerian Schools", "Macmillan Champion Primary English/Maths", "NERDC National Curriculum Outline", etc., depending on the content, along with active Nigerian educational internet links (e.g., "https://www.nerdc.org.ng", "https://portal.education.gov.ng", etc.) or specific online web-reference sources for ${topic}.

Please deliver the response in a JSON object conforming to this exact schema structure:
{
  "schoolInformation": "School Name and general detail of term and educational level context",
  "subject": "${subject}",
  "classLevel": "${classLevel}",
  "term": "${term}",
  "week": "Week ${week || 1}",
  "date": "${date || "N/A"}",
  "topic": "${topic}",
  "subTopic": "${subTopic || topic}",
  "duration": "${duration || "40 Minutes"}",
  "behaviouralObjectives": ["Clear student-focused operational/behavioural objective 1", "objective 2"],
  "instructionalMaterials": ["relevant instructional material 1", "material 2"],
  "referenceMaterials": ["Author/Title of standard textbook, curriculum reference 1", "reference 2"],
  "entryBehaviour": "string description",
  "previousKnowledge": "string description of what the students/pupils already know related to this topic",
  "introduction": "string description of the set induction / lesson introduction script (using Arabic numerals, no asterisks)",
  "presentationSteps": [
    {
      "step": "Step 1",
      "teachersActivities": "detailed description of what actions the teacher performs during this step during lesson development (using Arabic numerals, no asterisks)",
      "learnersActivities": "detailed description of what pupils/students do during this step (using Arabic numerals, no asterisks)",
      "classDiscussion": "active class group discussions, prompts, or debate triggers for mutual dialogue in this step",
      "learningPoints": "core learning points or cognitive concept corresponding to this step"
    }
  ],
  "evaluation": "comprehensive classroom evaluations and assessments written as sequential numbered points (no asterisks)",
  "assignment": "homework questions or physical tasks assigned written as sequential numbered points (no asterisks)",
  "conclusion": "Final lesson summary recap and closing instructional remarks written as sequential numbered points (no asterisks)"
}

Rule: Create exactly 4 highly compact presentation steps (maximum 1 or 2 brief sentences per cell, keep descriptions very brief and highly structured). The evaluation and assignment sections must be written as short lists with clear spacing. If ${subject} requires calculations (Mathematics, Physics, Chemistry), include 2 or 3 quick solved examples.
Return only valid JSON. Do not write markdown tags outside the JSON representation.
`;

  // Schema declaration for robust JSON format
  const schema = {
    type: Type.OBJECT,
    properties: {
      schoolInformation: { type: Type.STRING },
      subject: { type: Type.STRING },
      classLevel: { type: Type.STRING },
      term: { type: Type.STRING },
      week: { type: Type.STRING },
      date: { type: Type.STRING },
      topic: { type: Type.STRING },
      subTopic: { type: Type.STRING },
      duration: { type: Type.STRING },
      behaviouralObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
      instructionalMaterials: { type: Type.ARRAY, items: { type: Type.STRING } },
      referenceMaterials: { type: Type.ARRAY, items: { type: Type.STRING } },
      entryBehaviour: { type: Type.STRING },
      previousKnowledge: { type: Type.STRING },
      introduction: { type: Type.STRING },
      presentationSteps: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            step: { type: Type.STRING },
            teachersActivities: { type: Type.STRING },
            studentsActivities: { type: Type.STRING },
            classDiscussion: { type: Type.STRING },
            learningPoints: { type: Type.STRING },
          },
          required: ["step", "teachersActivities", "studentsActivities", "classDiscussion", "learningPoints"],
        },
      },
      evaluation: { type: Type.STRING },
      assignment: { type: Type.STRING },
      conclusion: { type: Type.STRING },
    },
    required: [
      "schoolInformation",
      "subject",
      "classLevel",
      "term",
      "week",
      "date",
      "topic",
      "subTopic",
      "duration",
      "behaviouralObjectives",
      "instructionalMaterials",
      "referenceMaterials",
      "entryBehaviour",
      "previousKnowledge",
      "introduction",
      "presentationSteps",
      "evaluation",
      "assignment",
      "conclusion",
    ],
  };

  try {
    const rawResult = await callGemini(prompt, true, schema);
    if (!rawResult) throw new Error("Gemini returned empty results.");

    const parsedPlan = JSON.parse(rawResult.trim());
    const completeLessonPlanObject = {
      id: "plan_" + Math.random().toString(36).substring(2, 9),
      teacherId: teacherId || "usr_teacher",
      schoolName: schoolName || "Brain Academy",
      teacherName: teacherName || "Educator",
      classLevel,
      subject,
      topic,
      subTopic: subTopic || topic,
      week: week ? Number(week) : 1,
      date: date || new Date().toISOString().split("T")[0],
      duration: duration || "40 Minutes",
      ageOfPupils: ageOfPupils || "12 Years",
      numberOfPupils: numberOfPupils || "30 Pupils",
      plan: parsedPlan,
      createdAt: new Date().toISOString(),
    };

    db.lessonPlans.push(completeLessonPlanObject);

    // Save automatically to the logged-in user's personal documents portal
    const docId = "doc_" + Math.random().toString(36).substring(2, 9);
    const newDoc = {
      id: docId,
      userId: teacherId || "usr_teacher",
      title: `Lesson Plan: ${topic}`,
      content: completeLessonPlanObject,
      category: "Lesson Plans",
      subject: subject,
      classLevel: classLevel,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "active"
    };
    if (!db.documents) db.documents = [];
    db.documents.push(newDoc);

    // Deduct fee and save transaction if creator is specified
    if (teacher) {
      teacher.walletBalance = Math.max(0, teacher.walletBalance - 50);
      db.transactions.push({
        id: "tx_" + Math.random().toString(36).substring(2, 9),
        userId: teacher.id,
        userName: teacher.name,
        amount: 50,
        type: "debit",
        purpose: `AI Lesson Plan: ${topic}`,
        date: new Date().toISOString()
      });
    }

    saveDatabase();

    res.json({ success: true, lessonPlan: completeLessonPlanObject, walletBalance: teacher ? teacher.walletBalance : undefined });
  } catch (error: any) {
    console.error("Lesson Plan generation failed:", error);
    res.status(500).json({ error: error.message || "Failed to generate lesson plan." });
  }
});

// --- AI LESSON NOTE GENERATOR ---
app.post("/api/ai/lesson-note", async (req, res) => {
  const { subject, classLevel, topic, subTopic, periods, difficulty, teacherId, week, date } = req.body;

  if (!subject || !classLevel || !topic) {
    return res.status(400).json({ error: "Subject, class level, and topic are required." });
  }

  const isCalcSubj = /math|physic|chemist|algebra|geometry|arithmetic|calculus|equation/i.test(subject);

  let examplesRequirement = "";
  let examplesHint = "";
  if (isCalcSubj) {
    examplesRequirement = `
1. QUANTITY & FOCUS OF EXAMPLES (At least 3-4):
   Since ${subject} is a calculation-heavy or formula-based science subject, you MUST include 3 to 4 detailed step-by-step solved calculation or formula-solving examples. Organization must be step-by-step with formulas and parameters.
`;
    examplesHint = "Detailed math or formula solved practical example with step-by-step mathematical workout lines";
  } else {
    examplesRequirement = `
1. RELEVANT ILLUSTRATIVE EXAMPLES (At least 3-4):
   CRITICAL: Since ${subject} is NOT a scientific or mathematical calculation subject, you are STRICTLY FORBIDDEN from including calculations below this note. Do NOT include formulas, variables, solving equations, maths, or calculations. Instead, provide 3 to 4 illustrative prose examples, real-life practical case studies, writing samples (for Language/English), or contextual scenarios relevant to the topic of ${topic}.
`;
    examplesHint = `High-quality illustrative prose point, case study scenario, sentence example, or essay/reading sample relevant to ${topic}`;
  }

  const old_unused_str = `
Generate a highly detailed, professionally structured lesson note documentation for:
Subject: ${subject}
Class: ${classLevel} (Use the standard Nigerian school levels: Nursery, Primary 1-6, JSS 1-3, SSS 1-3)
Topic: ${topic}
Sub-topic: ${subTopic || topic}
Week of Term: Week ${week || "1"}
Date: ${date || "N/A"}
Periods: ${periods || "2 Periods"}
Difficulty Level: ${difficulty || "Medium"}

CURRICULUM AND NATIONAL ALIGNMENT REQUIREMENTS (NIGERIAN SYSTEM):
1. NIGERIAN CURRICULUM & SCHEME OF WORK:
   - Align this note strictly with the Nigerian National Educational Research and Development Council (NERDC) national curriculum and standard school schemes of work.
   - For SSS levels, structure topics to prepare students for the West African Senior School Certificate Examination (WASSCE) by WAEC, National Examinations Council (NECO), and JAMB UTME.
   - For JSS levels, align to the Basic Education Certificate Examination (BECE) / Junior WAEC standards.
   - For Primary levels, align with the National Common Entrance Examination (NCEE) and primary educational benchmarks.
   - For Nursery/Pre-Primary levels, use highly interactive, foundational, and standard early childhood schemes.
2. NIGERIAN TERMINOLOGY & CONTEXT:
   - Use standard Nigerian terminology, grading contexts, and local teaching methodologies suitable for classrooms in Nigeria.
   - Incorporate culturally familiar, relevant, and engaging local examples, names (e.g., Emeka, Chinyere, Amina, Sade, Chidi, Babajide), locations (e.g., Lagos, Abuja, Port Harcourt, Kano, Ibadan, Enugu), national historical events, local flora/fauna, industries, and business contexts.
   - Use Nigerian legal and economic framework references (e.g., Nigerian Naira ₦ and Kobo as local currency, Central Bank of Nigeria, etc.) where appropriate.

DETAILED NOTE ARCHITECTURE (NO SINGLE-PAGE RESTRICTION & STRICT FORMATTING LIMITS):
1. DEPTH & COMPLETENESS:
   - The lesson note MUST NOT be truncated or artificially simplified to fit a single page. It should be comprehensive, thorough, and highly detailed, reflecting the pedagogical depth needed for effective classroom teaching and study guides.
   - Deliver rich, multi-paragraph content inside the "detailedNote" field divided into logical subheaders, complete explanations, and definitions, matching the required grade level perfectly.
2. STRICT FORMATTING & OUTLINE CONSTRAINTS:
   - YOU MUST NOT USE ASTERISKS (*) or DOUBLE ASTERISKS (**) anywhere in the generated output (e.g., no *bold*, no **bold** tag marks, and no * bullet items).
   - YOU MUST NOT USE HASHTAGS OR SIGNS LIKE "###" or "##" or "#" for headings anywhere. Instead, use headers labeled and structured with plain, sequential Arabic numerals (e.g., "1. INTRODUCTION", "2. HISTORICAL BACKGROUND", "3. CORE ELEMENTS", "4. CASE STUDY").
   - USE SIMPLE SEQUENTIAL ARABIC NUMERALS (1, 2, 3, 4, 5, etc.) for all sections, headings, lists, outlines, and items. YOU ARE STRICTLY FORBIDDEN from using sub-level or decimal-point numbering (like 1.1, 1.2, 2.1, 2.1.1, etc.). Simply increment the major numbers 1, 2, 3... sequentially for everything.
   - YOU MUST NOT USE UNNECESSARY UNSTRUCTURED MARKDOWN TABLES (specifically avoiding pipe tables like "| :--- | :--- | :--- | :--- |"). If you need to present comparisons or structured rows/columns, organize them as clearly aligned numbered paragraphs or indented lists of differences using standard sequential numbers.
3. MATH & SCIENTIFIC WORKOUTS (Only if appropriate):
${examplesRequirement}

4. SUPERSCRIPTS AND SUBSCRIPTS:
   Use proper mathematical formatting. For superscripts, always use the format x^{2} or x^{y} (using curly braces around the exponent). For subscripts, always use x_{1} or H_{2}O (using curly braces around the index).

5. HORIZONTAL FRACTION FORMATTING (No slanted slashes):
   You are STRICTLY FORBIDDEN from writing mathematical fractions using a slanted slash (e.g. do NOT write 3/4, a/b, or 1/2). Instead, fractions MUST display in a proper horizontal mathematical format using standard LaTeX math fraction structure: \\frac{numerator}{denominator} (e.g. \\frac{3}{4} or \\frac{a}{b}).

6. SPECIAL NOTATIONS & GRAMMAR PHONETICS:
   - ENGLISH/IPA: Use accurate Unicode quote symbols (“...”, ‘...’) and International Phonetic Alphabet (IPA) characters inside slant frames /.../.
   - PHYSICS/CHEMISTRY: Use correct Greek letter notations (θ, λ, μ, ρ, Ω, Δ) and correct chemical formulas (CO_{2}, Na^{+}, SO_{4}^{2-}).

  `;
  const term = req.body.term || db.schoolConfig?.term || "First Term";

  const prompt = `
Generate a highly detailed, professionally structured lesson note documentation for:
Subject: ${subject}
Class: ${classLevel} (Use the standard Nigerian school levels: Nursery, Primary 1-6, JSS 1-3, SSS 1-3)
Topic: ${topic}
Sub-topic: ${subTopic || topic}
Term: ${term}
Week of Term: Week ${week || "1"}
Date: ${date || "N/A"}
Periods: ${periods || "2 Periods"}
Difficulty Level: ${difficulty || "Medium"}

CURRICULUM AND NATIONAL ALIGNMENT REQUIREMENTS (NIGERIAN SYSTEM):
1. NIGERIAN CURRICULUM & SCHEME OF WORK:
   - Align this note strictly with the Nigerian National Educational Research and Development Council (NERDC) national curriculum and standard school schemes of work.
   - For SSS levels, structure topics to prepare students for the West African Senior School Certificate Examination (WASSCE) by WAEC, National Examinations Council (NECO), and JAMB UTME.
   - For JSS levels, align to the Basic Education Certificate Examination (BECE) / Junior WAEC standards.
   - For Primary levels, align with the National Common Entrance Examination (NCEE) and primary educational benchmarks.
   - For Nursery/Pre-Primary levels, use highly interactive, foundational, and standard early childhood schemes.
2. NIGERIAN TERMINOLOGY & CONTEXT:
   - Use standard Nigerian terminology, grading contexts, and local teaching methodologies suitable for classrooms in Nigeria.
   - Incorporate culturally familiar, relevant, and engaging local examples, names (e.g., Emeka, Chinyere, Amina, Sade, Chidi, Babajide), locations (e.g., Lagos, Abuja, Port Harcourt, Kano, Ibadan, Enugu), national historical events, local flora/fauna, industries, and business contexts.
   - Use Nigerian legal and economic framework references (e.g., Nigerian Naira ₦ and Kobo as local currency, Central Bank of Nigeria, etc.) where appropriate.
3. NIGERIAN TEXTBOOKS & INTERNET REFERENCES:
   - For "instructionalMaterials", you MUST ALWAYS include relevant physical/visual teaching aids as well as "Internet-connected devices (laptops, tablets, or smartphones for active search of web resources and digital curriculum portals)".
   - For "referenceMaterials", you MUST list 1 to 3 actual, widely recognized Nigerian textbooks that intensely relate to ${subject} and are highly relevant to ${classLevel} (e.g., "New General Mathematics for Senior Secondary Schools", "Essential Physics for SSS", "Modern Biology for SSS" by Sarojini T. Ramalingam, "Intensive English for Secondary Schools", "Macmillan Champion Primary English/Mathematics", etc., depending on the content) alongside direct curriculum links (e.g., "https://www.nerdc.org.ng" or specific online/internet educational resources). You are STRICTLY FORBIDDEN from putting blank placeholders. Always write real titles and active website reference URLs relevant to ${topic}.

DETAILED NOTE ARCHITECTURE (NO SINGLE-PAGE RESTRICTION & STRICT FORMATTING LIMITS):
1. DEPTH & COMPLETENESS:
   - The lesson note MUST NOT be truncated or artificially simplified to fit a single page. It should be comprehensive, thorough, and highly detailed, reflecting the pedagogical depth needed for effective classroom teaching and study guides.
   - Deliver rich, multi-paragraph content inside the "detailedNote" field divided into logical subheaders, complete explanations, and definitions, matching the required grade level perfectly.
2. STRICT FORMATTING & OUTLINE CONSTRAINTS:
   - YOU MUST NOT USE ASTERISKS (*) or DOUBLE ASTERISKS (**) anywhere in the generated output (e.g., no *bold*, no **bold** tag marks, and no * bullet items).
   - YOU MUST NOT USE HASHTAGS OR SIGNS LIKE "###" or "##" or "#" for headings anywhere. Instead, use headers labeled and structured with plain, sequential Arabic numerals (e.g., "1. INTRODUCTION", "2. HISTORICAL BACKGROUND", "3. CORE ELEMENTS", "4. CASE STUDY").
   - USE SIMPLE SEQUENTIAL ARABIC NUMERALS (1, 2, 3, 4, 5, etc.) for all sections, headings, lists, outlines, and items. YOU ARE STRICTLY FORBIDDEN from using sub-level or decimal-point numbering (like 1.1, 1.2, 2.1, 2.1.1, etc.). Simply increment the major numbers 1, 2, 3... sequentially for everything.
   - YOU MUST NOT USE UNNECESSARY UNSTRUCTURED MARKDOWN TABLES (specifically avoiding pipe tables like "| :--- | :--- | :--- | :--- |"). If you need to present comparisons or structured rows/columns, organize them as clearly aligned numbered paragraphs or indented lists of differences using standard sequential numbers.
3. MATH & SCIENTIFIC WORKOUTS (Only if appropriate):
${examplesRequirement}

4. SUPERSCRIPTS AND SUBSCRIPTS:
   Use proper mathematical formatting. For superscripts, always use the format x^{2} or x^{y} (using curly braces around the exponent). For subscripts, always use x_{1} or H_{2}O (using curly braces around the index).

5. HORIZONTAL FRACTION FORMATTING (No slanted slashes):
   You are STRICTLY FORBIDDEN from writing mathematical fractions using a slanted slash (e.g. do NOT write 3/4, a/b, or 1/2). Instead, fractions MUST display in a proper horizontal mathematical format using standard LaTeX math fraction structure: \\frac{numerator}{denominator} (e.g. \\frac{3}{4} or \\frac{a}{b}).

6. SPECIAL NOTATIONS & GRAMMAR PHONETICS:
   - ENGLISH/IPA: Use accurate Unicode quote symbols (“...”, ‘...’) and International Phonetic Alphabet (IPA) characters inside slant frames /.../.
   - PHYSICS/CHEMISTRY: Use correct Greek letter notations (θ, λ, μ, ρ, Ω, Δ) and correct chemical formulas (CO_{2}, Na^{+}, SO_{4}^{2-}).

Deliver the contents in a JSON schema structure:
{
  "schoolInformation": "School Name and general detail of term and educational level context",
  "subject": "${subject}",
  "classLevel": "${classLevel}",
  "term": "${term}",
  "week": "Week ${week || 1}",
  "date": "${date || "N/A"}",
  "topic": "${topic}",
  "subTopic": "${subTopic || topic}",
  "duration": "${periods || "2 Periods"}",
  "behaviouralObjectives": ["Clear student-focused operational/behavioural objective 1", "objective 2"],
  "instructionalMaterials": ["relevant instructional material 1", "material 2"],
  "referenceMaterials": ["Author/Title of standard textbook, curriculum reference 1", "reference 2"],
  "entryBehaviour": "string description",
  "previousKnowledge": "string description of what the students/pupils already know related to this topic",
  "introduction": "string description of presentation set induction / lesson introduction details",
  "detailedNote": "This is the main, highly-detailed Lesson Note Content. IT MUST NOT CONTAIN ANY asterisks (* or **), hashtags (### or ##), or Markdown pipe-and-colon tables (|---). Write in clean textbook-quality paragraphs with comprehensive definitions, background context, and clear comparisons organized strictly using simple sequential Arabic numerals (1., 2., 3., 4., etc.) for sections, lists, and outlines under the Nigerian curriculum. DO NOT use decimal/sub-level numbered outlines like 1.1 or 1.2; use only sequential whole numbers (1, 2, 3...) throughout.",
  "explanation": "Pedagogical hints and suggestions for the teacher on how to present this topic in a Nigerian classroom. (No asterisks, no markdown tables)",
  "presentationSteps": [
    {
      "step": "Step 1",
      "teachersActivities": "detailed description of what actions the teacher performs during this step during lesson development (using Arabic numerals, no asterisks)",
      "learnersActivities": "detailed description of what pupils/students do during this step (using Arabic numerals, no asterisks)",
      "classDiscussion": "active class group discussions, prompts, or debate triggers for mutual dialogue in this step",
      "learningPoints": "core learning points or cognitive concept corresponding to this step"
    }
  ],
  "examples": ["${examplesHint} (Provide 2-3 detailed and culturally/mathematically relevant examples. Do NOT use any asterisks, hashtags, or markdown tables here)"],
  "classActivities": ["2-3 interactive classroom active learning activities, discussion triggers, or question tasks to assess understanding during the lesson. Do NOT use asterisks, hashtags, or markdown tables here"],
  "evaluation": ["3-4 diagnostic assessment or past WAEC/NECO/JAMB past-question-style quiz questions to test student comprehension. Do NOT use asterisks, hashtags, or markdown tables here"],
  "assignment": "A highly detailed, comprehensive homework assignment, essay prompt, or physical project for further study. Do NOT use asterisks, hashtags, or markdown tables here.",
  "conclusion": "Key points recapping the ultimate takeaways of the lesson comprehensively, structured strictly with plain Arabic numerals. Do NOT use asterisks, hashtags, or markdown tables here."
}

Return ONLY valid JSON representation matching types. No surrounding backticks or commentary outside JSON.
`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      schoolInformation: { type: Type.STRING },
      subject: { type: Type.STRING },
      classLevel: { type: Type.STRING },
      term: { type: Type.STRING },
      week: { type: Type.STRING },
      date: { type: Type.STRING },
      topic: { type: Type.STRING },
      subTopic: { type: Type.STRING },
      duration: { type: Type.STRING },
      behaviouralObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
      instructionalMaterials: { type: Type.ARRAY, items: { type: Type.STRING } },
      referenceMaterials: { type: Type.ARRAY, items: { type: Type.STRING } },
      entryBehaviour: { type: Type.STRING },
      previousKnowledge: { type: Type.STRING },
      introduction: { type: Type.STRING },
      detailedNote: { type: Type.STRING },
      explanation: { type: Type.STRING },
      presentationSteps: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            step: { type: Type.STRING },
            teachersActivities: { type: Type.STRING },
            studentsActivities: { type: Type.STRING },
            classDiscussion: { type: Type.STRING },
            learningPoints: { type: Type.STRING },
          },
          required: ["step", "teachersActivities", "studentsActivities", "classDiscussion", "learningPoints"],
        },
      },
      examples: { type: Type.ARRAY, items: { type: Type.STRING } },
      classActivities: { type: Type.ARRAY, items: { type: Type.STRING } },
      evaluation: { type: Type.ARRAY, items: { type: Type.STRING } },
      assignment: { type: Type.STRING },
      conclusion: { type: Type.STRING },
    },
    required: [
      "schoolInformation",
      "subject",
      "classLevel",
      "term",
      "week",
      "date",
      "topic",
      "subTopic",
      "duration",
      "behaviouralObjectives",
      "instructionalMaterials",
      "referenceMaterials",
      "entryBehaviour",
      "previousKnowledge",
      "introduction",
      "detailedNote",
      "explanation",
      "presentationSteps",
      "examples",
      "classActivities",
      "evaluation",
      "assignment",
      "conclusion",
    ],
  };

  try {
    const rawResult = await callGemini(prompt, true, schema);
    if (!rawResult) throw new Error("Gemini returned empty results.");

    const parsedNote = JSON.parse(rawResult.trim());
    const completeLessonNoteObject = {
      id: "note_" + Math.random().toString(36).substring(2, 9),
      teacherId: teacherId || "usr_teacher",
      subject,
      classLevel,
      topic,
      subTopic: subTopic || topic,
      week: week ? Number(week) : 1,
      date: date || new Date().toISOString().split("T")[0],
      periods: periods || "2 Periods",
      difficulty: difficulty || "Medium",
      content: parsedNote,
      createdAt: new Date().toISOString(),
    };

    db.lessonNotes.push(completeLessonNoteObject);

    // Save automatically to the logged-in user's personal documents portal
    const docId = "doc_" + Math.random().toString(36).substring(2, 9);
    const newDoc = {
      id: docId,
      userId: teacherId || "usr_teacher",
      title: `Lesson Note: ${topic}`,
      content: completeLessonNoteObject,
      category: "Notes",
      subject: subject,
      classLevel: classLevel,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "active"
    };
    if (!db.documents) db.documents = [];
    db.documents.push(newDoc);

    saveDatabase();

    res.json({ success: true, lessonNote: completeLessonNoteObject });
  } catch (error: any) {
    console.error("Lesson Notes generation failed:", error);
    res.status(500).json({ error: error.message || "Failed to generate lesson notes." });
  }
});

// --- AI QUESTION GENERATOR ---
app.post("/api/ai/generate-questions", async (req, res) => {
  const { subject, topic, classLevel, count, difficulty, noteContent } = req.body;

  if (!subject || !topic || !classLevel) {
    return res.status(400).json({ error: "Subject, topic, and class level are required." });
  }

  const numQuestions = Math.min(Math.max(Number(count) || 5, 1), 50);
  const isAllTopics = topic.trim().toLowerCase() === "all topics" || 
                       topic.trim().toLowerCase() === "all" || 
                       topic.trim().toLowerCase() === "all_topics" ||
                       topic.trim().toLowerCase() === "all the topics" ||
                       topic.trim().toLowerCase() === "any";

  const prompt = `
Generate exactly ${numQuestions} objective multiple choice questions for an educational test of high academic standard.
Subject: ${subject}
Requested Topic State: ${isAllTopics ? "All topics across the dynamic syllabus (Comprehensive exam)" : `Strictly single topic: "${topic}"`}
Class: ${classLevel}
Difficulty Level: ${difficulty || "Medium"}

${noteContent ? `CONTEXT FROM GENERATED LESSON NOTE:
-----
${noteContent}
-----
IMPORTANT REQUIREMENT: The questions MUST be strictly based on and derived from the content in the lesson note provided above.` : ""}

Core Framework Requirements:
1. CURRICULUM & DATABASE SOURCE (myschool.com style WASSCE, NECO, JAMB):
   The questions must mimic official past examination questions on WASSCE, NECO, and JAMB typical of the databases kept on myschool.com. Ensure they are highly realistic, academic, rigorously structured, and reflect the syllabus, standard context, and nomenclature of these examination boards. Prefix some questions option layouts or text with exam tags if relevant, or simply reflect their exact test patterns.

2. MIX OF QUESTION TYPES (No excessive 'WH' questions):
   The questions must NOT be exclusively 'WH' questions (e.g., starting only with "What", "Which", "Why", "When"). Instead, build a balanced, realistic syllabus partition of multiple-choice formats:
   - Direct WH inquiry (e.g., "Which of the following organic compounds represents...")
   - Sentence / statement completion (e.g., "An oxide which dissolves in water to form an alkaline solution is ________.")
   - Direct numerical calculation or algebraic problem-solving (e.g., "A car travels 50m in... Calculate...")
   - Practical diagnostics, definitions, or scenario logic.

3. DYNAMIC SYLLABUS DISCOVERY ("all topics" vs "particular topic"):
   - If the selected scope topic state above indicates "All topics", generate questions that are distributed across a broad cross-section of different modules/topics of the entire standard syllabus for the subject "${subject}" (e.g., if Chemistry, cover atoms/elements/bonding, stoichiometry, gas laws, electrolysis, organic chemistry, non-metals, physical, etc.). Do NOT restrict to a single concept.
   - If the selected scope topic state is a specific topic, all questions must focus strictly on "${topic}" and its direct sub-topics.

4. PHONETIC SYMBOLS FOR ENGLISH LANGUAGE:
   If the subject is "English Language", you MUST include questions testing English phonetic symbols, vowel/consonant sound matching, diphthongs, stress patterns, or rhyming words. Wrap all phonetic symbols in standard IPA brackets /.../ (e.g., vowels: /æ/, /ɑː/, /ɔː/, /ʊ/, /uː/, /ʌ/, /ɜː/, /ə/, /iː/, /ɪ/; diphthongs: /eɪ/, /aɪ/, /ɔɪ/, /əʊ/, /aʊ/, /ɪə/, /eə/, /ʊə/; consonants: /ʃ/, /ʒ/, /tʃ/, /dʒ/, /θ/, /ð/, /ŋ/). Ensure standard IPA representations are clearly and correctly formulated (e.g., "Which of the following words contains the vowel sound represented by the phonetic symbol /æ/?").

5. MATHEMATICAL SYMBOLS, SHAPES, & FORMATTING:
   If the subject is "Mathematics", "Physics", or any quantitative science, you MUST use appropriate math symbols in the questions and options (e.g., ±, ∑, √, ∛, ∝, ∞, ∠, ⊥, ∥, ∩, ∪, ∫, ≈, ≡, ≠, ≤, ≥, °, π, ÷, ×, −, +, =, etc.). Furthermore, you MUST include questions that test mathematical shapes (e.g., triangles, cylinders, cones, spheres, trapeziums, rhombuses, parallelograms, polygons, segments, etc.), calculating their areas, volumes, perimeters, angles, theorems, or coordinate geometries in an academic past-question style.
   - For superscripts, always write x^{2}, x^{y}, or similar (with curly braces around exponent).
   - For subscripts, always write x_{1}, H_{2}O, or similar (with curly braces around index).
   - You are STRICTLY FORBIDDEN from writing fractions with slanted slashes (e.g. do NOT write 1/2 or 3/4). Write molecular or math fractions using standard horizontal LaTeX math fraction structures: \frac{numerator}{denominator} (e.g. \frac{3}{4} or \frac{a}{b}). Ensure this rule is followed in both the question text and all option choices A, B, C, D.
   - Anytime solution steps are requested or calculations are provided, organize them step-by-step with each step on its own clear physical line using standard newlines \n. Avoid messy, squished text.
   - You are STRICTLY FORBIDDEN from using "C.C.", "c.c.", or "cc" for volume or any other quantity. Instead, fully spell out the term, using "cm^{3}" (cubic centimeters) or "mL" or "milliliters" explicitly. Every calculation formula, step, constant, and unit must be extremely clear and easily readable by students, leaving absolutely no room for confusion. Do not append any weird characters or trailing strings.

6. ENGLISH GRAMMAR, LIT & PUNCTUATION/LITERATURE symbols:
   Use elegant typographic punctuation and aids: curly quote pairs (“...”, ‘...’), em-dash (—), en-dash (–), ellipses (…), standard word accents (é, è, á, ô), and brackets [ ] for phrases or grammatical clause representations.

7. PHYSICS & CHEMISTRY SIGNS, CONSTANTS, AND CHEMICAL NOTATIONS:
   - For Physics, use correct Greek variables and operations (e.g., θ for angle, λ for wavelength, μ for coefficient of friction, ρ for density, Ω for electrical resistance, ω for angular velocity, Δ for change, etc.) alongside standardized physical units (e.g., m/s^{2}, kg·m/s, N·m, J/kg·K).
   - For Chemistry, formulate compounds beautifully using subscript notation (e.g. H_{2}O, CO_{2}, C_{6}H_{12}O_{6}, H_{2}SO_{4}) and ionic charges with superscript notation (e.g. Na^{+}, Ca^{2+}, Cl^{-}, SO_{4}^{2-}). State symbols should be neatly wrapped in parentheses (e.g. (aq), (s), (g), (l)) and reaction paths should always utilize proper arrow characters (e.g., →, ⇌, \rightleftharpoons, or \rightarrow).

Deliver the response in a JSON schema representing a list of questions:
{
  "questions": [
    {
      "question": "The actual objective inquiry question text supporting the symbols, shapes, completions, or formulas...",
      "optionA": "Detailed option content",
      "optionB": "Detailed option content",
      "optionC": "Detailed option content",
      "optionD": "Detailed option content",
      "correctAnswer": "A",
      "subject": "${subject}",
      "topic": "The specific syllabus topic the question is derived from",
      "marks": 5
    }
  ]
}

Rules:
- The correctAnswer must be exactly one uppercase letter: "A", "B", "C", or "D"
- Return ONLY valid JSON.
`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            optionA: { type: Type.STRING },
            optionB: { type: Type.STRING },
            optionC: { type: Type.STRING },
            optionD: { type: Type.STRING },
            correctAnswer: { type: Type.STRING, description: "Must be exactly one letter: A, B, C, or D" },
            subject: { type: Type.STRING },
            topic: { type: Type.STRING },
            marks: { type: Type.INTEGER },
          },
          required: ["question", "optionA", "optionB", "optionC", "optionD", "correctAnswer", "subject", "topic", "marks"],
        },
      },
    },
    required: ["questions"],
  };

  try {
    const rawResult = await callGemini(prompt, true, schema);
    if (!rawResult) throw new Error("Gemini returned empty results.");

    const parsedResult = JSON.parse(rawResult.trim());
    const questionsList = parsedResult.questions || [];

    // Save automatically to the logged-in user's personal documents portal if authenticated
    const authUser = getAuthenticatedUser(req);
    if (authUser) {
      const docId = "doc_" + Math.random().toString(36).substring(2, 9);
      const newDoc = {
        id: docId,
        userId: authUser.id,
        title: `Question Pool: ${topic}`,
        content: { questions: questionsList },
        category: "Question Pools",
        subject: subject,
        classLevel: classLevel,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active"
      };
      if (!db.documents) db.documents = [];
      db.documents.push(newDoc);
      saveDatabase();
    }

    res.json({ success: true, questions: questionsList });
  } catch (error: any) {
    console.error("AI question generation failed:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI questions." });
  }
});

// --- CBT EXAMS SYSTEM ---
app.get("/api/exams", (req, res) => {
  // Prune published exams older than 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let changed = false;
  
  db.exams = db.exams.filter((ex) => {
    if (ex.isPublished) {
      const createdTime = ex.createdAt ? new Date(ex.createdAt).getTime() : Date.now();
      if (createdTime < thirtyDaysAgo) {
        changed = true;
        // Clean up matching results
        db.results = db.results.filter((r) => r.examId !== ex.id);
        return false;
      }
    }
    return true;
  });

  if (changed) {
    saveDatabase();
  }

  res.json({ exams: db.exams });
});

app.post("/api/exams", (req, res) => {
  const { title, subject, level, duration, totalMarks, instructions, questions, creatorId, creatorName } = req.body;

  if (!title || !subject || !level || !duration || !questions || questions.length === 0) {
    return res.status(400).json({ error: "Required exam configurations are missing." });
  }

  const newExam = {
    id: "exam_" + Math.random().toString(36).substring(2, 9),
    title,
    subject,
    level,
    duration: Number(duration),
    totalMarks: Number(totalMarks) || (questions.length * 5),
    instructions: instructions || "Read questions carefully before responding.",
    questions: questions.map((q: any) => ({
      ...q,
      marks: Number(q.marks) || 5,
    })),
    creatorId: creatorId || "usr_teacher",
    creatorName: creatorName || "Educator",
    examLink: "", // Generated upon publishing
    isPublished: false,
    createdAt: new Date().toISOString(),
  };

  db.exams.push(newExam);
  saveDatabase();

  res.json({ success: true, exam: newExam });
});

app.post("/api/exams/:id/publish", (req, res) => {
  const examId = req.params.id;
  const { teacherId } = req.body;

  const exam = db.exams.find((e) => e.id === examId);
  if (!exam) {
    return res.status(404).json({ error: "Exam not found." });
  }

  if (exam.isPublished) {
    return res.json({ success: true, message: "Exam is already published.", exam });
  }

  let teacher = db.users.find((u) => u.id === teacherId);
  if (!teacher && (teacherId === "usr_guest_admin" || teacherId === "usr_nwaigbo_admin" || teacherId === "usr_teacher")) {
    // Elegant fallback finding any administrator/owner or educator account with funds
    teacher = db.users.find((u) => u.id === "usr_guest_admin" || u.id === "usr_nwaigbo_admin" || u.id === "usr_teacher" || u.email === "nwaigboaugust@gmail.com");
  }

  if (!teacher) {
    return res.status(404).json({ error: "Teacher/Educator account not found." });
  }

  const CHARGE = 50; // Required ₦50 publishing charge
  if (teacher.walletBalance < CHARGE) {
    return res.status(400).json({ error: `Insufficient wallet balance! Publishing an exam costs ₦${CHARGE}. Your current balance is ₦${teacher.walletBalance}. Please fund your wallet.` });
  }

  // Deduct fee & register transaction
  teacher.walletBalance -= CHARGE;
  db.transactions.push({
    id: "tx_" + Math.random().toString(36).substring(2, 9),
    userId: teacher.id,
    userName: teacher.name,
    amount: CHARGE,
    type: "debit",
    purpose: `CBT Exam Publishing: ${exam.title}`,
    date: new Date().toISOString(),
  });

  // Assign published states and generate student join link
  const appUrl = process.env.APP_URL || "https://ais-dev-ztyvz4czqqphjogv3uekw5-210258902427.europe-west1.run.app";
  exam.isPublished = true;
  exam.examLink = `${appUrl}/?examId=${exam.id}`;

  saveDatabase();

  res.json({ success: true, message: `Exam successfully published! ₦${CHARGE} debited from wallet.`, exam });
});

app.post("/api/exams/:id/unpublish", (req, res) => {
  const examId = req.params.id;
  const exam = db.exams.find((e) => e.id === examId);
  if (!exam) {
    return res.status(404).json({ error: "Exam not found." });
  }

  exam.isPublished = false;
  exam.examLink = "";
  saveDatabase();

  res.json({ success: true, message: "Exam successfully drafted/unpublished.", exam });
});

app.get("/api/exams/:id", (req, res) => {
  const exam = db.exams.find((e) => e.id === req.params.id);
  if (!exam) {
    return res.status(404).json({ error: "Exam not found" });
  }

  if (exam.isPublished) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const createdTime = exam.createdAt ? new Date(exam.createdAt).getTime() : Date.now();
    if (createdTime < thirtyDaysAgo) {
      // Automatic removal of expired exam
      db.exams = db.exams.filter((e) => e.id !== exam.id);
      db.results = db.results.filter((r) => r.examId !== exam.id);
      saveDatabase();
      return res.status(410).json({ error: "This exam has expired (reached the 30-day limit) and has been automatically deleted." });
    }
  }

  res.json({ exam });
});

app.delete("/api/exams/:id", (req, res) => {
  const examId = req.params.id;
  const examIndex = db.exams.findIndex((e) => e.id === examId);
  if (examIndex === -1) {
    return res.status(404).json({ error: "Exam not found." });
  }

  // Permitted to delete
  db.exams.splice(examIndex, 1);
  
  // Clean up any corresponding results for this exam if necessary (or keep them - though deleting makes it no longer usable)
  db.results = db.results.filter((resObj) => resObj.examId !== examId);

  saveDatabase();
  res.json({ success: true, message: "Exam and any associated candidate attempts successfully deleted." });
});

// --- SUBMIT EXAM RESULTS ---
app.post("/api/exams/:id/submit", (req, res) => {
  const examId = req.params.id;
  const { studentId, studentName, answers, timeSpent } = req.body; // answers is an object mapping question indices to selected answer Option: { 0: 'A', 1: 'C' }

  const exam = db.exams.find((e) => e.id === examId);
  if (!exam) {
    return res.status(404).json({ error: "Exam file not found." });
  }

  let correctCount = 0;
  const failedReviews: any[] = [];
  let calculatedScore = 0;

  exam.questions.forEach((q: any, index: number) => {
    const selected = answers[index] || null;
    const isCorrect = selected === q.correctAnswer;
    if (isCorrect) {
      correctCount++;
      calculatedScore += q.marks;
    }
    
    failedReviews.push({
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      selectedAnswer: selected,
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation || `The correct answer is Option ${q.correctAnswer}. This completes the core requirements of this concept in ${q.subject || 'this subject'}.`,
      topic: q.topic || 'General Topic',
    });
  });

  const percentage = Math.round((correctCount / exam.questions.length) * 100);

  const newResult = {
    id: "res_" + Math.random().toString(36).substring(2, 9),
    examId,
    examTitle: exam.title,
    subject: exam.subject,
    studentId: studentId || "usr_student",
    studentName: studentName || "Anonymous Student",
    score: calculatedScore,
    percentage,
    totalQuestions: exam.questions.length,
    correctAnswers: correctCount,
    failedQuestions: failedReviews,
    date: new Date().toISOString(),
    timeSpent: timeSpent || 0,
  };

  db.results.push(newResult);
  saveDatabase();

  // Notify student & teacher
  db.notifications.push({
    id: "notif_" + Math.random().toString(36).substring(2, 9),
    userId: studentId || "usr_student",
    title: "Exam Completed",
    message: `You scored ${percentage}% (${calculatedScore}/${exam.questions.length * 5} marks) in ${exam.title}.`,
    read: false,
    date: new Date().toISOString(),
  });

  db.notifications.push({
    id: "notif_" + Math.random().toString(36).substring(2, 9),
    userId: exam.creatorId,
    title: "New Exam Submission",
    message: `${studentName || "A student"} completed ${exam.title} with score ${percentage}%.`,
    read: false,
    date: new Date().toISOString(),
  });

  res.json({ success: true, result: newResult });
});

// --- RESULTS & ANALYTICS ---
app.get("/api/results", (req, res) => {
  res.json({ results: db.results });
});

app.get("/api/results/student/:studentId", (req, res) => {
  const list = db.results.filter((r) => r.studentId === req.params.studentId);
  res.json({ results: list });
});

app.get("/api/results/exam/:examId", (req, res) => {
  const list = db.results.filter((r) => r.examId === req.params.examId);
  res.json({ results: list });
});

// --- WALLET & PAYSTACK INTEGRATION DIALOG SIMULATION ---
app.post("/api/wallet/fund", (req, res) => {
  const { userId, amount, isSimulation, paystackReference } = req.body;
  if (!userId || !amount) {
    return res.status(400).json({ error: "Missing parameter fields." });
  }

  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const fundAmount = Number(amount);
  user.walletBalance = Number(user.walletBalance || 0) + fundAmount;

  const transaction = {
    id: "tx_" + Math.random().toString(36).substring(2, 9),
    userId,
    userName: user.name,
    amount: fundAmount,
    type: "credit" as const,
    purpose: isSimulation ? `Simulated Sandbox Funding` : (paystackReference || `OPay Direct Deposit Approved`),
    date: new Date().toISOString(),
  };

  db.transactions.push(transaction);

  db.notifications.push({
    id: "notif_" + Math.random().toString(36).substring(2, 9),
    userId,
    title: "Wallet Funded",
    message: `Your wallet was successfully credited with ₦${fundAmount.toLocaleString()}`,
    read: false,
    date: new Date().toISOString(),
  });

  saveDatabase();
  res.json({ success: true, walletBalance: user.walletBalance, transaction });
});

app.get("/api/transactions/user/:userId", (req, res) => {
  const list = db.transactions.filter((t) => t.userId === req.params.userId);
  res.json({ transactions: list });
});

// --- ADMIN PANEL API ENDPOINTS ---
app.get("/api/admin/stats", (req, res) => {
  const teacherCount = db.users.filter((u) => u && u.role === "teacher").length;
  const studentCount = db.users.filter((u) => u && u.role === "student").length;
  const examCount = db.exams.length;
  const resultCount = db.results.length;
  const questionCount = db.exams.reduce((sum, e) => sum + (e.questions?.length || 0), 0);

  // Payments represent debit transactions where exams are published, plus simulated credits!
  const totalPayments = db.transactions
    .filter((tx) => tx.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0);

  res.json({
    stats: {
      teacherCount,
      studentCount,
      examCount,
      resultCount,
      questionCount,
      totalPayments,
    },
    users: db.users.filter(u => u).map((u) => ({ 
      id: u.id, 
      name: u.name, 
      email: u.email, 
      role: u.role, 
      isSuspended: !!u.isSuspended, 
      walletBalance: u.walletBalance, 
      createdAt: u.createdAt,
      regNumber: u.regNumber,
      classLevel: u.classLevel
    })),
    exams: db.exams.map((e) => ({ id: e.id, title: e.title, subject: e.subject, level: e.level, isPublished: e.isPublished, creatorName: e.creatorName, questionCount: e.questions.length, createdAt: e.createdAt })),
    transactions: db.transactions,
  });
});

app.post("/api/admin/users/:userId/suspend", (req, res) => {
  const { isSuspended } = req.body;
  const user = db.users.find((u) => u.id === req.params.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.isSuspended = !!isSuspended;
  saveDatabase();
  res.json({ success: true, message: `User account is now ${isSuspended ? "suspended" : "active"}.`, user });
});

// --- NOTIFICATIONS API ---
app.get("/api/notifications/user/:userId", (req, res) => {
  const list = db.notifications.filter((n) => n.userId === req.params.userId);
  res.json({ notifications: list });
});

app.post("/api/notifications/:id/read", (req, res) => {
  const notif = db.notifications.find((n) => n.id === req.params.id);
  if (notif) {
    notif.read = true;
    saveDatabase();
  }
  res.json({ success: true });
});

// --- LESSON PLAN/NOTE API FOR RETRIEVAL ---
app.get("/api/teachers/:teacherId/lesson-plans", (req, res) => {
  const plans = db.lessonPlans.filter((p) => p.teacherId === req.params.teacherId);
  res.json({ lessonPlans: plans });
});

app.get("/api/teachers/:teacherId/lesson-notes", (req, res) => {
  const notes = db.lessonNotes.filter((n) => n.teacherId === req.params.teacherId);
  res.json({ lessonNotes: notes });
});

// --- SCHOOL CONFIG & REPORT SHEETS API ---

app.get("/api/school-config", (req, res) => {
  res.json({ success: true, schoolConfig: db.schoolConfig });
});

app.post("/api/school-config", (req, res) => {
  const { schoolName, location, term, timesOpened, schoolLogo, schoolMotto } = req.body;
  db.schoolConfig = {
    schoolName: schoolName || "Brain International Academy",
    location: location || "Nigeria",
    term: term || "First Term",
    timesOpened: Number(timesOpened) || 120,
    schoolLogo: schoolLogo || "https://api.dicebear.com/7.x/identicon/svg?seed=wisdom",
    schoolMotto: schoolMotto || "wisdom, knowledge, and understanding"
  };
  saveDatabase();
  res.json({ success: true, schoolConfig: db.schoolConfig });
});

app.get("/api/report-sheets", (req, res) => {
  res.json({ success: true, reportSheets: db.reportSheets || [] });
});

app.post("/api/report-sheets", (req, res) => {
  const { id, studentId, studentName, classLevel, term, scores, studentAverage, classAverage, attendance, psychomotor, cognitive, teacherRemark, principalRemark } = req.body;

  if (!studentName || !classLevel) {
    return res.status(400).json({ error: "studentName and classLevel are required." });
  }

  const existingIndex = db.reportSheets.findIndex((r) => r.id === id || (r.studentName.trim().toLowerCase() === studentName.trim().toLowerCase() && r.classLevel === classLevel && r.term === term));

  const cleanReport = {
    id: id || "report_" + Math.random().toString(36).substring(2, 9),
    studentId: studentId || "std_" + Math.random().toString(36).substring(2, 9),
    studentName: studentName.trim(),
    classLevel,
    term: term || db.schoolConfig.term || "First Term",
    scores: scores || {},
    studentAverage: Number(studentAverage) || 0,
    classAverage: Number(classAverage) || 0,
    attendance: Number(attendance) || 0,
    psychomotor: psychomotor || { punctuality: 4, neatness: 4, honesty: 4, cooperation: 4, selfControl: 4 },
    cognitive: cognitive || { attentiveness: 4, participation: 4, comprehension: 4 },
    teacherRemark: teacherRemark || "",
    principalRemark: principalRemark || ""
  };

  if (existingIndex !== -1) {
    db.reportSheets[existingIndex] = { ...db.reportSheets[existingIndex], ...cleanReport };
  } else {
    db.reportSheets.push(cleanReport);
  }

  saveDatabase();
  // Recalculate statistics for this class level and term
  recalculateClassStatistics(classLevel, term || db.schoolConfig.term || "First Term");
  res.json({ success: true, reportSheet: cleanReport });
});

// Helper function to recalculate class statistics (grades, average, highest, lowest, position, etc.)
function recalculateClassStatistics(classLevel: string, term: string) {
  const classSheets = db.reportSheets.filter(
    (r) => r.classLevel === classLevel && r.term === term
  );

  if (classSheets.length === 0) return;

  // 1. Find all subjects present across all student reports in this class
  const subjectsPresent = new Set<string>();
  classSheets.forEach((sheet) => {
    if (sheet.scores) {
      Object.keys(sheet.scores).forEach((subj) => subjectsPresent.add(subj));
    }
  });

  // 2. Iterate each subject and compute highest, lowest, classAverage, positions
  subjectsPresent.forEach((subj) => {
    const studentScoresOnSubject = classSheets
      .map((s) => s.scores[subj]?.total)
      .filter((v) => v !== undefined && v !== null);

    const highest = studentScoresOnSubject.length > 0 ? Math.max(...studentScoresOnSubject) : 0;
    const lowest = studentScoresOnSubject.length > 0 ? Math.min(...studentScoresOnSubject) : 0;
    const sum = studentScoresOnSubject.reduce((a, b) => a + b, 0);
    const classAvg = studentScoresOnSubject.length > 0 ? Math.round((sum / studentScoresOnSubject.length) * 10) / 10 : 0;

    // Recalculate ranks for this subject
    const sortedForThisSubj = [...classSheets]
      .map((s) => ({ id: s.id, score: s.scores[subj]?.total || 0 }))
      .sort((a, b) => b.score - a.score);

    classSheets.forEach((sheet) => {
      if (sheet.scores[subj]) {
        sheet.scores[subj].highestInClass = highest;
        sheet.scores[subj].lowestInClass = lowest;
        sheet.scores[subj].classAverage = classAvg;

        const rank = sortedForThisSubj.findIndex((item) => item.id === sheet.id) + 1;
        sheet.scores[subj].position = rank;
      }
    });
  });

  // 3. Recalculate student averages
  classSheets.forEach((sheet) => {
    const scoreVals = Object.values(sheet.scores || {}) as any[];
    if (scoreVals.length > 0) {
      const totalSum = scoreVals.reduce((acc, item) => acc + (item.total || 0), 0);
      sheet.studentAverage = Math.round((totalSum / scoreVals.length) * 10) / 10;
    } else {
      sheet.studentAverage = 0;
    }
  });

  // 4. Recalculate overall class average
  const averagesSum = classSheets.reduce((acc, s) => acc + s.studentAverage, 0);
  const overallAvg = classSheets.length > 0 ? Math.round((averagesSum / classSheets.length) * 10) / 10 : 0;

  classSheets.forEach((sheet) => {
    sheet.classAverage = overallAvg;
  });

  saveDatabase();
}

// Bulk Class Roster Upload & Manual Registry
app.post("/api/students/bulk-save", (req, res) => {
  const { classLevel, students } = req.body;
  if (!classLevel || !Array.isArray(students)) {
    return res.status(400).json({ error: "classLevel and students list are required!" });
  }

  const saved: any[] = [];
  students.forEach((std) => {
    if (!std.name || !std.name.trim()) return;
    const name = std.name.trim();
    const cleanReg = std.regNumber && std.regNumber.trim() 
      ? std.regNumber.trim() 
      : `REG/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

    // Check if user already exists
    let user = db.users.find(
      (u) => u.role === "student" && 
      (
        u.regNumber?.trim().toLowerCase() === cleanReg.toLowerCase() ||
        (u.name.trim().toLowerCase() === name.toLowerCase() && u.classLevel === classLevel)
      )
    );

    if (user) {
      user.name = name;
      user.regNumber = cleanReg;
      user.classLevel = classLevel;
      saved.push(user);
    } else {
      const newUser = {
        id: "usr_" + Math.random().toString(36).substring(2, 9),
        email: `${cleanReg.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@brain.com`,
        password: "12345", // Mandated default password
        name,
        role: "student",
        regNumber: cleanReg,
        classLevel,
        walletBalance: 0,
        isSuspended: false,
        createdAt: new Date().toISOString()
      };
      db.users.push(newUser);
      saved.push(newUser);
    }
  });

  saveDatabase();
  res.json({ success: true, count: saved.length, students: saved });
});

// Bulk Subject Grader Upload
app.post("/api/report-sheets/bulk-subject-save", (req, res) => {
  const { classLevel, subject, term, scoresList } = req.body;
  if (!classLevel || !subject || !term || !Array.isArray(scoresList)) {
    return res.status(400).json({ error: "Missing parameters: classLevel, subject, term, scoresList are required." });
  }

  scoresList.forEach((entry) => {
    if (!entry.studentName || !entry.studentName.trim()) return;
    const studentName = entry.studentName.trim();
    const ca1 = Number(entry.ca1) || 0;
    const ca2 = Number(entry.ca2) || 0;
    const exam = Number(entry.exam) || 0;
    const caTotal = ca1 + ca2;
    const totalMark = caTotal + exam;

    let grade = "Poor";
    if (totalMark >= 75) grade = "Excellent";
    else if (totalMark >= 65) grade = "Very Good";
    else if (totalMark >= 50) grade = "Good";
    else if (totalMark >= 40) grade = "Fair";

    // Set auto remarks if empty
    let tr = "";
    let pr = "";
    if (totalMark >= 75) {
      tr = "Outstanding performance, exceptional intellectual aptitude!";
      pr = "An inspiring student record. Promoted with praise.";
    } else if (totalMark >= 50) {
      tr = "Good term report. Keep striving for distinction.";
      pr = "Highly encouraging marks. Continue reading.";
    } else {
      tr = "Requires more focus and close coaching in core concepts.";
      pr = "Must improve class attendance and study guidelines.";
    }

    // Find if report sheet exists
    let sheet = db.reportSheets.find(
      (r) => r.studentName.trim().toLowerCase() === studentName.toLowerCase() &&
             r.classLevel === classLevel &&
             r.term === term
    );

    if (!sheet) {
      sheet = {
        id: "report_" + Math.random().toString(36).substring(2, 9),
        studentId: "std_" + Math.random().toString(36).substring(2, 9),
        studentName,
        classLevel,
        term,
        scores: {},
        studentAverage: 0,
        classAverage: 0,
        attendance: 110,
        psychomotor: { punctuality: 4, neatness: 5, honesty: 4, cooperation: 5, selfControl: 4 },
        cognitive: { attentiveness: 5, participation: 4, comprehension: 5 },
        teacherRemark: tr,
        principalRemark: pr
      };
      db.reportSheets.push(sheet);
    }

    sheet.scores[subject] = {
      ca1,
      ca2,
      totalCa: caTotal,
      exam,
      total: totalMark,
      grade,
      highestInClass: totalMark,
      lowestInClass: totalMark,
      position: 1,
      classAverage: totalMark
    };
  });

  saveDatabase();
  
  // Recalculate statistics for this class level and term so all positions are beautifully synchronized!
  recalculateClassStatistics(classLevel, term);

  res.json({ success: true, message: "Scores successfully uploaded and synchronized!" });
});

app.post("/api/report-sheets/delete", (req, res) => {
  const { id } = req.body;
  db.reportSheets = db.reportSheets.filter((r) => r.id !== id);
  saveDatabase();
  res.json({ success: true, message: "Report sheet removed." });
});

// Collate CBT results automatically!
app.post("/api/report-sheets/collate", (req, res) => {
  const { classLevel } = req.body;
  if (!classLevel) {
    return res.status(400).json({ error: "Class level is required to collate results!" });
  }

  // Find all results belonging to this class
  // Group db.results by studentName
  const studentGroups: { [name: string]: any[] } = {};
  db.results.forEach(resObj => {
    const sName = resObj.studentName || "Anonymous Student";
    if (!studentGroups[sName]) studentGroups[sName] = [];
    studentGroups[sName].push(resObj);
  });

  const collatedSheets: any[] = [];

  Object.entries(studentGroups).forEach(([studentName, resultsList]) => {
    const scores: any = {};
    let grandTotal = 0;
    let subjectCount = 0;

    resultsList.forEach(r => {
      const subj = r.subject || "General";
      const percent = Number(r.percentage) || 0; // 0 - 100

      // Calculate pseudo First CA, Second CA, and Exam
      const ca1 = Math.round((percent / 100) * 20 * 10) / 10; // Max 20
      const ca2 = Math.round((percent / 100) * 20 * 10) / 10; // Max 20
      const examVal = Math.round((percent / 100) * 60 * 10) / 10; // Max 60
      const total = Math.round((ca1 + ca2 + examVal) * 10) / 10;

      grandTotal += total;
      subjectCount++;

      let grade = "Poor";
      if (total >= 75) grade = "Excellent";
      else if (total >= 65) grade = "Very Good";
      else if (total >= 50) grade = "Good";
      else if (total >= 40) grade = "Fair";

      scores[subj] = {
        ca1,
        ca2,
        totalCa: ca1 + ca2,
        exam: examVal,
        total,
        highestInClass: total,
        lowestInClass: total,
        position: 1,
        grade,
        classAverage: total
      };
    });

    const average = subjectCount > 0 ? Math.round((grandTotal / subjectCount) * 10) / 10 : 0;

    const reportId = "report_collate_" + Math.random().toString(36).substring(2, 9);
    const currentTerm = db.schoolConfig.term || "First Term";
    const existingSheet = db.reportSheets.find(
      r => r.studentName.trim().toLowerCase() === studentName.trim().toLowerCase() && r.classLevel === classLevel && r.term === currentTerm
    );

    // Auto remarks based on score
    let teacherRemark = "A commendable term. He/she showed Wisdom and understanding.";
    let principalRemark = "Wisdom is knowledge. Highly encouraging results.";
    if (average >= 75) {
      teacherRemark = "Outstanding learning capability. An exceptional student.";
      principalRemark = "Remarkable! Keep maintaining this academic standard.";
    } else if (average < 50) {
      teacherRemark = "Requires closer tutoring and more academic devotion.";
      principalRemark = "Needs to study harder in subsequent terms.";
    }

    const newReport = {
      id: existingSheet?.id || reportId,
      studentId: existingSheet?.studentId || "std_" + Math.random().toString(36).substring(2, 9),
      studentName,
      classLevel,
      term: db.schoolConfig.term || "First Term",
      scores,
      studentAverage: average,
      classAverage: average,
      attendance: 115,
      psychomotor: { punctuality: 4, neatness: 5, honesty: 4, cooperation: 5, selfControl: 4 },
      cognitive: { attentiveness: 5, participation: 4, comprehension: 5 },
      teacherRemark,
      principalRemark
    };

    collatedSheets.push(newReport);
  });

  // Re-calculate cross-student statistics (highest, lowest, classAverage, positions) for this class Level
  if (collatedSheets.length > 0) {
    const subjectsPresent = new Set<string>();
    collatedSheets.forEach(sheet => {
      Object.keys(sheet.scores).forEach(subj => subjectsPresent.add(subj));
    });

    subjectsPresent.forEach(subj => {
      const studentScoresOnSubject = collatedSheets.map(s => s.scores[subj]?.total || 0).filter(v => v !== undefined);
      const highest = studentScoresOnSubject.length > 0 ? Math.max(...studentScoresOnSubject) : 0;
      const lowest = studentScoresOnSubject.length > 0 ? Math.min(...studentScoresOnSubject) : 0;
      const sum = studentScoresOnSubject.reduce((a, b) => a + b, 0);
      const classAvg = studentScoresOnSubject.length > 0 ? Math.round((sum / studentScoresOnSubject.length) * 10) / 10 : 0;

      collatedSheets.forEach(sheet => {
        if (sheet.scores[subj]) {
          sheet.scores[subj].highestInClass = highest;
          sheet.scores[subj].lowestInClass = lowest;
          sheet.scores[subj].classAverage = classAvg;

          const position = studentScoresOnSubject.filter(v => v > sheet.scores[subj].total).length + 1;
          sheet.scores[subj].position = position;
        }
      });
    });

    const classAveragesSum = collatedSheets.reduce((acc, s) => acc + s.studentAverage, 0);
    const overallClassAvg = collatedSheets.length > 0 ? Math.round((classAveragesSum / collatedSheets.length) * 10) / 10 : 0;

    collatedSheets.forEach(sheet => {
      sheet.classAverage = overallClassAvg;

      const idx = db.reportSheets.findIndex(r => r.studentName.trim().toLowerCase() === sheet.studentName.trim().toLowerCase() && r.classLevel === classLevel && r.term === sheet.term);
      if (idx !== -1) {
        db.reportSheets[idx] = sheet;
      } else {
        db.reportSheets.push(sheet);
      }
    });

    saveDatabase();
  }

  res.json({ success: true, collatedCount: collatedSheets.length, message: "Successfully collated results!" });
});


// EXAM AND TESTS SECURITY GATE & FEES CONTROLLERS

app.get("/api/exams/:id/check-attempts", (req, res) => {
  const examId = req.params.id;
  const { studentName } = req.query;

  if (!studentName) {
    return res.status(400).json({ error: "studentName is required." });
  }

  const matches = db.results.filter(
    (r) => r.examId === examId && r.studentName.trim().toLowerCase() === (studentName as string).trim().toLowerCase()
  );

  res.json({
    success: true,
    attempts: matches.length,
    allowed: matches.length < 2,
    previousAttempts: matches.map(m => ({ score: m.score, percentage: m.percentage, date: m.date }))
  });
});

app.post("/api/exams/:id/start-attempt", (req, res) => {
  const examId = req.params.id;
  const { studentName } = req.body;

  if (!studentName || !studentName.trim()) {
    return res.status(400).json({ error: "Student name is required." });
  }

  const exam = db.exams.find((e) => e.id === examId);
  if (!exam) {
    return res.status(404).json({ error: "Exam not found." });
  }

  const matches = db.results.filter(
    (r) => r.examId === examId && r.studentName.trim().toLowerCase() === studentName.trim().toLowerCase()
  );

  if (matches.length >= 2) {
    return res.status(403).json({
      error: `Access Denied: '${studentName.trim()}' has already completed this CBT exam 2 times, which is the maximum attempt threshold. Additional starts are strictly blocked.`
    });
  }

  let student = db.users.find(
    (u) => u.name.trim().toLowerCase() === studentName.trim().toLowerCase() && u.role === "student"
  );

  if (!student) {
    student = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      email: `${studentName.trim().toLowerCase().replace(/\s+/g, "")}@student.cbt`,
      password: "password",
      name: studentName.trim(),
      role: "student",
      walletBalance: 1000,
      isSuspended: false,
      createdAt: new Date().toISOString()
    };
    db.users.push(student);
  }

  const EXAM_TAKE_CHARGE = 50;
  if (student.walletBalance < EXAM_TAKE_CHARGE) {
    return res.status(402).json({
      error: `Insufficient balance! Attempting standard CBT exam requires a ₦${EXAM_TAKE_CHARGE} charge. Student's current wallet balance is ₦${student.walletBalance}. Please fund the account.`
    });
  }

  student.walletBalance -= EXAM_TAKE_CHARGE;
  db.transactions.push({
    id: "tx_" + Math.random().toString(36).substring(2, 9),
    userId: student.id,
    userName: student.name,
    amount: EXAM_TAKE_CHARGE,
    type: "debit",
    purpose: `CBT Take Fee: ${exam.title} (Attempt #${matches.length + 1})`,
    date: new Date().toISOString()
  });

  saveDatabase();

  res.json({
    success: true,
    studentId: student.id,
    walletBalance: student.walletBalance,
    attemptNumber: matches.length + 1,
    previousAttemptsCount: matches.length
  });
});

// --- FEEDBACK & AI ONLINE CHAT PORTALS ---
app.get("/api/feedback", (req, res) => {
  res.json({ success: true, feedback: db.feedback || [] });
});

app.post("/api/feedback", (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email, and message are required." });
  }

  const newFeedback = {
    id: "fb_" + Math.random().toString(36).substring(2, 9),
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
    date: new Date().toISOString()
  };

  if (!db.feedback) db.feedback = [];
  db.feedback.unshift(newFeedback);
  saveDatabase();

  res.json({ success: true, feedback: newFeedback });
});

app.post("/api/feedback/chat", async (req, res) => {
  const { message, history } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Missing prompt message text." });
  }

  // Compile structural dialog context
  const formattedHistory = Array.isArray(history)
    ? history.map((chatUnit: any) => `${chatUnit.role === "model" ? "Brain Support" : "User"}: ${chatUnit.text}`).join("\n")
    : "";

  const directivePrompt = `You are "Brain Direct Support Agent", a friendly, ultra-helpful, professional Customer Success Representative representing Brain Educational Suite.
Brain is Nigeria's premier educational portal enabling teachers, school directors, and vice principals to generate lesson plans/class notebooks instantly and host Computer Based Testing (CBT).

Platform Details for Context:
- CBT publishing cost: ₦200 per exam (Educators/Teachers fund their portal wallet using Paystack or OPay references).
- Standard student exam participation charge: ₦50 per attempt (maximum of 2 attempts strictly enforced per student candidate).
- Contact lines: Phone/WhatsApp is 08062078597 and Email is nwaigboaugust@gmail.com.
- The founder/executive director is Austin Nwaigbo.
- Features include: AI Question Generator, CSV uploaded question lists, Lesson Notes writer, Tabular lesson plans editor, transaction ledger, and printable students certificates!

Instructions:
- Keep responses extremely polite, supportive, conversational, and highly concise (at most 3 short sentences per answer).
- Never act like raw code or display keys. Support the user enthusiastically!
- Answer any queries about features, pricing, contact details, or help them log feedback. If they write feedback/complaints, assure them that we have logged it and our tech support team will follow up!

Existing Chat logs:
${formattedHistory}

User: ${message.trim()}
Brain Support:`;

  try {
    const aiText = await callGemini(directivePrompt);
    res.json({ success: true, text: aiText });
  } catch (error: any) {
    console.error("Gemini direct chat error:", error);
    res.json({
      success: true,
      text: "Hello! I received your message. I am currently offline, but you can always reach us directly via Phone / WhatsApp at 08062078597 or via email at nwaigboaugust@gmail.com. We're happy to assist you!"
    });
  }
});

// --- VITE MIDDLEWARE CONFIGURATION FOR HOT APPLICATION PREVIEWS ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Brain (Express + Vite Fullstack server) is up and running on port ${PORT}!`);
  });
}

// Only start the server automatically if we are not running on a serverless platform
if (!IS_SERVERLESS) {
  startServer();
}

export { app, db };
