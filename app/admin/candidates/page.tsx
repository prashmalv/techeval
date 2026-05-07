import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { JOB_ROLE_CONFIG, EXPERIENCE_LEVEL_CONFIG } from "@/types";
import type { ApplicationStatus, JobRole } from "@/types";
import { Search, ArrowRight, User } from "lucide-react";

interface Props {
  searchParams: { q?: string; page?: string };
}

const statusColors: Record<ApplicationStatus, string> = {
  DRAFT: "badge-yellow",
  SUBMITTED: "badge-blue",
  EVALUATING: "bg-violet-100 text-violet-700",
  EVALUATED: "badge-green",
  SHORTLISTED: "bg-green-100 text-green-700",
  REJECTED: "badge-gray",
};

export default async function AdminCandidatesPage({ searchParams }: Props) {
  await getServerSession(authOptions);

  const page = parseInt(searchParams.page || "1");
  const limit = 25;

  const where = searchParams.q
    ? {
        role: "CANDIDATE" as const,
        OR: [
          { name: { contains: searchParams.q, mode: "insensitive" as const } },
          { email: { contains: searchParams.q, mode: "insensitive" as const } },
        ],
      }
    : { role: "CANDIDATE" as const };

  const [candidates, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        applications: {
          select: {
            id: true,
            jobRole: true,
            experienceLevel: true,
            status: true,
            submittedAt: true,
            createdAt: true,
            evaluation: { select: { overallScore: true, recommendation: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Candidates</h1>
        <p className="text-slate-500 mt-1">{total} registered · Page {page} of {Math.max(totalPages, 1)}</p>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <form method="GET" className="flex gap-3 items-end">
          <div className="flex-1 max-w-sm">
            <label className="label text-xs">Search by name or email</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={searchParams.q}
                placeholder="John Doe or john@example.com…"
                className="input pl-8 text-sm py-2"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary text-sm py-2">Search</button>
          {searchParams.q && (
            <Link href="/admin/candidates" className="btn-secondary text-sm py-2">Clear</Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Candidate</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Registered</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Applications</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Latest Role</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Score</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {candidates.map((candidate) => {
                const latest = candidate.applications[0];
                const roleConfig = latest ? JOB_ROLE_CONFIG[latest.jobRole as JobRole] : null;
                const levelConfig = latest ? EXPERIENCE_LEVEL_CONFIG[latest.experienceLevel] : null;

                return (
                  <tr key={candidate.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs shrink-0">
                          {candidate.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{candidate.name}</div>
                          <div className="text-xs text-slate-400">{candidate.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {candidate.phone || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">
                      {format(new Date(candidate.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-700">{candidate.applications.length}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {roleConfig ? (
                        <div>
                          <div className="flex items-center gap-1.5 text-slate-700">
                            {roleConfig.icon} {roleConfig.label}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">{levelConfig?.label}</div>
                        </div>
                      ) : (
                        <span className="text-slate-300">No applications</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {latest ? (
                        <span className={`badge text-xs ${statusColors[latest.status as ApplicationStatus]}`}>
                          {latest.status}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {latest?.evaluation ? (
                        <span className="font-bold text-indigo-600">
                          {latest.evaluation.overallScore.toFixed(0)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {latest ? (
                        <Link
                          href={`/admin/applications/${latest.id}`}
                          className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-xs whitespace-nowrap"
                        >
                          View App <ArrowRight size={12} />
                        </Link>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-300 text-xs">
                          <User size={12} /> No app
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {candidates.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              {searchParams.q ? `No candidates matching "${searchParams.q}"` : "No candidates have registered yet."}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/candidates?page=${p}${searchParams.q ? `&q=${searchParams.q}` : ""}`}
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
