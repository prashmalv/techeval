import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendHRNotification } from "@/lib/email";
import { ApplicationWithDetails } from "@/types";

export async function POST(
  req: NextRequest,
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
        user: { select: { id: true, name: true, email: true, phone: true } },
        answers: true,
        evaluation: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    await sendHRNotification(application as unknown as ApplicationWithDetails);

    await prisma.adminNotification.create({
      data: {
        applicationId: params.id,
        hrEmail: process.env.HR_EMAIL || "hr@rightleft.ai",
        emailSubject: `[RLAI Eval] ${application.user.name} — ${application.jobRole}`,
        emailBody: `HR notification sent for application ${params.id}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Notify error:", err);
    return NextResponse.json({ error: "Failed to send notification." }, { status: 500 });
  }
}
