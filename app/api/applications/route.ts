import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getQuestionsForRole } from "@/lib/questions/bank";
import { JobRole, ExperienceLevel } from "@/types";

const createSchema = z.object({
  jobRole: z.enum([
    "AI_INTERN", "AI_ENGINEER", "DATA_SCIENTIST", "AI_ARCHITECT",
    "MLOPS_ENGINEER", "CLOUD_ARCHITECT", "SENIOR_TECH_LEAD", "TECH_PROGRAM_MANAGER",
  ]),
  experienceLevel: z.enum(["INTERN", "JUNIOR", "MID", "SENIOR", "STAFF"]),
  yearsExperience: z.number().min(0).max(50),
  currentCompany: z.string().optional(),
  currentTitle: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  portfolioUrl: z.string().url().optional().or(z.literal("")),
  professionalSummary: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = createSchema.parse(body);

    const existing = await prisma.application.findUnique({
      where: { userId_jobRole: { userId: session.user.id, jobRole: data.jobRole } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already applied for this role.", applicationId: existing.id },
        { status: 409 }
      );
    }

    const questions = getQuestionsForRole(
      data.jobRole as JobRole,
      data.experienceLevel as ExperienceLevel
    );

    const application = await prisma.application.create({
      data: {
        userId: session.user.id,
        jobRole: data.jobRole,
        experienceLevel: data.experienceLevel,
        yearsExperience: data.yearsExperience,
        currentCompany: data.currentCompany || null,
        currentTitle: data.currentTitle || null,
        linkedinUrl: data.linkedinUrl || null,
        portfolioUrl: data.portfolioUrl || null,
        professionalSummary: data.professionalSummary || null,
        status: "DRAFT",
        assignedQuestions: JSON.parse(JSON.stringify({
          coding: questions.coding,
          systemDesign: questions.systemDesign,
          caseStudy: questions.caseStudy,
        })),
      },
    });

    return NextResponse.json({ applicationId: application.id }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("Create application error:", err);
    return NextResponse.json({ error: "Failed to create application." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "ADMIN") {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status");
      const role = searchParams.get("role");
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");

      const where: Record<string, unknown> = {};
      if (status) where.status = status;
      if (role) where.jobRole = role;

      const [applications, total] = await Promise.all([
        prisma.application.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            evaluation: {
              select: {
                overallScore: true,
                recommendation: true,
                aiUsageLikelihood: true,
                evaluatedAt: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.application.count({ where }),
      ]);

      return NextResponse.json({ applications, total, page, limit });
    }

    const applications = await prisma.application.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        jobRole: true,
        experienceLevel: true,
        status: true,
        submittedAt: true,
        createdAt: true,
        evaluation: {
          select: {
            overallScore: true,
            recommendation: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ applications });
  } catch (err) {
    console.error("Get applications error:", err);
    return NextResponse.json({ error: "Failed to fetch applications." }, { status: 500 });
  }
}
