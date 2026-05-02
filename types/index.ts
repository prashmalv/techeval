import {
  UserRole,
  JobRole,
  ExperienceLevel,
  ApplicationStatus,
  QuestionType,
} from "@prisma/client";

export { UserRole, JobRole, ExperienceLevel, ApplicationStatus, QuestionType };

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description: string;
  requirements?: string[];
  hints?: string[];
  exampleInput?: string;
  exampleOutput?: string;
  starterCode?: string;
  language?: string;
  estimatedMinutes: number;
  difficultyNote?: string;
}

export interface RoleConfig {
  id: JobRole;
  label: string;
  description: string;
  icon: string;
  levels: ExperienceLevel[];
  tags: string[];
}

export interface AssessmentAnswer {
  questionId: string;
  questionType: QuestionType;
  questionTitle: string;
  content: string;
  language?: string;
  diagramUrl?: string;
  timeTakenSeconds?: number;
}

export interface QuestionEvaluation {
  questionId: string;
  questionTitle: string;
  questionType: QuestionType;
  scores: {
    technical: number;
    practical: number;
    communication: number;
    overall: number;
  };
  feedback: string;
  strengths: string[];
  improvements: string[];
  aiUsageLikelihood: number;
  aiUsageNotes?: string;
}

export interface EvaluationResult {
  overallScore: number;
  technicalScore: number;
  practicalScore: number;
  communicationScore: number;
  systemThinkingScore: number;
  aiUsageLikelihood: number;
  aiUsageAnalysis: string;
  redFlags: string[];
  crossQuestionNotes: string;
  questionEvaluations: QuestionEvaluation[];
  recommendation: RecommendationLevel;
  keyStrengths: string[];
  keyConcerns: string[];
  suggestedCrossQuestions: string[];
  summary: string;
}

export type RecommendationLevel =
  | "STRONG_HIRE"
  | "HIRE"
  | "BORDERLINE"
  | "NO_HIRE"
  | "STRONG_NO_HIRE";

export interface ApplicationWithDetails {
  id: string;
  userId: string;
  jobRole: JobRole;
  experienceLevel: ExperienceLevel;
  yearsExperience: number;
  currentCompany?: string | null;
  currentTitle?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  professionalSummary?: string | null;
  resumeUrl?: string | null;
  resumeFileName?: string | null;
  status: ApplicationStatus;
  submittedAt?: Date | null;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  answers: {
    id: string;
    questionId: string;
    questionType: QuestionType;
    questionTitle: string;
    content: string;
    language?: string | null;
    diagramUrl?: string | null;
    timeTakenSeconds?: number | null;
  }[];
  evaluation?: {
    id: string;
    overallScore: number;
    technicalScore: number;
    practicalScore: number;
    communicationScore: number;
    systemThinkingScore: number;
    aiUsageLikelihood: number;
    aiUsageAnalysis: string;
    redFlags: string[];
    crossQuestionNotes?: string | null;
    questionEvaluations: QuestionEvaluation[];
    recommendation: string;
    keyStrengths: string[];
    keyConcerns: string[];
    suggestedCrossQuestions: string[];
    summary: string;
    evaluatedAt: Date;
  } | null;
}

export const JOB_ROLE_CONFIG: Record<JobRole, RoleConfig> = {
  AI_INTERN: {
    id: "AI_INTERN",
    label: "AI Intern",
    description: "Entry-level AI/ML internship for students and fresh graduates",
    icon: "🎓",
    levels: ["INTERN", "JUNIOR"],
    tags: ["Python", "ML Basics", "Data Analysis"],
  },
  AI_ENGINEER: {
    id: "AI_ENGINEER",
    label: "AI Engineer",
    description: "Build and deploy production AI/LLM systems",
    icon: "🤖",
    levels: ["JUNIOR", "MID", "SENIOR"],
    tags: ["LLMs", "RAG", "APIs", "Python"],
  },
  DATA_SCIENTIST: {
    id: "DATA_SCIENTIST",
    label: "Data Scientist",
    description: "Statistical modeling, ML, and business insights from data",
    icon: "📊",
    levels: ["JUNIOR", "MID", "SENIOR"],
    tags: ["Statistics", "ML", "Python/R", "Visualization"],
  },
  AI_ARCHITECT: {
    id: "AI_ARCHITECT",
    label: "AI Architect",
    description: "Design enterprise-scale AI platforms and strategies",
    icon: "🏗️",
    levels: ["SENIOR", "STAFF"],
    tags: ["Architecture", "LLMOps", "Strategy", "Cloud"],
  },
  MLOPS_ENGINEER: {
    id: "MLOPS_ENGINEER",
    label: "MLOps Engineer",
    description: "ML infrastructure, CI/CD pipelines, and model operations",
    icon: "⚙️",
    levels: ["MID", "SENIOR"],
    tags: ["MLflow", "Kubernetes", "CI/CD", "Monitoring"],
  },
  CLOUD_ARCHITECT: {
    id: "CLOUD_ARCHITECT",
    label: "Cloud Architect",
    description: "Design scalable cloud infrastructure for AI workloads",
    icon: "☁️",
    levels: ["SENIOR", "STAFF"],
    tags: ["Azure/AWS/GCP", "IaC", "Security", "FinOps"],
  },
  SENIOR_TECH_LEAD: {
    id: "SENIOR_TECH_LEAD",
    label: "Senior Tech Lead",
    description: "Technical leadership for AI product teams",
    icon: "👑",
    levels: ["SENIOR", "STAFF"],
    tags: ["Leadership", "Architecture", "Code Review", "Strategy"],
  },
  TECH_PROGRAM_MANAGER: {
    id: "TECH_PROGRAM_MANAGER",
    label: "Tech Program Manager",
    description: "Manage complex AI/tech programs and cross-team initiatives",
    icon: "📋",
    levels: ["MID", "SENIOR", "STAFF"],
    tags: ["Roadmap", "Stakeholders", "Agile", "Risk Management"],
  },
};

export const EXPERIENCE_LEVEL_CONFIG: Record<
  ExperienceLevel,
  { label: string; yearsRange: string; difficulty: string }
> = {
  INTERN: {
    label: "Intern / Fresher",
    yearsRange: "0–1 year",
    difficulty: "Foundational",
  },
  JUNIOR: {
    label: "Junior",
    yearsRange: "1–3 years",
    difficulty: "Basic to Intermediate",
  },
  MID: {
    label: "Mid-level",
    yearsRange: "3–5 years",
    difficulty: "Intermediate",
  },
  SENIOR: {
    label: "Senior",
    yearsRange: "5–8 years",
    difficulty: "Advanced",
  },
  STAFF: {
    label: "Staff / Principal",
    yearsRange: "8+ years",
    difficulty: "Expert",
  },
};

export const RECOMMENDATION_CONFIG: Record<
  RecommendationLevel,
  { label: string; color: string; bgColor: string }
> = {
  STRONG_HIRE: {
    label: "Strong Hire",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  HIRE: { label: "Hire", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  BORDERLINE: {
    label: "Borderline",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  NO_HIRE: { label: "No Hire", color: "text-orange-700", bgColor: "bg-orange-100" },
  STRONG_NO_HIRE: {
    label: "Strong No Hire",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
};
