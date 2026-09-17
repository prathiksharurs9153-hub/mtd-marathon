import React, { useState, useEffect } from "react";
import { useQuizSocket } from "../context/SocketContext";
import {
  Users,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Layers,
  BookOpen,
} from "lucide-react";

interface JoinScreenProps {
  onOpenQuizManager?: () => void;
}

export const JoinScreen: React.FC<JoinScreenProps> = ({ onOpenQuizManager }) => {
  const { joinQuizSession, error, clearError } = useQuizSocket();

  const [role, setRole] = useState<"student" | "host">("student");
  const [selectedQuizId, setSelectedQuizId] = useState<string>("MTD-2026");
  const [customQuizId, setCustomQuizId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [usn, setUsn] = useState<string>("");
  const [department, setDepartment] = useState<string>("Computer Science");
  const [availableQuizzes, setAvailableQuizzes] = useState<
    Array<{ quizId: string; title: string; questionCount: number }>
  >([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);

  // Fetch available quizzes list from backend
  useEffect(() => {
    let isMounted = true;
    setIsLoadingQuizzes(true);
    fetch("/api/quizzes")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.quizzes)) {
          setAvailableQuizzes(data.quizzes);
        }
      })
      .catch((e) => {
        console.warn("Could not fetch quizzes:", e);
      })
      .finally(() => {
        if (isMounted) setIsLoadingQuizzes(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);

    const activeId = (customQuizId.trim() || selectedQuizId).toUpperCase();
    if (!activeId) {
      setValidationError("Please select or enter a valid Quiz ID.");
      return;
    }

    if (role === "student") {
      if (!name.trim()) {
        setValidationError("Please enter your full name.");
        return;
      }
      if (!usn.trim()) {
        setValidationError("Please enter your University Seat Number (USN).");
        return;
      }

      joinQuizSession(activeId, false, {
        name: name.trim(),
        usn: usn.trim().toUpperCase(),
        department: department.trim(),
      });
    } else {
      // Host join
      joinQuizSession(activeId, true);
    }
  };

  return (
    <div id="join-screen-container" className="max-w-4xl mx-auto py-6 sm:py-10 px-4">
      {/* Intro Header */}
      <div className="text-center max-w-2xl mx-auto mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Real-Time Synchronized Competition</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          MTD Marathon Portal
        </h1>
        <p className="mt-2 text-slate-600 text-sm sm:text-base">
          Select your dedicated portal below. Participants enter live competitions to answer timed questions, while Hosts broadcast synchronized timelines and monitor class submissions.
        </p>
      </div>

      {/* Dedicated Dashboard Selector Tabs */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="grid grid-cols-2 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300/80 shadow-xs">
          <button
            type="button"
            id="role-student-btn"
            onClick={() => {
              setRole("student");
              setValidationError(null);
            }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              role === "student"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/90 ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
            }`}
          >
            <Users className="w-4 h-4 text-indigo-600 shrink-0" />
            <div className="text-center sm:text-left">
              <div>Participant Dashboard</div>
              <div className="text-[10px] font-normal text-slate-500 hidden sm:block">
                Student Portal & Exam Station
              </div>
            </div>
          </button>

          <button
            type="button"
            id="role-host-btn"
            onClick={() => {
              setRole("host");
              setValidationError(null);
            }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              role === "host"
                ? "bg-white text-purple-800 shadow-sm border border-slate-200/90 ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
            <div className="text-center sm:text-left">
              <div>Host Command Dashboard</div>
              <div className="text-[10px] font-normal text-slate-500 hidden sm:block">
                Admin Center & Broadcast Control
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Main Join Card */}
        <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  role === "student"
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "bg-purple-50 text-purple-700 border-purple-200"
                }`}
              >
                {role === "student" ? "Participant Portal" : "Host Administration"}
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                {role === "student" ? "Student Exam Station Entry" : "Broadcast Session Launcher"}
              </h2>
            </div>

            {role === "host" && onOpenQuizManager && (
              <button
                type="button"
                onClick={onOpenQuizManager}
                className="text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Question Bank</span>
              </button>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleJoin} className="space-y-5">
            {/* Quiz ID Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Select Quiz Room
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {availableQuizzes.length > 0 ? (
                  availableQuizzes.map((q) => (
                    <button
                      key={q.quizId}
                      type="button"
                      onClick={() => {
                        setSelectedQuizId(q.quizId);
                        setCustomQuizId("");
                      }}
                      className={`text-left p-3 rounded-xl border text-xs transition-all ${
                        selectedQuizId === q.quizId && !customQuizId
                          ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-2 ring-indigo-200"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="font-mono text-xs font-bold text-indigo-600">
                        {q.quizId}
                      </div>
                      <div className="truncate text-slate-600 font-medium">
                        {q.title}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                        <Layers className="w-3 h-3" /> {q.questionCount} Questions
                      </div>
                    </button>
                  ))
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedQuizId("MTD-2026");
                        setCustomQuizId("");
                      }}
                      className={`text-left p-3 rounded-xl border text-xs transition-all ${
                        selectedQuizId === "MTD-2026" && !customQuizId
                          ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-2 ring-indigo-200"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="font-mono text-xs font-bold text-indigo-600">MTD-2026</div>
                      <div className="text-slate-600">Python Marathon</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedQuizId("ADV-PYTHON-2026");
                        setCustomQuizId("");
                      }}
                      className={`text-left p-3 rounded-xl border text-xs transition-all ${
                        selectedQuizId === "ADV-PYTHON-2026" && !customQuizId
                          ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-2 ring-indigo-200"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="font-mono text-xs font-bold text-indigo-600">ADV-PYTHON-2026</div>
                      <div className="text-slate-600">Advanced Concepts</div>
                    </button>
                  </>
                )}
              </div>

              {/* Custom Quiz ID input */}
              <div className="relative">
                <input
                  type="text"
                  id="custom-quiz-id-input"
                  placeholder="Or enter custom Quiz Code (e.g. MTD-2026)"
                  value={customQuizId}
                  onChange={(e) => setCustomQuizId(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                />
              </div>
            </div>

            {/* Student Specific Fields */}
            {role === "student" && (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Your Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="student-name-input"
                    required
                    placeholder="e.g. Prathiksha Urs"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      USN / Roll Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="student-usn-input"
                      required
                      placeholder="e.g. 1MS22CS089"
                      value={usn}
                      onChange={(e) => setUsn(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Department / College
                    </label>
                    <input
                      type="text"
                      id="student-dept-input"
                      placeholder="e.g. Computer Science"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Host Specific Info Banner */}
            {role === "host" && (
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-purple-800">
                  <ShieldCheck className="w-4 h-4" /> Host Administrative Controls
                </div>
                <p>
                  You will manage the session timeline, trigger questions simultaneously for all joined
                  students, and view real-time participant responses.
                </p>
              </div>
            )}

            {/* Validation or Socket Error */}
            {(validationError || error) && (
              <div
                id="join-error-banner"
                className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{validationError || error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              id="join-submit-btn"
              className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                role === "student"
                  ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 active:scale-[0.99]"
                  : "bg-purple-600 hover:bg-purple-700 shadow-purple-200 active:scale-[0.99]"
              }`}
            >
              <span>{role === "student" ? "Enter Waiting Lobby" : "Launch as Host"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Sidebar Info / Rules Card */}
        <div className="md:col-span-5 space-y-4">
          {role === "student" ? (
            /* Participant Sidebar */
            <>
              <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 sm:p-6 text-slate-700">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Participant Exam Station Protocol
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Synchronized Timers:</strong> Every question is broadcast concurrently with strict per-question countdowns and audible 5-second tick warnings.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Shuffled Options:</strong> Answer choices are randomized uniquely per participant to eliminate peeking.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Auto-Locking Submissions:</strong> Answers lock automatically when countdown hits 0:00, or upon clicking "Lock Answer".
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Personalized Scorecard:</strong> Review your individual score, accuracy %, and class podium ranking instantly.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Student Testing Tips */}
              <div className="bg-indigo-50/60 rounded-2xl border border-indigo-100 p-5 text-xs text-indigo-900">
                <div className="font-bold text-indigo-950 flex items-center gap-1.5 mb-1">
                  <HelpCircle className="w-4 h-4 text-indigo-600" /> Student Testing Tips
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Enter your real name and University Seat Number (USN). If testing solo, you can open a second incognito browser tab as Host to broadcast questions!
                </p>
              </div>
            </>
          ) : (
            /* Host Sidebar */
            <>
              <div className="bg-purple-50/70 rounded-2xl border border-purple-200/80 p-5 sm:p-6 text-purple-950">
                <h3 className="font-bold text-purple-900 text-sm flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Host Command Center Features
                </h3>
                <ul className="space-y-2.5 text-xs text-purple-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Live Timeline Broadcast:</strong> Trigger questions simultaneously to all joined devices with synchronized countdown timers.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Real-Time Answering Telemetry:</strong> Monitor live response rates (who has locked answers vs who is still thinking).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Sample Student Generator:</strong> Click "+ Test Student" inside the host dashboard to simulate participants and view leaderboard competition.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Gradebook CSV Export:</strong> Download comprehensive student scores, ranks, and percentages in a structured CSV report.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Host Quick Launcher */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-xs text-slate-700">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                  <BookOpen className="w-4 h-4 text-purple-600" /> Question Bank Customization
                </div>
                <p className="text-slate-500 leading-relaxed mb-3">
                  You can configure custom questions, adjust per-question timer durations, or add new multiple choice topics at any time.
                </p>
                {onOpenQuizManager && (
                  <button
                    type="button"
                    onClick={onOpenQuizManager}
                    className="w-full py-2 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-semibold text-slate-800 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span>Manage Quiz Question Banks</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
