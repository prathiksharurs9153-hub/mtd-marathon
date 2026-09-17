import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SocketProvider, useQuizSocket } from "./context/SocketContext";
import { Header } from "./components/Header";
import { JoinScreen } from "./components/JoinScreen";
import { WaitingScreen } from "./components/WaitingScreen";
import { QuizScreen } from "./components/QuizScreen";
import { CompletedTransition } from "./components/CompletedTransition";
import { ResultsScreen } from "./components/ResultsScreen";
import { QuizManagerModal } from "./components/QuizManagerModal";

const QuizAppContent: React.FC = () => {
  const { quizState, joinQuizSession } = useQuizSocket();
  const [isQuizManagerOpen, setIsQuizManagerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Header onOpenQuizManager={() => setIsQuizManagerOpen(true)} />

      {/* Main Dynamic Viewport with Route Transition */}
      <main className="flex-1 flex flex-col justify-center px-2 sm:px-4 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={quizState}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            {quizState === "join" && (
              <JoinScreen onOpenQuizManager={() => setIsQuizManagerOpen(true)} />
            )}
            {quizState === "waiting" && <WaitingScreen />}
            {quizState === "in_quiz" && (
              <QuizScreen onOpenQuizManager={() => setIsQuizManagerOpen(true)} />
            )}
            {quizState === "completed_transition" && <CompletedTransition />}
            {quizState === "results" && <ResultsScreen />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Question Bank / Quiz Config Modal */}
      <QuizManagerModal
        isOpen={isQuizManagerOpen}
        onClose={() => setIsQuizManagerOpen(false)}
        onSelectQuizToJoin={(selectedId) => {
          // prefill into join flow
          joinQuizSession(selectedId, false);
        }}
      />

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200/60 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MTD Marathon — High-Performance Real-Time Quiz Portal</span>
          <span className="font-mono text-[11px] text-slate-400">
            Powered by Express • Socket.IO • React 19 • Tailwind CSS
          </span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <SocketProvider>
      <QuizAppContent />
    </SocketProvider>
  );
}
