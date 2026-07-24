import express from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validation.js";
import { analyzeSpeechSchema, tableTopicsGenerateSchema, tableTopicsAnalyzeSchema, analyzeResumeSchema, ttsSchema, analyzePronunciationSchema } from "../lib/schemas.js";
import { callGroq } from "../lib/groqClient.js";
import { saveSpeechSession } from "../lib/dbRepo.js";
import { grantXPAndStreak } from "../services/gamification.service.js";
import { transcribeAudio, generateSpeech } from "../lib/audioService.js";
import { analyzePronunciation } from "../lib/pronunciation.js";
import { calculateSpeechMetrics } from "../lib/speechHelpers.js";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith("audio/")),
});

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const createAndSaveSession = async (userId, transcript, duration, analysis, xp, extraData = {}) => {
  const { wpm, totalFillers, fillerCounts } = calculateSpeechMetrics(transcript, duration);
  const session = {
    id: "session_" + Date.now(),
    timestamp: new Date().toISOString(),
    transcript,
    duration,
    wpm,
    fillerCount: totalFillers,
    fillersBreakdown: fillerCounts,
    clarityScore: analysis.clarityScore,
    confidenceScore: analysis.confidenceScore,
    toneAnalysis: analysis.toneAnalysis,
    grammarIssues: analysis.grammarIssues,
    suggestions: analysis.suggestions,
    ...extraData,
  };
  await saveSpeechSession(userId, session);
  const gamification = await grantXPAndStreak(userId, xp);
  return { session, gamification };
};

router.post("/analyze-speech", requireAuth, validate(analyzeSpeechSchema), asyncHandler(async (req, res) => {
  const { transcript, duration } = req.body;
  const prompt = `Analyze this spoken speech transcript for grammar, clarity, tone, and confidence.
    Transcript: "${transcript}"
    
    You MUST return a JSON object with the following schema:
    {
      "clarityScore": 0-100 number,
      "confidenceScore": 0-100 number,
      "toneAnalysis": "short description of overall tone, e.g. confident, apologetic, hesitant, professional",
      "grammarIssues": [
        {
          "original": "substring in transcript containing error",
          "correction": "corrected version of the substring",
          "explanation": "brief reason for the correction"
        }
      ],
      "suggestions": [
        "bullet point feedback 1",
        "bullet point feedback 2",
        "bullet point feedback 3"
      ]
    }`;
  const systemInstruction = "You are a professional AI Communication Coach. Provide actionable, supportive, and precise critiques of user grammar, pronunciation flow, confidence, and filler word usage.";
  const analysis = await callGroq(prompt, systemInstruction);
  const result = await createAndSaveSession(req.user.userId, transcript, duration, analysis, 20);
  res.json(result);
}));

router.post("/analyze-resume", requireAuth, resumeUpload.single("resumeFile"), validate(analyzeResumeSchema), asyncHandler(async (req, res) => {
  const { targetRole } = req.body;
  if (!targetRole) return res.status(400).json({ error: "Target role is required" });
  if (!req.file) return res.status(400).json({ error: "Resume file is required" });

  let resumeText = "";
  if (req.file.mimetype === "application/pdf") {
    const data = await pdfParse(req.file.buffer);
    resumeText = data.text;
  } else if (req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const { value } = await mammoth.extractRawText({ buffer: req.file.buffer });
    resumeText = value;
  }

  if (!resumeText.trim()) return res.status(400).json({ error: "Resume file is empty or unsupported format" });

  const prompt = `Analyze this resume against the target role: "${targetRole}".
    Resume Text:
    """
    ${resumeText}
    """
    
    You MUST return a JSON object with the following schema:
    {
      "resumeScore": 0-100 number,
      "keywordMatchScore": 0-100 number,
      "impactScore": 0-100 number,
      "grammarFormattingScore": 0-100 number,
      "matchedKeywords": [
        "list of keywords found in the resume relevant to the target role"
      ],
      "missingKeywords": [
        "list of crucial keywords or skills that should be added for this target role"
      ],
      "strengths": [
        "list of key strengths of the resume"
      ],
      "redFlags": [
        "list of concerns or errors (e.g. passive voice, missing dates, spelling mistakes, lack of quantifiable results)"
      ],
      "bulletRewrites": [
        {
          "original": "an actual weak bullet point or section from the resume",
          "rewrite": "a much stronger, impact-driven version of that bullet point incorporating action verbs and quantifiable results",
          "reason": "explanation of why the rewrite is better and what was improved"
        }
      ]
    }`;

  const systemInstruction = "You are a professional ATS (Applicant Tracking System) recruiter and resume optimization expert. Critique the resume objectively and strictly for the target role.";
  const analysis = await callGroq(prompt, systemInstruction);
  const gamification = await grantXPAndStreak(req.user.userId, 40);
  res.json({ analysis, gamification });
}));

router.post("/transcribe-whisper", requireAuth, audioUpload.single("audio"), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Audio file is required." });
  const transcript = await transcribeAudio(req.file.buffer, req.file.originalname || "audio.webm");
  res.json({ transcript });
}));

router.post("/tts", requireAuth, validate(ttsSchema), asyncHandler(async (req, res) => {
  const { text, voice, speed } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required for TTS." });
  const audioBuffer = await generateSpeech(text, voice, speed);
  res.setHeader("Content-Type", "audio/mpeg");
  res.send(Buffer.from(audioBuffer));
}));

router.post("/pronunciation/analyze", requireAuth, validate(analyzePronunciationSchema), asyncHandler(async (req, res) => {
  const { referenceText, userTranscript } = req.body;
  const evaluation = await analyzePronunciation(referenceText, userTranscript);
  res.json(evaluation);
}));

router.post("/table-topics/generate", requireAuth, validate(tableTopicsGenerateSchema), asyncHandler(async (req, res) => {
  const { category } = req.body;
  const categoryPrompts = {
    fun: "Fun & Quirky topics (humorous, imaginative, unusual hypotheticals)",
    professional: "Professional & Career topics (leadership challenges, workplace scenarios, soft skills)",
    philosophical: "Philosophical & Deep topics (ethical dilemmas, meaning of success, life lessons)",
    crisis: "PR Crisis Management topics (explaining unexpected setbacks, public relations handling)",
  };
  const selectedCategory = categoryPrompts[category] || categoryPrompts.fun;

  const prompt = `Generate a single creative, engaging Toastmasters Table Topics prompt under the category: "${selectedCategory}". 
    The prompt must challenge the speaker to deliver an impromptu 1-to-2 minute speech. 
    Along with the prompt, provide a short structural guide (framework name and 3-4 bullet steps) to help the speaker organize their answer in real-time.
    
    Return ONLY a JSON object matching this schema:
    {
      "topic": "your prompt text here",
      "suggestedOutline": {
        "framework": "e.g., PREP Method, Past-Present-Future, Pros & Cons, or Problem-Solution",
        "steps": [
          "Step 1 details...",
          "Step 2 details...",
          "Step 3 details...",
          "Step 4 details..."
        ]
      }
    }`;

  const systemInstruction = "You are a Toastmasters Table Topics master, famous for generating challenging, fun, and thought-provoking impromptu speech prompts.";
  const result = await callGroq(prompt, systemInstruction);
  res.json({ topic: result.topic, suggestedOutline: result.suggestedOutline });
}));

router.post("/table-topics/analyze", requireAuth, validate(tableTopicsAnalyzeSchema), asyncHandler(async (req, res) => {
  const { topic, transcript, duration } = req.body;
  const prompt = `You are evaluating a candidate's impromptu speech for a Toastmasters Table Topics challenge.
    Topic Prompt: "${topic}"
    User's Speech Transcript: "${transcript}"
    Speech Duration: ${duration || 60} seconds
    
    Thoroughly evaluate their impromptu response, focusing on quick-thinking organization, relevancy, and structure (Opening hook, Body paragraphs, Conclusion/wrap-up).
    
    You MUST return a JSON object with this exact schema:
    {
      "structureScore": 0-100 number,
      "relevanceScore": 0-100 number,
      "deliveryScore": 0-100 number,
      "openingAnalysis": "feedback on how well they introduced their answer or hooked the listener (1-2 sentences)",
      "bodyAnalysis": "feedback on the structure of their main points and supportive ideas (1-2 sentences)",
      "conclusionAnalysis": "feedback on how they summarized their response or called to action (1-2 sentences)",
      "relevanceAnalysis": "critique of how relevant their speech was to the prompt topic, pointing out where they stayed on track or where they wandered off-topic (2-3 sentences)",
      "redirectionAdvice": "tactical advice on an alternative way they could have approached or pivoted this topic to be even more engaging (2-3 sentences)",
      "exemplarSpeech": "a complete 150-250 word exemplar speech script answering the topic prompt directly using the recommended outline framework to show the speaker how a professional would answer it (3-4 paragraphs)",
      "clarityScore": 0-100 number,
      "confidenceScore": 0-100 number,
      "toneAnalysis": "short description of overall tone (e.g. humorous, serious, professional, hesitant)",
      "suggestions": [
        "bullet point advice 1",
        "bullet point advice 2"
      ]
    }`;

  const systemInstruction = "You are an expert Toastmasters speech evaluator. Provide detailed, encouraging, and highly tactical feedback on impromptu speeches.";
  const analysis = await callGroq(prompt, systemInstruction);

  const extraData = {
    isTableTopics: true,
    tableTopicsMetadata: {
      topic,
      structureScore: analysis.structureScore,
      relevanceScore: analysis.relevanceScore,
      deliveryScore: analysis.deliveryScore,
      openingAnalysis: analysis.openingAnalysis,
      bodyAnalysis: analysis.bodyAnalysis,
      conclusionAnalysis: analysis.conclusionAnalysis,
      relevanceAnalysis: analysis.relevanceAnalysis,
      redirectionAdvice: analysis.redirectionAdvice,
      exemplarSpeech: analysis.exemplarSpeech,
    },
  };

  const result = await createAndSaveSession(req.user.userId, transcript, duration, analysis, 40, extraData);
  res.json(result);
}));

export default router;
