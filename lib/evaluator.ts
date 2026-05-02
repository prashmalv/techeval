import Anthropic from "@anthropic-ai/sdk";
import {
  EvaluationResult,
  JobRole,
  ExperienceLevel,
  JOB_ROLE_CONFIG,
  EXPERIENCE_LEVEL_CONFIG,
  QuestionEvaluation,
} from "@/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface AnswerInput {
  questionId: string;
  questionTitle: string;
  questionType: string;
  content: string;
  language?: string;
}

export async function evaluateApplication(
  answers: AnswerInput[],
  jobRole: JobRole,
  experienceLevel: ExperienceLevel,
  yearsExperience: number,
  candidateName: string
): Promise<EvaluationResult> {
  const roleConfig = JOB_ROLE_CONFIG[jobRole];
  const levelConfig = EXPERIENCE_LEVEL_CONFIG[experienceLevel];

  const answersText = answers
    .map(
      (a, i) => `
---
QUESTION ${i + 1}: ${a.questionTitle}
TYPE: ${a.questionType}
${a.language ? `LANGUAGE: ${a.language}` : ""}

CANDIDATE'S ANSWER:
${a.content || "(No answer provided)"}
---`
    )
    .join("\n");

  const systemPrompt = `You are a world-class technical interviewer and talent evaluator for an AI-first technology company.
You have deep expertise in AI/ML, software engineering, data science, cloud architecture, and engineering leadership.
Your evaluations are used to make hiring decisions, so they must be precise, fair, and actionable.
You always return valid JSON with no markdown formatting around it.`;

  const userPrompt = `Evaluate this technical assessment submission for the role of **${roleConfig.label}** at RLAI (rightleft.ai), an AI-first technology company.

CANDIDATE: ${candidateName}
ROLE: ${roleConfig.label}
EXPERIENCE LEVEL: ${levelConfig.label} (${yearsExperience} years)
DIFFICULTY: ${levelConfig.difficulty}

ROLE CONTEXT: ${roleConfig.description}
EXPECTED SKILLS: ${roleConfig.tags.join(", ")}

${answersText}

---

Evaluate ALL answers carefully and return a JSON object with this exact structure:

{
  "overallScore": <number 0-100>,
  "technicalScore": <number 0-10>,
  "practicalScore": <number 0-10>,
  "communicationScore": <number 0-10>,
  "systemThinkingScore": <number 0-10>,

  "aiUsageLikelihood": <number 0-100, probability that answers are AI-generated>,
  "aiUsageAnalysis": "<detailed explanation of AI usage assessment — look for: overly generic/perfect structure, formulaic language, lack of personal anecdotes or specific implementation context, inconsistent depth across questions, typical GPT/Claude writing patterns, missing practical gotchas that only come from real experience>",

  "redFlags": ["<flag1>", "<flag2>"],

  "crossQuestionNotes": "<observations about consistency, depth variation, or contradictions across answers>",

  "questionEvaluations": [
    {
      "questionId": "<same id as input>",
      "questionTitle": "<title>",
      "questionType": "<type>",
      "scores": {
        "technical": <0-10>,
        "practical": <0-10>,
        "communication": <0-10>,
        "overall": <0-10>
      },
      "feedback": "<specific, constructive feedback — what they got right, what's missing, what the ideal answer would include>",
      "strengths": ["<strength1>", "<strength2>"],
      "improvements": ["<improvement1>", "<improvement2>"],
      "aiUsageLikelihood": <0-100>,
      "aiUsageNotes": "<specific observations about this answer's authenticity>"
    }
  ],

  "recommendation": "<one of: STRONG_HIRE | HIRE | BORDERLINE | NO_HIRE | STRONG_NO_HIRE>",

  "keyStrengths": ["<strength1>", "<strength2>", "<strength3>"],
  "keyConcerns": ["<concern1>", "<concern2>"],

  "suggestedCrossQuestions": [
    "<specific follow-up question to probe their claimed knowledge>",
    "<another probing question based on their answer>",
    "<question to verify their AI/copy-paste answers if suspected>"
  ],

  "summary": "<3-5 sentence summary: overall impression, fit for the role, key decision factors, and what the interviewer should focus on in the next round>"
}

SCORING GUIDELINES:
- Technical (0-10): Correctness, depth, best practices, edge case awareness
- Practical (0-10): Real-world applicability, performance/security/scalability awareness, tradeoffs
- Communication (0-10): Clarity, structure, ability to explain complex ideas
- System Thinking (0-10 in overallScore context): Architecture sense, non-functional requirements, mobile/web awareness, user base thinking
- Overall (0-100): Holistic assessment calibrated to the role and experience level

For ${roleConfig.label} at ${levelConfig.label} level, calibrate expectations at: ${levelConfig.difficulty}

AI USAGE DETECTION — Look specifically for:
1. Answers that are suspiciously well-structured with no practical trade-offs mentioned
2. Bullet-point heavy answers that list everything but commit to nothing
3. Lack of specific version numbers, actual library names, or tool-specific quirks
4. Generic architectures that ignore the specific context of the problem
5. No personal opinions or opinions that seem to hedge all possibilities equally
6. Inconsistency: if they show deep expertise in one answer but basic knowledge in another of similar difficulty
7. Responses that match common LLM patterns (starting with "Certainly!", excessive "Additionally", "Furthermore", symmetric bullet lists)
8. Missing common real-world gotchas that practitioners would naturally mention
9. Answers that are perfectly formatted but lack specificity

Be candid but fair in your evaluation. An imperfect but genuine answer is better than a perfect AI-generated one.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude API");
  }

  const jsonText = content.text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
  const result = JSON.parse(jsonText) as EvaluationResult;

  // Ensure all required fields exist
  return {
    overallScore: result.overallScore ?? 0,
    technicalScore: result.technicalScore ?? 0,
    practicalScore: result.practicalScore ?? 0,
    communicationScore: result.communicationScore ?? 0,
    systemThinkingScore: result.systemThinkingScore ?? 0,
    aiUsageLikelihood: result.aiUsageLikelihood ?? 0,
    aiUsageAnalysis: result.aiUsageAnalysis ?? "",
    redFlags: result.redFlags ?? [],
    crossQuestionNotes: result.crossQuestionNotes ?? "",
    questionEvaluations: (result.questionEvaluations ?? []) as QuestionEvaluation[],
    recommendation: result.recommendation ?? "BORDERLINE",
    keyStrengths: result.keyStrengths ?? [],
    keyConcerns: result.keyConcerns ?? [],
    suggestedCrossQuestions: result.suggestedCrossQuestions ?? [],
    summary: result.summary ?? "",
  };
}
