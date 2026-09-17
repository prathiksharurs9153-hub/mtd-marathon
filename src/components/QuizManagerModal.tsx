import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  BookOpen,
  Trash2,
  Clock,
  CheckCircle,
  HelpCircle,
  Layers,
  Save,
} from "lucide-react";
import { QuizQuestion } from "../types";

interface QuizManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuizToJoin?: (quizId: string) => void;
}

export const QuizManagerModal: React.FC<QuizManagerModalProps> = ({
  isOpen,
  onClose,
  onSelectQuizToJoin,
}) => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"browse" | "create">("browse");
  const [selectedQuizDetails, setSelectedQuizDetails] = useState<any | null>(null);

  // New Quiz Form State
  const [newQuizId, setNewQuizId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newQuestions, setNewQuestions] = useState<QuizQuestion[]>([
    {
      question_id: 1,
      question_text: "What is the capital of Python?",
      options: ["A programming language", "A city", "A reptile", "A framework"],
      correct_answer: "A programming language",
      timer_seconds: 15,
      type: "radio",
      explanation: "Python is an interpreted, high-level, general-purpose programming language.",
    },
  ]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchQuizzes();
    }
  }, [isOpen]);

  const fetchQuizzes = async () => {
    try {
      const res = await fetch("/api/quizzes");
      const data = await res.json();
      if (data.success && Array.isArray(data.quizzes)) {
        setQuizzes(data.quizzes);
        if (data.quizzes.length > 0 && !selectedQuizDetails) {
          loadQuizDetails(data.quizzes[0].quizId);
        }
      }
    } catch (e) {
      console.warn("Could not fetch quizzes list:", e);
    }
  };

  const loadQuizDetails = async (quizId: string) => {
    try {
      const res = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}`);
      const data = await res.json();
      if (data.success && data.quiz) {
        setSelectedQuizDetails(data.quiz);
      }
    } catch (e) {
      console.warn("Error loading quiz details:", e);
    }
  };

  const handleAddQuestion = () => {
    setNewQuestions((prev) => [
      ...prev,
      {
        question_id: prev.length + 1,
        question_text: `New Question #${prev.length + 1}`,
        options: ["Option A", "Option B", "Option C", "Option D"],
        correct_answer: "Option A",
        timer_seconds: 15,
        type: "radio",
        explanation: "",
      },
    ]);
  };

  const handleSaveCustomQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuizId.trim()) return;

    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: newQuizId.trim().toUpperCase(),
          title: newTitle.trim() || newQuizId.trim().toUpperCase(),
          questions: newQuestions,
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        fetchQuizzes();
        setTimeout(() => {
          setSaveSuccess(false);
          setActiveTab("browse");
        }, 1200);
      }
    } catch (e) {
      console.error("Save error:", e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h2 className="font-extrabold text-slate-900 text-lg">
              Marathon Question Bank
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="px-6 pt-4 flex gap-3 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab("browse")}
            className={`pb-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === "browse"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Browse Loaded Quizzes ({quizzes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`pb-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === "create"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            + Create New Custom Quiz
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "browse" ? (
            <div className="space-y-6">
              {/* Quiz selector pills */}
              <div className="flex flex-wrap gap-2">
                {quizzes.map((q) => (
                  <button
                    key={q.quizId}
                    type="button"
                    onClick={() => loadQuizDetails(q.quizId)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono transition-all ${
                      selectedQuizDetails?.quizId === q.quizId
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {q.quizId} ({q.questionCount}Q)
                  </button>
                ))}
              </div>

              {/* Selected Quiz Inspector */}
              {selectedQuizDetails && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">
                        {selectedQuizDetails.title || selectedQuizDetails.quizId}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {selectedQuizDetails.questions?.length || 0} questions configured
                      </p>
                    </div>

                    {onSelectQuizToJoin && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectQuizToJoin(selectedQuizDetails.quizId);
                          onClose();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs border border-indigo-200 transition-colors"
                      >
                        Use This Quiz ID
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {selectedQuizDetails.questions?.map((q: QuizQuestion, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-900">
                            <span className="text-indigo-600 font-mono mr-1">
                              Q{idx + 1}.
                            </span>
                            {q.question_text}
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                            <Clock className="w-3 h-3" /> {q.timer_seconds}s
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`p-2 rounded-lg border ${
                                q.correct_answer.includes(opt)
                                  ? "bg-emerald-50 border-emerald-300 font-bold text-emerald-900"
                                  : "bg-white border-slate-200 text-slate-700"
                              }`}
                            >
                              {opt}
                            </div>
                          ))}
                        </div>

                        {q.explanation && (
                          <div className="text-slate-500 text-[11px]">
                            <strong>Tip:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Create Custom Quiz Form */
            <form onSubmit={handleSaveCustomQuiz} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Quiz ID Code (e.g. REACT-2026)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FULLSTACK-2026"
                    value={newQuizId}
                    onChange={(e) => setNewQuizId(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm uppercase focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Quiz Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Modern Web Engineering"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Questions Builder */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Questions ({newQuestions.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Question
                  </button>
                </div>

                {newQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">Question #{idx + 1}</span>
                      {newQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setNewQuestions(newQuestions.filter((_, i) => i !== idx))
                          }
                          className="text-rose-600 hover:text-rose-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Question prompt..."
                      value={q.question_text}
                      onChange={(e) => {
                        const next = [...newQuestions];
                        next[idx].question_text = e.target.value;
                        setNewQuestions(next);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => (
                        <input
                          key={optIdx}
                          type="text"
                          placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                          value={opt}
                          onChange={(e) => {
                            const next = [...newQuestions];
                            next[idx].options[optIdx] = e.target.value;
                            setNewQuestions(next);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                          Correct Answer (matches exact option text)
                        </label>
                        <input
                          type="text"
                          value={q.correct_answer}
                          onChange={(e) => {
                            const next = [...newQuestions];
                            next[idx].correct_answer = e.target.value;
                            setNewQuestions(next);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                          Timer (seconds)
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={60}
                          value={q.timer_seconds}
                          onChange={(e) => {
                            const next = [...newQuestions];
                            next[idx].timer_seconds = Number(e.target.value) || 15;
                            setNewQuestions(next);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                {saveSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Quiz Saved Successfully!
                  </span>
                )}
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Quiz to Bank</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
