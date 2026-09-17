import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuizSocket } from "../context/SocketContext";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Volume2,
  VolumeX,
  Check,
  Shield,
  HelpCircle,
  CheckCheck,
  Sparkles,
  Lock,
} from "lucide-react";

export const QuizScreen: React.FC = () => {
  const {
    isHost,
    currentQuestion,
    currentQuestionIndex,
    questionTimeRemaining,
    clientQuestions,
    studentAnswers,
    recordAnswer,
    submitCurrentAnswers,
    isAnswerSubmittedForCurrent,
  } = useQuizSocket();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState(false);

  // Audio beep generator via Web Audio API
  const playTickSound = (isUrgent: boolean = false) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(isUrgent ? 880 : 440, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToTime(0.001, ctx.currentTime + (isUrgent ? 0.08 : 0.04));

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (isUrgent ? 0.08 : 0.04));
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Find question definition in clientQuestions or currentQuestion
  const questionData = useMemo(() => {
    if (clientQuestions && clientQuestions.length > currentQuestionIndex && currentQuestionIndex >= 0) {
      return clientQuestions[currentQuestionIndex];
    }
    return null;
  }, [clientQuestions, currentQuestionIndex]);

  const questionType = questionData?.type || currentQuestion?.type_choice || "radio";

  // Reset selections when question index advances
  useEffect(() => {
    setIsLocked(false);
    const existing = studentAnswers[String(currentQuestionIndex)];
    if (existing) {
      if (Array.isArray(existing)) {
        setSelectedCheckboxes(existing);
        setSelectedOption("");
      } else {
        setSelectedOption(existing);
        setSelectedCheckboxes([]);
      }
      setIsLocked(true);
    } else {
      setSelectedOption("");
      setSelectedCheckboxes([]);
    }
  }, [currentQuestionIndex]);

  // Audio cue when timer runs low
  useEffect(() => {
    if (questionTimeRemaining <= 3 && questionTimeRemaining > 0) {
      playTickSound(true);
    }
  }, [questionTimeRemaining]);

  // Auto-lock and submit when timer hits 0
  useEffect(() => {
    if (questionTimeRemaining === 0 && !isLocked && !isHost) {
      handleLockAnswer();
    }
  }, [questionTimeRemaining, isLocked, isHost]);

  const handleSelectRadio = (opt: string) => {
    if (isLocked) return;
    setSelectedOption(opt);
    recordAnswer(currentQuestionIndex, opt);
  };

  const handleToggleCheckbox = (opt: string) => {
    if (isLocked) return;
    const next = selectedCheckboxes.includes(opt)
      ? selectedCheckboxes.filter((x) => x !== opt)
      : [...selectedCheckboxes, opt];
    setSelectedCheckboxes(next);
    recordAnswer(currentQuestionIndex, next);
  };

  const handleLockAnswer = () => {
    if (isLocked) return;
    setIsLocked(true);
    const finalAnswer = questionType === "checkbox" ? selectedCheckboxes : selectedOption;
    recordAnswer(currentQuestionIndex, finalAnswer);
    submitCurrentAnswers();
  };

  const totalQuestions = currentQuestion?.total || clientQuestions.length || 1;
  const currentNum = (currentQuestionIndex >= 0 ? currentQuestionIndex : 0) + 1;
  const progressPercent = Math.min(100, Math.round((currentNum / totalQuestions) * 100));

  // Determine timer color theme
  const timerTheme =
    questionTimeRemaining <= 4
      ? "text-rose-600 bg-rose-50 border-rose-200 animate-pulse"
      : questionTimeRemaining <= 8
      ? "text-amber-600 bg-amber-50 border-amber-200"
      : "text-emerald-600 bg-emerald-50 border-emerald-200";

  // If host is watching questions without options in currentQuestion, show from clientQuestions
  const optionsList = questionData?.options || [];

  return (
    <div id="quiz-screen" className="max-w-3xl mx-auto py-6 sm:py-8 px-4">
      {/* Top Header Bar: Progress & Audio Toggle */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-xs font-bold uppercase tracking-wider">
              Question {currentNum} of {totalQuestions}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {questionType === "checkbox" ? "Multiple Choice" : "Single Choice"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Audio toggle button */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title={soundEnabled ? "Mute Timer Tick" : "Enable Timer Tick"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Prominent Live Timer */}
          <div
            id="quiz-timer-badge"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-sm font-mono font-extrabold shadow-xs transition-colors ${timerTheme}`}
          >
            <Clock className="w-4 h-4" />
            <span>
              {questionTimeRemaining < 10 ? `0${questionTimeRemaining}` : questionTimeRemaining}s
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-6 border border-slate-200/60">
        <div
          className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Question Box */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 mb-6">
        {/* Question Text */}
        <h2
          id="question-text"
          className="text-lg sm:text-xl font-bold text-slate-900 leading-snug tracking-tight mb-6"
        >
          {currentQuestion?.question_text || questionData?.question_text || "Loading synchronized question..."}
        </h2>

        {/* Options List */}
        <div className="space-y-3">
          {optionsList.map((option, idx) => {
            const letterLabel = String.fromCharCode(65 + idx);
            const isSelected =
              questionType === "checkbox"
                ? selectedCheckboxes.includes(option)
                : selectedOption === option;

            // In host view, highlight correct answer if known
            const isCorrectOption =
              isHost && questionData?.correct_answer?.includes(option);

            return (
              <button
                key={idx}
                type="button"
                disabled={isLocked || isHost}
                onClick={() =>
                  questionType === "checkbox"
                    ? handleToggleCheckbox(option)
                    : handleSelectRadio(option)
                }
                className={`w-full text-left p-4 rounded-xl border text-sm sm:text-base flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? "bg-indigo-50/80 border-indigo-600 text-indigo-950 font-semibold ring-2 ring-indigo-200"
                    : isCorrectOption
                    ? "bg-emerald-50/60 border-emerald-400 text-emerald-900 font-semibold"
                    : "bg-slate-50/50 hover:bg-slate-100/80 border-slate-200 text-slate-800"
                } ${isLocked ? "cursor-not-allowed opacity-90" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : isCorrectOption
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {letterLabel}
                  </div>
                  <span>{option}</span>
                </div>

                {isSelected && (
                  <Check className="w-5 h-5 text-indigo-600 shrink-0" />
                )}
                {isCorrectOption && (
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    Correct Answer
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Student Lock & Action Bar */}
        {!isHost ? (
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              {isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">
                    Response locked and submitted to server.
                  </span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Selection will auto-lock when timer ends, or lock manually now.
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              id="quiz-lock-answer-btn"
              disabled={
                isLocked ||
                (questionType === "checkbox"
                  ? selectedCheckboxes.length === 0
                  : !selectedOption)
              }
              onClick={handleLockAnswer}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                isLocked
                  ? "bg-emerald-100 text-emerald-800 cursor-default"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 shadow-xs"
              }`}
            >
              {isLocked ? (
                <>
                  <CheckCheck className="w-4 h-4" />
                  <span>Answer Locked</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Lock Answer</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Host Moderator Info */
          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-purple-900 bg-purple-50/60 p-4 rounded-xl border border-purple-100">
            <div className="flex items-center gap-2 font-semibold">
              <Shield className="w-4 h-4 text-purple-600" />
              <span>Host Live Broadcast Active</span>
            </div>
            <span className="font-mono text-purple-700">
              Next question advances automatically on timer expiration.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
