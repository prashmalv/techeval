"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Users, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { href: "/admin/applications", icon: FileText, label: "Applications" },
  { href: "/admin/candidates", icon: Users, label: "Candidates" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const initials = session?.user?.name
    ?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "A";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-60 flex-col bg-slate-900 fixed h-full z-30 hidden md:flex">
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/rlai-logo.png" alt="RLAI" width={64} height={33} className="object-contain" />
            <div>
              <div className="text-sm font-bold text-white leading-none">TechEval</div>
              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <Shield size={10} /> Admin Portal
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-semibold text-xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white truncate">{session?.user?.name}</div>
              <div className="text-xs text-slate-400 truncate">Administrator</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-white/10 hover:text-red-300 transition-colors w-full"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-60 min-h-screen">
        {children}
      </main>
    </div>
  );
}
