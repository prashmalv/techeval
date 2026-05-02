"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ChevronRight, ChevronLeft, Send, Save, Clock, Image, X, AlertTriangle } from "lucide-react";
import dynamic from "next/dynamic";
import { Question, AssessmentAnswer } from "@/types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false, loading: () => (
  <div className="h-64 bg-slate-900 rounded-lg flex items-center justify-center text-slate-400 text-sm">Loading editor…</div>
) });

const LANGUAGES = ["python", "typescript", "javascript", "java", "go", "rust", "cpp", "sql", "yaml", "bash"];

interface AppData {
  id: string;
  jobRole: string;
  experienceLevel: string;
  assignedQuestions: {
    coding: Question[];
    systemDesign: Question;
    caseStudy: Question;
  };
  answers: { questionId: string; content: string; language?: string; diagramUrl?: string }[];
}

function AssessmentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appId = searchParams.get("id");

  const [appData, setAppData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AssessmentAnswer>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [diagramUploading, setDiagramUploading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const timerRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const startTimes = useRef<Record<string, number>>({});

  const allQuestions = appData
    ? [...(appData.assignedQuestions.coding || []),
       appData.assignedQuestions.systemDesign,
       appData.assignedQuestions.caseStudy].filter(Boolean)
    : [];

  const currentQ = allQuestions[step];

  // Load application data
  useEffect(() => {
    if (!appId) { router.push("/candidate/apply"); return; }
    fetch(`/api/applications/${appId}`)
      .then((r) => r.json())
      .then(({ application }) => {
        if (!application) { router.push("/candidate/apply"); return; }
        if (application.status !== "DRAFT") {
          toast.info("This application has already been submitted.");
          router.push("/candidate/dashboard");
          return;
        }
        setAppData(application);

        // Restore saved answers from localStorage or API
        const saved = localStorage.getItem(`rlai_answers_${appId}`);
        const existing: Record<string, AssessmentAnswer> = {};
        if (saved) {
          Object.assign(existing, JSON.parse(saved));
        }
        if (application.answers?.length > 0) {
          application.answers.forEach((a: { questionId: string; questionType: string; questionTitle: string; content: string; language?: string; diagramUrl?: string }) => {
            if (!existing[a.questionId]) {
              existing[a.questionId] = {
                questionId: a.questionId,
                questionType: a.questionType as AssessmentAnswer["questionType"],
                questionTitle: a.questionTitle,
                content: a.content,
                language: a.language,
                diagramUrl: a.diagramUrl,
              };
            }
          });
        }
        setAnswers(existing);
      })
      .catch(() => toast.error("Failed to load assessment"))
      .finally(() => setLoading(false));
  }, [appId, router]);

  // Per-question timer
  useEffect(() => {
    if (!currentQ) return;
    const qId = currentQ.id;
    if (!startTimes.current[qId]) startTimes.current[qId] = Date.now();

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimes.current[qId]) / 1000);
      setTimers((prev) => ({ ...prev, [qId]: elapsed }));
    }, 1000);

    timerRefs.current[qId] = interval;
    return () => clearInterval(interval);
  }, [step, currentQ]);

  const updateAnswer = useCallback((questionId: string, field: string, value: string) => {
    setAnswers((prev) => {
      const updated = { ...prev, [questionId]: { ...prev[questionId], [field]: value } };
      localStorage.setItem(`rlai_answers_${appId}`, JSON.stringify(updated));
      return updated;
    });
  }, [appId]);

  const saveProgress = async () => {
    if (!appId || !appData) return;
    setSaving(true);
    try {
      const answersPayload = Object.values(answers).filter(a => a.content?.trim()).map(a => ({
        ...a,
        timeTakenSeconds: timers[a.questionId] || 0,
      }));

      await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersPayload, action: "save" }),
      });
      toast.success("Progress saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDiagramUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !appId || !currentQ) return;
    setDiagramUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "diagram");
      fd.append("applicationId", appId);
      fd.append("questionId", currentQ.id);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Upload failed"); return; }
      updateAnswer(currentQ.id, "diagramUrl", json.url);
      toast.success("Diagram uploaded");
    } finally {
      setDiagramUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!appId || !appData) return;
    setSubmitting(true);
    try {
      const answersPayload = Object.values(answers).map(a => ({
        ...a,
        timeTakenSeconds: timers[a.questionId] || 0,
      }));

      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersPayload, action: "submit" }),
      });

      if (!res.ok) {
        toast.error("Submission failed. Please try again.");
        return;
      }

      localStorage.removeItem(`rlai_answers_${appId}`);
      toast.success("Assessment submitted successfully!");
      router.push("/candidate/applications?submitted=1");
    } catch {
      toast.error("Submission failed.");
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const answeredCount = Object.values(answers).filter(a => a.content?.trim()).length;

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 size={32} className="animate-spin text-indigo-600" />
    </div>
  );

  if (!appData || !currentQ) return (
    <div className="p-8 text-center text-slate-500">Assessment not available.</div>
  );

  const isLastStep = step === allQuestions.length - 1;
  const answer = answers[currentQ.id] || { questionId: currentQ.id, questionType: currentQ.type, questionTitle: currentQ.title, content: "" };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="text-sm font-semibold text-slate-900">
            Question {step + 1} of {allQuestions.length}
          </div>
          <div className="hidden md:flex gap-1.5">
            {allQuestions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setStep(i)}
                className={`w-8 h-8 rounded-full text-xs font-semibold transition-colors ${
                  i === step ? "bg-indigo-600 text-white" :
                  answers[q.id]?.content?.trim() ? "bg-emerald-100 text-emerald-700" :
                  "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Clock size={14} />
            <span className="font-mono">{formatTime(timers[currentQ.id] || 0)}</span>
          </div>
          <button onClick={saveProgress} disabled={saving} className="btn-secondary text-xs py-1.5 px-3">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-100 shrink-0">
        <div
          className="h-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${((step + 1) / allQuestions.length) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Question */}
        <div className="w-full md:w-[45%] border-r border-slate-200 overflow-y-auto p-6 bg-white scrollbar-thin">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className={`badge text-xs ${
                currentQ.type === "CODING" ? "badge-blue" :
                currentQ.type === "SYSTEM_DESIGN" ? "badge-blue bg-violet-100 text-violet-700" :
                "badge-green"
              }`}>
                {currentQ.type === "CODING" ? "💻 Coding" :
                 currentQ.type === "SYSTEM_DESIGN" ? "🏗️ System Design" : "📋 Case Study"}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={12} /> ~{currentQ.estimatedMinutes} min
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-3">{currentQ.title}</h2>
            <div className="prose prose-sm text-slate-600 max-w-none">
              {currentQ.description.split("\n").map((line, i) => (
                <p key={i} className={line.startsWith("```") ? "hidden" : "mb-2"}>{line}</p>
              ))}
            </div>
          </div>

          {currentQ.requirements && currentQ.requirements.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-4">
              <div className="text-xs font-semibold text-amber-800 mb-2 uppercase tracking-wide">Requirements</div>
              <ul className="space-y-1.5">
                {currentQ.requirements.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                    <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {currentQ.exampleInput && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-slate-500 mb-1.5">Example Input</div>
              <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono overflow-x-auto">{currentQ.exampleInput}</pre>
            </div>
          )}
          {currentQ.exampleOutput && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-slate-500 mb-1.5">Expected Output</div>
              <pre className="bg-slate-900 text-emerald-300 rounded-lg p-3 text-xs font-mono overflow-x-auto">{currentQ.exampleOutput}</pre>
            </div>
          )}

          {currentQ.hints && currentQ.hints.length > 0 && (
            <details className="mt-4">
              <summary className="text-xs text-indigo-600 cursor-pointer font-medium">Show hints</summary>
              <ul className="mt-2 space-y-1">
                {currentQ.hints.map((h, i) => (
                  <li key={i} className="text-xs text-slate-500">💡 {h}</li>
                ))}
              </ul>
            </details>
          )}
        </div>

        {/* Right: Answer */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {currentQ.type === "CODING" ? (
            <>
              {/* Language selector */}
              <div className="px-4 pt-4 pb-2 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                <label className="text-xs font-medium text-slate-600">Language:</label>
                <select
                  value={answer.language || currentQ.language || "python"}
                  onChange={(e) => updateAnswer(currentQ.id, "language", e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                >
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <span className="text-xs text-slate-400 ml-auto">Write your complete solution below</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <MonacoEditor
                  height="100%"
                  language={answer.language || currentQ.language || "python"}
                  value={answer.content || currentQ.starterCode || ""}
                  onChange={(val) => updateAnswer(currentQ.id, "content", val || "")}
                  theme="vs-dark"
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    padding: { top: 16, bottom: 16 },
                    fontFamily: "JetBrains Mono, Fira Code, monospace",
                    suggestOnTriggerCharacters: true,
                    tabSize: 4,
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
              {/* Text answer */}
              <label className="text-sm font-semibold text-slate-700 mb-2">Your Answer</label>
              <textarea
                value={answer.content || ""}
                onChange={(e) => updateAnswer(currentQ.id, "content", e.target.value)}
                placeholder={
                  currentQ.type === "SYSTEM_DESIGN"
                    ? "Describe your architecture design here. Include:\n• Components and their responsibilities\n• Data flow\n• Technology choices and why\n• How you handle scale, failures, security\n• Trade-offs you considered\n\nYou can also upload an architecture diagram below."
                    : "Share your analysis and recommendation here. Be specific:\n• What's the core problem or decision?\n• What options did you consider?\n• What's your recommendation and why?\n• What are the risks and mitigations?\n• How would you measure success?"
                }
                rows={16}
                className="input resize-none flex-1 font-sans text-sm leading-relaxed"
              />
              <div className="text-right text-xs text-slate-400 mt-1">
                {answer.content?.length || 0} characters
              </div>

              {/* Diagram upload for system design */}
              {currentQ.type === "SYSTEM_DESIGN" && (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Image size={16} /> Architecture Diagram
                    <span className="font-normal text-xs text-slate-400">(optional — PNG, JPG, SVG)</span>
                  </div>
                  {answer.diagramUrl ? (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <img src={answer.diagramUrl} alt="Architecture diagram" className="w-16 h-16 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-emerald-700 font-medium">Diagram uploaded</div>
                        <a href={answer.diagramUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline">View full</a>
                      </div>
                      <button onClick={() => updateAnswer(currentQ.id, "diagramUrl", "")} className="text-slate-400 hover:text-red-500">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-3 border-2 border-dashed border-slate-300 rounded-xl p-4 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                      <input type="file" accept="image/*" className="hidden" onChange={handleDiagramUpload} disabled={diagramUploading} />
                      {diagramUploading ? (
                        <Loader2 size={16} className="animate-spin text-indigo-600" />
                      ) : (
                        <Image size={18} className="text-slate-400" />
                      )}
                      <span className="text-sm text-slate-500">
                        {diagramUploading ? "Uploading…" : "Upload diagram (PNG, JPG, SVG, max 10MB)"}
                      </span>
                    </label>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <button
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="btn-secondary disabled:opacity-0"
        >
          <ChevronLeft size={16} /> Previous
        </button>

        <div className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{answeredCount}</span> of {allQuestions.length} answered
        </div>

        {isLastStep ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="btn-primary bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
            disabled={submitting}
          >
            <Send size={16} /> Submit Assessment
          </button>
        ) : (
          <button onClick={() => setStep(s => s + 1)} className="btn-primary">
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Submit confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Submit Assessment?</h2>
            </div>
            <p className="text-slate-600 text-sm mb-4">
              You are about to submit your assessment for review. <strong>This cannot be undone.</strong>
            </p>
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <div className="text-sm font-semibold text-slate-700 mb-2">Summary:</div>
              <ul className="text-sm text-slate-600 space-y-1">
                {allQuestions.map((q, i) => (
                  <li key={q.id} className="flex items-center gap-2">
                    {answers[q.id]?.content?.trim() ? (
                      <span className="text-emerald-500">✓</span>
                    ) : (
                      <span className="text-amber-500">○</span>
                    )}
                    Question {i + 1}: {q.title}
                  </li>
                ))}
              </ul>
              {answeredCount < allQuestions.length && (
                <p className="text-xs text-amber-600 mt-3">
                  ⚠️ You have {allQuestions.length - answeredCount} unanswered question(s). You can still submit.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary flex-1" disabled={submitting}>
                Go Back
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 bg-emerald-600 hover:bg-emerald-700">
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : "Confirm Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    }>
      <AssessmentContent />
    </Suspense>
  );
}
