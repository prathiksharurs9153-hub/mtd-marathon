import React, { useState } from "react";
import { motion } from "motion/react";
import { useQuizSocket } from "../context/SocketContext";
import { soundEffects } from "../utils/soundEffects";
import {
  Shield,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Volume2,
  VolumeX,
  UserPlus,
  BookOpen,
  Layers,
  BarChart3,
  Award,
  Sparkles,
  Info,
  Check,
} from "lucide-react";

interface HostQuizDashboardProps {
  onOpenQuizManager?: () => void;
}

export const HostQuizDashboard: React.FC<HostQuizDashboardProps> = ({
  onOpenQuizManager,
}) => {
  const {
    quizId,
    currentQuestion,
    currentQuestionIndex,
    questionTimeRemaining,
    clientQuestions,
    participants,
    leaderboard,
  } = useQuizSocket();

  const [soundEnabled, setSoundEnabled] = useState(() => soundEffects.isEnabled());
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<"broadcast" | "participants" | "leaderboard">(
    "broadcast"
  );

  const handleToggleSound = () => {
    const next = soundEffects.toggle();
    setSoundEnabled(next);
  };

  const handleSimulateParticipant = async () => {
    setIsSimulating(true);
    try {
      await fetch("/api/simulate-participant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId,
          name: `Student ${Math.floor(10 + Math.random() * 90)}`,
          usn: `USN-2026-${Math.floor(100 + Math.random() * 900)}`,
        }),
      });
    } catch (e) {
      console.warn("Could not simulate participant:", e);
    } finally {
      setIsSimulating(false);
    }
  };

  // Find question definition
  const questionData =
    clientQuestions &&
    clientQuestions.length > currentQuestionIndex &&
    currentQuestionIndex >= 0
      ? clientQuestions[currentQuestionIndex]
      : null;

  const totalQuestions = currentQuestion?.total || clientQuestions.length || 1;
  const currentNum = (currentQuestionIndex >= 0 ? currentQuestionIndex : 0) + 1;
  const isLastFiveSeconds = questionTimeRemaining <= 5 && questionTimeRemaining > 0;

  // Options list
  const optionsList: string[] =
    questionData?.options && questionData.options.length > 0
      ? questionData.options
      : ["Loading options..."];

  const correctAnswer = questionData?.correct_answer || "";

  // Evaluate how many students have locked an answer for this question
  const currentQIndexKey = String(currentQuestionIndex);
  const currentQIdKey = questionData?.question_id !== undefined ? String(questionData.question_id) : "";

  const submissionsCount = participants.filter((p) => {
    const ans = p.answers?.[currentQIndexKey] ?? (currentQIdKey ? p.answers?.[currentQIdKey] : undefined);
    if (!ans) return false;
    if (Array.isArray(ans)) return ans.length > 0;
    return String(ans).trim() !== "";
  }).length;

  const totalParticipants = participants.length;
  const submissionPercent =
    totalParticipants > 0
      ? Math.min(100, Math.round((submissionsCount / totalParticipants) * 100))
      : 0;

  return (
    <div id="host-quiz-dashboard" className="max-w-5xl mx-auto py-6 sm:py-8 px-4 space-y-6">
      {/* Host Command Center Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-purple-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/40">
              <Shield className="w-3.5 h-3.5 text-purple-300" />
              Host Command Center
            </span>
            <span className="text-xs text-purple-200 font-mono">Room: {quizId}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Live Quiz Broadcast & Student Telemetry
          </h1>
          <p className="text-xs text-purple-200/80 mt-1 max-w-xl">
            You are broadcasting questions in real-time. Student submissions are tracked automatically.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            id="host-simulate-student-btn"
            onClick={handleSimulateParticipant}
            disabled={isSimulating}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-white bg-purple-600/60 hover:bg-purple-600 border border-purple-400/50 transition-colors cursor-pointer"
            title="Add a sample student to test live response tracking"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{isSimulating ? "Adding..." : "+ Test Student"}</span>
          </button>

          {onOpenQuizManager && (
            <button
              type="button"
              id="host-question-bank-btn"
              onClick={onOpenQuizManager}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Question Bank</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleSound}
            className={`p-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              soundEnabled
                ? "bg-purple-500/40 text-purple-200 border-purple-400"
                : "bg-white/10 text-slate-400 border-white/10 hover:text-white"
            }`}
            title={soundEnabled ? "Audio On" : "Audio Muted"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Broadcast Progress</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
            Q {currentNum} <span className="text-xs text-slate-400 font-sans font-normal">/ {totalQuestions}</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-purple-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.round((currentNum / totalQuestions) * 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Time Remaining</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-extrabold font-mono flex items-center gap-1.5 ${
              isLastFiveSeconds ? "text-rose-600 animate-pulse" : "text-slate-900"
            }`}
          >
            <span>{questionTimeRemaining}s</span>
            {isLastFiveSeconds && (
              <span className="text-[10px] uppercase font-sans font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
                Ending
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Auto-advances on 0s</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Connected Players</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
            {totalParticipants}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Synced
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Locked Responses</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
            {submissionsCount}{" "}
            <span className="text-xs text-slate-400 font-sans font-normal">/ {totalParticipants}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{submissionPercent}% submission rate</div>
        </div>
      </div>

      {/* Host Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("broadcast")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "broadcast"
              ? "bg-purple-100 text-purple-900 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Shield className="w-4 h-4 text-purple-700" />
          <span>Active Broadcast & Solution</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("participants")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "participants"
              ? "bg-purple-100 text-purple-900 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Users className="w-4 h-4 text-purple-700" />
          <span>Live Participant Status ({totalParticipants})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("leaderboard")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "leaderboard"
              ? "bg-purple-100 text-purple-900 shadow-2xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Award className="w-4 h-4 text-purple-700" />
          <span>Live Leaderboard Standings</span>
        </button>
      </div>

      {/* Tab 1: Live Broadcast & Solution */}
      {activeTab === "broadcast" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Question Card */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
                Broadcasting Question {currentNum} of {totalQuestions}
              </span>
              <span className="text-xs font-medium text-slate-500">
                Type: {questionData?.type === "checkbox" ? "Multiple Selection" : "Single Choice (Radio)"}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              {currentQuestion?.question_text ||
                questionData?.question_text ||
                "Loading question..."}
            </h2>

            {/* Options list with Host-Only Correct Answer Highlight */}
            <div className="space-y-3">
              {optionsList.map((opt, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const isCorrect = correctAnswer.includes(opt);

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border text-sm flex items-center justify-between transition-all ${
                      isCorrect
                        ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold ring-2 ring-emerald-200 shadow-2xs"
                        : "bg-slate-50/70 border-slate-200 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isCorrect ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {letter}
                      </div>
                      <span>{opt}</span>
                    </div>

                    {isCorrect && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        Official Answer
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Explanation card */}
            {questionData?.explanation && (
              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/80 text-xs text-purple-950 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Answer Explanation for Moderator: </strong>
                  <span>{questionData.explanation}</span>
                </div>
              </div>
            )}
          </div>

          {/* Side Panel: Live Submission Gauge & Quick Tips */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>Live Student Submissions</span>
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-600 font-medium">
                  <span>Completed responses:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {submissionsCount} of {totalParticipants}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                  <motion.div
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full rounded-full"
                    animate={{ width: `${submissionPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-2">
                <p>
                  Questions advance automatically when the countdown expires. All connected devices
                  remain locked in sync.
                </p>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-600">
                  Broadcast status: ACTIVE
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Live Participant Roster */}
      {activeTab === "participants" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-900">Connected Participant Roster</h3>
              <p className="text-xs text-slate-500">
                Track individual answering progress and connection status in real-time.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
              {totalParticipants} {totalParticipants === 1 ? "Student" : "Students"}
            </span>
          </div>

          {participants.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No students have joined yet. Use "+ Test Student" to add sample participants.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {participants.map((p, i) => {
                const ans =
                  p.answers?.[currentQIndexKey] ??
                  (currentQIdKey ? p.answers?.[currentQIdKey] : undefined);
                const hasAnswered =
                  ans !== undefined &&
                  ans !== null &&
                  (Array.isArray(ans) ? ans.length > 0 : String(ans).trim() !== "");

                return (
                  <div
                    key={p.usn || i}
                    className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                      hasAnswered
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                        : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900">{p.name || "Student"}</div>
                      <div className="font-mono text-[11px] text-slate-500">{p.usn}</div>
                      {p.department && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{p.department}</div>
                      )}
                    </div>

                    <div className="text-right">
                      {hasAnswered ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Check className="w-3 h-3 text-emerald-700" />
                          Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[10px] bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-700" />
                          Thinking
                        </span>
                      )}
                      <div className="text-[11px] font-mono text-slate-600 mt-1">
                        Score: {p.score ?? 0}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Live Leaderboard Standings */}
      {activeTab === "leaderboard" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-900">Live Leaderboard Standings</h3>
              <p className="text-xs text-slate-500">
                Synchronized score rankings updated in real-time as answers are evaluated.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
              Live Scores
            </span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Scores will populate automatically as students submit responses.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Participant</th>
                    <th className="py-2.5 px-3">USN</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-right">Score</th>
                    <th className="py-2.5 px-3 text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboard.map((item, idx) => (
                    <tr key={item.student?.usn || idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold font-mono">
                        {idx === 0 ? "🥇 1" : idx === 1 ? "🥈 2" : idx === 2 ? "🥉 3" : idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {item.student?.name || "Student"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {item.student?.usn}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {item.student?.department || "General"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-indigo-600 font-mono">
                        {item.score} / {item.total}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                        {item.percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
