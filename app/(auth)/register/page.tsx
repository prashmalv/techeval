"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const password = watch("password", "");
  const strength = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Registration failed.");
        return;
      }

      await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      toast.success("Account created! Redirecting…");
      router.push("/candidate/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white">
            <Image src="/rlai-logo.png" alt="RLAI" width={72} height={37} className="object-contain" unoptimized />
            <span className="font-semibold text-lg text-white">TechEval</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-white">Create your account</h1>
          <p className="mt-1 text-slate-400 text-sm">Start your application for an RLAI role</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label text-slate-200">Full Name *</label>
              <input
                {...register("name")}
                type="text"
                placeholder="Priya Sharma"
                className="input bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-indigo-400"
              />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div>
              <label className="label text-slate-200">Email Address *</label>
              <input
                {...register("email")}
                type="email"
                placeholder="priya@example.com"
                className="input bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-indigo-400"
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label text-slate-200">Phone <span className="text-slate-500 text-xs">(optional)</span></label>
              <input
                {...register("phone")}
                type="tel"
                placeholder="+91 98765 43210"
                className="input bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="label text-slate-200">Password *</label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPw ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  className="input bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-indigo-400 pr-10"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {strength.map((ok, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${ok ? "bg-indigo-400" : "bg-white/10"}`} />
                  ))}
                </div>
              )}
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label text-slate-200">Confirm Password *</label>
              <input
                {...register("confirmPassword")}
                type={showPw ? "text" : "password"}
                placeholder="Repeat password"
                className="input bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-indigo-400"
              />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>}
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <CheckCircle2 size={16} className="text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-400">
                By registering, you agree that your answers and personal information will be stored securely on Azure and reviewed by the RLAI team.
              </p>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 rounded-xl text-base mt-2">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Creating account…</> : "Create Account & Start"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-400">
            Already registered?{" "}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
