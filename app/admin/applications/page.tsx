import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { JOB_ROLE_CONFIG, RECOMMENDATION_CONFIG, EXPERIENCE_LEVEL_CONFIG } from "@/types";
import type { RecommendationLevel, JobRole, ApplicationStatus } from "@/types";
import { ArrowRight, Search } from "lucide-react";

interface Props {
  searchParams: {
    role?: string;
    status?: string;
    page?: string;
    q?: string;
  };
}

export default async function AdminApplicationsPage({ searchParams }: Props) {
  await getServerSession(authOptions);

  const page = parseInt(searchParams.page || "1");
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (searchParams.role) where.jobRole = searchParams.role;
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.q) {
    where.user = {
      OR: [
        { name: { contains: searchParams.q, mode: "insensitive" } },
        { email: { contains: searchParams.q, mode: "insensitive" } },
      ],
    };
  }

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        evaluation: {
          select: {
            overallScore: true, recommendation: true,
            aiUsageLikelihood: true, evaluatedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.application.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);
  const roles = Object.values(JOB_ROLE_CONFIG);
  const statuses: ApplicationStatus[] = ["DRAFT", "SUBMITTED", "EVALUATING", "EVALUATED", "SHORTLISTED", "REJECTED"];

  const statusBadge = {
    DRAFT: "badge-yellow",
    SUBMITTED: "badge-blue",
    EVALUATING: "bg-violet-100 text-violet-700",
    EVALUATED: "badge-green",
    SHORTLISTED: "bg-green-100 text-green-700",
    REJECTED: "badge-gray",
  } as const;

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">All Applications</h1>
        <p className="text-slate-500 mt-1">{total} total · Page {page} of {totalPages}</p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <form method="GET" className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="label text-xs">Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input name="q" defaultValue={searchParams.q} placeholder="Name or email…"
                className="input pl-8 text-sm py-2" />
            </div>
          </div>
          <div>
            <label className="label text-xs">Role</label>
            <select name="role" defaultValue={searchParams.role || ""} className="input text-sm py-2 pr-8">
              <option value="">All Roles</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.icon} {r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Status</label>
            <select name="status" defaultValue={searchParams.status || ""} className="input text-sm py-2 pr-8">
              <option value="">All Statuses</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary text-sm py-2">Filter</button>
          <Link href="/admin/applications" className="btn-secondary text-sm py-2">Reset</Link>
        </form>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Candidate</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Level</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Score</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Recommendation</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">AI Flag</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((app) => {
                const roleConfig = JOB_ROLE_CONFIG[app.jobRole as JobRole];
                const levelConfig = EXPERIENCE_LEVEL_CONFIG[app.experienceLevel];
                const rec = app.evaluation?.recommendation as RecommendationLevel | undefined;
                const recConfig = rec ? RECOMMENDATION_CONFIG[rec] : null;
                const aiFlag = app.evaluation?.aiUsageLikelihood ?? 0;

                return (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-900">{app.user.name}</div>
                      <div className="text-xs text-slate-400">{app.user.email}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1.5">
                        {roleConfig.icon} <span className="text-slate-700">{roleConfig.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="badge-gray text-xs">{levelConfig.label}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`badge text-xs ${statusBadge[app.status as keyof typeof statusBadge]}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {app.evaluation ? (
                        <span className="font-bold text-indigo-600">{app.evaluation.overallScore.toFixed(0)}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {recConfig ? (
                        <span className={`text-xs font-semibold ${recConfig.color} ${recConfig.bgColor} px-2 py-0.5 rounded-full`}>
                          {recConfig.label}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {app.evaluation && (
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${aiFlag > 60 ? "bg-red-400" : aiFlag > 30 ? "bg-amber-400" : "bg-emerald-400"}`}
                              style={{ width: `${aiFlag}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${aiFlag > 60 ? "text-red-600" : aiFlag > 30 ? "text-amber-600" : "text-emerald-600"}`}>
                            {aiFlag.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">
                      {format(new Date(app.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/admin/applications/${app.id}`}
                        className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                        Review <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {applications.length === 0 && (
            <div className="py-16 text-center text-slate-400">No applications found matching your filters.</div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/applications?page=${p}${searchParams.role ? `&role=${searchParams.role}` : ""}${searchParams.status ? `&status=${searchParams.status}` : ""}`}
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                p === page ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
