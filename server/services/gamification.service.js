import { getUserProfile, updateUserProfile } from "../lib/dbRepo.js";

/**
 * Grant XP, manage streaks, and unlock achievements for a user.
 * @param {string} userId
 * @param {number} xpEarned
 * @returns {Promise<object>}
 */
export const grantXPAndStreak = async (userId, xpEarned) => {
  const profile = await getUserProfile(userId);

  profile.xp = (profile.xp || 0) + xpEarned;

  const newLevel = Math.floor(profile.xp / 100) + 1;
  const leveledUp = newLevel > (profile.level || 1);
  profile.level = newLevel;

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (profile.lastPracticeDate === today) {
    // Already practiced today
  } else if (profile.lastPracticeDate === yesterday) {
    profile.streak = (profile.streak || 0) + 1;
  } else {
    profile.streak = 1;
  }

  profile.lastPracticeDate = today;

  if (profile.streak > (profile.longestStreak || 0)) {
    profile.longestStreak = profile.streak;
  }

  const currentBadges = (profile.badges || []).map((b) => b.id);
  const newBadges = [];

  if (profile.streak >= 3 && !currentBadges.includes("streak_3")) {
    newBadges.push({ id: "streak_3", title: "Consistent", description: "Maintain a 3-day practice streak", unlockedAt: today, icon: "🔥" });
  }
  if (profile.streak >= 7 && !currentBadges.includes("streak_7")) {
    newBadges.push({ id: "streak_7", title: "Dedicated", description: "Maintain a 7-day practice streak", unlockedAt: today, icon: "⚡" });
  }
  if (profile.xp >= 500 && !currentBadges.includes("xp_500")) {
    newBadges.push({ id: "xp_500", title: "Communicator", description: "Reach 500 total XP", unlockedAt: today, icon: "🎓" });
  }
  if (profile.xp >= 1000 && !currentBadges.includes("xp_1000")) {
    newBadges.push({ id: "xp_1000", title: "Expert Speaker", description: "Reach 1000 total XP", unlockedAt: today, icon: "🏆" });
  }

  await updateUserProfile(userId, profile, newBadges);

  return { profile, xpEarned, leveledUp, newBadges };
};
