import express from "express";
import { AccessToken, RoomServiceClient, AgentDispatchClient } from "livekit-server-sdk";
import { requireAuth } from "../middleware/auth.js";
import { callGroq } from "../lib/groqClient.js";
import { getSession, setSession } from "../lib/redis.js";

const router = express.Router();
const activeDispatchPromises = new Map();

router.get("/token", requireAuth, async (req, res, next) => {
  const { room, identity, includeAgent } = req.query;

  if (!room || !identity) {
    return res.status(400).json({ error: "Room and identity query parameters are required" });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  if (
    !apiKey || 
    !apiSecret || 
    !livekitUrl || 
    apiKey === "your_livekit_key_here" || 
    apiSecret === "your_livekit_secret_here"
  ) {
    return res.status(400).json({ 
      error: "LiveKit server credentials are not configured. Please open Settings in the sidebar to configure your LiveKit Server URL, API Key, and API Secret." 
    });
  }

  try {
    // ── Room capacity check (max 2 human participants) ──────────────────────
    // Supports the "Real-Time Peer Voice" feature where exactly two humans
    // share a room by exchanging a room name.  AI agents connect separately
    // via AgentDispatchClient and are NOT counted in this list.
    //
    // Rules:
    //  - If userId already in participants → allow (reconnect / page refresh).
    //  - If userId not in participants and capacity < 2 → add and allow.
    //  - If userId not in participants and capacity >= 2 → reject 403.
    const capacityKey = `voice:${room}`;
    const roomSession = await getSession(capacityKey);
    const participants = roomSession?.participants ?? [];

    if (!participants.includes(req.user.userId)) {
      if (participants.length >= 2) {
        return res.status(403).json({ error: "This room already has two participants." });
      }
      // Register this user as a participant (TTL 2 h — covers a full session).
      await setSession(capacityKey, { participants: [...participants, req.user.userId] }, 7200);
    }
    // ───────────────────────────────────────────────────────────────────────

    const host = livekitUrl.replace(/^ws/, "http");

    // Pre-create the room with a custom emptyTimeout of 5 minutes (300 seconds)
    // to prevent the room from terminating automatically if it remains empty briefly.
    try {
      const roomService = new RoomServiceClient(host, apiKey, apiSecret);
      await roomService.createRoom({
        name: room,
        emptyTimeout: 300,
      });
    } catch (createRoomErr) {
      console.warn("Could not pre-create room with custom timeout:", createRoomErr.message);
      // Fallback: we still proceed so the client can try connecting using automatic room creation
    }

    // Explicitly dispatch agent if requested
    if (includeAgent === "true") {
      try {
        const agentName = process.env.LIVEKIT_AGENT_NAME || "assistant-033";
        const agentDispatchClient = new AgentDispatchClient(host, apiKey, apiSecret);
        
        const lockKey = `${room}_${agentName}`;
        if (!activeDispatchPromises.has(lockKey)) {
          const dispatchPromise = (async () => {
            try {
              const roomService = new RoomServiceClient(host, apiKey, apiSecret);
              let isAgentPresent = false;
              
              // 1. Check if an agent participant is already connected to the LiveKit room
              try {
                const participants = await roomService.listParticipants(room);
                isAgentPresent = participants.some(p => {
                  const identityLower = (p.identity || "").toLowerCase();
                  return (
                    identityLower.startsWith("agent-") ||
                    identityLower.includes("agent") ||
                    identityLower.includes("assistant") ||
                    identityLower.includes("bot") ||
                    identityLower.includes(agentName.toLowerCase())
                  );
                });
              } catch (listErr) {
                console.warn("Could not list participants in room:", listErr.message);
              }
              
              // 2. Dispatch fresh agent if not present in the room
              if (!isAgentPresent) {
                await agentDispatchClient.createDispatch(room, agentName);
                console.log(`Dispatched fresh agent ${agentName} to room ${room}`);
              } else {
                console.log(`Agent ${agentName} is already active in room ${room}. Skipping dispatch.`);
              }
            } catch (err) {
              console.error("Error in background dispatch promise:", err.message);
            }
          })();
          
          activeDispatchPromises.set(lockKey, dispatchPromise);
          
          // Clear lock after 30 seconds to allow new dispatches if previous agent left
          setTimeout(() => {
            activeDispatchPromises.delete(lockKey);
          }, 30000);
        }
        
        await activeDispatchPromises.get(lockKey);
      } catch (dispatchErr) {
        console.warn("Could not dispatch agent to room:", dispatchErr.message);
      }
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: identity,
    });
    
    at.addGrant({
      roomJoin: true,
      room: room,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    res.json({
      token,
      url: livekitUrl,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/mom", requireAuth, async (req, res, next) => {
  const { transcript, duration } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: "Transcript is required" });
  }

  try {
    const prompt = `You are a professional secretary and AI assistant. 
    Below is the raw transcript of a real-time call/meeting with multiple participants:
    "${transcript}"
    
    Meeting Duration: ${duration || 0} seconds.

    Generate the Minutes of Meeting (MOM) for this discussion. You MUST return a JSON object with this exact schema:
    {
      "summary": "A concise 2-3 sentence overview of what the meeting/discussion was about.",
      "discussionPoints": [
        "Key topic discussed 1",
        "Key topic discussed 2",
        "Decision made or consensus reached 3"
      ],
      "qaList": [
        {
          "question": "Question asked during the meeting",
          "answer": "Answer or response given"
        }
      ],
      "actionItems": [
        "Action item 1 (Assigned to [Participant Name] if known, otherwise general next step)",
        "Action item 2"
      ]
    }`;

    const systemInstruction = "You are a professional corporate secretary. Produce clean, structured, and highly accurate Minutes of Meeting (MOM) from raw transcripts.";
    const mom = await callGroq(prompt, systemInstruction);

    res.json({ mom });
  } catch (err) {
    next(err);
  }
});

export default router;
