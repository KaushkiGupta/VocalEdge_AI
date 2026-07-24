import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Define mockDb at module level so it is accessible in the hoisted mock
const mockDb = {
  users: {}
};

// Mock the database repository layer directly
vi.mock("../lib/dbRepo.js", () => {
  return {
    findUserByEmail: async (email) => {
      return Object.values(mockDb.users).find(u => u.email === email) || null;
    },
    createUser: async (email, passwordHash, name) => {
      const id = "user_" + Math.random().toString(36).substring(2);
      const newUser = {
        id,
        email,
        passwordHash,
        name,
        profile: {
          name,
          xp: 0,
          level: 1,
          streak: 0,
          longestStreak: 0,
          lastPracticeDate: "",
          badges: []
        },
        speechSessions: [],
        interviews: []
      };
      mockDb.users[id] = newUser;
      return newUser;
    },
    getUserProfile: async (userId) => {
      const user = mockDb.users[userId];
      if (!user) {
        return {
          name: "User",
          xp: 0,
          level: 1,
          streak: 0,
          longestStreak: 0,
          lastPracticeDate: "",
          badges: []
        };
      }
      return user.profile;
    },
    updateUserProfile: async (userId, profileData, newBadges = []) => {
      const user = mockDb.users[userId];
      if (user) {
        user.profile = {
          ...user.profile,
          ...profileData,
          badges: [...(user.profile.badges || []), ...newBadges]
        };
      }
    },
    saveSpeechSession: async (userId, sessionData) => {
      const user = mockDb.users[userId];
      if (user) {
        const words = sessionData.transcript.split(/\s+/).filter(Boolean);
        const duration = sessionData.duration || 30;
        const wpm = Math.round(words.length / (duration / 60));
        const newSession = {
          id: "session_" + Date.now(),
          userId,
          transcript: sessionData.transcript,
          duration,
          wpm,
          fillerCount: 0,
          fillersBreakdown: {},
          clarityScore: 85,
          confidenceScore: 90,
          toneAnalysis: "confident",
          grammarIssues: [],
          suggestions: ["Good job!"]
        };
        user.speechSessions.push(newSession);
        return newSession;
      }
    },
    getDashboardData: async (userId) => {
      const user = mockDb.users[userId] || { profile: {}, speechSessions: [], interviews: [] };
      return {
        userProfile: user.profile,
        recentSessions: user.speechSessions,
        recentInterviews: user.interviews,
        stats: {
          totalSessions: user.speechSessions.length,
          avgClarity: 85,
          totalXp: user.profile.xp || 0,
          streak: user.profile.streak || 0
        }
      };
    }
  };
});

// Mock the callGroq helper
vi.mock("../lib/groqClient.js", () => {
  return {
    callGroq: vi.fn().mockImplementation(async (prompt, systemInstruction) => {
      return {
        clarityScore: 85,
        confidenceScore: 90,
        toneAnalysis: "confident",
        grammarIssues: [],
        suggestions: ["Good job!"]
      };
    })
  };
});

// Import app and service *after* the mocks are defined
import app from "../server.js";
import { grantXPAndStreak } from "../services/gamification.service.js";

describe("VocalEdge AI Backend Test Suite", () => {
  beforeEach(() => {
    // Reset DB state cleanly
    mockDb.users = {};
    vi.clearAllMocks();
  });

  describe("Authentication Flow", () => {
    it("should successfully register, login, and fetch current user (happy path)", async () => {
      // 1. Register
      const registerRes = await request(app)
        .post("/api/auth/register")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          email: "john@example.com",
          password: "Password123!",
          name: "John Doe"
        });

      expect(registerRes.status).toBe(200);
      expect(registerRes.body).toHaveProperty("token");
      expect(registerRes.body.user).toHaveProperty("email", "john@example.com");

      // Verify cookie is set
      const cookies = registerRes.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain("token=");

      // 2. Login
      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          email: "john@example.com",
          password: "Password123!"
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty("token");

      // 3. /api/auth/me
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("X-Requested-With", "XMLHttpRequest")
        .set("Cookie", [`token=${loginRes.body.token}`]);

      expect(meRes.status).toBe(200);
      expect(meRes.body).toHaveProperty("email", "john@example.com");
      expect(meRes.body).toHaveProperty("name", "John Doe");
    });

    it("should reject registration with duplicate email", async () => {
      // Register first user
      await request(app)
        .post("/api/auth/register")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          email: "duplicate@example.com",
          password: "Password123!",
          name: "Original User"
        });

      // Register second user with same email
      const duplicateRes = await request(app)
        .post("/api/auth/register")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          email: "duplicate@example.com",
          password: "Password456!",
          name: "Duplicate User"
        });

      expect(duplicateRes.status).toBe(400);
      expect(duplicateRes.body).toHaveProperty("error", "Email is already registered");
    });

    it("should reject requests to protected routes without a valid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("X-Requested-With", "XMLHttpRequest");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error", "Access denied. No token provided.");
    });
  });

  describe("Gamification Logic Unit Tests", () => {
    it("should correctly increment levels, streaks, and award badges", async () => {
      const mockUserId = "user_test_gamification";
      mockDb.users[mockUserId] = {
        id: mockUserId,
        email: "game@example.com",
        name: "Gamer",
        profile: {
          name: "Gamer",
          xp: 0,
          level: 1,
          streak: 0,
          longestStreak: 0,
          lastPracticeDate: "",
          badges: []
        },
        speechSessions: [],
        interviews: []
      };

      // 1. Initial practice - should increment streak to 1 and award XP
      const res1 = await grantXPAndStreak(mockUserId, 150);
      expect(res1.profile.xp).toBe(150);
      expect(res1.profile.level).toBe(2);
      expect(res1.leveledUp).toBe(true);
      expect(res1.profile.streak).toBe(1);

      // 2. Practice tomorrow - streak should increment to 2
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      mockDb.users[mockUserId].profile.lastPracticeDate = yesterdayStr;
      mockDb.users[mockUserId].profile.streak = 1;

      const res2 = await grantXPAndStreak(mockUserId, 350); // total 500 XP
      expect(res2.profile.streak).toBe(2);
      expect(mockDb.users[mockUserId].profile.badges.some(b => b.id === "xp_500")).toBe(true);

      // 3. Practice after 2 days (streak break) - streak should reset to 1
      const dayBeforeYesterdayStr = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];
      mockDb.users[mockUserId].profile.lastPracticeDate = dayBeforeYesterdayStr;
      
      const res3 = await grantXPAndStreak(mockUserId, 10);
      expect(res3.profile.streak).toBe(1);
    });
  });

  describe("AI Speech Analysis & Persisted Session Data", () => {
    it("should process speech analysis and persist session", async () => {
      // Register and login to get auth token
      const registerRes = await request(app)
        .post("/api/auth/register")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          email: "speech@example.com",
          password: "Password123!",
          name: "Speaker"
        });

      const token = registerRes.body.token;
      const userId = registerRes.body.user.id;

      // Analyze speech
      const res = await request(app)
        .post("/api/analyze-speech")
        .set("X-Requested-With", "XMLHttpRequest")
        .set("Cookie", [`token=${token}`])
        .send({
          transcript: "hello this is my speech today about communication",
          duration: 30
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("session");
      expect(res.body.session).toHaveProperty("clarityScore", 85);
      expect(res.body.session).toHaveProperty("confidenceScore", 90);

      // Verify session is persisted in mock DB
      const persistedUser = mockDb.users[userId];
      expect(persistedUser.speechSessions.length).toBe(1);
      expect(persistedUser.speechSessions[0].transcript).toBe("hello this is my speech today about communication");
    });
  });

  describe("Multi-Tenancy Isolation", () => {
    it("should isolate user profile, sessions, and histories between two separate users", async () => {
      // Register User A
      const regA = await request(app)
        .post("/api/auth/register")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ email: "usera@example.com", password: "Password123!", name: "User A" });
      
      // Register User B
      const regB = await request(app)
        .post("/api/auth/register")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ email: "userb@example.com", password: "Password123!", name: "User B" });

      const tokenA = regA.body.token;
      const tokenB = regB.body.token;
      const idA = regA.body.user.id;
      const idB = regB.body.user.id;

      // Save a speech session for User A (10 words in 10s = 60 WPM)
      await request(app)
        .post("/api/analyze-speech")
        .set("X-Requested-With", "XMLHttpRequest")
        .set("Cookie", [`token=${tokenA}`])
        .send({ transcript: "one two three four five six seven eight nine ten", duration: 10 });

      // Save a speech session for User B
      await request(app)
        .post("/api/analyze-speech")
        .set("X-Requested-With", "XMLHttpRequest")
        .set("Cookie", [`token=${tokenB}`])
        .send({ transcript: "hello world speech sample", duration: 15 });

      // Verify User A's database sessions only contain User A's session
      const dashA = await request(app)
        .get("/api/dashboard")
        .set("X-Requested-With", "XMLHttpRequest")
        .set("Cookie", [`token=${tokenA}`]);

      expect(dashA.body.recentSessions.length).toBe(1);
      expect(dashA.body.recentSessions[0].wpm).toBe(60);
      
      const dashB = await request(app)
        .get("/api/dashboard")
        .set("X-Requested-With", "XMLHttpRequest")
        .set("Cookie", [`token=${tokenB}`]);

      expect(dashB.body.recentSessions.length).toBe(1);

      // Verify isolation directly in DB content
      expect(mockDb.users[idA].speechSessions[0].transcript).toBe("one two three four five six seven eight nine ten");
      expect(mockDb.users[idB].speechSessions[0].transcript).toBe("hello world speech sample");
    });
  });
});
