import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "..", "db", "db.json");

const migrate = () => {
  console.log("Checking DB migration state for:", DB_PATH);
  if (!fs.existsSync(DB_PATH)) {
    console.log("No db.json found. Skipping migration.");
    return;
  }

  const fileContent = fs.readFileSync(DB_PATH, "utf8");
  let db;
  try {
    db = JSON.parse(fileContent);
  } catch (err) {
    console.error("Failed to parse db.json:", err.message);
    return;
  }

  // If db.users is already an object/dictionary, it's already migrated
  if (db.users && !Array.isArray(db.users)) {
    console.log("Database is already migrated (users is a dictionary).");
    return;
  }

  console.log("Migrating legacy flat db.json to keyed multi-tenant shape...");

  const legacyUsers = Array.isArray(db.users) ? db.users : [];
  const migratedUsers = {};

  if (legacyUsers.length === 0) {
    // If no users exist, create a default user if there's legacy profile/sessions
    const hasLegacyData = db.userProfile || db.speechSessions?.length || db.interviews?.length;
    if (hasLegacyData) {
      const defaultId = "user_default";
      migratedUsers[defaultId] = {
        id: defaultId,
        email: "default@vocaledge.ai",
        passwordHash: "$2b$10$dummyhash",
        name: db.userProfile?.name || "Default User",
        profile: {
          name: db.userProfile?.name || "Default User",
          xp: db.userProfile?.xp || 0,
          level: db.userProfile?.level || 1,
          streak: db.userProfile?.streak || 0,
          longestStreak: db.userProfile?.longestStreak || 0,
          lastPracticeDate: db.userProfile?.lastPracticeDate || "",
          badges: db.userProfile?.badges || [],
        },
        speechSessions: db.speechSessions || [],
        interviews: db.interviews || [],
        resumes: db.resumes || [],
      };
      console.log(`Created default user ${defaultId} for migrated data.`);
    }
  } else {
    // Assign legacy profile/sessions/interviews to the first user so data isn't lost
    legacyUsers.forEach((u, index) => {
      const isFirst = index === 0;
      migratedUsers[u.id] = {
        id: u.id,
        email: u.email,
        passwordHash: u.passwordHash,
        name: u.name,
        profile: isFirst ? {
          name: u.name,
          xp: db.userProfile?.xp || 0,
          level: db.userProfile?.level || 1,
          streak: db.userProfile?.streak || 0,
          longestStreak: db.userProfile?.longestStreak || 0,
          lastPracticeDate: db.userProfile?.lastPracticeDate || "",
          badges: db.userProfile?.badges || [],
        } : {
          name: u.name,
          xp: 0,
          level: 1,
          streak: 0,
          longestStreak: 0,
          lastPracticeDate: "",
          badges: [],
        },
        speechSessions: isFirst ? (db.speechSessions || []) : [],
        interviews: isFirst ? (db.interviews || []) : [],
        resumes: isFirst ? (db.resumes || []) : [],
      };
      console.log(`Migrated user: ${u.id} (${u.email})`);
    });
  }

  const migratedDb = {
    users: migratedUsers
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(migratedDb, null, 2), "utf8");
  console.log("Migration completed successfully!");
};

migrate();
