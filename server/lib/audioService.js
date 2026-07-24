import dotenv from "dotenv";

dotenv.config();

/**
 * Transcribe recorded audio using Groq's whisper-large-v3 model.
 * @param {Buffer} fileBuffer - Audio file buffer
 * @param {string} filename - Filename (e.g. 'recording.webm')
 * @returns {Promise<string>} - Transcribed text
 */
export const transcribeAudio = async (fileBuffer, filename = "recording.webm") => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  // Create multipart/form-data boundary
  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: audio/webm\r\n\r\n`;
  const footer = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3\r\n--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nen\r\n--${boundary}--\r\n`;

  const payload = Buffer.concat([
    Buffer.from(header, "utf-8"),
    fileBuffer,
    Buffer.from(footer, "utf-8")
  ]);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: payload,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Whisper transcription failed: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return data.text || "";
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      const timeoutError = new Error("Gateway Timeout: Whisper service did not respond within 30 seconds.");
      timeoutError.status = 504;
      throw timeoutError;
    }
    if (err.message && (err.message.includes("fetch failed") || err.message.includes("connect") || err.message.includes("timeout"))) {
      const networkError = new Error("Network error: Failed to reach Whisper transcription service. Please check your internet connection, DNS, or VPN settings.");
      networkError.status = 503;
      throw networkError;
    }
    throw err;
  }
};

/**
 * Generate speech (TTS) using OpenAI's tts-1 model or ElevenLabs.
 * @param {string} text - Text to convert to speech
 * @param {string} voice - Voice setting (e.g. 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer')
 * @param {number} speed - Speed rate (0.25 to 4.0)
 * @returns {Promise<ArrayBuffer>} - Audio binary data
 */
export const generateSpeech = async (text, voice = "alloy", speed = 1.0) => {
  const openAiKey = process.env.OPENAI_API_KEY;
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

  if (!openAiKey && !elevenLabsKey) {
    throw new Error("Neither OPENAI_API_KEY nor ELEVENLABS_API_KEY is configured.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    if (openAiKey) {
      // Call OpenAI TTS API
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: voice || "alloy",
          speed: speed || 1.0,
          response_format: "mp3"
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI TTS failed: ${response.status} - ${errText}`);
      }

      return await response.arrayBuffer();
    }

    if (elevenLabsKey) {
      // Call ElevenLabs TTS API (default male voice if not specified)
      const voiceId = voice || "21m00Tcm4TlvDq8ikWAM"; // Rachel voice ID
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ElevenLabs TTS failed: ${response.status} - ${errText}`);
      }

      return await response.arrayBuffer();
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      const timeoutError = new Error("Gateway Timeout: Speech generation service did not respond within 30 seconds.");
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw err;
  }
};
