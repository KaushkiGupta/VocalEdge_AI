import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "./prisma.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "..", "db", "db.json");

let usePrisma = false;

// Test connection to Prisma on startup
try {
  if (process.env.DATABASE_URL) {
    await prisma.$connect();
    usePrisma = true;
    console.log("Database connection successful. Using Prisma (PostgreSQL).");
  } else {
    console.log("DATABASE_URL not found. Using local JSON DB fallback.");
  }
} catch (err) {
  console.warn("Prisma connection failed, using local JSON DB fallback:", err.message);
  usePrisma = false;
}

// ─── Local JSON DB Fallback Helpers ──────────────────────────────────────────
const readJSONDB = () => {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch (err) {
    return { users: {} };
  }
};

const writeJSONDB = (data) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing JSON database:", err);
  }
};

const tryPrisma = async (name, fn) => {
  if (!usePrisma) return { ok: false };
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (err) {
    console.warn(`Prisma error in ${name}, falling back to JSON:`, err.message);
    return { ok: false, error: err };
  }
};

const defaultProfile = (name = "User") => ({
  name,
  xp: 0,
  level: 1,
  streak: 0,
  longestStreak: 0,
  lastPracticeDate: "",
  badges: [],
});

// ─── Unified Database Methods ────────────────────────────────────────────────
export const findUserByEmail = async (email) => {
  const res = await tryPrisma("findUserByEmail", () => prisma.user.findUnique({ where: { email } }));
  if (res.ok) return res.value;
  const db = readJSONDB();
  return Object.values(db.users || {}).find((u) => u.email === email) || null;
};

export const createUser = async (email, passwordHash, name) => {
  const res = await tryPrisma("createUser", () =>
    prisma.user.create({
      data: { email, passwordHash, name, xp: 0, level: 1, streak: 0, longestStreak: 0, lastPracticeDate: "" },
    })
  );
  if (res.ok) return res.value;

  const db = readJSONDB();
  if (!db.users) db.users = {};
  const userId = "user_" + Date.now();
  const newUser = {
    id: userId,
    email,
    passwordHash,
    name,
    profile: defaultProfile(name),
    speechSessions: [],
    interviews: [],
    resumes: [],
  };
  db.users[userId] = newUser;
  writeJSONDB(db);
  return newUser;
};

export const getUserProfile = async (userId) => {
  const res = await tryPrisma("getUserProfile", async () => {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { achievements: true } });
    if (!user) return null;
    return {
      name: user.name,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      longestStreak: user.longestStreak,
      lastPracticeDate: user.lastPracticeDate,
      badges: user.achievements.map((a) => ({
        id: a.badgeId,
        title: a.title,
        description: a.description,
        icon: a.icon,
        unlockedAt: a.unlockedAt.toISOString().split("T")[0],
      })),
    };
  });
  if (res.ok && res.value !== null) return res.value;

  const db = readJSONDB();
  const user = db.users?.[userId];
  return user ? user.profile || defaultProfile(user.name) : defaultProfile();
};

export const updateUserProfile = async (userId, profileData, newBadges = []) => {
  const res = await tryPrisma("updateUserProfile", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        xp: profileData.xp,
        level: profileData.level,
        streak: profileData.streak,
        longestStreak: profileData.longestStreak,
        lastPracticeDate: profileData.lastPracticeDate,
      },
    });
    for (const badge of newBadges) {
      await prisma.achievement.create({
        data: { userId, badgeId: badge.id, title: badge.title, description: badge.description, icon: badge.icon },
      });
    }
    return true;
  });
  if (res.ok) return;

  const db = readJSONDB();
  if (db.users?.[userId]) {
    db.users[userId].profile = {
      ...(db.users[userId].profile || {}),
      xp: profileData.xp,
      level: profileData.level,
      streak: profileData.streak,
      longestStreak: profileData.longestStreak,
      lastPracticeDate: profileData.lastPracticeDate,
      badges: [...((db.users[userId].profile || {}).badges || []), ...newBadges],
    };
    writeJSONDB(db);
  }
};

export const saveSpeechSession = async (userId, sessionData) => {
  const res = await tryPrisma("saveSpeechSession", async () => {
    await prisma.speechSession.create({
      data: {
        userId,
        transcript: sessionData.transcript,
        duration: sessionData.duration,
        wpm: sessionData.wpm,
        fillerCount: sessionData.fillerCount,
        fillersBreakdown: sessionData.fillersBreakdown,
        clarityScore: sessionData.clarityScore,
        confidenceScore: sessionData.confidenceScore,
        toneAnalysis: sessionData.toneAnalysis,
        grammarIssues: sessionData.grammarIssues || [],
        suggestions: sessionData.suggestions || [],
        isTableTopics: !!sessionData.isTableTopics,
        tableTopicsMetadata: sessionData.tableTopicsMetadata || {},
      },
    });
    return true;
  });
  if (res.ok) return;

  const db = readJSONDB();
  if (db.users?.[userId]) {
    if (!db.users[userId].speechSessions) db.users[userId].speechSessions = [];
    db.users[userId].speechSessions.push(sessionData);
    writeJSONDB(db);
  }
};

export const saveInterview = async (userId, interviewData, questionLog = []) => {
  const res = await tryPrisma("saveInterview", async () => {
    const interview = await prisma.interview.create({
      data: {
        userId,
        role: interviewData.role,
        interviewType: interviewData.interviewType,
        overallScore: interviewData.overallScore,
        technicalScore: interviewData.technicalScore,
        communicationScore: interviewData.communicationScore,
        structureScore: interviewData.structureScore,
        strengths: interviewData.strengths || [],
        improvements: interviewData.improvements || [],
      },
    });
    if (questionLog.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const item of questionLog) {
          const question = await tx.question.create({
            data: {
              interviewId: interview.id,
              questionText: item.question,
              sourceResumeSection: item.sourceResumeSection || "General",
              sourceSkill: item.sourceSkill || "General",
              reasoning: item.reasoning || "Evaluation of experience",
            },
          });
          if (item.answer) {
            await tx.answer.create({
              data: {
                questionId: question.id,
                answerText: item.answer,
                score: item.score || 0,
                feedback: item.feedback || "",
                wpm: item.wpm || 0,
                fillerCount: item.fillerCount || 0,
              },
            });
          }
        }
      });
    }
    return true;
  });
  if (res.ok) return;

  const db = readJSONDB();
  if (db.users?.[userId]) {
    if (!db.users[userId].interviews) db.users[userId].interviews = [];
    db.users[userId].interviews.push(interviewData);
    writeJSONDB(db);
  }
};

export const getDashboardData = async (userId) => {
  const res = await tryPrisma("getDashboardData", async () => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        achievements: true,
        speechSessions: { take: 5, orderBy: { timestamp: "desc" } },
        interviews: { take: 5, orderBy: { timestamp: "desc" } },
      },
    });
    if (!user) return null;
    const [sessionAgg, interviewAgg] = await Promise.all([
      prisma.speechSession.aggregate({
        where: { userId },
        _count: { id: true },
        _avg: { clarityScore: true },
      }),
      prisma.interview.aggregate({
        where: { userId },
        _count: { id: true },
        _avg: { overallScore: true },
      }),
    ]);
    return {
      userProfile: {
        name: user.name,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        longestStreak: user.longestStreak,
        lastPracticeDate: user.lastPracticeDate,
        badges: user.achievements.map((a) => ({
          id: a.badgeId,
          title: a.title,
          description: a.description,
          icon: a.icon,
        })),
      },
      recentSessions: user.speechSessions.map((s) => ({
        id: s.id,
        timestamp: s.timestamp.toISOString(),
        clarityScore: s.clarityScore,
        wpm: s.wpm,
      })),
      recentInterviews: user.interviews.map((i) => ({
        id: i.id,
        timestamp: i.timestamp.toISOString(),
        role: i.role,
        interviewType: i.interviewType,
        overallScore: i.overallScore,
      })),
      stats: {
        totalPracticeSessions: sessionAgg._count.id,
        totalInterviews: interviewAgg._count.id,
        averageSpeechScore: sessionAgg._avg.clarityScore ?? 0,
        averageInterviewScore: interviewAgg._avg.overallScore ?? 0,
      },
    };
  });
  if (res.ok && res.value !== null) return res.value;

  const db = readJSONDB();
  const user = db.users?.[userId];
  const profile = user?.profile || defaultProfile(user?.name);
  const speechSessions = user?.speechSessions || [];
  const interviews = user?.interviews || [];

  return {
    userProfile: profile,
    recentSessions: [...speechSessions].slice(-5).reverse(),
    recentInterviews: [...interviews].slice(-5).reverse(),
    stats: {
      totalPracticeSessions: speechSessions.length,
      totalInterviews: interviews.length,
      averageSpeechScore:
        speechSessions.reduce((acc, curr) => acc + (curr.clarityScore || 0), 0) / (speechSessions.length || 1),
      averageInterviewScore:
        interviews.reduce((acc, curr) => acc + (curr.overallScore || 0), 0) / (interviews.length || 1),
    },
  };
};

export const getFullPerformanceHistory = async (userId) => {
  const res = await tryPrisma("getFullPerformanceHistory", async () => {
    const [sessions, interviews] = await Promise.all([
      prisma.speechSession.findMany({ where: { userId }, orderBy: { timestamp: "asc" }, take: 500 }),
      prisma.interview.findMany({ where: { userId }, orderBy: { timestamp: "asc" }, take: 500 }),
    ]);
    return { sessions, interviews };
  });
  if (res.ok) return res.value;

  const db = readJSONDB();
  const user = db.users?.[userId];
  return {
    sessions: user?.speechSessions || [],
    interviews: user?.interviews || [],
  };
};
