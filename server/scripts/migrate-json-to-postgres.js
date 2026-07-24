import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "..", "db", "db.json");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting JSON to Postgres migration...");

  if (!fs.existsSync(DB_PATH)) {
    console.error(`Source db.json not found at: ${DB_PATH}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(DB_PATH, "utf8");
  const db = JSON.parse(rawData);

  if (!db.users || Object.keys(db.users).length === 0) {
    console.log("No users found in JSON database to migrate.");
    return;
  }

  const userIds = Object.keys(db.users);
  console.log(`Found ${userIds.length} users in JSON database.`);

  let usersMigrated = 0;
  let achievementsMigrated = 0;
  let sessionsMigrated = 0;
  let interviewsMigrated = 0;
  let questionsMigrated = 0;
  let answersMigrated = 0;

  for (const uid of userIds) {
    const user = db.users[uid];

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email }
    });

    let userId = user.id;

    if (existingUser) {
      console.log(`User ${user.email} already exists in database. Skipping user creation.`);
      userId = existingUser.id;
    } else {
      const createdUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          name: user.name,
          xp: user.profile?.xp || 0,
          level: user.profile?.level || 1,
          streak: user.profile?.streak || 0,
          longestStreak: user.profile?.longestStreak || 0,
          lastPracticeDate: user.profile?.lastPracticeDate || "",
        }
      });
      userId = createdUser.id;
      usersMigrated++;
      console.log(`Created user: ${user.email}`);
    }

    // Migrate Achievements (Badges)
    const badges = user.profile?.badges || [];
    for (const badge of badges) {
      // Check if badge already exists for this user
      const existingBadge = await prisma.achievement.findFirst({
        where: { userId, badgeId: badge.id }
      });

      if (!existingBadge) {
        let parsedDate = new Date();
        if (badge.unlockedAt) {
          const d = new Date(badge.unlockedAt);
          if (!isNaN(d.getTime())) {
            parsedDate = d;
          }
        }
        await prisma.achievement.create({
          data: {
            userId,
            badgeId: badge.id,
            title: badge.title,
            description: badge.description,
            icon: badge.icon || "🏆",
            unlockedAt: parsedDate,
          }
        });
        achievementsMigrated++;
      }
    }

    // Migrate Speech Sessions
    const sessions = user.speechSessions || [];
    for (const session of sessions) {
      const existingSession = await prisma.speechSession.findUnique({
        where: { id: session.id }
      });

      if (!existingSession) {
        let parsedDate = new Date();
        if (session.timestamp) {
          const d = new Date(session.timestamp);
          if (!isNaN(d.getTime())) {
            parsedDate = d;
          }
        }
        await prisma.speechSession.create({
          data: {
            id: session.id,
            userId,
            timestamp: parsedDate,
            transcript: session.transcript || "",
            duration: session.duration || 0,
            wpm: session.wpm || 0,
            fillerCount: session.fillerCount || 0,
            fillersBreakdown: session.fillersBreakdown || {},
            clarityScore: session.clarityScore || 0,
            confidenceScore: session.confidenceScore || 0,
            toneAnalysis: session.toneAnalysis || "",
            grammarIssues: session.grammarIssues || [],
            suggestions: session.suggestions || [],
            isTableTopics: session.isTableTopics || false,
            tableTopicsMetadata: session.tableTopicsMetadata || null,
          }
        });
        sessionsMigrated++;
      }
    }

    // Migrate Interviews
    const interviews = user.interviews || [];
    for (const interview of interviews) {
      const existingInterview = await prisma.interview.findUnique({
        where: { id: interview.id }
      });

      if (!existingInterview) {
        let parsedDate = new Date();
        if (interview.timestamp) {
          const d = new Date(interview.timestamp);
          if (!isNaN(d.getTime())) {
            parsedDate = d;
          }
        }
        const createdInterview = await prisma.interview.create({
          data: {
            id: interview.id,
            userId,
            timestamp: parsedDate,
            role: interview.role || "Software Engineer",
            interviewType: interview.interviewType || "General",
            overallScore: interview.overallScore || 0,
            technicalScore: interview.technicalScore || 0,
            communicationScore: interview.communicationScore || 0,
            structureScore: interview.structureScore || 0,
            strengths: interview.strengths || [],
            improvements: interview.improvements || [],
          }
        });

        // Migrate questionReviews
        const reviews = interview.questionReviews || [];
        for (const review of reviews) {
          const questionText = review.question || "";
          const answerText = review.answer || "";
          
          // Create Question
          const createdQuestion = await prisma.question.create({
            data: {
              interviewId: createdInterview.id,
              questionText,
              sourceResumeSection: "",
              sourceSkill: "",
              reasoning: "",
            }
          });
          questionsMigrated++;

          // Create Answer
          await prisma.answer.create({
            data: {
              questionId: createdQuestion.id,
              answerText,
              score: review.score || 0,
              feedback: review.feedback || "",
              wpm: review.wpm || 0,
              fillerCount: review.fillerCount || 0,
            }
          });
          answersMigrated++;
        }
        interviewsMigrated++;
      }
    }
  }

  console.log("Migration summary:");
  console.log(`- Users Migrated: ${usersMigrated}`);
  console.log(`- Achievements Migrated: ${achievementsMigrated}`);
  console.log(`- Speech Sessions Migrated: ${sessionsMigrated}`);
  console.log(`- Interviews Migrated: ${interviewsMigrated}`);
  console.log(`- Questions Migrated: ${questionsMigrated}`);
  console.log(`- Answers Migrated: ${answersMigrated}`);
}

main()
  .catch((e) => {
    console.error("Migration failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
