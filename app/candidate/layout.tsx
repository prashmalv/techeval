"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, FileText, LogOut, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/candidate/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/candidate/apply", icon: Briefcase, label: "Apply for a Role" },
  { href: "/candidate/applications", icon: FileText, label: "My Applications" },
];

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-slate-200 fixed h-full z-30">
        <div className="px-5 py-5 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/rlai-logo.png" alt="RLAI" width={64} height={33} className="object-contain" unoptimized />
            <div>
              <div className="text-sm font-bold text-white leading-none">TechEval</div>
              <div className="text-xs text-slate-400 mt-0.5">Candidate Portal</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "sidebar-item",
                pathname.startsWith(item.href) && "active"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-900 truncate">{session?.user?.name}</div>
              <div className="text-xs text-slate-400 truncate">{session?.user?.email}</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="sidebar-item w-full mt-1 text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/rlai-logo.png" alt="RLAI" width={56} height={29} className="object-contain" unoptimized />
          <span className="font-bold text-white">TechEval</span>
        </Link>
        <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-1.5 text-sm text-slate-600">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs">{initials}</div>
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMenuOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="font-semibold mb-6">{session?.user?.name}</div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                  className={cn("sidebar-item", pathname.startsWith(item.href) && "active")}>
                  <item.icon size={18} /> {item.label}
                </Link>
              ))}
              <button onClick={() => signOut({ callbackUrl: "/login" })} className="sidebar-item w-full text-red-500 hover:bg-red-50">
                <LogOut size={16} /> Sign Out
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 md:ml-60 mt-14 md:mt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
