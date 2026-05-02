import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { JOB_ROLE_CONFIG, EXPERIENCE_LEVEL_CONFIG, JobRole } from "@/types";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default async function ApplyPage() {
  const session = await getServerSession(authOptions);

  const existing = await prisma.application.findMany({
    where: { userId: session!.user.id },
    select: { jobRole: true, status: true },
  });

  const appliedRoles = new Set(existing.map((a) => a.jobRole));

  const roles = Object.values(JOB_ROLE_CONFIG);

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Apply for a Role</h1>
        <p className="text-slate-500 mt-1">Choose the role that best matches your background. You can apply for one role at a time.</p>
      </div>

      {/* What to expect */}
      <div className="card p-5 mb-8 bg-gradient-to-r from-indigo-50 to-violet-50 border-indigo-100">
        <h3 className="font-semibold text-slate-800 mb-3">The evaluation has 4 parts:</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            { icon: "💻", title: "Coding #1", time: "~30 min" },
            { icon: "💻", title: "Coding #2", time: "~30 min" },
            { icon: "🏗️", title: "System Design", time: "~45 min" },
            { icon: "📋", title: "Case Study", time: "~20 min" },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-lg p-3 text-center border border-slate-200">
              <div className="text-xl mb-1">{item.icon}</div>
              <div className="font-medium text-slate-800">{item.title}</div>
              <div className="text-slate-500 text-xs">{item.time}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">Questions adapt to your stated experience level. You can save your progress and return later.</p>
      </div>

      {/* Roles grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {roles.map((role) => {
          const applied = appliedRoles.has(role.id as JobRole);
          const appData = existing.find((a) => a.jobRole === role.id);
          const roleSlug = role.id.toLowerCase().replace(/_/g, "-");

          return (
            <div key={role.id} className={`card p-6 transition-all ${applied ? "opacity-75" : "hover:shadow-md hover:border-indigo-200"}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{role.icon}</span>
                  <div>
                    <h3 className="font-bold text-slate-900">{role.label}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {role.levels.map((lvl) => (
                        <span key={lvl} className="badge-gray text-xs">{EXPERIENCE_LEVEL_CONFIG[lvl].yearsRange}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {applied && (
                  <span className={`badge text-xs ${
                    appData?.status === "SHORTLISTED" ? "badge-green" :
                    appData?.status === "REJECTED" ? "badge-red" :
                    appData?.status === "DRAFT" ? "badge-yellow" :
                    "badge-blue"
                  }`}>
                    {appData?.status === "DRAFT" ? "In Progress" : appData?.status ?? "Applied"}
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-500 mb-4 leading-relaxed">{role.description}</p>

              <div className="flex flex-wrap gap-1.5 mb-5">
                {role.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                    {tag}
                  </span>
                ))}
              </div>

              {applied ? (
                appData?.status === "DRAFT" ? (
                  <Link
                    href={`/candidate/apply/${roleSlug}/assessment?id=${existing.find(a => a.jobRole === role.id as JobRole)}`}
                    className="btn-secondary w-full justify-center"
                  >
                    Continue Assessment <ArrowRight size={14} />
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                    <CheckCircle2 size={16} /> Application submitted
                  </div>
                )
              ) : (
                <Link href={`/candidate/apply/${roleSlug}`} className="btn-primary w-full justify-center">
                  Apply for {role.label} <ArrowRight size={14} />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
