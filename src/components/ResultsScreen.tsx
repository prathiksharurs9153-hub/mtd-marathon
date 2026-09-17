import React, { useState, useEffect, useMemo } from "react";
import confetti from "canvas-confetti";
import { useQuizSocket } from "../context/SocketContext";
import { soundEffects } from "../utils/soundEffects";
import {
  Trophy,
  Medal,
  Award,
  Search,
  Download,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  Volume2,
  Shield,
  GraduationCap,
  BarChart3,
  Users,
} from "lucide-react";

export const ResultsScreen: React.FC = () => {
  const {
    quizId,
    isHost,
    studentData,
    leaderboard,
    clientQuestions,
    studentAnswers,
    fetchLeaderboard,
    setQuizState,
  } = useQuizSocket();

  const [searchQuery, setSearchQuery] = useState("");
  const [showQuestionReview, setShowQuestionReview] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Host class statistics
  const hostStats = useMemo(() => {
    if (!leaderboard || leaderboard.length === 0) {
      return { count: 0, avgScore: "0.0", avgPct: 0, topScore: 0, perfectCount: 0 };
    }
    const count = leaderboard.length;
    const totalScores = leaderboard.reduce((acc, curr) => acc + (curr.score || 0), 0);
    const totalPercentages = leaderboard.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
    const topScore = Math.max(...leaderboard.map((l) => l.score || 0));
    const perfectCount = leaderboard.filter((l) => l.percentage === 100).length;

    return {
      count,
      avgScore: (totalScores / count).toFixed(1),
      avgPct: Math.round(totalPercentages / count),
      topScore,
      perfectCount,
    };
  }, [leaderboard]);

  // Trigger celebration confetti
  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // Confetti fallback
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLeaderboard();
    setIsRefreshing(false);
  };

  // Find student's own record in the leaderboard
  const myRecord = useMemo(() => {
    if (!studentData?.usn) return null;
    const index = leaderboard.findIndex(
      (r) => r.student?.usn?.toUpperCase() === studentData.usn.toUpperCase()
    );
    if (index !== -1) {
      return { ...leaderboard[index], rank: index + 1 };
    }
    return null;
  }, [leaderboard, studentData]);

  // Top 3 Podium
  const topThree = useMemo(() => {
    return leaderboard.slice(0, 3);
  }, [leaderboard]);

  // Filtered leaderboard table
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return leaderboard;
    const q = searchQuery.toLowerCase();
    return leaderboard.filter(
      (entry) =>
        entry.student?.name?.toLowerCase().includes(q) ||
        entry.student?.usn?.toLowerCase().includes(q)
    );
  }, [leaderboard, searchQuery]);

  // CSV Export
  const handleExportCSV = () => {
    if (leaderboard.length === 0) return;
    const headers = ["Rank", "Name", "USN", "Department", "Score", "Total", "Percentage"];
    const rows = leaderboard.map((item, idx) => [
      idx + 1,
      `"${item.student?.name || "Student"}"`,
      `"${item.student?.usn || ""}"`,
      `"${item.student?.department || ""}"`,
      item.score,
      item.total,
      `${item.percentage}%`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MTD_Marathon_${quizId}_Leaderboard.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="results-screen" className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Role-Specific Header Banner */}
      <div
        className={`rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${
          isHost
            ? "bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 shadow-purple-950/20 border border-purple-800/40"
            : "bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 shadow-indigo-950/20 border border-indigo-800/40"
        }`}
      >
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 backdrop-blur border border-white/20">
            {isHost ? (
              <>
                <Shield className="w-3.5 h-3.5 text-purple-300" />
                <span className="text-purple-200">Host Command Dashboard</span>
              </>
            ) : (
              <>
                <GraduationCap className="w-3.5 h-3.5 text-indigo-300" />
                <span className="text-indigo-200">Participant Performance Portal</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isHost ? "Class Evaluation & Gradebook" : "Quiz Results & Personal Scorecard"}
          </h1>
          <p className="text-xs text-slate-300 max-w-xl">
            {isHost
              ? `Room ${quizId} • Session complete. Analyze aggregate class metrics, download the full gradebook, or inspect individual participant accuracy below.`
              : `Room ${quizId} • Congratulations on completing the marathon! Review your official standing, breakdown of questions, and leaderboard placement.`}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          {isHost ? (
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Gradebook CSV</span>
            </button>
          ) : (
            myRecord && (
              <div className="bg-white/10 backdrop-blur rounded-2xl px-5 py-3 text-center border border-white/15">
                <div className="text-[10px] uppercase tracking-wider text-indigo-200 font-bold">
                  Final Rank
                </div>
                <div className="text-3xl font-black text-amber-300">#{myRecord.rank}</div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Host Aggregate Analytics Grid (Visible only to Host) */}
      {isHost && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 text-center">
            <div className="w-8 h-8 mx-auto rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-2">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{hostStats.count}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              Total Graded
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 text-center">
            <div className="w-8 h-8 mx-auto rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-2">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-indigo-600 font-mono">{hostStats.avgScore}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              Class Avg Score
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 text-center">
            <div className="w-8 h-8 mx-auto rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">{hostStats.topScore}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              Highest Score
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 text-center">
            <div className="w-8 h-8 mx-auto rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-2">
              <Award className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-amber-600 font-mono">{hostStats.avgPct}%</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              Class Accuracy
            </div>
          </div>
        </div>
      )}

      {/* Student Personal Performance Summary Card (Visible only to Student) */}
      {!isHost && myRecord && (
        <div
          id="student-scorecard"
          className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Participant Examination Summary
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {studentData?.name || "Student"}
              </h2>
              <p className="text-xs font-mono text-slate-500">
                USN: {studentData?.usn} {studentData?.department ? `• ${studentData.department}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {/* Rank */}
              <div className="bg-amber-50 rounded-2xl px-5 py-3 text-center border border-amber-200">
                <div className="text-[10px] uppercase tracking-wider text-amber-800 font-bold">
                  Class Rank
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-600">
                  #{myRecord.rank}
                </div>
              </div>

              {/* Score */}
              <div className="bg-indigo-50 rounded-2xl px-5 py-3 text-center border border-indigo-200">
                <div className="text-[10px] uppercase tracking-wider text-indigo-800 font-bold">
                  Total Score
                </div>
                <div className="text-2xl sm:text-3xl font-black text-indigo-600">
                  {myRecord.score}
                  <span className="text-xs font-normal text-indigo-500">/{myRecord.total}</span>
                </div>
              </div>

              {/* Percentage */}
              <div className="bg-emerald-50 rounded-2xl px-5 py-3 text-center border border-emerald-200">
                <div className="text-[10px] uppercase tracking-wider text-emerald-800 font-bold">
                  Accuracy
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600">
                  {myRecord.percentage}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium (if >= 1 participant) */}
      {topThree.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center mb-6">
            Winners Podium
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end max-w-2xl mx-auto">
            {/* Rank 2 (Silver) */}
            {topThree[1] ? (
              <div className="order-2 sm:order-1 bg-slate-50 rounded-2xl border border-slate-200 p-4 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 shadow-sm">
                  🥈
                </div>
                <div className="font-bold text-sm text-slate-900 truncate">
                  {topThree[1].student?.name || "Student"}
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  {topThree[1].student?.usn}
                </div>
                <div className="text-base font-black text-indigo-600">
                  {topThree[1].score}/{topThree[1].total} ({topThree[1].percentage}%)
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">2nd Place</div>
              </div>
            ) : (
              <div className="order-2 sm:order-1 hidden sm:block" />
            )}

            {/* Rank 1 (Gold) */}
            {topThree[0] && (
              <div className="order-1 sm:order-2 bg-gradient-to-b from-amber-50 to-white rounded-2xl border-2 border-amber-300 p-6 text-center space-y-2 -translate-y-2 shadow-md shadow-amber-100">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-400 flex items-center justify-center text-xl shadow-md">
                  👑
                </div>
                <div className="font-extrabold text-base text-slate-900 truncate">
                  {topThree[0].student?.name || "Student"}
                </div>
                <div className="text-xs font-mono text-slate-500">
                  {topThree[0].student?.usn}
                </div>
                <div className="text-xl font-black text-amber-600">
                  {topThree[0].score}/{topThree[0].total} ({topThree[0].percentage}%)
                </div>
                <div className="text-xs font-extrabold text-amber-700 uppercase tracking-wider">
                  1st Place Champion
                </div>
              </div>
            )}

            {/* Rank 3 (Bronze) */}
            {topThree[2] ? (
              <div className="order-3 bg-amber-50/40 rounded-2xl border border-amber-200/60 p-4 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-amber-200 flex items-center justify-center font-bold text-amber-800 shadow-sm">
                  🥉
                </div>
                <div className="font-bold text-sm text-slate-900 truncate">
                  {topThree[2].student?.name || "Student"}
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  {topThree[2].student?.usn}
                </div>
                <div className="text-base font-black text-indigo-600">
                  {topThree[2].score}/{topThree[2].total} ({topThree[2].percentage}%)
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">3rd Place</div>
              </div>
            ) : (
              <div className="order-3 hidden sm:block" />
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Controls bar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name or USN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 text-center w-16">Rank</th>
                <th className="py-3.5 px-4">Participant</th>
                <th className="py-3.5 px-4 font-mono">USN</th>
                <th className="py-3.5 px-4 text-center">Score</th>
                <th className="py-3.5 px-4 text-center">Percentage</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No matching participants found on leaderboard.
                  </td>
                </tr>
              ) : (
                filteredList.map((entry, idx) => {
                  const isCurrent =
                    studentData?.usn &&
                    entry.student?.usn?.toUpperCase() === studentData.usn.toUpperCase();

                  return (
                    <tr
                      key={entry.student?.usn || idx}
                      className={`transition-colors ${
                        isCurrent
                          ? "bg-indigo-50/80 font-bold"
                          : "hover:bg-slate-50/70 text-slate-700"
                      }`}
                    >
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {idx === 0 ? "🥇 1" : idx === 1 ? "🥈 2" : idx === 2 ? "🥉 3" : `#${idx + 1}`}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-900 font-semibold">
                            {entry.student?.name || "Student"}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {entry.student?.usn}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-indigo-700">
                        {entry.score} / {entry.total}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-emerald-600">
                        {entry.percentage}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {entry.status || "Completed"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Answer Review Section (for Students and Hosts) */}
      {clientQuestions && clientQuestions.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowQuestionReview(!showQuestionReview)}>
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                Question Breakdown & Explanations ({clientQuestions.length} Questions)
              </h3>
            </div>
            <button
              type="button"
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              {showQuestionReview ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {showQuestionReview && (
            <div className="mt-6 space-y-4 pt-4 border-t border-slate-100">
              {clientQuestions.map((q, idx) => {
                const userAns = studentAnswers[String(idx)];
                const isCorrect = Array.isArray(userAns)
                  ? userAns.sort().join(",") === q.correct_answer.split(",").sort().join(",")
                  : String(userAns || "").trim().toLowerCase() === q.correct_answer.trim().toLowerCase();

                return (
                  <div
                    key={q.question_id || idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-slate-900">
                        <span className="text-indigo-600 font-mono mr-1.5">Q{idx + 1}.</span>
                        {q.question_text}
                      </div>
                      {!isHost && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isCorrect ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3.5 h-3.5" /> Incorrect
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              isCorrect
                                ? soundEffects.playCorrectSound()
                                : soundEffects.playIncorrectSound()
                            }
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title={isCorrect ? "Play correct chime" : "Play incorrect tone"}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Choices preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                      {q.options.map((opt, optIdx) => {
                        const isThisCorrect = q.correct_answer.includes(opt);
                        const isThisChosen = Array.isArray(userAns)
                          ? userAns.includes(opt)
                          : userAns === opt;

                        return (
                          <div
                            key={optIdx}
                            className={`p-2 rounded-lg border flex items-center justify-between ${
                              isThisCorrect
                                ? "bg-emerald-50 border-emerald-300 font-bold text-emerald-950"
                                : isThisChosen && !isThisCorrect
                                ? "bg-rose-50 border-rose-300 text-rose-950 line-through"
                                : "bg-white border-slate-200 text-slate-700"
                            }`}
                          >
                            <span>{opt}</span>
                            {isThisCorrect && (
                              <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded">
                                Correct
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="text-xs text-slate-600 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
                        <strong className="text-indigo-950">Explanation: </strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="text-center pt-4">
        <button
          type="button"
          id="results-return-lobby-btn"
          onClick={() => setQuizState("join")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Exit to Home & Join Another Quiz</span>
        </button>
      </div>
    </div>
  );
};
