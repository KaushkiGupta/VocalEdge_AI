import { useState, useEffect, useRef, useCallback } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import { Mic, MicOff, PhoneOff, AlertCircle } from "lucide-react";
import { Track } from "livekit-client";

/**
 * Utility to identify whether a LiveKit participant represents an AI Agent / Bot.
 * Checks for standard identity patterns like "agent-", "bot", "assistant", etc.
 * @param {object} participant - LiveKit Participant object
 * @returns {boolean} True if the participant matches agent identity patterns
 */
const isParticipantAgent = (participant) => {
  if (!participant || !participant.identity) return false;
  const identityLower = participant.identity.toLowerCase();
  return (
    identityLower.startsWith("agent-") ||
    identityLower.includes("agent") ||
    identityLower.includes("assistant") ||
    identityLower.includes("bot")
  );
};

/**
 * Reusable helper to connect a remote participant's WebRTC audio track to a Web Audio destination node.
 * Prevents redundant stream creation by verifying tracking maps.
 * @param {AudioContext} audioCtx - Active browser AudioContext
 * @param {MediaStreamAudioDestinationNode} dest - Web Audio mixed output node
 * @param {RemoteTrack} track - LiveKit WebRTC Track object
 * @param {Map<string, MediaStreamAudioSourceNode>} connectedSources - Active connections map
 * @param {string} trackSid - Unique LiveKit track SID
 */
const connectRemoteAudioTrack = (audioCtx, dest, track, connectedSources, trackSid) => {
  if (!track || !track.mediaStreamTrack || !audioCtx || !dest) return;
  if (connectedSources.has(trackSid)) return;

  try {
    const remoteStream = new MediaStream([track.mediaStreamTrack]);
    const remoteSource = audioCtx.createMediaStreamSource(remoteStream);
    remoteSource.connect(dest);
    connectedSources.set(trackSid, remoteSource);
    console.log(`Connected remote participant audio track: ${trackSid}`);
  } catch (err) {
    console.warn("Failed to connect remote track:", err.message);
  }
};

export default function RtcVoiceRoom({ token, serverUrl, onDisconnect }) {
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);
  const audioChunksRef = useRef([]); // Holds recorded audio chunks for the session
  // eslint-disable-next-line react-hooks/purity -- Intentionally tracking dynamic start time at instantiation time
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleDisconnected = () => {
    if (isMountedRef.current) {
      handleEndCall();
    }
  };

  const handleEndCall = () => {
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    const audioBlob = audioChunksRef.current.length > 0 
      ? new Blob(audioChunksRef.current, { type: "audio/webm" }) 
      : null;
    onDisconnect(audioBlob, duration);
  };

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={handleDisconnected}
      onError={(err) => setError(err.message)}
    >
      <div className="card" style={{ borderColor: "var(--color-success)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "12px", borderBottom: "1px solid var(--border-light)" }}>
          <div>
            <h2 style={{ fontSize: "18px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="live-indicator"></span> Real-Time Voice Room
            </h2>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>LiveKit WebRTC Connection Active</div>
          </div>
          <button className="btn btn-danger" style={{ padding: "8px 12px", fontSize: "13px" }} onClick={handleEndCall}>
            <PhoneOff size={16} /> <span style={{ marginLeft: "6px" }}>End Call</span>
          </button>
        </div>

        {error ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", backgroundColor: "var(--color-danger-glow)", border: "1px solid var(--color-danger)", borderRadius: "10px", color: "var(--color-danger)", fontSize: "13px", width: "100%" }}>
              <AlertCircle size={16} color="var(--color-danger)" /> {error}
            </div>
            <button className="btn btn-secondary" onClick={handleEndCall}>
              Return to Form
            </button>
          </div>
        ) : (
          <RoomUI audioChunksRef={audioChunksRef} />
        )}
      </div>
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function RoomUI({ audioChunksRef }) {
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [mutedAgentSids, setMutedAgentSids] = useState(new Set());
  
  // Track microphone tracks dynamically (Ensures we catch remote tracks on subscription/load)
  const trackRefs = useTracks([Track.Source.Microphone]);

  // Derived state directly from LiveKit microphone state (Eliminated redundant isMuted state)
  const isMuted = !isMicrophoneEnabled;

  const toggleAgentMute = (sid) => {
    setMutedAgentSids((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) {
        next.delete(sid);
      } else {
        next.add(sid);
      }
      return next;
    });
  };
  
  const mediaRecorderRef = useRef(null);
  const audioCtxRef = useRef(null);
  const destRef = useRef(null);
  const connectedSourcesRef = useRef(new Map());

  const toggleMute = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    }
  };

  /**
   * Helper function to release all hardware and audio recording resources cleanly.
   * Prevents memory leaks by stopping MediaRecorder and closing AudioContext.
   */
  const cleanupMediaRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("Failed to stop media recorder during cleanup:", e.message);
      }
      mediaRecorderRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      try {
        audioCtxRef.current.close();
      } catch (e) {
        console.warn("Failed to close audio context during cleanup:", e.message);
      }
      audioCtxRef.current = null;
    }
    destRef.current = null;
    connectedSourcesRef.current = new Map();
  }, []);

  /**
   * Helper function to setup the audio mixer graph and start session recording.
   */
  const startRecording = useCallback(async () => {
    try {
      // Initialize AudioContext & Destination
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      
      const dest = audioCtx.createMediaStreamDestination();
      destRef.current = dest;
      connectedSourcesRef.current = new Map();

      // Connect all microphone tracks (both local and remote) from useTracks
      trackRefs.forEach((ref) => {
        const pub = ref.publication;
        const track = ref.track || pub?.track;
        if (pub && track && track.mediaStreamTrack) {
          connectRemoteAudioTrack(audioCtx, dest, track, connectedSourcesRef.current, pub.trackSid);
        }
      });

      // Start MediaRecorder on the mixed destination stream
      const recorder = new MediaRecorder(dest.stream, { mimeType: "audio/webm" });
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0 && audioChunksRef) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.warn("Could not start mixed media recorder:", err.message);
    }
  }, [trackRefs, audioChunksRef]);

  // Handles MediaRecorder lifecycle based on mic status
  useEffect(() => {
    if (isMicrophoneEnabled) {
      startRecording();
    } else {
      cleanupMediaRecording();
    }

    return () => {
      cleanupMediaRecording();
    };
  }, [isMicrophoneEnabled, startRecording, cleanupMediaRecording]);

  // Monitor trackRefs array to dynamically connect new remote tracks as they join/subscribe
  useEffect(() => {
    if (!audioCtxRef.current || !destRef.current) return;

    trackRefs.forEach((ref) => {
      const p = ref.participant;
      if (!p || p.isLocal) return; // Skip local mic

      const pub = ref.publication;
      const track = ref.track || pub?.track;
      if (pub && track && track.mediaStreamTrack) {
        connectRemoteAudioTrack(
          audioCtxRef.current,
          destRef.current,
          track,
          connectedSourcesRef.current,
          pub.trackSid
        );
      }
    });
  }, [trackRefs]);

  // Manage Local Agent Audio Subscription
  useEffect(() => {
    participants.forEach((p) => {
      if (!p) return;
      const isAgent = isParticipantAgent(p);
      if (isAgent) {
        const isMuted = mutedAgentSids.has(p.sid);
        p.audioTrackPublications.forEach((pub) => {
          if (pub.isSubscribed && isMuted) {
            pub.setSubscribed(false);
            console.log(`Unsubscribed from agent audio track locally: ${pub.trackSid} (${p.identity})`);
          } else if (!pub.isSubscribed && !isMuted) {
            pub.setSubscribed(true);
            console.log(`Subscribed back to agent audio track locally: ${pub.trackSid} (${p.identity})`);
          }
        });
      }
    });
  }, [participants, mutedAgentSids]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: "24px" }}>
      {/* Participants Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "20px", width: "100%", justifyContent: "center", padding: "12px 0" }}>
        {participants.map((p) => {
          if (!p) return null;
          const isSpeaking = p.isSpeaking;
          const isLocal = p.identity === localParticipant?.identity;
          const isMicEnabled = p.isMicrophoneEnabled;
          const isAgent = isParticipantAgent(p);
          const initial = (p.identity || "U").charAt(0).toUpperCase();

          return (
            <div 
              key={p.sid} 
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "24px 16px",
                backgroundColor: "var(--bg-tertiary)",
                border: "1px solid var(--border-light)",
                borderRadius: "16px",
                position: "relative",
                boxShadow: isSpeaking ? "0 0 15px var(--color-success-glow)" : "none",
                transition: "all var(--transition-base)"
              }}
            >
              {isAgent && (
                <div style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  backgroundColor: "var(--color-success)",
                  color: "#fff",
                  fontSize: "9px",
                  fontWeight: "bold",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  AI Agent
                </div>
              )}
              <div 
                className="interviewer-avatar" 
                style={{ 
                  width: "80px", 
                  height: "80px", 
                  fontSize: "32px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  backgroundColor: isLocal ? "var(--color-accent)" : (isAgent ? "var(--color-success)" : "var(--color-cta)"),
                  color: "#fff",
                  borderRadius: "50%",
                  fontWeight: "bold",
                  position: "relative"
                }}
              >
                {isAgent ? "🤖" : initial}
                {isSpeaking && (
                  <div 
                    className="avatar-pulse active" 
                    style={{ 
                      backgroundColor: isLocal ? "var(--color-accent)" : (isAgent ? "var(--color-success)" : "var(--color-cta)"),
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      borderRadius: "50%",
                      zIndex: -1
                    }} 
                  />
                )}
              </div>
              
              <div style={{ fontSize: "15px", fontWeight: "700", marginTop: "12px", textAlign: "center", color: "var(--text-primary)" }}>
                {p.identity} {isLocal && <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "normal" }}>(You)</span>}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                {isMicEnabled ? (
                  <span style={{ fontSize: "11px", color: "var(--color-success)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Mic size={12} /> Mic active
                  </span>
                ) : (
                  <span style={{ fontSize: "11px", color: "var(--color-danger)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <MicOff size={12} /> Muted
                  </span>
                )}
              </div>

              {isAgent && (
                <button
                  type="button"
                  className={`btn ${mutedAgentSids.has(p.sid) ? "btn-success" : "btn-danger"}`}
                  style={{ marginTop: "12px", padding: "6px 12px", fontSize: "11px", borderRadius: "8px", width: "100%" }}
                  onClick={() => toggleAgentMute(p.sid)}
                >
                  {mutedAgentSids.has(p.sid) ? "Unmute AI Agent" : "Mute AI Agent"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* User Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "24px", marginTop: "12px" }}>
        <button
          onClick={toggleMute}
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: isMuted ? "var(--color-danger)" : "var(--bg-card)",
            color: isMuted ? "#fff" : "var(--color-success)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: isMuted ? "0 0 20px rgba(239, 68, 68, 0.4)" : "0 4px 12px rgba(0,0,0,0.1)",
            border: isMuted ? "none" : "2px solid var(--color-success)",
            transition: "all 0.2s"
          }}
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
        </button>
        <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          {isMuted ? "Microphone off" : "Microphone on"}
        </div>
      </div>
    </div>
  );
}
