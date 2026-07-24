import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  name: z.string().min(1, "Name is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const analyzeSpeechSchema = z.object({
  transcript: z.string().min(1, "Transcript cannot be empty"),
  duration: z.number().nonnegative().optional(),
});

export const tableTopicsGenerateSchema = z.object({
  category: z.string().min(1, "Category is required"),
});

export const tableTopicsAnalyzeSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  transcript: z.string().min(1, "Transcript is required"),
  duration: z.number().nonnegative().optional(),
});

export const interviewAnswerSchema = z.object({
  interviewId: z.string().min(1, "Interview ID is required"),
  answerText: z.string().min(1, "Answer text cannot be empty"),
});

export const saveApiKeySchema = z.object({
  apiKey: z.string().min(1, "API Key cannot be empty"),
});

export const interviewStartSchema = z.object({
  role: z.string().min(1, "Job role is required"),
  jobDescription: z.string().optional(),
  interviewType: z.string().optional(),
  difficulty: z.string().optional(),
});

export const analyzeResumeSchema = z.object({
  targetRole: z.string().min(1, "Target role is required"),
});

export const ttsSchema = z.object({
  text: z.string().min(1, "Text is required for TTS"),
  voice: z.string().optional(),
  speed: z.number().optional(),
});

export const analyzePronunciationSchema = z.object({
  referenceText: z.string().min(1, "Reference text is required"),
  userTranscript: z.string().min(1, "User transcript is required"),
});

