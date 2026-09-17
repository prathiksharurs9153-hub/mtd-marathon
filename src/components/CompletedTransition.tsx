import React from "react";
import { useQuizSocket } from "../context/SocketContext";
import { CheckCircle2, Sparkles, Loader2, Trophy, ArrowRight } from "lucide-react";

export const CompletedTransition: React.FC = () => {
  const { isHost, setQuizState, fetchLeaderboard, quizId } = useQuizSocket();

  const handleSkipToResults = () => {
    fetchLeaderboard(quizId);
    setQuizState("results");
  };

  return (
    <div id="completed-transition-screen" className="max-w-md mx-auto py-16 px-4 text-center">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-200">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            Marathon Concluded
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-3">
            Quiz Completed!
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            All questions have concluded. Responses have been securely transmitted to the server for evaluation.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs font-medium text-indigo-700 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Tabulating scores & building leaderboard...</span>
        </div>

        <div>
          <button
            type="button"
            id="view-results-now-btn"
            onClick={handleSkipToResults}
            className="w-full py-3 px-5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Trophy className="w-4 h-4" />
            <span>View Leaderboard & Results</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
