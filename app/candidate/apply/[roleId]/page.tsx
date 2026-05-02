"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Loader2, Upload, FileText, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { JOB_ROLE_CONFIG, EXPERIENCE_LEVEL_CONFIG, JobRole, ExperienceLevel } from "@/types";

const ROLE_SLUG_MAP: Record<string, JobRole> = {
  "ai-intern": "AI_INTERN",
  "ai-engineer": "AI_ENGINEER",
  "data-scientist": "DATA_SCIENTIST",
  "ai-architect": "AI_ARCHITECT",
  "mlops-engineer": "MLOPS_ENGINEER",
  "cloud-architect": "CLOUD_ARCHITECT",
  "senior-tech-lead": "SENIOR_TECH_LEAD",
  "tech-program-manager": "TECH_PROGRAM_MANAGER",
};

const YEARS_TO_LEVEL = (y: number): ExperienceLevel => {
  if (y < 1) return "INTERN";
  if (y < 3) return "JUNIOR";
  if (y < 5) return "MID";
  if (y < 8) return "SENIOR";
  return "STAFF";
};

const schema = z.object({
  yearsExperience: z.number({ invalid_type_error: "Required" }).min(0).max(50),
  currentTitle: z.string().max(100).optional(),
  currentCompany: z.string().max(100).optional(),
  linkedinUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  portfolioUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  professionalSummary: z.string().max(2000).optional(),
});
type FormData = z.infer<typeof schema>;

export default function ApplyRolePage() {
  const params = useParams();
  const router = useRouter();
  const roleSlug = params.roleId as string;
  const jobRole = ROLE_SLUG_MAP[roleSlug];

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [appId, setAppId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"], "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
    maxSize: 5 * 1024 * 1024,
    maxFiles: 1,
    onDropAccepted: (files) => setResumeFile(files[0]),
    onDropRejected: () => toast.error("File must be PDF or Word, max 5MB"),
  });

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { yearsExperience: 0 },
  });

  const years = watch("yearsExperience") || 0;
  const level = YEARS_TO_LEVEL(Number(years));
  const levelConfig = EXPERIENCE_LEVEL_CONFIG[level];

  if (!jobRole) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Role not found.</p>
        <Link href="/candidate/apply" className="btn-primary mt-4">Back to roles</Link>
      </div>
    );
  }

  const roleConfig = JOB_ROLE_CONFIG[jobRole];

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const level = YEARS_TO_LEVEL(Number(data.yearsExperience));

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobRole, experienceLevel: level, ...data }),
      });

      const json = await res.json();

      if (res.status === 409) {
        toast.error("You have already applied for this role.");
        router.push("/candidate/applications");
        return;
      }

      if (!res.ok) {
        toast.error(json.error || "Failed to create application");
        return;
      }

      const newAppId = json.applicationId;
      setAppId(newAppId);

      if (resumeFile) {
        setUploading(true);
        const fd = new FormData();
        fd.append("file", resumeFile);
        fd.append("type", "resume");
        fd.append("applicationId", newAppId);

        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (!uploadRes.ok) toast.warning("Resume upload failed — you can upload it later");
        setUploading(false);
      }

      toast.success("Application created! Starting your assessment…");
      router.push(`/candidate/apply/${roleSlug}/assessment?id=${newAppId}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      <Link href="/candidate/apply" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mb-6">
        ← Back to roles
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl">{roleConfig.icon}</span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Apply — {roleConfig.label}</h1>
          <p className="text-slate-500 text-sm">{roleConfig.description}</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        <div className="flex items-center gap-2 font-semibold text-indigo-600">
          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">1</div>
          Your Profile
        </div>
        <div className="flex-1 h-px bg-slate-200" />
        <div className="flex items-center gap-2 text-slate-400">
          <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center text-xs">2</div>
          Assessment
        </div>
        <div className="flex-1 h-px bg-slate-200" />
        <div className="flex items-center gap-2 text-slate-400">
          <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center text-xs">3</div>
          Submit
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Experience */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Experience Level</h2>
          <div>
            <label className="label">Years of relevant experience *</label>
            <input
              {...register("yearsExperience", { valueAsNumber: true })}
              type="number"
              min="0"
              max="50"
              step="0.5"
              placeholder="e.g. 2.5"
              className="input"
            />
            {errors.yearsExperience && <p className="mt-1 text-xs text-red-500">{errors.yearsExperience.message}</p>}
          </div>

          {years >= 0 && (
            <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-indigo-600" />
                <span className="text-sm font-semibold text-indigo-800">
                  Your assessment: <span className="text-indigo-600">{levelConfig.difficulty}</span> level
                </span>
              </div>
              <p className="text-xs text-indigo-600 mt-1">
                {levelConfig.label} · {levelConfig.yearsRange} · questions tailored to this level
              </p>
            </div>
          )}
        </div>

        {/* Professional info */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Professional Background</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Current Job Title</label>
              <input {...register("currentTitle")} type="text" placeholder="e.g. ML Engineer" className="input" />
            </div>
            <div>
              <label className="label">Current Company</label>
              <input {...register("currentCompany")} type="text" placeholder="e.g. Infosys" className="input" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="label">LinkedIn URL</label>
              <input {...register("linkedinUrl")} type="url" placeholder="https://linkedin.com/in/..." className="input" />
              {errors.linkedinUrl && <p className="mt-1 text-xs text-red-500">{errors.linkedinUrl.message}</p>}
            </div>
            <div>
              <label className="label">Portfolio / GitHub</label>
              <input {...register("portfolioUrl")} type="url" placeholder="https://github.com/..." className="input" />
              {errors.portfolioUrl && <p className="mt-1 text-xs text-red-500">{errors.portfolioUrl.message}</p>}
            </div>
          </div>
          <div className="mt-4">
            <label className="label">Brief Professional Summary <span className="text-slate-400 font-normal">(optional, max 2000 chars)</span></label>
            <textarea
              {...register("professionalSummary")}
              rows={3}
              placeholder="Briefly describe your background, key achievements, and why you're applying to RLAI…"
              className="input resize-none"
            />
          </div>
        </div>

        {/* Resume upload */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Resume <span className="text-slate-400 font-normal text-sm">(recommended)</span></h2>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-indigo-400 bg-indigo-50" : "border-slate-300 hover:border-indigo-300 hover:bg-slate-50"
            }`}
          >
            <input {...getInputProps()} />
            {resumeFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={20} className="text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">{resumeFile.name}</span>
                <span className="text-xs text-slate-400">({(resumeFile.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            ) : (
              <div>
                <Upload size={24} className="text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600"><span className="font-semibold text-indigo-600">Click to upload</span> or drag & drop</p>
                <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX · Max 5 MB</p>
              </div>
            )}
          </div>
        </div>

        <button type="submit" disabled={loading || uploading} className="btn-primary w-full py-3.5 text-base rounded-xl">
          {loading || uploading ? (
            <><Loader2 size={18} className="animate-spin" /> {uploading ? "Uploading resume…" : "Creating application…"}</>
          ) : (
            <>Continue to Assessment <ArrowRight size={18} /></>
          )}
        </button>
      </form>
    </div>
  );
}
