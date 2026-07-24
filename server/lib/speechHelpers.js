/**
 * Centralized utility to calculate WPM, total filler words count, and detailed breakdown.
 * @param {string} transcript - The spoken text
 * @param {number} durationSeconds - Duration in seconds
 * @returns {object} - { wpm, totalFillers, fillerCounts }
 */
export const calculateSpeechMetrics = (transcript, durationSeconds) => {
  const words = (transcript || "").toLowerCase().split(/\s+/).filter(Boolean);
  const durationMinutes = (durationSeconds || 30) / 60;
  const wpm = Math.round(words.length / durationMinutes);

  const fillerWords = ["like", "um", "uh", "you know", "basically", "so", "actually", "mean", "literally"];
  const fillerCounts = {};
  let totalFillers = 0;

  words.forEach((word) => {
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    if (fillerWords.includes(cleanWord)) {
      fillerCounts[cleanWord] = (fillerCounts[cleanWord] || 0) + 1;
      totalFillers++;
    }
  });

  return { wpm, totalFillers, fillerCounts };
};
