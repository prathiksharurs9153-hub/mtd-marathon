import React, { useState } from "react";
import { useQuizSocket } from "../context/SocketContext";
import {
  Users,
  Play,
  UserPlus,
  Shield,
  Copy,
  Check,
  Clock,
  Sparkles,
  Volume2,
  AlertCircle,
  HelpCircle,
  Hash,
  GraduationCap,
  Radio,
  BookOpen,
} from "lucide-react";

export const WaitingScreen: React.FC = () => {
  const {
    quizId,
    isHost,
    studentData,
    participants,
    startQuizSequence,
    clientQuestions,
  } = useQuizSocket();

  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [testBeepPlayed, setTestBeepPlayed] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(quizId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateParticipant = async () => {
    setIsSimulating(true);
    try {
      await fetch("/api/simulate-participant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId,
          name: `Sample Student ${Math.floor(10 + Math.random() * 90)}`,
          usn: `USN-2026-${Math.floor(100 + Math.random() * 900)}`,
        }),
      });
    } catch (e) {
      console.warn("Could not simulate participant:", e);
    } finally {
      setIsSimulating(false);
    }
  };

  // Play a gentle audio chime to test browser audio
  const playTestAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
        setTestBeepPlayed(true);
        setTimeout(() => setTestBeepPlayed(false), 2000);
      }
    } catch (e) {
      console.warn("Audio Context not ready:", e);
    }
  };

  return (
    <div id="waiting-screen" className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Role-Specific Header Banner */}
      <div
        className={`rounded-2xl p-5 sm:p-6 text-white shadow-sm border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isHost
            ? "bg-gradient-to-r from-purple-900 to-indigo-900 border-purple-800"
            : "bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border-indigo-800"
        }`}
      >
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                isHost
                  ? "bg-purple-500/30 text-purple-200 border-purple-400/40"
                  : "bg-blue-500/30 text-blue-200 border-blue-400/40"
              }`}
            >
              {isHost ? <Shield className="w-3.5 h-3.5" /> : <GraduationCap className="w-3.5 h-3.5" />}
              {isHost ? "Host Broadcast Center" : "Participant Holding Station"}
            </span>
            <span className="text-xs text-slate-300 font-mono">Room: {quizId}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {isHost ? "Lobby Session Master Controls" : "Awaiting Host Quiz Broadcast"}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {isHost
              ? "All joined participants are held here. When ready, click 'Start Quiz Sequence' to broadcast questions simultaneously."
              : `Welcome, ${studentData?.name || "Participant"}! You are checked in with USN ${studentData?.usn || "N/A"}. The exam will begin when the host broadcasts Question 1.`}
          </p>
        </div>

        {/* Room Code Quick Box */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20 flex items-center justify-between sm:justify-start gap-4">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-300">Room Code</div>
            <div className="text-lg font-mono font-black text-white">{quizId}</div>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Copy Code"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Waiting Action Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Lobby Active & Synced
              </div>
              <div className="text-sm font-semibold text-slate-700">
                Socket.IO Real-Time Session Channel
              </div>
            </div>
          </div>

          {/* Connected Count Indicator */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-center">
              <div className="text-2xl font-black text-indigo-600 font-mono">
                {participants.length}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Joined
              </div>
            </div>
          </div>
        </div>

        {/* Role-Specific Action Zone */}
        <div className="pt-6">
          {isHost ? (
            /* Host Controls */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-purple-50/70 border border-purple-200">
                <div>
                  <h3 className="font-bold text-sm text-purple-950 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    Host Broadcast Controls
                  </h3>
                  <p className="text-xs text-purple-700 mt-0.5">
                    Clicking "Start Quiz Sequence" broadcasts Question 1 to all joined student screens concurrently.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="host-add-sample-btn"
                    onClick={handleSimulateParticipant}
                    disabled={isSimulating}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-purple-800 bg-white hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
                    title="Add a sample student to test leaderboard & competition"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isSimulating ? "Adding..." : "+ Test Student"}</span>
                  </button>

                  <button
                    type="button"
                    id="host-start-quiz-btn"
                    onClick={startQuizSequence}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl text-white bg-purple-600 hover:bg-purple-700 shadow-sm shadow-purple-200 transition-all cursor-pointer active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Start Quiz Sequence</span>
                  </button>
                </div>
              </div>

              {participants.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    No participants have joined yet. You can open a second browser window with this Quiz ID
                    or click <strong>"+ Test Student"</strong> to preview the multi-user experience.
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Student Waiting Status */
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Clock className="w-6 h-6 animate-spin text-indigo-600" style={{ animationDuration: "8s" }} />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white animate-ping" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <span>Awaiting Host broadcast signal...</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Stay on this screen. As soon as the host triggers the quiz, Question 1 will launch automatically.
                  </p>
                </div>
              </div>

              {/* Test Audio Button */}
              <button
                type="button"
                id="student-test-audio-btn"
                onClick={playTestAudio}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  testBeepPlayed
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
                title="Test timer alert audio"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{testBeepPlayed ? "Audio Ready!" : "Test Audio Chime"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Participant Roster Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Connected Participants ({participants.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Live Roster</span>
        </div>

        {participants.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-medium">
            Waiting for students to join room {quizId}...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {participants.map((p, idx) => (
              <div
                key={p.usn || idx}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                  p.usn === studentData?.usn
                    ? "bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-200/60"
                    : "bg-slate-50/60 border-slate-200"
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                  {p.name ? p.name.charAt(0).toUpperCase() : "S"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                    <span>{p.name || "Student"}</span>
                    {p.usn === studentData?.usn && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-600 text-white font-semibold">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 truncate">
                    {p.usn}
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Connected" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
