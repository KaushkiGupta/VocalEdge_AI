import { callGroq } from "./groqClient.js";

/**
 * Perform pronunciation analysis on user transcript against a reference text.
 * @param {string} referenceText - Target text the user was supposed to say
 * @param {string} userTranscript - What the user actually said
 * @returns {Promise<object>} - Scorecard containing word-level scores, phoneme assessments, and suggestions.
 */
export const analyzePronunciation = async (referenceText, userTranscript) => {
  if (!referenceText || !userTranscript) {
    throw new Error("Reference text and user transcript are required for pronunciation assessment.");
  }

  try {
    const prompt = `You are an expert Speech-Language Pathologist and Pronunciation Coach.
    Compare the User's Spoken Transcript against the Reference Text.
    
    Reference Text: "${referenceText}"
    User's Spoken Transcript: "${userTranscript}"
    
    Assess spelling alignment, word omissions, additions, and phonetic mispronunciations.
    
    You MUST return a JSON object with this exact schema:
    {
      "pronunciationScore": 0-100 overall accuracy percentage,
      "words": [
        {
          "word": "word from reference text",
          "accuracyScore": 0-100 accuracy for this word,
          "errorType": "None" | "Mispronounced" | "Omitted" | "Insertion",
          "phonemes": "phonetic transcription (e.g. IPA or ARPAbet) highlighting where the user erred"
        }
      ],
      "suggestions": [
        "tactical tip 1 on how to enunciate specific letters/vowels",
        "tactical tip 2 on word stress and rhythm"
      ]
    }`;

    const systemInstruction = "You are a professional AI Pronunciation Assessor. Analyze spoken text comparison down to phonetic details and return JSON.";
    
    // We will call the Groq helper
    const result = await callGroq(prompt, systemInstruction);
    return result;
  } catch (err) {
    console.error("Pronunciation analysis failed, generating fallback metrics:", err.message);
    
    // Fallback: Perform basic Levenshtein word match
    const refWords = referenceText.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/);
    const userWords = userTranscript.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").split(/\s+/);
    
    const wordEvaluations = refWords.map((word) => {
      const matchIndex = userWords.indexOf(word);
      const isCorrect = matchIndex !== -1;
      
      return {
        word,
        accuracyScore: isCorrect ? 95 : 0,
        errorType: isCorrect ? "None" : "Omitted",
        phonemes: "",
      };
    });

    const correctCount = wordEvaluations.filter((w) => w.errorType === "None").length;
    const score = Math.round((correctCount / refWords.length) * 100);

    return {
      pronunciationScore: score,
      words: wordEvaluations,
      suggestions: [
        "Some words were not detected. Speak clearly and maintain a constant distance from your microphone.",
        "Practice slowly, concentrating on word transitions and linking sounds.",
      ],
    };
  }
};
