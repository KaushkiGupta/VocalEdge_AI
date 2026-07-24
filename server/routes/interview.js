import express from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validation.js";
import { interviewStartSchema, interviewAnswerSchema } from "../lib/schemas.js";
import { callGroq } from "../lib/groqClient.js";
import { getSession, setSession, delSession } from "../lib/redis.js";
import { saveInterview } from "../lib/dbRepo.js";
import { grantXPAndStreak } from "../services/gamification.service.js";

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const extractResumeText = async (file) => {
  if (!file) return "";
  if (file.mimetype === "application/pdf") return (await pdfParse(file.buffer)).text;
  if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return (await mammoth.extractRawText({ buffer: file.buffer })).value;
  }
  return "";
};

const makeQuestionItem = (resObj, defSection, defSkill, defReasoning) => ({
  question: resObj.interviewerQuestion,
  sourceResumeSection: resObj.sourceResumeSection || defSection,
  sourceSkill: resObj.sourceSkill || defSkill,
  reasoning: resObj.reasoning || defReasoning,
  answer: "",
});

const formatQuestionResponse = (resObj) => ({
  question: resObj.interviewerQuestion,
  sourceResumeSection: resObj.sourceResumeSection,
  sourceSkill: resObj.sourceSkill,
  reasoning: resObj.reasoning,
});

router.post("/start", requireAuth, resumeUpload.single("resumeFile"), validate(interviewStartSchema), asyncHandler(async (req, res) => {
  const { role, jobDescription, interviewType, difficulty } = req.body;
  if (!role) return res.status(400).json({ error: "Job role is required" });

  const difficultyLevel = difficulty || "Medium";
  const resumeText = await extractResumeText(req.file);
  if (!resumeText.trim()) return res.status(400).json({ error: "Resume file is empty or unsupported format" });

  const interviewId = crypto.randomUUID();
  const systemContent = `You are an expert interviewer recruiting for a ${role} position. 
      Target Job Description: "${jobDescription || "Standard requirements"}"
      Candidate Resume Details: "${resumeText || "None provided"}"
      Interview Format: ${interviewType || "General mix of technical and behavioral"}
      Difficulty Setting: ${difficultyLevel}
      
      Conduct a realistic, challenging, and professional interactive interview.
      Generate ONE conversational follow-up or primary question at a time.
      Be concise, professional, and adaptive. Do not repeat questions or greet repeatedly. Respond to the candidate's answer naturally before asking the next question.
      
      Since Difficulty is set to ${difficultyLevel}, adjust your interviewer personality:
      * Easy: Supportive, straightforward questions.
      * Medium: Standard conversational behavior.
      * Hard: Aggressive follow-up questions, deep technical probing, and increased cross-questioning challenging details from the candidate's resume.
      
      Every question you generate MUST be traced back to the candidate's resume/skills.
      At each step, you MUST return a JSON object with this format:
      {
        "interviewerQuestion": "your next interview question",
        "sourceResumeSection": "the section of their resume this question targets (e.g. Experience, Education, Skills, Projects)",
        "sourceSkill": "the specific technology, skill or role trait targeted",
        "reasoning": "why you are asking this question in relation to their background",
        "isFinished": false (boolean, set to true ONLY if you have completed 4-5 questions and want to finish the interview)
      }`;

  const prompt = `Start the interview. Greet the candidate briefly and ask the first relevant interview question based on the role and resume details. Include 'interviewerQuestion', 'sourceResumeSection', 'sourceSkill', 'reasoning' and 'isFinished': false in the JSON response.`;
  const response = await callGroq(prompt, systemContent);

  const messages = [
    { role: "system", content: systemContent },
    { role: "assistant", content: response.interviewerQuestion },
  ];
  const questionLog = [makeQuestionItem(response, "Header", "General", "Introductory ice-breaker")];

  await setSession(interviewId, {
    id: interviewId,
    userId: req.user.userId,
    role,
    resumeText,
    jobDescription,
    interviewType,
    difficulty: difficultyLevel,
    messages,
    questionLog,
    questionCount: 1,
    maxQuestions: 5,
  });

  res.json({ interviewId, ...formatQuestionResponse(response) });
}));

router.post("/answer", requireAuth, validate(interviewAnswerSchema), asyncHandler(async (req, res) => {
  const { interviewId, answerText } = req.body;

  const interview = await getSession(interviewId);
  if (!interview) return res.status(404).json({ error: "Interview session not found or expired" });
  if (interview.userId !== req.user.userId) return res.status(403).json({ error: "Forbidden" });

  if (interview.questionLog.length > 0) {
    interview.questionLog[interview.questionLog.length - 1].answer = answerText;
  }

  interview.messages.push({ role: "user", content: answerText });
  interview.questionCount++;
  const isFinalQuestion = interview.questionCount >= interview.maxQuestions;

  const turnPrompt = `Candidate's answer: "${answerText}"\n` +
    (isFinalQuestion
      ? `This is the final turn. Set "isFinished": true, and provide a dummy "interviewerQuestion" like "Thank you, that concludes our interview."`
      : `Acknowledge the candidate's answer briefly and ask the next follow-up/interview question. Set "isFinished": false.`);

  const conversationPrompt = interview.messages.map((m) => `${m.role === "user" ? "Candidate" : "Interviewer"}: ${m.content}`).join("\n\n") + `\n\nTask: ${turnPrompt}`;
  const response = await callGroq(conversationPrompt, interview.messages[0].content);

  if (response.isFinished || isFinalQuestion) {
    const evaluationPrompt = `Analyze the full interview transcript. 
      Transcript:\n${interview.messages.map((m) => `${m.role === "user" ? "Candidate" : "Interviewer"}: ${m.content}`).join("\n")}\n
      
      Evaluate the candidate's performance thoroughly.
      You MUST return a JSON object matching this schema:
      {
        "overallScore": 0-100 number,
        "technicalScore": 0-100 number,
        "communicationScore": 0-100 number,
        "structureScore": 0-100 number,
        "strengths": ["strength 1", "strength 2", "strength 3"],
        "improvements": ["improvement 1", "improvement 2", "improvement 3"],
        "questionReviews": [
          {
            "question": "the question asked",
            "answer": "the candidate's answer",
            "score": 0-100 rating,
            "feedback": "constructive review of this specific answer"
          }
        ]
      }`;

    const scorecard = await callGroq(
      evaluationPrompt,
      "You are a senior recruiter evaluating a candidate's mock interview. Provide detailed, fair, and highly constructive scoring."
    );

    const interviewRecord = {
      id: interviewId,
      timestamp: new Date().toISOString(),
      role: interview.role,
      interviewType: interview.interviewType,
      overallScore: scorecard.overallScore,
      technicalScore: scorecard.technicalScore,
      communicationScore: scorecard.communicationScore,
      structureScore: scorecard.structureScore,
      strengths: scorecard.strengths,
      improvements: scorecard.improvements,
      questionReviews: scorecard.questionReviews,
    };

    await saveInterview(req.user.userId, interviewRecord, interview.questionLog);
    await delSession(interviewId);
    const gamification = await grantXPAndStreak(req.user.userId, 100);

    return res.json({ isFinished: true, scorecard, gamification });
  }

  interview.messages.push({ role: "assistant", content: response.interviewerQuestion });
  interview.questionLog.push(makeQuestionItem(response, "Experience", "Competency Check", "Adaptive follow-up question"));
  await setSession(interviewId, interview);

  res.json({ isFinished: false, ...formatQuestionResponse(response) });
}));

export default router;
