import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { evaluateApplication } from "@/lib/evaluator";
import { JobRole, ExperienceLevel } from "@/types";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { name: true } },
        answers: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (application.answers.length === 0) {
      return NextResponse.json({ error: "No answers to evaluate." }, { status: 400 });
    }

    await prisma.application.update({
      where: { id: params.id },
      data: { status: "EVALUATING" },
    });

    const result = await evaluateApplication(
      application.answers.map((a) => ({
        questionId: a.questionId,
        questionTitle: a.questionTitle,
        questionType: a.questionType,
        content: a.content,
        language: a.language || undefined,
      })),
      application.jobRole as JobRole,
      application.experienceLevel as ExperienceLevel,
      application.yearsExperience,
      application.user.name
    );

    const existing = await prisma.evaluation.findUnique({
      where: { applicationId: params.id },
    });

    const evalData = {
      overallScore: result.overallScore,
      technicalScore: result.technicalScore,
      practicalScore: result.practicalScore,
      communicationScore: result.communicationScore,
      systemThinkingScore: result.systemThinkingScore,
      aiUsageLikelihood: result.aiUsageLikelihood,
      aiUsageAnalysis: result.aiUsageAnalysis,
      redFlags: result.redFlags,
      crossQuestionNotes: result.crossQuestionNotes,
      questionEvaluations: result.questionEvaluations as object[],
      recommendation: result.recommendation,
      keyStrengths: result.keyStrengths,
      keyConcerns: result.keyConcerns,
      suggestedCrossQuestions: result.suggestedCrossQuestions,
      summary: result.summary,
    };

    if (existing) {
      await prisma.evaluation.update({
        where: { applicationId: params.id },
        data: { ...evalData, evaluatedAt: new Date() },
      });
    } else {
      await prisma.evaluation.create({
        data: { applicationId: params.id, ...evalData },
      });
    }

    await prisma.application.update({
      where: { id: params.id },
      data: { status: "EVALUATED" },
    });

    return NextResponse.json({ success: true, evaluation: result });
  } catch (err) {
    console.error("Evaluation error:", err);
    await prisma.application.update({
      where: { id: params.id },
      data: { status: "SUBMITTED" },
    }).catch(() => {});

    const message = err instanceof Error && err.message.includes("credit balance")
      ? "Anthropic API credit balance is too low. Please top up at console.anthropic.com → Plans & Billing, then update ANTHROPIC_API_KEY in the Container App."
      : "Evaluation failed. Check server logs for details.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
