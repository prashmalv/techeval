import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { JOB_ROLE_CONFIG, RECOMMENDATION_CONFIG, EXPERIENCE_LEVEL_CONFIG } from "@/types";
import type { RecommendationLevel } from "@/types";
import { formatDistanceToNow, format } from "date-fns";
import { CheckCircle2, Clock, Zap, FileText, ExternalLink } from "lucide-react";

export default async function MyApplicationsPage() {
  const session = await getServerSession(authOptions);

  const applications = await prisma.application.findMany({
    where: { userId: session!.user.id },
    include: {
      answers: { select: { questionId: true, questionType: true } },
      evaluation: {
        select: {
          overallScore: true, technicalScore: true, practicalScore: true,
          communicationScore: true, systemThinkingScore: true,
          recommendation: true, aiUsageLikelihood: true,
          keyStrengths: true, keyConcerns: true, summary: true,
          evaluatedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const statusConfig = {
    DRAFT: { label: "In Progress", icon: Clock, color: "badge-yellow" },
    SUBMITTED: { label: "Submitted", icon: CheckCircle2, color: "badge-blue" },
    EVALUATING: { label: "Evaluating…", icon: Zap, color: "badge-blue bg-violet-100 text-violet-700" },
    EVALUATED: { label: "Evaluated", icon: CheckCircle2, color: "badge-green" },
    SHORTLISTED: { label: "Shortlisted 🎉", icon: CheckCircle2, color: "badge-green bg-green-100 text-green-700" },
    REJECTED: { label: "Not Selected", icon: FileText, color: "badge-gray" },
  } as const;

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
        <p className="text-slate-500 mt-1">Track all your submitted evaluations</p>
      </div>

      {applications.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={40} className="text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-700 mb-2">No applications yet</h3>
          <Link href="/candidate/apply" className="btn-primary mt-2">Browse open roles</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {applications.map((app) => {
            const roleConfig = JOB_ROLE_CONFIG[app.jobRole];
            const sc = statusConfig[app.status];
            const StatusIcon = sc.icon;
            const rec = app.evaluation?.recommendation as RecommendationLevel | undefined;
            const recConfig = rec ? RECOMMENDATION_CONFIG[rec] : null;
            const levelConfig = EXPERIENCE_LEVEL_CONFIG[app.experienceLevel];

            return (
              <div key={app.id} className="card p-0 overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{roleConfig.icon}</span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900">{roleConfig.label}</h3>
                          <span className={`badge ${sc.color}`}>
                            <StatusIcon size={11} className="mr-1" />{sc.label}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {levelConfig.label} · {app.yearsExperience} yrs exp · Applied {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>

                    {app.evaluation && (
                      <div className="text-right">
                        <div className="text-3xl font-extrabold text-indigo-600">
                          {app.evaluation.overallScore.toFixed(0)}<span className="text-base text-slate-400">/100</span>
                        </div>
                        {recConfig && (
                          <span className={`text-sm font-semibold ${recConfig.color}`}>{recConfig.label}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Evaluation details */}
                {app.evaluation && (
                  <div className="p-5">
                    {/* Score bars */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                      {[
                        { label: "Technical", value: app.evaluation.technicalScore },
                        { label: "Practical", value: app.evaluation.practicalScore },
                        { label: "Communication", value: app.evaluation.communicationScore },
                        { label: "System Thinking", value: app.evaluation.systemThinkingScore },
                      ].map((s) => (
                        <div key={s.label}>
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>{s.label}</span>
                            <span className="font-semibold text-slate-700">{s.value.toFixed(1)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${s.value * 10}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary */}
                    {app.evaluation.summary && (
                      <p className="text-sm text-slate-600 leading-relaxed mb-4 bg-slate-50 rounded-lg p-4">
                        {app.evaluation.summary}
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {app.evaluation.keyStrengths?.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-emerald-700 mb-2">✅ Key Strengths</div>
                          <ul className="space-y-1">
                            {app.evaluation.keyStrengths.map((s, i) => (
                              <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                                <span className="text-emerald-500 shrink-0">•</span>{s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {app.evaluation.keyConcerns?.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-amber-700 mb-2">⚠️ Areas to Improve</div>
                          <ul className="space-y-1">
                            {app.evaluation.keyConcerns.map((c, i) => (
                              <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                                <span className="text-amber-500 shrink-0">•</span>{c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {app.evaluation.aiUsageLikelihood > 40 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                        <strong>Note:</strong> Our AI evaluation detected some patterns consistent with AI-assisted responses
                        ({app.evaluation.aiUsageLikelihood.toFixed(0)}% likelihood). If you are shortlisted,
                        expect targeted cross-questions to validate your understanding.
                      </div>
                    )}

                    <div className="text-xs text-slate-400 mt-3">
                      Evaluated {format(new Date(app.evaluation.evaluatedAt), "PPP")}
                    </div>
                  </div>
                )}

                {app.status === "DRAFT" && (
                  <div className="p-5 bg-amber-50 border-t border-amber-100 flex items-center justify-between">
                    <p className="text-sm text-amber-700">Your assessment is still in progress.</p>
                    <Link
                      href={`/candidate/apply/${app.jobRole.toLowerCase().replace(/_/g, "-")}/assessment?id=${app.id}`}
                      className="btn-primary text-sm py-2 flex items-center gap-1.5"
                    >
                      Continue <ExternalLink size={13} />
                    </Link>
                  </div>
                )}

                {["SUBMITTED", "EVALUATING"].includes(app.status) && (
                  <div className="p-5 bg-blue-50 border-t border-blue-100">
                    <p className="text-sm text-blue-700">
                      {app.status === "EVALUATING"
                        ? "⚡ Your answers are currently being evaluated by our AI system."
                        : "✅ Your assessment has been submitted and is under review. We'll notify you when evaluation is complete."}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
