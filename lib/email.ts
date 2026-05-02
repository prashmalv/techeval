import nodemailer from "nodemailer";
import { ApplicationWithDetails, JOB_ROLE_CONFIG, RECOMMENDATION_CONFIG } from "@/types";
import type { RecommendationLevel } from "@/types";

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendHRNotification(
  application: ApplicationWithDetails
): Promise<void> {
  const transporter = createTransporter();
  const hrEmail = process.env.HR_EMAIL || "hr@rightleft.ai";
  const hrCcEmail = process.env.HR_CC_EMAIL;

  const roleConfig = JOB_ROLE_CONFIG[application.jobRole];
  const evaluation = application.evaluation;
  const rec = evaluation?.recommendation as RecommendationLevel | undefined;
  const recConfig = rec ? RECOMMENDATION_CONFIG[rec] : null;

  const scoreBar = (score: number) =>
    `${"█".repeat(Math.round(score / 10))}${"░".repeat(10 - Math.round(score / 10))} ${score.toFixed(1)}/10`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Inter, Arial, sans-serif; color: #1e293b; background: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 700px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: white; padding: 32px 40px; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .header p { margin: 8px 0 0; opacity: 0.8; font-size: 14px; }
    .content { padding: 32px 40px; }
    .candidate-card { background: #f0f4ff; border-radius: 10px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #4f46e5; }
    .candidate-name { font-size: 20px; font-weight: 700; color: #1e1b4b; margin: 0 0 8px; }
    .info-row { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 12px; }
    .info-item { font-size: 13px; color: #475569; }
    .info-item strong { color: #1e293b; }
    .rec-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; margin-bottom: 20px; }
    .scores-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .score-item { background: #f8fafc; border-radius: 8px; padding: 14px; }
    .score-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .score-value { font-size: 22px; font-weight: 700; color: #1e1b4b; }
    .score-sub { font-size: 11px; color: #94a3b8; font-family: monospace; }
    .section { margin-bottom: 20px; }
    .section h3 { font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .tag-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .tag { background: #e0f2fe; color: #0369a1; padding: 3px 10px; border-radius: 12px; font-size: 12px; }
    .tag.red { background: #fee2e2; color: #b91c1c; }
    .tag.green { background: #dcfce7; color: #15803d; }
    .ai-warning { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 14px; font-size: 13px; color: #78350f; }
    .ai-warning strong { display: block; margin-bottom: 4px; }
    .cta-button { display: inline-block; background: #4f46e5; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 24px; }
    .footer { background: #f8fafc; padding: 20px 40px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Candidate Evaluation — ${roleConfig.label}</h1>
      <p>RLAI Tech Evaluation Platform · ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
    </div>
    <div class="content">
      <div class="candidate-card">
        <div class="candidate-name">${application.user.name}</div>
        <div class="info-row">
          <div class="info-item"><strong>Email:</strong> ${application.user.email}</div>
          ${application.user.phone ? `<div class="info-item"><strong>Phone:</strong> ${application.user.phone}</div>` : ""}
          ${application.currentTitle ? `<div class="info-item"><strong>Current Role:</strong> ${application.currentTitle}</div>` : ""}
          ${application.currentCompany ? `<div class="info-item"><strong>Company:</strong> ${application.currentCompany}</div>` : ""}
          <div class="info-item"><strong>Experience:</strong> ${application.yearsExperience} years</div>
          ${application.linkedinUrl ? `<div class="info-item"><strong>LinkedIn:</strong> <a href="${application.linkedinUrl}">${application.linkedinUrl}</a></div>` : ""}
        </div>
      </div>

      ${
        evaluation
          ? `
      <div class="rec-badge" style="background: ${rec === "STRONG_HIRE" ? "#dcfce7" : rec === "HIRE" ? "#d1fae5" : rec === "BORDERLINE" ? "#fef9c3" : rec === "NO_HIRE" ? "#ffedd5" : "#fee2e2"}; color: ${rec === "STRONG_HIRE" ? "#15803d" : rec === "HIRE" ? "#065f46" : rec === "BORDERLINE" ? "#854d0e" : rec === "NO_HIRE" ? "#9a3412" : "#991b1b"};">
        ${recConfig?.label || evaluation.recommendation}
      </div>

      <div class="scores-grid">
        <div class="score-item">
          <div class="score-label">Overall Score</div>
          <div class="score-value">${evaluation.overallScore.toFixed(1)}<span style="font-size:14px;color:#94a3b8">/100</span></div>
        </div>
        <div class="score-item">
          <div class="score-label">Technical</div>
          <div class="score-value">${evaluation.technicalScore.toFixed(1)}<span style="font-size:14px;color:#94a3b8">/10</span></div>
        </div>
        <div class="score-item">
          <div class="score-label">Practical</div>
          <div class="score-value">${evaluation.practicalScore.toFixed(1)}<span style="font-size:14px;color:#94a3b8">/10</span></div>
        </div>
        <div class="score-item">
          <div class="score-label">System Thinking</div>
          <div class="score-value">${evaluation.systemThinkingScore.toFixed(1)}<span style="font-size:14px;color:#94a3b8">/10</span></div>
        </div>
      </div>

      ${
        evaluation.keyStrengths?.length > 0
          ? `<div class="section">
        <h3>Key Strengths</h3>
        <div class="tag-list">${evaluation.keyStrengths.map((s) => `<span class="tag green">${s}</span>`).join("")}</div>
      </div>`
          : ""
      }

      ${
        evaluation.keyConcerns?.length > 0
          ? `<div class="section">
        <h3>Key Concerns</h3>
        <div class="tag-list">${evaluation.keyConcerns.map((c) => `<span class="tag red">${c}</span>`).join("")}</div>
      </div>`
          : ""
      }

      ${
        evaluation.aiUsageLikelihood > 50
          ? `<div class="ai-warning">
        <strong>⚠️ AI Usage Alert: ${evaluation.aiUsageLikelihood.toFixed(0)}% likelihood</strong>
        ${evaluation.aiUsageAnalysis}
      </div>`
          : ""
      }

      ${evaluation.summary ? `<div class="section"><h3>AI Summary</h3><p style="font-size:14px;line-height:1.6;color:#475569;">${evaluation.summary}</p></div>` : ""}
      `
          : "<p>Evaluation pending.</p>"
      }

      ${application.resumeUrl ? `<a href="${application.resumeUrl}" class="cta-button">📄 View Resume</a>` : ""}
      <a href="${process.env.NEXTAUTH_URL}/admin/applications/${application.id}" class="cta-button" style="margin-left:12px;">🔍 View Full Evaluation</a>
    </div>
    <div class="footer">
      RLAI Tech Evaluation Platform · rightleft.ai · This is an automated notification
    </div>
  </div>
</body>
</html>`;

  const rec_label = recConfig?.label || (evaluation?.recommendation ?? "Pending");

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "RLAI Talent <no-reply@rightleft.ai>",
    to: hrEmail,
    cc: hrCcEmail || undefined,
    subject: `[RLAI Eval] ${application.user.name} — ${roleConfig.label} — ${rec_label}`,
    html: htmlBody,
    text: `New candidate evaluation submitted.\n\nCandidate: ${application.user.name}\nRole: ${roleConfig.label}\nEmail: ${application.user.email}\nRecommendation: ${rec_label}\n\nView full evaluation: ${process.env.NEXTAUTH_URL}/admin/applications/${application.id}`,
  });
}
