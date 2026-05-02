import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const answerSchema = z.object({
  questionId: z.string(),
  questionType: z.enum(["CODING", "SYSTEM_DESIGN", "CASE_STUDY"]),
  questionTitle: z.string(),
  content: z.string(),
  language: z.string().optional(),
  diagramUrl: z.string().optional(),
  timeTakenSeconds: z.number().optional(),
});

const submitSchema = z.object({
  answers: z.array(answerSchema),
  action: z.enum(["save", "submit"]),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        answers: true,
        evaluation: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (
      session.user.role !== "ADMIN" &&
      application.userId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ application });
  } catch (err) {
    console.error("Get application error:", err);
    return NextResponse.json({ error: "Failed to fetch application." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const application = await prisma.application.findUnique({
      where: { id: params.id },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (application.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (application.status === "SUBMITTED" || application.status === "EVALUATED") {
      return NextResponse.json(
        { error: "This application has already been submitted." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { answers, action } = submitSchema.parse(body);

    await prisma.$transaction(async (tx) => {
      for (const answer of answers) {
        await tx.answer.upsert({
          where: {
            applicationId_questionId: {
              applicationId: params.id,
              questionId: answer.questionId,
            },
          },
          create: {
            applicationId: params.id,
            questionId: answer.questionId,
            questionType: answer.questionType,
            questionTitle: answer.questionTitle,
            content: answer.content,
            language: answer.language || null,
            diagramUrl: answer.diagramUrl || null,
            timeTakenSeconds: answer.timeTakenSeconds || null,
          },
          update: {
            content: answer.content,
            language: answer.language || null,
            diagramUrl: answer.diagramUrl || null,
            timeTakenSeconds: answer.timeTakenSeconds || null,
          },
        });
      }

      if (action === "submit") {
        await tx.application.update({
          where: { id: params.id },
          data: {
            status: "SUBMITTED",
            submittedAt: new Date(),
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      submitted: action === "submit",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("Submit answers error:", err);
    return NextResponse.json({ error: "Failed to save answers." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { status } = z.object({
      status: z.enum(["SHORTLISTED", "REJECTED"]),
    }).parse(body);

    await prisma.application.update({
      where: { id: params.id },
      data: { status },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update application status error:", err);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
