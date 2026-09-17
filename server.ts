import express from "express";
import http from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createServer as createViteServer } from "vite";
import { ParticipantModel } from "./src/models/Participant";

dotenv.config();

const app = express();
const PORT = 3000;
const HOST = "0.0.0.0";
const server = http.createServer(app);

// Enable CORS for all routes
app.use(cors({ origin: "*" }));
app.use(express.json());

// Set up Socket.IO on the same HTTP server
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

// -------------------- Question & Quiz Interfaces --------------------
export interface QuizQuestion {
  question_id: number;
  question_text: string;
  options: string[];
  correct_answer: string;
  timer_seconds: number;
  type: "radio" | "checkbox";
  explanation?: string;
}

export interface QuizState {
  quizId: string;
  title?: string;
  questions: QuizQuestion[];
  isCompleted: boolean;
  status: "idle" | "running" | "completed";
  currentQuestionIndex: number;
  currentQuestionStartedAt: number;
  currentQuestionDuration: number;
}

export interface ParticipantRecord {
  usn: string;
  studentInfo: {
    name?: string;
    usn: string;
    email?: string;
    department?: string;
  };
  answers: Record<string, string | string[]>;
  score: number;
  total: number;
  percentage: number;
  status: "Joined" | "In-Progress" | "Completed";
  joinedAt: number;
  completedAt?: number;
  socketId?: string;
}

// -------------------- In-Memory State & Cache --------------------
const activeQuizzes: Record<string, QuizState> = {};
const roomParticipants: Record<string, Map<string, ParticipantRecord>> = {};
const roomTimelineRunning = new Set<string>();
let isMongoConnected = false;

// -------------------- MongoDB Connection (Graceful Fallback) --------------------
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mtd_marathon";

mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 2000,
  })
  .then(() => {
    isMongoConnected = true;
    console.log("Connected to MongoDB successfully at:", MONGODB_URI);
  })
  .catch((err) => {
    isMongoConnected = false;
    console.log(
      `[Notice] MongoDB not reachable (${err.message}). Seamlessly running in resilient in-memory mode.`
    );
  });

// -------------------- Load Quizzes from File --------------------
const QUIZ_FILE = path.join(process.cwd(), "questions.json");

function loadQuizzesFromFile() {
  if (fs.existsSync(QUIZ_FILE)) {
    try {
      const raw = fs.readFileSync(QUIZ_FILE, "utf-8");
      const data = JSON.parse(raw);
      for (const [quizId, questions] of Object.entries(data)) {
        activeQuizzes[quizId] = {
          quizId,
          title: quizId.replace(/-/g, " "),
          questions: questions as QuizQuestion[],
          isCompleted: false,
          status: "idle",
          currentQuestionIndex: -1,
          currentQuestionStartedAt: 0,
          currentQuestionDuration: 0,
        };
      }
      console.log(
        `Successfully loaded ${Object.keys(activeQuizzes).length} quizzes from ${QUIZ_FILE}`
      );
    } catch (err: any) {
      console.error(`Error reading ${QUIZ_FILE}:`, err.message);
    }
  } else {
    // Built-in fallback quizzes
    activeQuizzes["MTD-2026"] = {
      quizId: "MTD-2026",
      title: "MTD Marathon Python Basics",
      questions: [
        {
          question_id: 1,
          question_text: "Which of the following represents a float data type in Python?",
          options: ["10", "10.5", "\"10.5\"", "[10.5]"],
          correct_answer: "10.5",
          timer_seconds: 15,
          type: "radio",
          explanation: "10.5 has a decimal point and is evaluated as float.",
        },
        {
          question_id: 2,
          question_text: "Which of the following is a valid string declaration in Python?",
          options: ["name = John", "name = 'John'", "name = (John)", "name = {John}"],
          correct_answer: "name = 'John'",
          timer_seconds: 15,
          type: "radio",
          explanation: "Strings must be wrapped in quotes.",
        },
      ],
      isCompleted: false,
      status: "idle",
      currentQuestionIndex: -1,
      currentQuestionStartedAt: 0,
      currentQuestionDuration: 0,
    };
  }
}

loadQuizzesFromFile();

// -------------------- Scoring & Evaluation Helpers --------------------
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function computeParticipantScore(
  quiz: QuizState,
  studentAnswers: Record<string, string | string[]> = {}
) {
  const questions = quiz.questions;
  const totalQuestions = questions.length;
  let score = 0;

  questions.forEach((q, index) => {
    const ansKey = String(index);
    const studentChoice = studentAnswers[ansKey] ?? studentAnswers[String(q.question_id)] ?? [];
    const correctAns = q.correct_answer;

    if (q.type === "radio") {
      if (
        String(studentChoice).trim().toLowerCase() ===
        String(correctAns).trim().toLowerCase()
      ) {
        score += 1;
      }
    } else if (q.type === "checkbox") {
      if (Array.isArray(studentChoice)) {
        const studentSet = new Set(
          studentChoice.map((x) => String(x).trim().toLowerCase())
        );
        const correctSet = new Set(
          String(correctAns)
            .split(",")
            .map((x) => x.trim().toLowerCase())
        );
        if (
          studentSet.size === correctSet.size &&
          [...studentSet].every((x) => correctSet.has(x))
        ) {
          score += 1;
        }
      }
    }
  });

  const percentage =
    totalQuestions > 0
      ? Math.round((score / totalQuestions) * 10000) / 100
      : 0;
  return { score, total: totalQuestions, percentage };
}

async function saveParticipantRecord(record: ParticipantRecord, quizId: string) {
  if (!roomParticipants[quizId]) {
    roomParticipants[quizId] = new Map();
  }
  roomParticipants[quizId].set(record.usn, record);

  if (isMongoConnected) {
    try {
      await (ParticipantModel as any).findOneAndUpdate(
        { quizId, usn: record.usn },
        {
          quizId,
          usn: record.usn,
          studentInfo: record.studentInfo,
          answers: record.answers,
          score: record.score,
          total: record.total,
          percentage: record.percentage,
          status: record.status,
          joinedAt: new Date(record.joinedAt),
          completedAt: record.completedAt ? new Date(record.completedAt) : undefined,
        },
        { upsert: true, new: true }
      );
    } catch (err: any) {
      console.warn("MongoDB write fallback:", err.message);
    }
  }
}

async function getParticipantsForQuiz(quizId: string): Promise<ParticipantRecord[]> {
  const memMap = roomParticipants[quizId] || new Map();

  if (isMongoConnected) {
    try {
      const dbRecords = await (ParticipantModel as any).find({ quizId }).lean();
      for (const d of dbRecords) {
        if (!memMap.has(d.usn)) {
          const rec: ParticipantRecord = {
            usn: d.usn,
            studentInfo: d.studentInfo || { usn: d.usn },
            answers: d.answers || {},
            score: d.score || 0,
            total: d.total || 0,
            percentage: d.percentage || 0,
            status: (d.status as any) || "Completed",
            joinedAt: d.joinedAt ? new Date(d.joinedAt).getTime() : Date.now(),
            completedAt: d.completedAt ? new Date(d.completedAt).getTime() : undefined,
          };
          memMap.set(d.usn, rec);
        }
      }
    } catch (err: any) {
      console.warn("MongoDB read fallback:", err.message);
    }
  }

  // Sort descending by score, then percentage
  return Array.from(memMap.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.percentage - a.percentage;
  });
}

// -------------------- REST Endpoints --------------------
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    quizzes: Object.keys(activeQuizzes),
    isMongoConnected,
    timestamp: Date.now(),
  });
});

app.get("/api/quizzes", (_req, res) => {
  const summary = Object.entries(activeQuizzes).map(([id, q]) => ({
    quizId: id,
    title: q.title || id,
    questionCount: q.questions.length,
    status: q.status,
    isCompleted: q.isCompleted,
    totalDurationSeconds: q.questions.reduce(
      (acc, curr) => acc + (curr.timer_seconds || 15),
      0
    ),
  }));
  res.json({ success: true, quizzes: summary });
});

app.get("/api/quizzes/:quizId", (req, res) => {
  const { quizId } = req.params;
  const quiz = activeQuizzes[quizId];
  if (!quiz) {
    return res.status(404).json({ success: false, detail: "Quiz ID not found" });
  }
  res.json({ success: true, quiz });
});

app.post("/api/quizzes", (req, res) => {
  const { quizId, title, questions } = req.body || {};
  if (!quizId || !Array.isArray(questions) || questions.length === 0) {
    return res
      .status(400)
      .json({ success: false, detail: "quizId and questions array are required" });
  }

  activeQuizzes[quizId] = {
    quizId,
    title: title || quizId,
    questions,
    isCompleted: false,
    status: "idle",
    currentQuestionIndex: -1,
    currentQuestionStartedAt: 0,
    currentQuestionDuration: 0,
  };

  res.json({ success: true, quiz: activeQuizzes[quizId] });
});

app.post("/api/evaluate-quiz", async (req, res) => {
  const { quizId } = req.body || {};
  if (!quizId || !activeQuizzes[quizId]) {
    return res.status(404).json({ success: false, detail: "Quiz ID not found" });
  }
  try {
    const participants = await getParticipantsForQuiz(quizId);
    const quiz = activeQuizzes[quizId];
    const results = participants.map((p) => {
      const { score, total, percentage } = computeParticipantScore(
        quiz,
        p.answers || {}
      );
      p.score = score;
      p.total = total;
      p.percentage = percentage;
      return {
        student: p.studentInfo,
        score,
        total,
        percentage,
        answers: p.answers || {},
        status: p.status,
      };
    });
    res.json({ success: true, results });
  } catch (err: any) {
    console.error("evaluate-quiz error:", err.message);
    res.status(500).json({ success: false, detail: "Internal server error" });
  }
});

app.get("/api/get-results/:quizId", async (req, res) => {
  const { quizId } = req.params;
  if (!activeQuizzes[quizId]) {
    return res.status(404).json({ success: false, detail: "Quiz ID not found" });
  }
  try {
    const participants = await getParticipantsForQuiz(quizId);
    const quiz = activeQuizzes[quizId];
    const results = participants.map((p) => {
      const { score, total, percentage } = computeParticipantScore(
        quiz,
        p.answers || {}
      );
      return {
        student: p.studentInfo,
        score,
        total,
        percentage,
        answers: p.answers || {},
        status: p.status,
      };
    });
    res.json({ success: true, results, quiz });
  } catch (err: any) {
    console.error("get-results error:", err.message);
    res.status(500).json({ success: false, detail: "Internal server error" });
  }
});

// Helper for testing: add simulated participants
app.post("/api/simulate-participant", async (req, res) => {
  const { quizId, name, usn } = req.body || {};
  if (!quizId || !activeQuizzes[quizId]) {
    return res.status(404).json({ success: false, detail: "Quiz ID not found" });
  }
  const testUsn = usn || `TEST-${Math.floor(1000 + Math.random() * 9000)}`;
  const testName = name || `Simulated Student ${testUsn.slice(-4)}`;

  const quiz = activeQuizzes[quizId];
  const answers: Record<string, string | string[]> = {};
  quiz.questions.forEach((q, idx) => {
    if (Math.random() > 0.3) {
      answers[String(idx)] = q.correct_answer;
    } else {
      answers[String(idx)] = q.options[0] || "";
    }
  });
  const { score, total, percentage } = computeParticipantScore(quiz, answers);

  const record: ParticipantRecord = {
    usn: testUsn,
    studentInfo: {
      name: testName,
      usn: testUsn,
      department: "Computer Science",
    },
    answers,
    score,
    total,
    percentage,
    status: "Completed",
    joinedAt: Date.now() - 60000,
    completedAt: Date.now(),
  };

  await saveParticipantRecord(record, quizId);
  const updatedParticipants = await getParticipantsForQuiz(quizId);
  io.to(quizId).emit("participant_list_update", {
    participants: updatedParticipants.map((p) => p.studentInfo),
  });
  io.to(quizId).emit("leaderboard_update", { results: updatedParticipants });

  res.json({ success: true, participant: record });
});

// -------------------- Socket.IO Real-Time Engine --------------------
io.on("connection", (socket: Socket) => {
  const quizId = (socket.handshake.query?.quizId as string) || "MTD-2026";

  if (!quizId || !activeQuizzes[quizId]) {
    // If not found in memory, try to auto-create or fall back
    if (!activeQuizzes[quizId]) {
      socket.emit("error_event", { message: `Quiz ${quizId} is not available.` });
      return;
    }
  }

  socket.join(quizId);
  socket.data.quizId = quizId;

  // Handle participant or host join
  socket.on("join_quiz", async ({ studentData, isHost } = {}) => {
    const usn = studentData?.usn || (isHost ? "HOST_ADMIN" : `GUEST-${socket.id.slice(0, 5)}`);
    socket.data.studentUsn = usn;
    socket.data.studentData = studentData || { usn, name: isHost ? "Quiz Host" : "Student" };
    socket.data.isHost = Boolean(isHost);

    if (!roomParticipants[quizId]) {
      roomParticipants[quizId] = new Map();
    }

    if (usn !== "HOST_ADMIN") {
      const existing = roomParticipants[quizId].get(usn);
      const record: ParticipantRecord = existing || {
        usn,
        studentInfo: studentData || { usn, name: "Student" },
        answers: {},
        score: 0,
        total: activeQuizzes[quizId].questions.length,
        percentage: 0,
        status: "Joined",
        joinedAt: Date.now(),
        socketId: socket.id,
      };
      record.socketId = socket.id;
      await saveParticipantRecord(record, quizId);
    }

    // Broadcast updated participant roster to all clients in the room
    const currentList = await getParticipantsForQuiz(quizId);
    io.to(quizId).emit("participant_list_update", {
      participants: currentList.map((p) => ({
        ...p.studentInfo,
        status: p.status,
        score: p.score,
      })),
      count: currentList.length,
    });

    // If quiz is currently running, sync the late-joining student
    const currentQuiz = activeQuizzes[quizId];
    if (currentQuiz && currentQuiz.status === "running") {
      const clientQuestions = currentQuiz.questions.map((q) => ({
        ...q,
        options: shuffle(q.options),
      }));
      socket.emit("quiz_started", {
        type: "quiz_started",
        questions: clientQuestions,
        currentIndex: currentQuiz.currentQuestionIndex,
        isLateJoin: true,
      });

      if (currentQuiz.currentQuestionIndex >= 0) {
        const currentQ = currentQuiz.questions[currentQuiz.currentQuestionIndex];
        const elapsed = Math.floor((Date.now() - currentQuiz.currentQuestionStartedAt) / 1000);
        const remaining = Math.max(1, currentQuiz.currentQuestionDuration - elapsed);

        socket.emit("host_question_sync", {
          type: "host_question_sync",
          question_text: currentQ.question_text,
          timer_seconds: remaining,
          index: currentQuiz.currentQuestionIndex,
          total: currentQuiz.questions.length,
          question_id: currentQ.question_id,
          type_choice: currentQ.type,
        });
      }
    } else if (currentQuiz && currentQuiz.status === "completed") {
      socket.emit("enable_results_button", { type: "enable_results_button" });
    }
  });

  // Host starts the quiz sequence
  socket.on("start_quiz_sequence", () => {
    if (roomTimelineRunning.has(quizId)) {
      console.log(`Timeline already active for room ${quizId}`);
      return;
    }
    roomTimelineRunning.add(quizId);
    startQuizTimeline(quizId).finally(() => {
      roomTimelineRunning.delete(quizId);
    });
  });

  // Student submits answers
  socket.on("submit_answer", async ({ answersMap } = {}) => {
    const usn = socket.data.studentUsn;
    if (!usn || usn === "HOST_ADMIN") return;

    const quiz = activeQuizzes[quizId];
    if (!quiz) return;

    const { score, total, percentage } = computeParticipantScore(quiz, answersMap || {});
    const existing = roomParticipants[quizId]?.get(usn);

    const record: ParticipantRecord = {
      usn,
      studentInfo: socket.data.studentData || existing?.studentInfo || { usn },
      answers: answersMap || {},
      score,
      total,
      percentage,
      status: "Completed",
      joinedAt: existing?.joinedAt || Date.now(),
      completedAt: Date.now(),
      socketId: socket.id,
    };

    await saveParticipantRecord(record, quizId);

    // Send confirmation back to student
    socket.emit("answer_acknowledged", {
      score,
      total,
      percentage,
      usn,
    });

    // Broadcast updated leaderboard and participant roster
    const allResults = await getParticipantsForQuiz(quizId);
    io.to(quizId).emit("leaderboard_update", { results: allResults });
    io.to(quizId).emit("participant_list_update", {
      participants: allResults.map((p) => ({
        ...p.studentInfo,
        status: p.status,
        score: p.score,
        answers: p.answers,
      })),
      count: allResults.length,
    });
  });

  socket.on("disconnect", async () => {
    // Notify room of roster state
    if (activeQuizzes[quizId]) {
      const currentList = await getParticipantsForQuiz(quizId);
      io.to(quizId).emit("participant_list_update", {
        participants: currentList.map((p) => ({
          ...p.studentInfo,
          status: p.status,
        })),
        count: currentList.length,
      });
    }
  });
});

// -------------------- Host Timeline Driver --------------------
async function startQuizTimeline(quizId: string) {
  const quiz = activeQuizzes[quizId];
  if (!quiz) {
    console.log(`Quiz ID ${quizId} not found for timeline start.`);
    return;
  }

  const { questions } = quiz;
  const totalQ = questions.length;
  quiz.status = "running";
  quiz.isCompleted = false;

  console.log(`>>> STARTING QUIZ TIMELINE: ${quizId} (${totalQ} questions) <<<`);

  // 1. Send each connected client its own shuffled copy of questions
  const sockets = await io.in(quizId).fetchSockets();
  for (const s of sockets) {
    const clientQuestions = questions.map((q) => ({
      ...q,
      options: shuffle(q.options),
    }));
    s.emit("quiz_started", {
      type: "quiz_started",
      questions: clientQuestions,
      total: totalQ,
    });
  }

  // Small 2-second countdown before Q1
  await sleep(1500);

  // 2. Drive the shared timeline: broadcast each question and wait its timer
  for (let index = 0; index < questions.length; index++) {
    const currentQ = questions[index];
    const duration = currentQ.timer_seconds || 15;

    quiz.currentQuestionIndex = index;
    quiz.currentQuestionStartedAt = Date.now();
    quiz.currentQuestionDuration = duration;

    io.to(quizId).emit("host_question_sync", {
      type: "host_question_sync",
      question_text: currentQ.question_text,
      timer_seconds: duration,
      index,
      total: totalQ,
      question_id: currentQ.question_id,
      type_choice: currentQ.type,
      explanation: currentQ.explanation,
    });

    // Sleep for the exact duration of the question
    await sleep(duration * 1000);
  }

  // 3. Complete quiz display
  quiz.status = "completed";
  quiz.isCompleted = true;
  quiz.currentQuestionIndex = totalQ;

  io.to(quizId).emit("host_quiz_completed_display", {
    type: "host_quiz_completed_display",
    duration: 5,
  });

  await sleep(5000);

  // 4. Enable results button & broadcast leaderboard
  io.to(quizId).emit("enable_results_button", { type: "enable_results_button" });

  const finalLeaderboard = await getParticipantsForQuiz(quizId);
  io.to(quizId).emit("leaderboard_update", { results: finalLeaderboard });
}

// -------------------- Vite Middleware / Production Server --------------------
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`MTD Marathon Quiz Portal running at http://${HOST}:${PORT}`);
  });
}

start();
