import React, { useState } from "react";
import { motion } from "motion/react";
import { useQuizSocket } from "../context/SocketContext";
import { soundEffects } from "../utils/soundEffects";
import {
  Trophy,
  Wifi,
  WifiOff,
  LogOut,
  Shield,
  User,
  Users,
  Clock,
  Sparkles,
  BookOpen,
  Volume2,
  VolumeX,
} from "lucide-react";

interface HeaderProps {
  onOpenQuizManager?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenQuizManager }) => {
  const {
    isConnected,
    quizId,
    isHost,
    studentData,
    quizState,
    leaveQuizSession,
    participants,
  } = useQuizSocket();
  const [soundEnabled, setSoundEnabled] = useState(() => soundEffects.isEnabled());

  const handleToggleSound = () => {
    const next = soundEffects.toggle();
    setSoundEnabled(next);
  };

  // Compute live current player count from socket-synced participants roster
  const playerCount = Math.max(
    participants.length,
    quizState !== "join" && !isHost ? 1 : 0
  );

  return (
    <header
      id="app-header"
      className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/80 transition-all"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-lg sm:text-xl font-sans">
                MTD Marathon
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                Quiz Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block -mt-0.5">
              Host-driven synchronized real-time competition
            </p>
          </div>
        </div>

        {/* Status & User Info */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Connection Pill */}
          <div
            id="connection-indicator"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isConnected
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Synced</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Connecting</span>
              </>
            )}
          </div>

          {/* Quiz Badge if inside room */}
          {quizId && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-mono font-semibold border border-slate-200">
              <span className="text-slate-400">ID:</span>
              <span>{quizId}</span>
            </div>
          )}

          {/* Dynamic Current Players Count Indicator */}
          <div
            id="current-players-indicator"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              quizId && quizState !== "join"
                ? "bg-indigo-50/90 text-indigo-800 border-indigo-200/90 shadow-2xs"
                : "hidden sm:flex bg-slate-50 text-slate-500 border-slate-200"
            }`}
            title={
              quizId && quizState !== "join"
                ? `${playerCount} ${playerCount === 1 ? "player" : "players"} connected in real-time to quiz room ${quizId}`
                : "Dynamic player count updates in real-time upon joining a quiz session"
            }
          >
            {quizId && quizState !== "join" ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <div className="flex items-center gap-1 font-sans">
                  <span className="hidden lg:inline text-slate-500 text-[11px]">Players:</span>
                  <motion.span
                    key={playerCount}
                    initial={{ scale: 0.75, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="font-extrabold text-indigo-950 font-mono text-xs"
                  >
                    {playerCount}
                  </motion.span>
                </div>
                <span className="hidden md:inline lg:hidden text-indigo-700/80 text-[11px] font-medium">
                  {playerCount === 1 ? "Player" : "Players"}
                </span>
              </>
            ) : (
              <>
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 text-[11px]">0 Players</span>
              </>
            )}
          </div>

          {/* Host / Student Badge */}
          {quizId && (
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                isHost
                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                  : "bg-blue-100 text-blue-800 border border-blue-200"
              }`}
            >
              {isHost ? (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>Host Admin</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5" />
                  <span className="max-w-[100px] truncate">{studentData?.name || "Student"}</span>
                </>
              )}
            </div>
          )}

          {/* Audio Sound Effects Toggle */}
          <button
            type="button"
            id="header-audio-toggle-btn"
            onClick={handleToggleSound}
            className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              soundEnabled
                ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                : "border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            }`}
            title={
              soundEnabled
                ? "Sound Effects Active (5s Countdown Ticks, Correct/Incorrect Audio). Click to Mute."
                : "Sound Muted. Click to Enable."
            }
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Quiz Bank Modal Trigger for Host */}
          {onOpenQuizManager && (
            <button
              id="header-quiz-manager-btn"
              onClick={onOpenQuizManager}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
              title="View all quizzes & questions"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Quiz Bank</span>
            </button>
          )}

          {/* Leave Button */}
          {quizState !== "join" && (
            <button
              id="header-leave-btn"
              onClick={leaveQuizSession}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
              title="Leave Current Quiz"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
