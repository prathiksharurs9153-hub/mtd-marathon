/// <reference types="vite/client" />
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  QuizQuestion,
  StudentData,
  Participant,
  SyncQuestionPayload,
  LeaderboardEntry,
} from "../types";

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  latency: number;
  quizId: string;
  isHost: boolean;
  studentData: StudentData | null;
  participants: Participant[];
  quizState: "join" | "waiting" | "in_quiz" | "completed_transition" | "results";
  clientQuestions: QuizQuestion[];
  currentQuestionIndex: number;
  currentQuestion: SyncQuestionPayload | null;
  questionTimeRemaining: number;
  studentAnswers: Record<string, string | string[]>;
  leaderboard: LeaderboardEntry[];
  error: string | null;
  isAnswerSubmittedForCurrent: boolean;
  joinQuizSession: (id: string, host: boolean, student?: StudentData) => void;
  leaveQuizSession: () => void;
  startQuizSequence: () => void;
  recordAnswer: (questionIndex: number, answer: string | string[]) => void;
  submitCurrentAnswers: () => void;
  setQuizState: (state: "join" | "waiting" | "in_quiz" | "completed_transition" | "results") => void;
  fetchLeaderboard: (id?: string) => Promise<void>;
  clearError: () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [quizId, setQuizId] = useState<string>("");
  const [isHost, setIsHost] = useState(false);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [quizState, setQuizState] = useState<
    "join" | "waiting" | "in_quiz" | "completed_transition" | "results"
  >("join");
  const [clientQuestions, setClientQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(-1);
  const [currentQuestion, setCurrentQuestion] = useState<SyncQuestionPayload | null>(null);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState<number>(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string | string[]>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAnswerSubmittedForCurrent, setIsAnswerSubmittedForCurrent] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const answersRef = useRef<Record<string, string | string[]>>({});

  // Keep answersRef synced with studentAnswers
  useEffect(() => {
    answersRef.current = studentAnswers;
  }, [studentAnswers]);

  // Handle countdown ticks locally when currentQuestion is active
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (quizState === "in_quiz" && questionTimeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setQuestionTimeRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [quizState, currentQuestionIndex]);

  const joinQuizSession = useCallback(
    (targetQuizId: string, hostMode: boolean, student?: StudentData) => {
      if (!targetQuizId) return;

      const cleanId = targetQuizId.trim();
      setQuizId(cleanId);
      setIsHost(hostMode);
      setStudentData(student || null);
      setStudentAnswers({});
      setClientQuestions([]);
      setCurrentQuestionIndex(-1);
      setCurrentQuestion(null);
      setError(null);

      // Disconnect prior socket if open
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const backendEnvUrl = (import.meta as any).env?.VITE_BACKEND_URL;
      const backendUrl =
        typeof backendEnvUrl === "string" && backendEnvUrl.startsWith("http")
          ? backendEnvUrl
          : window.location.origin;

      const s = io(backendUrl, {
        query: { quizId: cleanId },
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current = s;
      setSocket(s);

      s.on("connect", () => {
        setIsConnected(true);
        const startTime = Date.now();
        s.emit("ping_check", () => {
          setLatency(Date.now() - startTime);
        });

        // Join room
        s.emit("join_quiz", {
          studentData: hostMode
            ? { name: "Quiz Host (Admin)", usn: "HOST_ADMIN" }
            : student,
          isHost: hostMode,
        });

        setQuizState("waiting");
      });

      s.on("disconnect", () => {
        setIsConnected(false);
      });

      s.on("error_event", (errData: { message: string }) => {
        setError(errData.message || "A network error occurred.");
      });

      s.on("participant_list_update", (data: { participants: Participant[] }) => {
        if (Array.isArray(data.participants)) {
          setParticipants(data.participants);
        }
      });

      s.on("quiz_started", (payload: { questions: QuizQuestion[]; isLateJoin?: boolean }) => {
        setClientQuestions(payload.questions || []);
        setQuizState("in_quiz");
      });

      s.on("host_question_sync", (syncPayload: SyncQuestionPayload) => {
        setCurrentQuestionIndex(syncPayload.index);
        setCurrentQuestion(syncPayload);
        setQuestionTimeRemaining(syncPayload.timer_seconds || 15);
        setIsAnswerSubmittedForCurrent(false);
        setQuizState("in_quiz");
      });

      s.on("host_quiz_completed_display", () => {
        // Auto-submit current student's answers upon quiz completion
        if (!hostMode && student?.usn) {
          s.emit("submit_answer", { answersMap: answersRef.current });
        }
        setQuizState("completed_transition");
      });

      s.on("enable_results_button", () => {
        setQuizState("results");
        fetchLeaderboard(cleanId);
      });

      s.on("leaderboard_update", (data: { results: LeaderboardEntry[] }) => {
        if (Array.isArray(data.results)) {
          setLeaderboard(data.results);
        }
      });
    },
    []
  );

  const leaveQuizSession = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSocket(null);
    setIsConnected(false);
    setQuizId("");
    setIsHost(false);
    setStudentData(null);
    setParticipants([]);
    setQuizState("join");
    setClientQuestions([]);
    setCurrentQuestionIndex(-1);
    setCurrentQuestion(null);
    setStudentAnswers({});
    setError(null);
  }, []);

  const startQuizSequence = useCallback(() => {
    if (socketRef.current && isHost) {
      socketRef.current.emit("start_quiz_sequence");
    }
  }, [isHost]);

  const recordAnswer = useCallback((qIndex: number, ans: string | string[]) => {
    setStudentAnswers((prev) => {
      const next = { ...prev, [String(qIndex)]: ans };
      // Also automatically submit latest answers to socket for real-time progress
      if (socketRef.current && !isHost) {
        socketRef.current.emit("submit_answer", { answersMap: next });
      }
      return next;
    });
    setIsAnswerSubmittedForCurrent(true);
  }, [isHost]);

  const submitCurrentAnswers = useCallback(() => {
    if (socketRef.current && !isHost) {
      socketRef.current.emit("submit_answer", { answersMap: answersRef.current });
      setIsAnswerSubmittedForCurrent(true);
    }
  }, [isHost]);

  const fetchLeaderboard = useCallback(async (targetId?: string) => {
    const id = targetId || quizId;
    if (!id) return;
    try {
      const res = await fetch(`/api/get-results/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results) {
          setLeaderboard(data.results);
        }
      }
    } catch (e) {
      console.warn("Could not fetch leaderboard via REST:", e);
    }
  }, [quizId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        latency,
        quizId,
        isHost,
        studentData,
        participants,
        quizState,
        clientQuestions,
        currentQuestionIndex,
        currentQuestion,
        questionTimeRemaining,
        studentAnswers,
        leaderboard,
        error,
        isAnswerSubmittedForCurrent,
        joinQuizSession,
        leaveQuizSession,
        startQuizSequence,
        recordAnswer,
        submitCurrentAnswers,
        setQuizState,
        fetchLeaderboard,
        clearError,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useQuizSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useQuizSocket must be used within a SocketProvider");
  }
  return ctx;
};
