import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { format, subDays } from "date-fns";
import { JOB_ROLE_CONFIG, RECOMMENDATION_CONFIG } from "@/types";
import type { RecommendationLevel } from "@/types";
import { ArrowRight, TrendingUp, Users, FileText, CheckCircle2, Zap } from "lucide-react";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  const [
    totalApps,
    submitted,
    evaluated,
    shortlisted,
    todayApps,
    recentApps,
    roleBreakdown,
  ] = await Promise.all([
    prisma.application.count(),
    prisma.application.count({ where: { status: { in: ["SUBMITTED", "EVALUATING", "EVALUATED", "SHORTLISTED", "REJECTED"] } } }),
    prisma.application.count({ where: { status: { in: ["EVALUATED", "SHORTLISTED", "REJECTED"] } } }),
    prisma.application.count({ where: { status: "SHORTLISTED" } }),
    prisma.application.count({ where: { createdAt: { gte: subDays(new Date(), 1) } } }),
    prisma.application.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        evaluation: { select: { overallScore: true, recommendation: true, aiUsageLikelihood: true } },
      },
    }),
    prisma.application.groupBy({
      by: ["jobRole"],
      _count: { _all: true },
      orderBy: { _count: { jobRole: "desc" } },
    }),
  ]);

  const stats = [
    { label: "Total Applications", value: totalApps, icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Submitted", value: submitted, icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Evaluated", value: evaluated, icon: Zap, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Shortlisted", value: shortlisted, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Today", value: todayApps, icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <Link href="/admin/applications" className="btn-primary text-sm">
          View All Applications <ArrowRight size={14} />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon size={16} className={s.color} />
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent applications */}
        <div className="lg:col-span-2 card">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent Submissions</h2>
            <Link href="/admin/applications" className="text-xs text-indigo-600 hover:text-indigo-700">View all →</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentApps.map((app) => {
              const roleConfig = JOB_ROLE_CONFIG[app.jobRole];
              const rec = app.evaluation?.recommendation as RecommendationLevel | undefined;
              const recConfig = rec ? RECOMMENDATION_CONFIG[rec] : null;

              return (
                <Link key={app.id} href={`/admin/applications/${app.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs shrink-0">
                    {app.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{app.user.name}</div>
                    <div className="text-xs text-slate-400 truncate">
                      {roleConfig.icon} {roleConfig.label} · {format(new Date(app.createdAt), "MMM d, h:mm a")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {app.evaluation ? (
                      <>
                        <span className="text-sm font-bold text-indigo-600">
                          {app.evaluation.overallScore.toFixed(0)}
                        </span>
                        {recConfig && (
                          <span className={`text-xs font-semibold ${recConfig.color} ${recConfig.bgColor} px-2 py-0.5 rounded-full`}>
                            {recConfig.label}
                          </span>
                        )}
                        {app.evaluation.aiUsageLikelihood > 60 && (
                          <span className="badge-yellow text-xs">⚠️ AI</span>
                        )}
                      </>
                    ) : (
                      <span className={`badge text-xs ${
                        app.status === "DRAFT" ? "badge-yellow" :
                        app.status === "EVALUATING" ? "bg-violet-100 text-violet-700" :
                        "badge-blue"
                      }`}>
                        {app.status}
                      </span>
                    )}
                    <ArrowRight size={14} className="text-slate-300" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Role breakdown */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Applications by Role</h2>
          </div>
          <div className="p-5 space-y-3">
            {roleBreakdown.map((rb) => {
              const roleConfig = JOB_ROLE_CONFIG[rb.jobRole];
              const pct = totalApps > 0 ? (rb._count._all / totalApps) * 100 : 0;
              return (
                <div key={rb.jobRole}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700 flex items-center gap-1.5">
                      {roleConfig.icon} {roleConfig.label}
                    </span>
                    <span className="font-semibold text-slate-900">{rb._count._all}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
