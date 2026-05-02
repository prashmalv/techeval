import Link from "next/link";
import Image from "next/image";
import { JOB_ROLE_CONFIG } from "@/types";

export default function LandingPage() {
  const roles = Object.values(JOB_ROLE_CONFIG);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/rlai-logo.png" alt="RLAI" width={72} height={37} className="object-contain" unoptimized />
            <span className="font-semibold text-lg tracking-tight text-white">TechEval</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link href="/register" className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition-colors">
              Apply Now →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-sm text-indigo-300 mb-8">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
          Hiring for AI & Tech Roles · rightleft.ai
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          Prove Your <span className="text-gradient bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Real Skills</span>
          <br />Not Just Your Resume
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          RLAI's adaptive technical evaluation goes beyond keywords. Solve real-world coding challenges,
          system design problems, and AI case studies — at your actual experience level.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register" className="btn-primary text-base px-8 py-3 rounded-xl shadow-lg shadow-indigo-500/25">
            Start Your Evaluation →
          </Link>
          <Link href="/login" className="btn-secondary text-base px-8 py-3 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10">
            Already have an account
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-12 text-white">How the Evaluation Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: "01", icon: "📝", title: "Register & Select Role", desc: "Create your profile, upload your resume, and choose the role you're targeting." },
            { step: "02", icon: "⚡", title: "Adaptive Assessment", desc: "Answer 4 questions tailored to your experience: 2 coding + 1 system design + 1 case study." },
            { step: "03", icon: "🤖", title: "AI Evaluation", desc: "Our AI evaluates your answers on technical depth, practical thinking, and genuine expertise." },
            { step: "04", icon: "🎯", title: "Expert Review", desc: "Our team reviews the AI evaluation and top candidates are contacted by HR directly." },
          ].map((item) => (
            <div key={item.step} className="relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors">
              <div className="text-xs font-mono text-indigo-400 mb-3">{item.step}</div>
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-4 text-white">Open Evaluations</h2>
        <p className="text-slate-400 text-center mb-12">We're evaluating candidates across all these roles right now</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/8 hover:border-indigo-500/40 transition-all group cursor-pointer">
              <div className="text-2xl mb-3">{role.icon}</div>
              <h3 className="font-semibold text-white text-sm mb-1.5">{role.label}</h3>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">{role.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {role.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Assessment structure */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-10 md:p-14">
          <h2 className="text-2xl font-bold mb-10 text-white text-center">What to Expect in the Assessment</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: "💻", title: "2 Coding Challenges", time: "~60 min", color: "from-blue-500 to-indigo-600",
                points: ["Real-world implementation problems", "In-browser code editor with syntax highlighting", "Difficulty adapts to your experience level", "Language of your choice"] },
              { icon: "🏗️", title: "1 System Design", time: "~45 min", color: "from-violet-500 to-purple-600",
                points: ["Architecture for real-scale problems", "Security, performance, mobile/web tradeoffs", "Upload architecture diagrams (optional)", "Showcase your holistic thinking"] },
              { icon: "📋", title: "1 Case Study", time: "~20 min", color: "from-emerald-500 to-teal-600",
                points: ["Realistic business + technical scenario", "Tests decision-making and trade-offs", "Role-specific practical situations", "No right answer — your thinking matters"] },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className={`inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} items-center justify-center text-2xl mb-4 shadow-lg`}>
                  {item.icon}
                </div>
                <h3 className="font-bold text-white mb-1">{item.title}</h3>
                <p className="text-indigo-400 text-sm mb-4">{item.time}</p>
                <ul className="text-sm text-slate-400 space-y-2 text-left">
                  {item.points.map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to stand out?</h2>
        <p className="text-slate-400 mb-8">Takes about 2 hours. We review every submission and the best candidates hear back within 5 business days.</p>
        <Link href="/register" className="btn-primary text-base px-10 py-4 rounded-xl shadow-xl shadow-indigo-500/30 text-lg">
          Begin Your Evaluation
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} rightleft.ai · RLAI Tech Evaluation Platform
      </footer>
    </div>
  );
}
