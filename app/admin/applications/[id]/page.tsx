"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Loader2, ArrowLeft, ExternalLink, Mail, Send, Zap,
  CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, User
} from "lucide-react";
import { JOB_ROLE_CONFIG, RECOMMENDATION_CONFIG, EXPERIENCE_LEVEL_CONFIG as ELC } from "@/types";
import type { ApplicationWithDetails, RecommendationLevel, QuestionEvaluation } from "@/types";
import { format } from "date-fns";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false, loading: () => <div className="h-48 bg-slate-900 rounded-lg flex items-center justify-center text-slate-400 text-sm">Loading…</div>
});

export default function AdminApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  useRouter();
  const [app, setApp] = useState<ApplicationWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});
  const [expandedEvals, setExpandedEvals] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`/api/applications/${id}`)
      .then((r) => r.json())
      .then(({ application }) => {
        setApp(application);
        const expanded: Record<string, boolean> = {};
        application?.answers?.forEach((a: { questionId: string }) => { expanded[a.questionId] = true; });
        setExpandedAnswers(expanded);
      })
      .catch(() => toast.error("Failed to load application"))
      .finally(() => setLoading(false));
  }, [id]);

  const runEvaluation = async () => {
    setEvaluating(true);
    toast.info("Running AI evaluation… this may take up to 60 seconds.");
    try {
      const res = await fetch(`/api/applications/${id}/evaluate`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Evaluation failed"); return; }
      toast.success("Evaluation complete!");
      const r = await fetch(`/api/applications/${id}`);
      const { application } = await r.json();
      setApp(application);
    } finally {
      setEvaluating(false);
    }
  };

  const sendHREmail = async () => {
    setNotifying(true);
    try {
      const res = await fetch(`/api/notify/${id}`, { method: "POST" });
      if (!res.ok) { toast.error("Failed to send email"); return; }
      toast.success("HR notification sent successfully!");
    } finally {
      setNotifying(false);
    }
  };

  const updateStatus = async (status: "SHORTLISTED" | "REJECTED") => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { toast.error("Update failed"); return; }
      setApp((prev) => prev ? { ...prev, status } : prev);
      toast.success(`Marked as ${status}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 size={32} className="animate-spin text-indigo-600" />
    </div>
  );

  if (!app) return (
    <div className="p-8 text-center text-slate-500">Application not found.</div>
  );

  const roleConfig = JOB_ROLE_CONFIG[app.jobRole];
  const levelConfig = ELC[app.experienceLevel];
  const rec = app.evaluation?.recommendation as RecommendationLevel | undefined;
  const recConfig = rec ? RECOMMENDATION_CONFIG[rec] : null;
  const eval_ = app.evaluation;

  const SCORE_COLOR = (v: number) =>
    v >= 8 ? "text-emerald-600" : v >= 6 ? "text-indigo-600" : v >= 4 ? "text-amber-600" : "text-red-600";

  const AI_COLOR = (v: number) =>
    v > 60 ? "text-red-600 bg-red-50" : v > 30 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50";

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      {/* Back */}
      <Link href="/admin/applications" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft size={14} /> Back to Applications
      </Link>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
              {app.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{app.user.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Mail size={12} /> {app.user.email}</span>
                {app.user.phone && <span>{app.user.phone}</span>}
                {app.currentTitle && <span><strong>Current:</strong> {app.currentTitle} @ {app.currentCompany}</span>}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`badge text-xs ${
                  app.status === "SHORTLISTED" ? "badge-green" : app.status === "REJECTED" ? "badge-red" :
                  app.status === "EVALUATED" ? "badge-green" : "badge-blue"
                }`}>{app.status}</span>
                <span className="badge-blue text-xs">{roleConfig.icon} {roleConfig.label}</span>
                <span className="badge-gray text-xs">{levelConfig.label} · {app.yearsExperience}y exp</span>
                {app.submittedAt && (
                  <span className="badge-gray text-xs">Submitted {format(new Date(app.submittedAt), "MMM d, yyyy HH:mm")}</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {app.resumeUrl && (
              <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm py-2">
                <ExternalLink size={14} /> View Resume
              </a>
            )}
            {app.linkedinUrl && (
              <a href={app.linkedinUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm py-2">
                <User size={14} /> LinkedIn
              </a>
            )}
            {(app.status === "SUBMITTED" || app.status === "EVALUATED") && (
              <button onClick={runEvaluation} disabled={evaluating} className="btn-primary text-sm py-2 bg-violet-600 hover:bg-violet-700 focus:ring-violet-500">
                {evaluating ? <><Loader2 size={14} className="animate-spin" /> Evaluating…</> : <><Zap size={14} /> Run AI Evaluation</>}
              </button>
            )}
            {app.status === "EVALUATED" && (
              <>
                <button onClick={sendHREmail} disabled={notifying} className="btn-primary text-sm py-2">
                  {notifying ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> Notify HR</>}
                </button>
                <button onClick={() => updateStatus("SHORTLISTED")} disabled={updatingStatus}
                  className="btn-primary text-sm py-2 bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 size={14} /> Shortlist
                </button>
                <button onClick={() => updateStatus("REJECTED")} disabled={updatingStatus}
                  className="btn-secondary text-sm py-2 text-red-600 border-red-200 hover:bg-red-50">
                  <XCircle size={14} /> Reject
                </button>
              </>
            )}
          </div>
        </div>

        {app.professionalSummary && (
          <div className="mt-4 bg-slate-50 rounded-lg p-4 text-sm text-slate-600 leading-relaxed">
            <div className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Professional Summary</div>
            {app.professionalSummary}
          </div>
        )}
      </div>

      {/* Evaluation Report */}
      {eval_ ? (
        <div className="mb-6 space-y-4">
          {/* Score overview */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">AI Evaluation Report</h2>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-4xl font-extrabold text-indigo-600">
                    {eval_.overallScore.toFixed(0)}<span className="text-lg text-slate-400">/100</span>
                  </div>
                </div>
                {recConfig && (
                  <div className={`px-4 py-2 rounded-xl font-bold text-sm ${recConfig.bgColor} ${recConfig.color}`}>
                    {recConfig.label}
                  </div>
                )}
              </div>
            </div>

            {/* Score breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {[
                { label: "Technical", value: eval_.technicalScore },
                { label: "Practical", value: eval_.practicalScore },
                { label: "Communication", value: eval_.communicationScore },
                { label: "System Thinking", value: eval_.systemThinkingScore },
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 rounded-lg p-4">
                  <div className="text-xs text-slate-500 mb-1">{s.label}</div>
                  <div className={`text-2xl font-bold ${SCORE_COLOR(s.value)}`}>
                    {s.value.toFixed(1)}<span className="text-sm text-slate-400">/10</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full rounded-full ${s.value >= 7 ? "bg-emerald-500" : s.value >= 5 ? "bg-indigo-500" : "bg-amber-500"}`}
                      style={{ width: `${s.value * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-5">
              <div className="text-xs font-semibold text-indigo-700 mb-2 uppercase tracking-wide">AI Summary</div>
              <p className="text-sm text-indigo-900 leading-relaxed">{eval_.summary}</p>
            </div>

            {/* Strengths & Concerns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              {eval_.keyStrengths?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-emerald-700 mb-3 uppercase tracking-wide">✅ Key Strengths</div>
                  <ul className="space-y-2">
                    {eval_.keyStrengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{idx + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {eval_.keyConcerns?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-amber-700 mb-3 uppercase tracking-wide">⚠️ Key Concerns</div>
                  <ul className="space-y-2">
                    {eval_.keyConcerns.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Red flags */}
            {eval_.redFlags?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide">
                  <AlertTriangle size={12} /> Red Flags
                </div>
                <ul className="space-y-1">
                  {eval_.redFlags.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                      <span className="text-red-400 shrink-0">🚩</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Usage */}
            <div className={`rounded-xl p-4 border mb-5 ${eval_.aiUsageLikelihood > 60 ? "bg-red-50 border-red-200" : eval_.aiUsageLikelihood > 30 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2">
                  🤖 AI Usage Detection
                </div>
                <span className={`text-lg font-bold ${AI_COLOR(eval_.aiUsageLikelihood).split(" ")[0]}`}>
                  {eval_.aiUsageLikelihood.toFixed(0)}% likelihood
                </span>
              </div>
              <div className="h-2 bg-white/60 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full ${eval_.aiUsageLikelihood > 60 ? "bg-red-500" : eval_.aiUsageLikelihood > 30 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${eval_.aiUsageLikelihood}%` }}
                />
              </div>
              <p className="text-sm leading-relaxed">{eval_.aiUsageAnalysis}</p>
            </div>

            {/* Cross-question notes */}
            {eval_.crossQuestionNotes && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
                <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Cross-Question Observations</div>
                <p className="text-sm text-slate-700 leading-relaxed">{eval_.crossQuestionNotes}</p>
              </div>
            )}

            {/* Suggested cross-questions */}
            {eval_.suggestedCrossQuestions?.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <div className="text-xs font-semibold text-indigo-700 mb-3 uppercase tracking-wide">💬 Suggested Interview Cross-Questions</div>
                <ol className="space-y-2">
                  {eval_.suggestedCrossQuestions.map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-indigo-800">
                      <span className="font-bold text-indigo-500 shrink-0">{i + 1}.</span>
                      {q}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="text-xs text-slate-400 mt-4">
              Evaluated by Claude AI on {format(new Date(eval_.evaluatedAt), "PPpp")}
            </div>
          </div>

          {/* Per-question evaluations */}
          {(eval_.questionEvaluations as QuestionEvaluation[])?.length > 0 && (
            <div className="card p-6">
              <h3 className="font-bold text-slate-900 mb-4">Per-Question Evaluation</h3>
              <div className="space-y-4">
                {(eval_.questionEvaluations as QuestionEvaluation[]).map((qe, i) => (
                  <div key={qe.questionId} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                      onClick={() => setExpandedEvals(p => ({ ...p, [qe.questionId]: !p[qe.questionId] }))}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`badge text-xs ${
                          qe.questionType === "CODING" ? "badge-blue" :
                          qe.questionType === "SYSTEM_DESIGN" ? "bg-violet-100 text-violet-700" : "badge-green"
                        }`}>
                          {qe.questionType === "CODING" ? "💻" : qe.questionType === "SYSTEM_DESIGN" ? "🏗️" : "📋"} {qe.questionType.replace("_", " ")}
                        </span>
                        <span className="font-medium text-slate-800 text-sm">{qe.questionTitle}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`font-bold ${SCORE_COLOR(qe.scores.overall)}`}>
                          {qe.scores.overall.toFixed(1)}/10
                        </span>
                        {qe.aiUsageLikelihood > 50 && (
                          <span className="badge-yellow text-xs">🤖 {qe.aiUsageLikelihood.toFixed(0)}%</span>
                        )}
                        {expandedEvals[qe.questionId] ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>
                    </button>

                    {expandedEvals[qe.questionId] && (
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: "Technical", value: qe.scores.technical },
                            { label: "Practical", value: qe.scores.practical },
                            { label: "Communication", value: qe.scores.communication },
                          ].map((s) => (
                            <div key={s.label} className="bg-slate-50 rounded-lg p-3 text-center">
                              <div className="text-xs text-slate-500 mb-1">{s.label}</div>
                              <div className={`text-xl font-bold ${SCORE_COLOR(s.value)}`}>{s.value.toFixed(1)}</div>
                            </div>
                          ))}
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-slate-600 mb-1.5">Feedback</div>
                          <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3">{qe.feedback}</p>
                        </div>

                        {qe.strengths?.length > 0 && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs font-semibold text-emerald-700 mb-1.5">Strengths</div>
                              <ul className="text-xs text-slate-600 space-y-1">
                                {qe.strengths.map((s, j) => <li key={j}>✓ {s}</li>)}
                              </ul>
                            </div>
                            {qe.improvements?.length > 0 && (
                              <div>
                                <div className="text-xs font-semibold text-amber-700 mb-1.5">Improvements</div>
                                <ul className="text-xs text-slate-600 space-y-1">
                                  {qe.improvements.map((s, j) => <li key={j}>→ {s}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {qe.aiUsageNotes && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                            🤖 <strong>AI Usage Note:</strong> {qe.aiUsageNotes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        app.status === "SUBMITTED" && (
          <div className="card p-8 mb-6 text-center">
            <Zap size={32} className="text-violet-400 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-800 mb-2">Evaluation Pending</h3>
            <p className="text-slate-500 text-sm mb-4">This application has been submitted but not yet evaluated by AI.</p>
            <button onClick={runEvaluation} disabled={evaluating} className="btn-primary bg-violet-600 hover:bg-violet-700">
              {evaluating ? <><Loader2 size={16} className="animate-spin" /> Running…</> : <><Zap size={16} /> Run AI Evaluation</>}
            </button>
          </div>
        )
      )}

      {/* Candidate's Answers */}
      {app.answers?.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-5">Candidate Answers</h2>
          <div className="space-y-4">
            {app.answers.map((answer, i) => {
              const qEval = (eval_?.questionEvaluations as QuestionEvaluation[])?.find(q => q.questionId === answer.questionId);

              return (
                <div key={answer.questionId} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                    onClick={() => setExpandedAnswers(p => ({ ...p, [answer.questionId]: !p[answer.questionId] }))}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`badge text-xs ${
                        answer.questionType === "CODING" ? "badge-blue" :
                        answer.questionType === "SYSTEM_DESIGN" ? "bg-violet-100 text-violet-700" : "badge-green"
                      }`}>
                        Q{i + 1}
                      </span>
                      <span className="font-medium text-slate-800 text-sm">{answer.questionTitle}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {qEval && (
                        <span className={`text-sm font-bold ${SCORE_COLOR(qEval.scores.overall)}`}>
                          {qEval.scores.overall.toFixed(1)}/10
                        </span>
                      )}
                      {expandedAnswers[answer.questionId] ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </button>

                  {expandedAnswers[answer.questionId] && (
                    <div className="p-5">
                      {answer.questionType === "CODING" ? (
                        <MonacoEditor
                          height="350px"
                          language={answer.language || "python"}
                          value={answer.content || ""}
                          theme="vs-dark"
                          options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13,
                            lineNumbers: "on", scrollBeyondLastLine: false, wordWrap: "on",
                            padding: { top: 12, bottom: 12 }, fontFamily: "JetBrains Mono, monospace" }}
                        />
                      ) : (
                        <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                          {answer.content || <span className="text-slate-400 italic">No answer provided</span>}
                        </div>
                      )}
                      {answer.diagramUrl && (
                        <div className="mt-4">
                          <div className="text-xs font-semibold text-slate-500 mb-2">Architecture Diagram</div>
                          <img src={answer.diagramUrl} alt="Architecture diagram" className="max-w-full rounded-lg border border-slate-200 shadow-sm" />
                        </div>
                      )}
                      {answer.timeTakenSeconds && (
                        <div className="text-xs text-slate-400 mt-2">
                          Time spent: {Math.floor(answer.timeTakenSeconds / 60)}m {answer.timeTakenSeconds % 60}s
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
