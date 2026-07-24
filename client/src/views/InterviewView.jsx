import React, { useState, useRef, useEffect, Suspense } from "react";
import {
  Briefcase,
  Play,
  Mic,
  RefreshCw,
  Send,
  Volume2,
  VolumeX,
  AlertCircle,
  Award,
  CheckCircle,
  Sparkles,
  Upload,
  Radio,
  MessageSquare,
} from "lucide-react";
import "@livekit/components-styles";

const RtcVoiceRoom = React.lazy(() => import("../components/RtcVoiceRoom"));

const apiFetch = async (endpoint, options = {}, backendUrl = "") => {
  const isFormData = options.body instanceof FormData;
  const headers = {
    "X-Requested-With": "XMLHttpRequest",
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...options.headers,
  };
  const res = await fetch(`${backendUrl}${endpoint}`, { ...options, headers, credentials: "include" });
  if (!res.ok) {
    let msg = await res.text();
    try { msg = JSON.parse(msg).error || msg; } catch { }
    throw new Error(msg);
  }
  return res.json();
};

const ErrorAlert = ({ msg }) => (
  msg ? (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", backgroundColor: "var(--color-danger-glow)", border: "1px solid var(--color-danger)", borderRadius: "10px", color: "var(--text-primary)", fontSize: "13px", marginBottom: "16px" }}>
      <AlertCircle size={16} color="var(--color-danger)" /> {msg}
    </div>
  ) : null
);

export default function InterviewView({ onSessionComplete, backendUrl, currentUser }) {
  const [role] = useState("Software Engineer");
  const [selectedFile, setSelectedFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [interviewType] = useState("Mixed (Behavioral & Technical)");
  const [difficulty] = useState("Medium");
  const [isStarting, setIsStarting] = useState(false);
  const [useRealTimeVoice, setUseRealTimeVoice] = useState(false);

  const [interviewId, setInterviewId] = useState(null);
  const [chatLog, setChatLog] = useState([]);
  const [userAnswer, setUserAnswer] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

  const [livekitToken, setLivekitToken] = useState(null);
  const [livekitUrl, setLivekitUrl] = useState(null);
  const [roomName, setRoomName] = useState(() => `room-${Math.floor(1000 + Math.random() * 9000)}`);
  const [displayName, setDisplayName] = useState(() => currentUser?.name || `User-${Math.floor(1000 + Math.random() * 9000)}`);
  const [includeAgent, setIncludeAgent] = useState(true);

  const [error, setError] = useState("");
  const [scorecard, setScorecard] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const recognitionRef = useRef(null);
  const baseTextRef = useRef("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => () => {
    if (recognitionRef.current) recognitionRef.current.abort();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  const speakQuestion = (text) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => v.name.includes("Google US English") || v.name.includes("Microsoft David") || v.name.includes("Zira"));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return setError("Speech recognition is not supported in this browser.");

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      return setIsListening(false);
    }

    setError("");
    let audioStream = null;
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      return setError("Microphone access denied: " + err.message);
    }

    baseTextRef.current = userAnswer;
    audioChunksRef.current = [];
    try {
      const mediaRecorder = new MediaRecorder(audioStream);
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
    } catch (e) {
      console.warn("Could not start MediaRecorder fallback stream:", e);
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + " ";
        else interimTranscript += event.results[i][0].transcript;
      }
      const newSpeech = (finalTranscript + interimTranscript).trim();
      setUserAnswer(baseTextRef.current + (baseTextRef.current && newSpeech ? " " : "") + newSpeech);
    };

    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError("Voice input error: " + event.error);
        setIsListening(false);
      }
    };

    recognition.onend = async () => {
      setIsListening(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        setIsTranscribing(true);
        const stopPromise = new Promise((resolve) => {
          mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            if (mediaRecorderRef.current.stream) mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
            resolve(blob);
          };
          mediaRecorderRef.current.stop();
        });

        try {
          const audioBlob = await stopPromise;
          if (audioBlob && audioBlob.size > 1000) {
            const formData = new FormData();
            formData.append("audio", audioBlob, "recording.webm");
            const data = await apiFetch("/api/transcribe-whisper", { method: "POST", body: formData }, backendUrl);
            if (data.transcript?.trim()) {
              setUserAnswer(baseTextRef.current + (baseTextRef.current ? " " : "") + data.transcript.trim());
            }
          }
        } catch (err) {
          console.error("Whisper transcription error, keeping browser STT:", err);
        } finally {
          setIsTranscribing(false);
        }
      } else if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop());
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const handleFileChange = (e) => {
    setError("");
    const file = e.target.files[0];
    if (file) {
      if (file.type !== "application/pdf" && file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        setError("Only PDF and DOCX files are supported.");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const startInterview = async (e) => {
    e.preventDefault();
    if (!selectedFile && !useRealTimeVoice) return setError("Please upload a resume file (PDF or DOCX).");

    setIsStarting(true);
    setError("");
    setScorecard(null);
    setChatLog([]);

    try {
      if (useRealTimeVoice) {
        const finalRoom = (roomName || "").trim() || `room-${crypto.randomUUID().slice(0, 8)}`;
        const identity = (displayName || "").trim() || `User-${Math.floor(Math.random() * 1000)}`;
        const data = await apiFetch(`/api/rtc/token?room=${finalRoom}&identity=${identity}&includeAgent=${includeAgent}`, {}, backendUrl);
        setLivekitToken(data.token);
        setLivekitUrl(data.url);
      } else {
        const formData = new FormData();
        formData.append("role", role);
        formData.append("resumeFile", selectedFile);
        formData.append("jobDescription", jobDescription);
        formData.append("interviewType", interviewType);
        formData.append("difficulty", difficulty);

        const data = await apiFetch("/api/interview/start", { method: "POST", body: formData }, backendUrl);
        setInterviewId(data.interviewId);
        setChatLog([{ role: "interviewer", text: data.question }]);
        setTimeout(() => speakQuestion(data.question), 500);
      }
    } catch (err) {
      setError("Failed to start interview: " + err.message);
    } finally {
      setIsStarting(false);
    }
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim()) return setError("Please type or speak your answer before submitting.");

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setError("");
    setIsThinking(true);
    const candidateAnswer = userAnswer.trim();
    setUserAnswer("");
    setChatLog((prev) => [...prev, { role: "candidate", text: candidateAnswer }]);

    try {
      const data = await apiFetch("/api/interview/answer", {
        method: "POST",
        body: JSON.stringify({ interviewId, answerText: candidateAnswer }),
      }, backendUrl);

      if (data.isFinished) {
        setScorecard(data.scorecard);
        setInterviewId(null);
        if (onSessionComplete) onSessionComplete(data.gamification);
      } else {
        setChatLog((prev) => [...prev, { role: "interviewer", text: data.question }]);
        speakQuestion(data.question);
      }
    } catch (err) {
      setError("Failed to submit response: " + err.message);
    } finally {
      setIsThinking(false);
    }
  };

  const [livekitFeedback, setLivekitFeedback] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleLivekitDisconnect = async (audioBlob, duration) => {
    if (!audioBlob || audioBlob.size < 1000) {
      resetInterview();
      setError("No speech audio was captured during this session. Please make sure to unmute your microphone and speak clearly during the call to generate a performance summary.");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setLivekitToken(null);
    setLivekitUrl(null);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");
      const transcribeData = await apiFetch("/api/transcribe-whisper", { method: "POST", body: formData }, backendUrl);
      const transcript = transcribeData.transcript;

      if (!transcript || transcript.trim().split(/\s+/).length < 3) {
        throw new Error("No speech could be recognized in your audio. Make sure your microphone is working and you spoke clearly.");
      }

      const data = await apiFetch("/api/rtc/mom", {
        method: "POST",
        body: JSON.stringify({ transcript: transcript.trim(), duration: duration || 30 }),
      }, backendUrl);

      setLivekitFeedback({ ...data.mom, transcript: transcript.trim() });
    } catch (err) {
      setError("Failed to generate session feedback: " + err.message);
      resetInterview();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetInterview = () => {
    setInterviewId(null);
    setLivekitToken(null);
    setLivekitUrl(null);
    setScorecard(null);
    setLivekitFeedback(null);
    setChatLog([]);
    setUserAnswer("");
    setError("");
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 1. Configuration Setup */}
      {!interviewId && !scorecard && !livekitToken && !livekitFeedback && !isAnalyzing && (
        <div className="card">
          <div className="card-title">
            <Briefcase size={20} color="var(--color-accent)" />
            AI Mock Interview System
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
            Upload your resume and select a target role. Groq AI dynamically generates
            role-specific questions from a curated question bank and scores your responses using
            communication analysis algorithms.
          </p>

          <ErrorAlert msg={error} />

          <form onSubmit={startInterview}>
            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label className="form-label">Interview Mode</label>
              <div className="interview-mode-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div
                  className={`card ${!useRealTimeVoice ? "active" : ""}`}
                  style={{ cursor: "pointer", borderColor: !useRealTimeVoice ? "var(--color-accent)" : "var(--border-light)", backgroundColor: !useRealTimeVoice ? "var(--color-accent-glow)" : "var(--bg-card)", transition: "all var(--transition-fast)" }}
                  onClick={() => setUseRealTimeVoice(false)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", marginBottom: "4px" }}>
                    <MessageSquare size={16} color={!useRealTimeVoice ? "var(--color-accent)" : "var(--text-secondary)"} />
                    Turn-Based (Groq)
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Interactive Q&A using Groq AI text-to-speech.</div>
                </div>

                <div
                  className={`card ${useRealTimeVoice ? "active" : ""}`}
                  style={{ cursor: "pointer", borderColor: useRealTimeVoice ? "var(--color-success)" : "var(--border-light)", backgroundColor: useRealTimeVoice ? "var(--color-success-glow)" : "var(--bg-card)", transition: "all var(--transition-fast)" }}
                  onClick={() => setUseRealTimeVoice(true)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", marginBottom: "4px" }}>
                    <Radio size={16} color={useRealTimeVoice ? "var(--color-success)" : "var(--text-secondary)"} />
                    Real-Time Peer Voice (LiveKit)
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Low-latency voice room. Connect with a peer using a shared Room Name.</div>
                </div>
              </div>
            </div>

            {useRealTimeVoice ? (
              <>
                <div className="interview-setup-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                  <div className="form-group">
                    <label className="form-label">Display Name / Identity</label>
                    <input type="text" className="form-control" placeholder="Enter your name..." value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Room Name</span>
                      <span style={{ color: "var(--color-accent)", cursor: "pointer", textDecoration: "underline", fontSize: "11px" }} onClick={() => setRoomName(`room-${Math.floor(1000 + Math.random() * 9000)}`)}>Regenerate</span>
                    </label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input type="text" className="form-control" placeholder="e.g. room-1234" value={roomName} onChange={(e) => setRoomName(e.target.value)} required />
                      <button type="button" className="btn btn-secondary" style={{ padding: "10px 14px", borderRadius: "12px" }} onClick={() => { navigator.clipboard.writeText(roomName); alert("Room Name copied to clipboard!"); }}>Copy</button>
                    </div>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <input type="checkbox" id="includeAgentCheck" checked={includeAgent} onChange={(e) => setIncludeAgent(e.target.checked)} style={{ width: "18px", height: "18px", accentColor: "var(--color-success)", cursor: "pointer" }} />
                  <label htmlFor="includeAgentCheck" style={{ fontSize: "14px", fontWeight: "600", cursor: "pointer", userSelect: "none" }}>Include AI Interviewer / Agent in room</label>
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Upload Resume File (PDF / DOCX)</label>
                  <div style={{ border: "2px dashed var(--border-light)", borderRadius: "12px", padding: "32px 20px", textAlign: "center", backgroundColor: "var(--bg-tertiary)", cursor: "pointer", position: "relative" }}>
                    <input type="file" accept=".pdf,.docx" onChange={handleFileChange} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
                    <Upload size={32} color="var(--color-accent)" style={{ marginBottom: "12px", opacity: 0.8 }} />
                    <div style={{ fontSize: "14px", fontWeight: "600" }}>{selectedFile ? selectedFile.name : "Drag & drop file here or click to browse"}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>Supports PDF and DOCX formats (max 5MB)</div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Target Job Description (Optional)</label>
                  <textarea className="form-control" placeholder="Paste the job description to align questions with requirements..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} style={{ minHeight: "80px" }} />
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "16px" }} disabled={isStarting}>
              {isStarting ? <><RefreshCw className="animate-spin" size={16} /> Preparing interview...</> : <><Play size={16} /> {useRealTimeVoice ? "Connect to LiveKit Room" : "Enter Mock Interview Room"}</>}
            </button>
          </form>
        </div>
      )}

      {/* 1.1 Analyzing Loading Spinner */}
      {isAnalyzing && (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <RefreshCw className="animate-spin" size={48} color="var(--color-accent)" style={{ margin: "0 auto 24px" }} />
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>Analyzing Session Performance...</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Groq AI is reviewing your transcript to evaluate grammar, tone, clarity, and pacing. Please wait...
          </p>
        </div>
      )}

      {/* 2. Active Interview (LiveKit) */}
      {livekitToken && livekitUrl && (
        <Suspense fallback={
          <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
            <RefreshCw className="animate-spin" size={32} color="var(--color-accent)" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Connecting to voice room…</p>
          </div>
        }>
          <RtcVoiceRoom token={livekitToken} serverUrl={livekitUrl} onDisconnect={handleLivekitDisconnect} />
        </Suspense>
      )}

      {/* 3. Active Interview (Turn-Based Groq) */}
      {interviewId && !scorecard && (
        <div className="card" style={{ borderColor: "var(--color-info)" }}>
          <div className="interview-room-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "12px", borderBottom: "1px solid var(--border-light)" }}>
            <div>
              <h2 style={{ fontSize: "18px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Briefcase size={18} color="var(--color-info)" /> Interview Room: {role}
              </h2>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Type: {interviewType}</div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="btn btn-secondary" style={{ padding: "8px 12px", fontSize: "13px" }} onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}>
                {isVoiceEnabled ? <Volume2 size={16} color="var(--color-success)" /> : <VolumeX size={16} color="var(--text-muted)" />}
                <span style={{ marginLeft: "6px" }}>{isVoiceEnabled ? "Voice ON" : "Voice OFF"}</span>
              </button>
              <button className="btn btn-danger" style={{ padding: "8px 12px", fontSize: "13px" }} onClick={resetInterview}>Exit</button>
            </div>
          </div>

          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div className="interviewer-avatar">
              🤖
              <div className={`avatar-pulse ${isSpeaking ? "active" : ""}`} style={{ backgroundColor: "var(--color-accent)" }} />
              <div className={`avatar-pulse ${isThinking ? "active" : ""}`} style={{ backgroundColor: "var(--color-warning)" }} />
            </div>
            <div style={{ fontSize: "15px", fontWeight: "700" }}>Senior Interviewer</div>
            <div style={{ fontSize: "12px", color: isSpeaking ? "var(--color-success)" : isThinking ? "var(--color-warning)" : "var(--text-secondary)" }}>
              {isSpeaking ? "Speaking question..." : isThinking ? "Reviewing response..." : "Waiting for your response..."}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px", backgroundColor: "var(--bg-tertiary)", borderRadius: "12px", padding: "20px", border: "1px solid var(--border-light)", maxHeight: "300px", overflowY: "auto" }}>
            {chatLog.map((chat, idx) => (
              <div key={idx} style={{ alignSelf: chat.role === "interviewer" ? "flex-start" : "flex-end", backgroundColor: chat.role === "interviewer" ? "var(--bg-card)" : "var(--color-accent-glow)", border: "1px solid", borderColor: chat.role === "interviewer" ? "var(--border-light)" : "var(--color-accent)", borderRadius: "12px", padding: "12px 16px", maxWidth: "80%", fontSize: "14px", textAlign: "left" }}>
                <strong>{chat.role === "interviewer" ? "Interviewer" : "You"}:</strong>
                <div style={{ marginTop: "4px" }}>{chat.text}</div>
              </div>
            ))}
            {isThinking && (
              <div style={{ alignSelf: "flex-start", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>
                <RefreshCw className="animate-spin" size={14} /> Preparing next question...
              </div>
            )}
          </div>

          <ErrorAlert msg={error} />

          <div className="form-group" style={{ position: "relative", marginBottom: isTranscribing ? "8px" : "16px" }}>
            <textarea className="form-control" placeholder="Type your response here, or click the mic button to answer verbally..." value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} disabled={isThinking || isTranscribing} style={{ paddingRight: "60px", minHeight: "100px" }} />
            <button type="button" className={`btn ${isListening ? "btn-danger" : "btn-secondary"}`} onClick={toggleListening} disabled={isThinking || isTranscribing} style={{ position: "absolute", right: "12px", bottom: "12px", width: "38px", height: "38px", borderRadius: "50%", padding: 0 }} title="Record verbal response">
              {isTranscribing ? <RefreshCw className="animate-spin" size={16} color="var(--color-accent)" /> : <Mic size={16} color={isListening ? "#fff" : "var(--color-accent)"} />}
            </button>
          </div>

          {isTranscribing && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--color-info)", marginBottom: "16px" }}>
              <RefreshCw className="animate-spin" size={14} /> Polishing transcript with Whisper AI...
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            {isVoiceEnabled && isSpeaking && (
              <button className="btn btn-secondary" onClick={() => window.speechSynthesis.cancel()}>Stop Audio</button>
            )}
            <button className="btn btn-primary" onClick={submitAnswer} disabled={isThinking || isTranscribing || !userAnswer.trim()}>
              <Send size={14} /> Submit Answer
            </button>
          </div>
        </div>
      )}

      {/* 4. Scorecard */}
      {scorecard && (
        <div className="card" style={{ borderColor: "var(--color-success)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", borderBottom: "1px solid var(--border-light)", paddingBottom: "12px" }}>
            <div className="card-title" style={{ margin: 0, color: "var(--color-success)" }}>
              <Sparkles size={20} /> Interview Evaluation Scorecard
            </div>
            <button className="btn btn-secondary" onClick={resetInterview}>Start New Session</button>
          </div>

          <div className="grid-3col" style={{ marginBottom: "24px" }}>
            <div className="card" style={{ textAlign: "center", padding: "16px" }}>
              <div className="score-circle-wrapper">
                <svg className="score-circle-svg">
                  <circle className="score-circle-bg" cx="70" cy="70" r="65" />
                  <circle className="score-circle-fill" cx="70" cy="70" r="65" stroke="var(--color-success)" style={{ strokeDashoffset: 408 - (408 * scorecard.overallScore) / 100 }} />
                </svg>
                <div className="score-value" style={{ color: "var(--color-success)" }}>{scorecard.overallScore}</div>
              </div>
              <div style={{ fontSize: "14px", fontWeight: "700" }}>Overall Score</div>
            </div>

            <div className="card" style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "16px", justifyContent: "center" }}>
              {[
                { label: "Technical / Substantive Fit", score: scorecard.technicalScore, color: "var(--color-accent)" },
                { label: "Communication & Confidence", score: scorecard.communicationScore, color: "var(--color-info)" },
                { label: "Answer Structure (STAR)", score: scorecard.structureScore, color: "var(--color-warning)" },
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                    <span>{item.label}</span>
                    <strong>{item.score}%</strong>
                  </div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${item.score}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid-2col" style={{ marginBottom: "32px" }}>
            <div className="card" style={{ borderColor: "rgba(16,185,129,0.25)", backgroundColor: "rgba(16,185,129,0.02)" }}>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--color-success)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle size={16} /> Key Strengths
              </div>
              <ul style={{ paddingLeft: "16px", fontSize: "13px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "8px" }}>
                {scorecard.strengths?.map((str, idx) => <li key={idx}>{str}</li>)}
              </ul>
            </div>

            <div className="card" style={{ borderColor: "rgba(245,158,11,0.25)", backgroundColor: "rgba(245,158,11,0.02)" }}>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--color-warning)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={16} /> Areas for Improvement
              </div>
              <ul style={{ paddingLeft: "16px", fontSize: "13px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "8px" }}>
                {scorecard.improvements?.map((imp, idx) => <li key={idx}>{imp}</li>)}
              </ul>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Award size={18} color="var(--color-info)" /> Question-by-Question Analysis
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {scorecard.questionReviews?.map((review, idx) => (
                <div key={idx} className="card" style={{ padding: "16px", backgroundColor: "rgba(255,255,255,0.01)", border: "1px solid var(--border-light)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--color-info)" }}>
                      Q{idx + 1}: {review.question}
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: review.score >= 80 ? "var(--color-success)" : review.score >= 60 ? "var(--color-warning)" : "var(--color-danger)", backgroundColor: "var(--bg-tertiary)", padding: "2px 8px", borderRadius: "10px", flexShrink: 0 }}>
                      {review.score}/100
                    </div>
                  </div>
                  <div style={{ fontSize: "13px", fontStyle: "italic", color: "var(--text-secondary)", marginBottom: "10px", paddingLeft: "8px", borderLeft: "2px solid var(--border-light)" }}>
                    "{review.answer}"
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    <strong>Feedback:</strong> {review.feedback}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. LiveKit Room MOM Summary */}
      {livekitFeedback && (
        <div className="card" style={{ borderColor: "var(--color-success)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", borderBottom: "1px solid var(--border-light)", paddingBottom: "12px" }}>
            <div className="card-title" style={{ margin: 0, color: "var(--color-success)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={20} /> Minutes of Meeting (MOM) Summary
            </div>
            <button className="btn btn-secondary" onClick={resetInterview}>Start New Session</button>
          </div>

          <div className="card" style={{ padding: "20px", marginBottom: "24px", backgroundColor: "var(--bg-tertiary)", borderColor: "var(--border-light)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px", color: "var(--color-accent)" }}>Meeting Overview</h3>
            <p style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: "1.6", margin: 0 }}>
              {livekitFeedback.summary}
            </p>
          </div>

          <div className="card" style={{ padding: "20px", marginBottom: "24px", borderColor: "var(--border-light)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "12px", color: "var(--color-info)" }}>Key Discussion Points</h3>
            <ul style={{ paddingLeft: "20px", fontSize: "14px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "8px", margin: 0 }}>
              {livekitFeedback.discussionPoints?.map((pt, idx) => (
                <li key={idx} style={{ lineHeight: "1.5" }}>{pt}</li>
              ))}
            </ul>
          </div>

          {livekitFeedback.qaList?.length > 0 && (
            <div className="card" style={{ padding: "20px", marginBottom: "24px", borderColor: "var(--border-light)" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", color: "var(--color-warning)" }}>Questions & Answers</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {livekitFeedback.qaList.map((qa, idx) => (
                  <div key={idx} style={{ padding: "14px", backgroundColor: "var(--bg-tertiary)", borderRadius: "8px", fontSize: "13px", border: "1px solid var(--border-light)" }}>
                    <div style={{ fontWeight: "700", color: "var(--color-info)", marginBottom: "6px" }}>Q: {qa.question}</div>
                    <div style={{ color: "var(--text-primary)", lineHeight: "1.5" }}>A: {qa.answer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {livekitFeedback.actionItems?.length > 0 && (
            <div className="card" style={{ padding: "20px", marginBottom: "24px", borderColor: "rgba(16,185,129,0.25)", backgroundColor: "rgba(16,185,129,0.02)" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "12px", color: "var(--color-success)" }}>Action Items & Next Steps</h3>
              <ul style={{ paddingLeft: "20px", fontSize: "14px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "8px", margin: 0 }}>
                {livekitFeedback.actionItems.map((item, idx) => (
                  <li key={idx} style={{ lineHeight: "1.5" }}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "12px", color: "var(--text-muted)" }}>Meeting Transcript</h3>
            <div style={{ maxHeight: "200px", overflowY: "auto", backgroundColor: "var(--bg-tertiary)", padding: "16px", borderRadius: "12px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6", border: "1px solid var(--border-light)" }}>
              {livekitFeedback.transcript}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
