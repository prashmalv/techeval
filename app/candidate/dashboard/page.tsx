import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight, Clock, CheckCircle2, AlertCircle, FileText, Zap } from "lucide-react";
import { JOB_ROLE_CONFIG, RECOMMENDATION_CONFIG } from "@/types";
import type { RecommendationLevel } from "@/types";
import { formatDistanceToNow } from "date-fns";

export default async function CandidateDashboard() {
  const session = await getServerSession(authOptions);

  const applications = await prisma.application.findMany({
    where: { userId: session!.user.id },
    include: {
      evaluation: { select: { overallScore: true, recommendation: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const statusIcon = {
    DRAFT: <Clock size={16} className="text-amber-500" />,
    SUBMITTED: <AlertCircle size={16} className="text-blue-500" />,
    EVALUATING: <Zap size={16} className="text-violet-500" />,
    EVALUATED: <CheckCircle2 size={16} className="text-emerald-500" />,
    SHORTLISTED: <CheckCircle2 size={16} className="text-green-600" />,
    REJECTED: <AlertCircle size={16} className="text-red-500" />,
  } as const;

  const statusLabel = {
    DRAFT: "In Progress",
    SUBMITTED: "Under Review",
    EVALUATING: "Being Evaluated",
    EVALUATED: "Evaluated",
    SHORTLISTED: "Shortlisted 🎉",
    REJECTED: "Not Selected",
  } as const;

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {session?.user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1">Track your applications and continue your evaluation.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Applied", value: applications.length, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Submitted", value: applications.filter(a => a.status !== "DRAFT").length, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Evaluated", value: applications.filter(a => ["EVALUATED","SHORTLISTED","REJECTED"].includes(a.status)).length, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Shortlisted", value: applications.filter(a => a.status === "SHORTLISTED").length, color: "text-green-600", bg: "bg-green-50" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* My Applications */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">My Applications</h2>
        <Link href="/candidate/apply" className="btn-primary text-sm py-2 px-4">
          Apply for a New Role <ArrowRight size={14} />
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={40} className="text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-700 mb-2">No applications yet</h3>
          <p className="text-slate-500 text-sm mb-6">Choose a role and start your technical evaluation.</p>
          <Link href="/candidate/apply" className="btn-primary">
            Browse Open Roles
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const roleConfig = JOB_ROLE_CONFIG[app.jobRole];
            const rec = app.evaluation?.recommendation as RecommendationLevel | undefined;
            const recConfig = rec ? RECOMMENDATION_CONFIG[rec] : null;

            return (
              <div key={app.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl shrink-0">{roleConfig.icon}</div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{roleConfig.label}</h3>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          {statusIcon[app.status]}
                          <span>{statusLabel[app.status]}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {roleConfig.tags.map((t) => (
                          <span key={t} className="badge-gray text-xs">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {app.evaluation && (
                      <div className="text-right">
                        <div className="text-xl font-bold text-indigo-600">{app.evaluation.overallScore.toFixed(0)}<span className="text-sm text-slate-400">/100</span></div>
                        {recConfig && (
                          <span className={`text-xs font-semibold ${recConfig.color}`}>{recConfig.label}</span>
                        )}
                      </div>
                    )}
                    {app.status === "DRAFT" && (
                      <Link href={`/candidate/apply/${app.jobRole.toLowerCase().replace(/_/g, "-")}/assessment?id=${app.id}`}
                        className="btn-primary text-xs py-1.5 px-3">
                        Continue <ArrowRight size={12} />
                      </Link>
                    )}
                    {["SUBMITTED","EVALUATING"].includes(app.status) && (
                      <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">Awaiting review</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tips */}
      <div className="mt-10 bg-indigo-50 border border-indigo-100 rounded-xl p-5">
        <h3 className="font-semibold text-indigo-800 mb-3">💡 Tips for a Strong Evaluation</h3>
        <ul className="text-sm text-indigo-700 space-y-1.5">
          <li>• Write your <strong>own</strong> answers — our AI flags AI-generated responses and that helps us identify those candidates</li>
          <li>• Show your thought process: imperfect but genuine beats polished but generic</li>
          <li>• For system design, mention trade-offs, not just the ideal solution</li>
          <li>• Include real numbers, specific libraries, and hard-won lessons from your experience</li>
        </ul>
      </div>
    </div>
  );
}
