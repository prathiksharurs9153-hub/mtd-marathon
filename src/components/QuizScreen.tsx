import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuizSocket } from "../context/SocketContext";
import { soundEffects } from "../utils/soundEffects";
import { HostQuizDashboard } from "./HostQuizDashboard";
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
  X,
  Info,
  User,
  GraduationCap,
} from "lucide-react";

interface QuizScreenProps {
  onOpenQuizManager?: () => void;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({ onOpenQuizManager }) => {
  const {
    isHost,
    studentData,
    currentQuestion,
    currentQuestionIndex,
    questionTimeRemaining,
    clientQuestions,
    studentAnswers,
    recordAnswer,
    submitCurrentAnswers,
  } = useQuizSocket();

  // If active user is Host, render the dedicated Host Command Dashboard
  if (isHost) {
    return <HostQuizDashboard onOpenQuizManager={onOpenQuizManager} />;
  }

  const [soundEnabled, setSoundEnabled] = useState(() => soundEffects.isEnabled());
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isCorrectEvaluation, setIsCorrectEvaluation] = useState<
    "correct" | "incorrect" | "unanswered" | null
  >(null);
  const [showAudioMenu, setShowAudioMenu] = useState(false);

  // Direction tracker for question transitions (forward or backward)
  const prevIndexRef = useRef(currentQuestionIndex);
  const direction = currentQuestionIndex >= prevIndexRef.current ? 1 : -1;

  useEffect(() => {
    prevIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  // Framer Motion variants for question entrance and exit transitions
  const questionCardVariants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: dir >= 0 ? 32 : -32,
      scale: 0.985,
      filter: "blur(3px)",
    }),
    center: {
      opacity: 1,
      x: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        duration: 0.32,
        ease: [0.22, 1, 0.36, 1],
      },
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir >= 0 ? -32 : 32,
      scale: 0.985,
      filter: "blur(3px)",
      transition: {
        duration: 0.22,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  };

  // Track the last second a countdown tick was played to avoid duplicate ticks
  const lastTickSecondRef = useRef<number | null>(null);

  // Toggle global audio sound effects
  const handleToggleSound = () => {
    const next = soundEffects.toggle();
    setSoundEnabled(next);
  };

  // Find question definition in clientQuestions or currentQuestion
  const questionData = useMemo(() => {
    if (
      clientQuestions &&
      clientQuestions.length > currentQuestionIndex &&
      currentQuestionIndex >= 0
    ) {
      return clientQuestions[currentQuestionIndex];
    }
    return null;
  }, [clientQuestions, currentQuestionIndex]);

  const questionType = questionData?.type || currentQuestion?.type_choice || "radio";

  // Helper to evaluate answer correctness
  const checkAnswerCorrectness = (
    userAns: string | string[],
    correctAns: string | undefined
  ): boolean => {
    if (!correctAns) return false;
    if (Array.isArray(userAns)) {
      if (userAns.length === 0) return false;
      const sortedUser = [...userAns].map((s) => s.trim().toLowerCase()).sort().join(",");
      const sortedCorrect = correctAns
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .sort()
        .join(",");
      return sortedUser === sortedCorrect;
    }
    return String(userAns).trim().toLowerCase() === correctAns.trim().toLowerCase();
  };

  // Reset selections & evaluation when question index advances
  useEffect(() => {
    setIsLocked(false);
    setIsCorrectEvaluation(null);
    lastTickSecondRef.current = null;

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
      // Re-evaluate existing answer if already submitted
      if (questionData?.correct_answer) {
        const isCorr = checkAnswerCorrectness(existing, questionData.correct_answer);
        setIsCorrectEvaluation(isCorr ? "correct" : "incorrect");
      }
    } else {
      setSelectedOption("");
      setSelectedCheckboxes([]);
    }
  }, [currentQuestionIndex]);

  // Audio cue: countdown 'tick' sound during the last five seconds of a question (5, 4, 3, 2, 1)
  useEffect(() => {
    if (questionTimeRemaining <= 5 && questionTimeRemaining > 0) {
      if (lastTickSecondRef.current !== questionTimeRemaining) {
        lastTickSecondRef.current = questionTimeRemaining;
        soundEffects.playCountdownTick(questionTimeRemaining);
      }
    }
  }, [questionTimeRemaining]);

  // Handle lock and audio feedback evaluation
  const handleLockAnswer = () => {
    if (isLocked) return;
    setIsLocked(true);
    const finalAnswer = questionType === "checkbox" ? selectedCheckboxes : selectedOption;
    recordAnswer(currentQuestionIndex, finalAnswer);
    submitCurrentAnswers();

    // Subtle audio feedback for correct/incorrect answers
    if (!isHost && questionData?.correct_answer) {
      const hasAnswer =
        questionType === "checkbox"
          ? selectedCheckboxes.length > 0
          : Boolean(selectedOption);

      if (hasAnswer) {
        const isCorrect = checkAnswerCorrectness(finalAnswer, questionData.correct_answer);
        setIsCorrectEvaluation(isCorrect ? "correct" : "incorrect");
        if (isCorrect) {
          soundEffects.playCorrectSound();
        } else {
          soundEffects.playIncorrectSound();
        }
      } else {
        setIsCorrectEvaluation("unanswered");
        soundEffects.playIncorrectSound();
      }
    } else {
      soundEffects.playLockSound();
    }
  };

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

  const totalQuestions = currentQuestion?.total || clientQuestions.length || 1;
  const currentNum = (currentQuestionIndex >= 0 ? currentQuestionIndex : 0) + 1;

  // Track answer completion per question for accurate progress reporting
  const questionAnsweredStatus = useMemo(() => {
    const status: boolean[] = [];
    for (let i = 0; i < totalQuestions; i++) {
      let isAns = false;
      const ansByIndex = studentAnswers?.[String(i)];
      const qId = clientQuestions[i]?.question_id;
      const ansById = qId !== undefined ? studentAnswers?.[String(qId)] : undefined;
      const stored = ansByIndex ?? ansById;

      if (stored !== undefined && stored !== null) {
        if (Array.isArray(stored)) {
          isAns = stored.length > 0;
        } else {
          isAns = String(stored).trim() !== "";
        }
      }

      // If evaluating current active question, also count current active selection or locked status
      if (i === currentQuestionIndex) {
        const hasCurrentLocalSelection =
          questionType === "checkbox"
            ? selectedCheckboxes.length > 0
            : Boolean(selectedOption);
        if (hasCurrentLocalSelection || isLocked) {
          isAns = true;
        }
      }

      status.push(isAns);
    }
    return status;
  }, [
    totalQuestions,
    studentAnswers,
    clientQuestions,
    currentQuestionIndex,
    questionType,
    selectedCheckboxes,
    selectedOption,
    isLocked,
  ]);

  const answeredCount = questionAnsweredStatus.filter(Boolean).length;
  const answeredPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const remainingCount = Math.max(0, totalQuestions - answeredCount);

  // Determine timer color theme and urgency styling
  const isLastFiveSeconds = questionTimeRemaining <= 5 && questionTimeRemaining > 0;
  const timerTheme =
    questionTimeRemaining <= 5
      ? "text-rose-600 bg-rose-50 border-rose-300 ring-2 ring-rose-200"
      : questionTimeRemaining <= 8
      ? "text-amber-600 bg-amber-50 border-amber-200"
      : "text-emerald-600 bg-emerald-50 border-emerald-200";

  // Options list for the current question
  const optionsList = questionData?.options || [];

  return (
    <div id="quiz-screen" className="max-w-3xl mx-auto py-6 sm:py-8 px-4">
      {/* Top Header Bar: Question Tracker & Audio Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold uppercase tracking-wider">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              Participant Station
            </span>
            {studentData?.name && (
              <span className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">
                {studentData.name} ({studentData.usn})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-xs font-bold uppercase tracking-wider">
              Question {currentNum} of {totalQuestions}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {questionType === "checkbox" ? "Multiple Choice" : "Single Choice"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Audio toggle & test controls */}
          <div className="relative">
            <button
              type="button"
              id="quiz-audio-toggle-btn"
              onClick={handleToggleSound}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                soundEnabled
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  : "border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              }`}
              title={
                soundEnabled
                  ? "Sound Active (Countdown Ticks & Answer Feedback). Click to Mute."
                  : "Sound Muted. Click to Enable."
              }
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline text-[11px]">Audio On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline text-[11px]">Muted</span>
                </>
              )}
            </button>
          </div>

          {/* Prominent Live Timer */}
          <motion.div
            id="quiz-timer-badge"
            animate={
              isLastFiveSeconds
                ? { scale: [1, 1.05, 1], transition: { duration: 0.6, repeat: Infinity } }
                : { scale: 1 }
            }
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-sm font-mono font-extrabold shadow-xs transition-colors ${timerTheme}`}
          >
            <Clock
              className={`w-4 h-4 ${isLastFiveSeconds ? "animate-spin" : ""}`}
            />
            <span>
              {questionTimeRemaining < 10 ? `0${questionTimeRemaining}` : questionTimeRemaining}s
            </span>
            {isLastFiveSeconds && (
              <span className="text-[10px] font-sans font-bold bg-rose-200/80 text-rose-800 px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                Final 5s
              </span>
            )}
          </motion.div>
        </div>
      </div>

      {/* Visual Answered Questions Progress Indicator */}
      <div
        id="quiz-progress-indicator-container"
        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-4 mb-6 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span
              id="quiz-answered-count-badge"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {isHost ? "Quiz In Progress" : `Answered ${answeredCount} of ${totalQuestions}`}
              </span>
            </span>
            <span className="text-slate-500 font-medium">
              {!isHost && (
                remainingCount === 0 ? (
                  <span className="text-emerald-700 font-semibold">All questions answered!</span>
                ) : (
                  <span>{remainingCount} {remainingCount === 1 ? "question" : "questions"} left</span>
                )
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium hidden sm:inline">Completion:</span>
            <span
              id="quiz-completion-percentage"
              className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200 text-xs"
            >
              {answeredPercent}%
            </span>
          </div>
        </div>

        {/* Visual Progress Bar (Answered vs Total) */}
        <div
          id="quiz-answered-progress-bar"
          className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/70 relative"
          role="progressbar"
          aria-valuenow={answeredCount}
          aria-valuemin={0}
          aria-valuemax={totalQuestions}
          aria-label={`Answered ${answeredCount} of ${totalQuestions} questions`}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-full"
            animate={{ width: `${answeredPercent}%` }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        {/* Segmented Question Pips Indicator */}
        {totalQuestions <= 25 && (
          <div
            id="quiz-question-pips"
            className="flex items-center gap-1.5 pt-0.5 overflow-x-auto"
          >
            {questionAnsweredStatus.map((isAns, idx) => {
              const isCurrent = idx === currentQuestionIndex;
              return (
                <div
                  key={idx}
                  id={`question-pip-${idx + 1}`}
                  title={`Question ${idx + 1}: ${
                    isAns
                      ? "Answered"
                      : isCurrent
                      ? "Current Question (Active)"
                      : "Unanswered"
                  }`}
                  className={`h-2 flex-1 min-w-[12px] rounded-full transition-all ${
                    isAns
                      ? "bg-emerald-500"
                      : isCurrent
                      ? "bg-indigo-500 ring-2 ring-indigo-200"
                      : "bg-slate-200"
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Main Question Box with Smooth Framer Motion Entrance and Exit Animations */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentQuestionIndex}
          custom={direction}
          variants={questionCardVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 mb-6 space-y-6 overflow-hidden"
        >
          {/* Question Text with Soft Entrance */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
          >
            <h2
              id="question-text"
              className="text-lg sm:text-xl font-bold text-slate-900 leading-snug tracking-tight"
            >
              {currentQuestion?.question_text ||
                questionData?.question_text ||
                "Loading synchronized question..."}
            </h2>
          </motion.div>

          {/* Dynamic Correct/Incorrect Feedback Banner when Locked */}
          <AnimatePresence>
            {isLocked && isCorrectEvaluation && !isHost && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className={`p-4 rounded-xl border text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                  isCorrectEvaluation === "correct"
                    ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
                    : isCorrectEvaluation === "incorrect"
                    ? "bg-rose-50/90 border-rose-300 text-rose-950"
                    : "bg-amber-50/90 border-amber-300 text-amber-950"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isCorrectEvaluation === "correct" ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : isCorrectEvaluation === "incorrect" ? (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-extrabold">
                      {isCorrectEvaluation === "correct"
                        ? "Correct Answer! (+1 point)"
                        : isCorrectEvaluation === "incorrect"
                        ? "Incorrect Choice"
                        : "Time Expired without Selection"}
                    </span>
                    <p className="text-xs opacity-90 mt-0.5">
                      {isCorrectEvaluation === "correct"
                        ? "Subtle audio confirmation sounded. Score recorded."
                        : isCorrectEvaluation === "incorrect"
                        ? "Review the highlighted correct answer below."
                        : "Next question will broadcast on timer expiration."}
                    </p>
                  </div>
                </div>

                {/* Sound replay button */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() =>
                      isCorrectEvaluation === "correct"
                        ? soundEffects.playCorrectSound()
                        : soundEffects.playIncorrectSound()
                    }
                    className="px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white text-slate-800 border border-slate-200 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    title="Replay audio feedback"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Replay Sound</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Staggered Options List */}
          <motion.div
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.04,
                  delayChildren: 0.08,
                },
              },
            }}
          >
            {optionsList.map((option, idx) => {
              const letterLabel = String.fromCharCode(65 + idx);
              const isSelected =
                questionType === "checkbox"
                  ? selectedCheckboxes.includes(option)
                  : selectedOption === option;

              const isOptionCorrect =
                Boolean(questionData?.correct_answer?.includes(option));

              // Feedback styling state when student answer is locked
              let optionStyle = "bg-slate-50/50 hover:bg-slate-100/80 border-slate-200 text-slate-800";
              let badgeText: string | null = null;
              let badgeStyle = "";

              if (isLocked && !isHost) {
                if (isSelected && isOptionCorrect) {
                  optionStyle =
                    "bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold ring-2 ring-emerald-200";
                  badgeText = "✓ Correct Answer (+1 Pt)";
                  badgeStyle = "bg-emerald-100 text-emerald-800 border border-emerald-300";
                } else if (isSelected && !isOptionCorrect) {
                  optionStyle =
                    "bg-rose-50 border-rose-400 text-rose-950 font-semibold ring-2 ring-rose-200";
                  badgeText = "✕ Your Selection";
                  badgeStyle = "bg-rose-100 text-rose-800 border border-rose-300";
                } else if (!isSelected && isOptionCorrect) {
                  optionStyle =
                    "bg-emerald-50/70 border-emerald-300 text-emerald-900 border-dashed font-semibold";
                  badgeText = "Correct Answer";
                  badgeStyle = "bg-emerald-100 text-emerald-800 border border-emerald-200";
                } else {
                  optionStyle = "bg-slate-50/30 border-slate-200/70 text-slate-400 opacity-60";
                }
              } else if (isHost) {
                if (isOptionCorrect) {
                  optionStyle =
                    "bg-emerald-50/80 border-emerald-400 text-emerald-950 font-semibold";
                  badgeText = "Correct Answer";
                  badgeStyle = "bg-emerald-100 text-emerald-800";
                }
              } else if (isSelected) {
                optionStyle =
                  "bg-indigo-50/80 border-indigo-600 text-indigo-950 font-semibold ring-2 ring-indigo-200";
              }

              return (
                <motion.button
                  key={idx}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.22, ease: "easeOut" },
                    },
                  }}
                  whileHover={!isLocked && !isHost ? { scale: 1.008, y: -1 } : {}}
                  whileTap={!isLocked && !isHost ? { scale: 0.992 } : {}}
                  type="button"
                  disabled={isLocked || isHost}
                  onClick={() =>
                    questionType === "checkbox"
                      ? handleToggleCheckbox(option)
                      : handleSelectRadio(option)
                  }
                  className={`w-full text-left p-4 rounded-xl border text-sm sm:text-base flex items-center justify-between transition-all cursor-pointer ${optionStyle} ${
                    isLocked ? "cursor-not-allowed" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        isLocked && isSelected && isOptionCorrect
                          ? "bg-emerald-600 text-white"
                          : isLocked && isSelected && !isOptionCorrect
                          ? "bg-rose-600 text-white"
                          : isSelected
                          ? "bg-indigo-600 text-white"
                          : isHost && isOptionCorrect
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {letterLabel}
                    </div>
                    <span>{option}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {badgeText && (
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${badgeStyle}`}
                      >
                        {badgeText}
                      </span>
                    )}
                    {isSelected && !badgeText && (
                      <Check className="w-5 h-5 text-indigo-600 shrink-0" />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Explanation Card when Locked */}
          <AnimatePresence>
            {isLocked && questionData?.explanation && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2 overflow-hidden"
              >
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 font-bold">Explanation: </strong>
                  <span>{questionData.explanation}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Student Lock & Action Bar */}
          {!isHost ? (
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                {isLocked ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">
                      Response locked & evaluated. Transmitted to server.
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Auto-locks with audio feedback on timer expiration, or lock now.
                    </span>
                  </>
                )}
              </div>

              <motion.button
                type="button"
                id="quiz-lock-answer-btn"
                whileTap={!isLocked ? { scale: 0.96 } : {}}
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
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                }`}
              >
                {isLocked ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-emerald-700" />
                    <span>Answer Locked</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Lock Answer & Check</span>
                  </>
                )}
              </motion.button>
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
        </motion.div>
      </AnimatePresence>

      {/* Subtle Audio Guidance Pill */}
      <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3 text-rose-500" /> 5s Countdown Ticks
        </span>
        <span>•</span>
        <span className="inline-flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-emerald-500" /> Harmonic Correct Chime
        </span>
        <span>•</span>
        <span className="inline-flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-amber-500" /> Low-Tone Incorrect Cue
        </span>
      </div>
    </div>
  );
};

