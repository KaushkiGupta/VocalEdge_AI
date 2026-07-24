import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validation.js";
import { saveApiKeySchema } from "../lib/schemas.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.join(__dirname, "..", ".env");

router.get("/status", requireAuth, (req, res) => {
  const hasLivekit = process.env.LIVEKIT_API_KEY && 
                     process.env.LIVEKIT_API_KEY !== "your_livekit_key_here" && 
                     process.env.LIVEKIT_API_SECRET && 
                     process.env.LIVEKIT_API_SECRET !== "your_livekit_secret_here";
  res.json({ 
    hasKey: !!process.env.GROQ_API_KEY,
    hasLivekit: !!hasLivekit
  });
});

router.post("/apikey", requireAuth, validate(saveApiKeySchema), (req, res) => {
  const { apiKey } = req.body;

  try {
    let envContent = "";
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, "utf8");
    }
    
    if (envContent.includes("GROQ_API_KEY=")) {
      envContent = envContent.replace(/GROQ_API_KEY=.*/g, `GROQ_API_KEY=${apiKey}`);
    } else {
      envContent += `\nGROQ_API_KEY=${apiKey}\n`;
    }

    fs.writeFileSync(ENV_PATH, envContent, "utf8");
    process.env.GROQ_API_KEY = apiKey;
    res.json({ success: true, message: "Groq API Key saved successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to write key to .env file: " + err.message });
  }
});

router.post("/livekit", requireAuth, (req, res) => {
  const { url, key, secret, agentName } = req.body;

  if (!url || !key || !secret) {
    return res.status(400).json({ error: "All LiveKit fields are required" });
  }

  try {
    let envContent = "";
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, "utf8");
    }
    
    if (envContent.includes("LIVEKIT_URL=")) {
      envContent = envContent.replace(/LIVEKIT_URL=.*/g, `LIVEKIT_URL=${url}`);
    } else {
      envContent += `\nLIVEKIT_URL=${url}\n`;
    }

    if (envContent.includes("LIVEKIT_API_KEY=")) {
      envContent = envContent.replace(/LIVEKIT_API_KEY=.*/g, `LIVEKIT_API_KEY=${key}`);
    } else {
      envContent += `\nLIVEKIT_API_KEY=${key}\n`;
    }

    if (envContent.includes("LIVEKIT_API_SECRET=")) {
      envContent = envContent.replace(/LIVEKIT_API_SECRET=.*/g, `LIVEKIT_API_SECRET=${secret}`);
    } else {
      envContent += `\nLIVEKIT_API_SECRET=${secret}\n`;
    }

    if (envContent.includes("LIVEKIT_AGENT_NAME=")) {
      envContent = envContent.replace(/LIVEKIT_AGENT_NAME=.*/g, `LIVEKIT_AGENT_NAME=${agentName || "assistant-033"}`);
    } else {
      envContent += `\nLIVEKIT_AGENT_NAME=${agentName || "assistant-033"}\n`;
    }

    fs.writeFileSync(ENV_PATH, envContent, "utf8");
    process.env.LIVEKIT_URL = url;
    process.env.LIVEKIT_API_KEY = key;
    process.env.LIVEKIT_API_SECRET = secret;
    process.env.LIVEKIT_AGENT_NAME = agentName || "assistant-033";
    res.json({ success: true, message: "LiveKit credentials saved successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to write LiveKit keys to .env file: " + err.message });
  }
});

export default router;
