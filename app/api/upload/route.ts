import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { uploadResume, uploadDiagram } from "@/lib/azure-storage";

const MAX_RESUME_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_DIAGRAM_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_RESUME_TYPES = ["application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const ALLOWED_DIAGRAM_TYPES = ["image/png", "image/jpeg", "image/jpg",
  "image/gif", "image/webp", "image/svg+xml"];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const uploadType = formData.get("type") as string | null;
    const applicationId = formData.get("applicationId") as string | null;
    const questionId = formData.get("questionId") as string | null;

    if (!file || !uploadType || !applicationId) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application || application.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (uploadType === "resume") {
      if (file.size > MAX_RESUME_SIZE) {
        return NextResponse.json({ error: "Resume must be under 5MB." }, { status: 400 });
      }
      if (!ALLOWED_RESUME_TYPES.includes(file.type)) {
        return NextResponse.json({ error: "Resume must be PDF or Word document." }, { status: 400 });
      }

      const url = await uploadResume(buffer, file.name, applicationId, file.type);
      await prisma.application.update({
        where: { id: applicationId },
        data: { resumeUrl: url, resumeFileName: file.name },
      });

      return NextResponse.json({ url, fileName: file.name });
    }

    if (uploadType === "diagram") {
      if (!questionId) {
        return NextResponse.json({ error: "questionId required for diagram upload." }, { status: 400 });
      }
      if (file.size > MAX_DIAGRAM_SIZE) {
        return NextResponse.json({ error: "Diagram must be under 10MB." }, { status: 400 });
      }
      if (!ALLOWED_DIAGRAM_TYPES.includes(file.type)) {
        return NextResponse.json({ error: "Diagram must be an image file." }, { status: 400 });
      }

      const url = await uploadDiagram(buffer, file.name, applicationId, questionId, file.type);
      return NextResponse.json({ url, fileName: file.name });
    }

    return NextResponse.json({ error: "Invalid upload type." }, { status: 400 });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
