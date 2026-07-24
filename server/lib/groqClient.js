import "dotenv/config";

/**
 * Call Groq chat completion API with a timeout
 * @param {string} prompt
 * @param {string} systemInstruction
 * @returns {Promise<object>}
 */
export const callGroq = async (prompt, systemInstruction = "") => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set in server/.env file. Please check settings.");
  }

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction + "\nReturn ONLY valid JSON." });
  }
  messages.push({ role: "user", content: prompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API Error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    const rawText = responseData.choices?.[0]?.message?.content;
    if (!rawText) {
      throw new Error("Groq returned empty content");
    }

    return JSON.parse(rawText.trim());
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      const timeoutError = new Error("Gateway Timeout: LLM service did not respond within 30 seconds.");
      timeoutError.status = 504;
      throw timeoutError;
    }
    console.error("Groq Call Failed:", err.message);
    if (err.message && (err.message.includes("fetch failed") || err.message.includes("connect") || err.message.includes("timeout"))) {
      const networkError = new Error("Network error: Failed to reach Groq AI services. Please check your internet connection, DNS, or VPN settings.");
      networkError.status = 503;
      throw networkError;
    }
    throw err;
  }
};
