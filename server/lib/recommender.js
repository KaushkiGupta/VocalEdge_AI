export const getRecommendations = (sessions = [], interviews = []) => {
  // Default recommendations if no history is present
  const defaultRecs = {
    dailyGoals: [
      { id: "dg_1", task: "Complete a 1-minute Free Speech session", completed: false, xpReward: 20 },
      { id: "dg_2", task: "Record a Toastmasters Table Topic", completed: false, xpReward: 40 },
    ],
    weeklyGoals: [
      { id: "wg_1", task: "Maintain a 3-day practice streak", target: 3, current: 0, completed: false, xpReward: 100 },
      { id: "wg_2", task: "Achieve > 75% Clarity score on any session", completed: false, xpReward: 150 },
    ],
    exercises: [
      { title: "Vocal Pacing Workout", focus: "Pacing", description: "Read the teleprompter script at 130-150 WPM to master standard conversational velocity." },
      { title: "Filler Elimination Exercise", focus: "Fillers", description: "Speak for 45 seconds about your favorite hobby without using the word 'like' or 'um'." },
    ],
    interviewPlan: {
      recommendedRole: "Software Engineer",
      focusArea: "Behavioral fit using the STAR Method",
    },
    weakSkills: [],
    strongSkills: [],
  };

  if (sessions.length === 0 && interviews.length === 0) {
    return defaultRecs;
  }

  // Calculate metrics
  const totalClarity = sessions.reduce((acc, s) => acc + (s.clarityScore || 0), 0);
  const avgClarity = sessions.length > 0 ? totalClarity / sessions.length : 70;

  const totalConfidence = sessions.reduce((acc, s) => acc + (s.confidenceScore || 0), 0);
  const avgConfidence = sessions.length > 0 ? totalConfidence / sessions.length : 70;

  const totalWpm = sessions.reduce((acc, s) => acc + (s.wpm || 0), 0);
  const avgWpm = sessions.length > 0 ? totalWpm / sessions.length : 140;

  const totalFillers = sessions.reduce((acc, s) => acc + (s.fillerCount || 0), 0);
  const avgFillers = sessions.length > 0 ? totalFillers / sessions.length : 3;

  const totalInterview = interviews.reduce((acc, i) => acc + (i.overallScore || 0), 0);
  const avgInterview = interviews.length > 0 ? totalInterview / interviews.length : 70;

  const weakSkills = [];
  const strongSkills = [];

  if (avgClarity < 70) weakSkills.push("Articulation & Clarity");
  else strongSkills.push("Articulation & Clarity");

  if (avgConfidence < 70) weakSkills.push("Speaking Confidence");
  else strongSkills.push("Speaking Confidence");

  if (avgWpm < 110 || avgWpm > 170) weakSkills.push("Pacing & Speed Control");
  else strongSkills.push("Pacing & Speed Control");

  if (avgFillers > 5) weakSkills.push("Filler Word Minimization");
  else strongSkills.push("Filler Word Minimization");

  if (avgInterview < 70) weakSkills.push("Interview Structure");
  else if (interviews.length > 0) strongSkills.push("Interview Structure");

  // Dynamic goals based on weaknesses
  const dailyGoals = [];
  const weeklyGoals = [];
  const exercises = [];
  let recommendedRole = "Software Engineer";

  if (interviews.length > 0) {
    recommendedRole = interviews[interviews.length - 1].role || "Software Engineer";
  }

  if (weakSkills.includes("Filler Word Minimization")) {
    dailyGoals.push({ id: "dg_filler", task: "Perform a speech with under 2 filler words", completed: false, xpReward: 30 });
    exercises.push({
      title: "The Silent Pause Practice",
      focus: "Fillers",
      description: "When you feel like saying 'um' or 'like', pause in complete silence for 1 second instead. Try it with a Toastmasters Table Topic.",
    });
  }

  if (weakSkills.includes("Pacing & Speed Control")) {
    dailyGoals.push({ id: "dg_pace", task: "Complete a presentation practice at 130-150 WPM", completed: false, xpReward: 30 });
    exercises.push({
      title: "Speed Calibration",
      focus: "Pacing",
      description: `Your average speed is ${Math.round(avgWpm)} WPM. Rehearse the Pitch script aiming for exactly 140 WPM.`,
    });
  }

  if (weakSkills.includes("Articulation & Clarity")) {
    weeklyGoals.push({ id: "wg_clarity", task: "Achieve an average clarity of 80% over 3 sessions", completed: false, xpReward: 120 });
    exercises.push({
      title: "Vowel Enunciation Run",
      focus: "Articulation",
      description: "Record a free-form speech making sure to fully enunciate every syllable and vocalize final consonants (-t, -d, -g).",
    });
  }

  // Populate defaults if arrays are empty
  if (dailyGoals.length < 2) {
    dailyGoals.push({ id: "dg_std_1", task: "Complete your daily 60-second speech session", completed: false, xpReward: 20 });
  }
  if (dailyGoals.length < 2) {
    dailyGoals.push({ id: "dg_std_2", task: "Review your latest resume ATS recommendations", completed: false, xpReward: 20 });
  }

  if (weeklyGoals.length < 2) {
    weeklyGoals.push({ id: "wg_std_1", task: "Complete 5 mock interview responses", target: 5, current: interviews.length % 5, completed: false, xpReward: 100 });
  }
  if (weeklyGoals.length < 2) {
    weeklyGoals.push({ id: "wg_std_2", task: "Earn 150 XP through daily exercises", target: 150, current: 0, completed: false, xpReward: 150 });
  }

  if (exercises.length < 2) {
    exercises.push({
      title: "STAR Method Drill",
      focus: "Interview Preparation",
      description: "Write down your key achievements formatted as Situation, Task, Action, Result, and speak them out loud.",
    });
  }
  if (exercises.length < 2) {
    exercises.push({
      title: "PR Crisis Impromptu",
      focus: "Impacting",
      description: "Select the Crisis category in Impromptu Table Topics and defend your perspective in 90 seconds.",
    });
  }

  return {
    dailyGoals,
    weeklyGoals,
    exercises,
    interviewPlan: {
      recommendedRole,
      focusArea: weakSkills.includes("Interview Structure") ? "STAR Method Organization" : "Advanced technical explanation",
    },
    weakSkills,
    strongSkills,
  };
};
