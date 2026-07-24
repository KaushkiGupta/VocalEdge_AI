import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  Square,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Clock,
  BarChart3,
  Volume2,
  Zap,
  Timer,
  Shuffle,
  Lightbulb,
} from "lucide-react";
import { AudioAnalyser } from "../utils/audioAnalyser";

const apiPost = async (endpoint, payload, backendUrl) => {
  const isFormData = payload instanceof FormData;
  const res = await fetch(`${backendUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
    credentials: "include",
    body: isFormData ? payload : JSON.stringify(payload),
  });
  if (!res.ok) {
    let msg = await res.text();
    try { msg = JSON.parse(msg).error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
};

const FillersBreakdownCard = ({ breakdown }) => (
  breakdown && Object.keys(breakdown).length > 0 ? (
    <div className="card">
      <div className="card-title">
        <AlertCircle size={18} color="var(--color-warning)" /> Filler Words Breakdown
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {Object.entries(breakdown).map(([word, count]) => (
          <div key={word} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 14px", backgroundColor: "var(--color-warning-glow)", borderRadius: "20px", border: "1px solid rgba(245,158,11,0.2)", fontSize: "13px" }}>
            <span style={{ fontWeight: "600", color: "var(--color-warning)" }}>"{word}"</span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>×{count}</span>
          </div>
        ))}
      </div>
    </div>
  ) : null
);

const SuggestionsCard = ({ suggestions }) => (
  suggestions?.length > 0 ? (
    <div className="card">
      <div className="card-title">
        <TrendingUp size={18} color="var(--color-accent)" /> Personalized Suggestions
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {suggestions.map((suggestion, idx) => (
          <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "10px 14px", backgroundColor: "var(--color-accent-glow)", borderRadius: "10px", border: "1px solid rgba(139,92,246,0.15)" }}>
            <Zap size={14} color="var(--color-accent)" style={{ marginTop: "2px", flexShrink: 0 }} />
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>{suggestion}</div>
          </div>
        ))}
      </div>
    </div>
  ) : null
);

const TranscriptCard = ({ transcript }) => (
  transcript ? (
    <div className="card">
      <div className="card-title">
        <Clock size={18} color="var(--text-muted)" /> Original Transcript
      </div>
      <div style={{ backgroundColor: "var(--bg-tertiary)", borderRadius: "10px", padding: "16px", fontSize: "13px", lineHeight: "1.7", color: "var(--text-secondary)", maxHeight: "200px", overflowY: "auto" }}>
        {transcript}
      </div>
    </div>
  ) : null
);

const SuggestedOutlineCard = ({ outline, marginTop = "24px" }) => (
  outline ? (
    <div className="card" style={{ borderColor: "rgba(139,92,246,0.2)", backgroundColor: "rgba(139,92,246,0.01)", marginTop, textAlign: "left", marginBottom: "16px" }}>
      <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--color-accent)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <Lightbulb size={16} /> Recommended Structure: {outline.framework}
      </div>
      <ul style={{ paddingLeft: "16px", margin: 0, fontSize: "12px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "6px" }}>
        {outline.steps?.map((step, idx) => (
          <li key={idx} style={{ lineHeight: "1.4" }}>{step}</li>
        ))}
      </ul>
    </div>
  ) : null
);

export default function PracticeView({ onSessionComplete, backendUrl }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [duration, setDuration] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  const [liveWpm, setLiveWpm] = useState(0);
  const [liveVolume, setLiveVolume] = useState(0);
  const [coachingAlert, setCoachingAlert] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const coachingAlertRef = useRef("");
  const alertDebounceRef = useRef(0);

  const [practiceMode, setPracticeMode] = useState("free");
  const [category, setCategory] = useState("fun");
  const [prepTimeSetting, setPrepTimeSetting] = useState(10);
  const [currentTopic, setCurrentTopic] = useState("");
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [prepCountdown, setPrepCountdown] = useState(0);
  const [isPrepping, setIsPrepping] = useState(false);
  const [showTopicReveal, setShowTopicReveal] = useState(false);
  const [activeFeedbackTab, setActiveFeedbackTab] = useState("opening");
  const [currentOutline, setCurrentOutline] = useState(null);
  const [inputMode, setInputMode] = useState("voice");
  const [textResponse, setTextResponse] = useState("");

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const latestTranscriptRef = useRef("");
  const durationRef = useRef(0);
  const isRecordingRef = useRef(false);
  const accumulatedTranscriptRef = useRef("");
  const recognitionEndResolveRef = useRef(null);

  useEffect(() => () => {
    if (recognitionRef.current) recognitionRef.current.abort();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startWriting = useCallback(() => {
    setError("");
    setAnalysis(null);
    setTranscript("");
    setTextResponse("");
    setDuration(0);
    durationRef.current = 0;
    setShowTopicReveal(false);

    if (timerRef.current) clearInterval(timerRef.current);
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setDuration(elapsed);
      durationRef.current = elapsed;
    }, 1000);
  }, []);

  const runAnalysis = useCallback(async (textToAnalyze, speechDuration) => {
    if (!textToAnalyze?.trim()) {
      setError(inputMode === "text" ? "Please enter your response before analyzing." : "No speech detected. Please record some speech first.");
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setIsAnalyzing(true);
    setError("");

    try {
      const isImpromptu = practiceMode === "impromptu";
      const endpoint = isImpromptu ? "/api/table-topics/analyze" : "/api/analyze-speech";
      const payload = isImpromptu
        ? { topic: currentTopic, transcript: textToAnalyze.trim(), duration: speechDuration || duration || 30 }
        : { transcript: textToAnalyze.trim(), duration: speechDuration || duration || 30 };

      const data = await apiPost(endpoint, payload, backendUrl);
      setAnalysis(data.session);
      if (onSessionComplete) onSessionComplete(data.gamification);
    } catch (err) {
      setError("Analysis failed. Please try again. Details: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [practiceMode, backendUrl, currentTopic, duration, inputMode, onSessionComplete]);

  const startRecording = useCallback(async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      setShowTopicReveal(false);
      return;
    }

    setError("");
    setAnalysis(null);
    setTranscript("");
    setDuration(0);
    latestTranscriptRef.current = "";
    accumulatedTranscriptRef.current = "";
    durationRef.current = 0;
    coachingAlertRef.current = "";
    alertDebounceRef.current = 0;
    isRecordingRef.current = true;
    setIsRecording(true);
    setShowTopicReveal(false);

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {
      setError("Microphone access denied. Please allow microphone access in your browser settings.");
      isRecordingRef.current = false;
      setIsRecording(false);
      setShowTopicReveal(false);
      return;
    }

    const analyser = new AudioAnalyser();
    const success = await analyser.start();
    if (success) {
      analyserRef.current = analyser;
      const DEBOUNCE_FRAMES = 30;
      const checkVolume = () => {
        if (!analyserRef.current) return;
        const vol = analyser.getVolume();
        setLiveVolume(Math.round(vol * 200));
        const currentWords = latestTranscriptRef.current.trim().split(/\s+/).filter(Boolean).length;
        const currentElapsedMinutes = (durationRef.current || 1) / 60;
        const currentWpm = Math.round(currentWords / currentElapsedMinutes);
        setLiveWpm(currentWpm);

        let desiredAlert = "";
        if (currentWpm > 165) desiredAlert = "Slow down! You are speaking too quickly.";
        else if (currentWpm > 0 && currentWpm < 100 && durationRef.current > 6) desiredAlert = "Speed up a bit. Speak with higher momentum.";
        else if (vol < 0.005 && durationRef.current > 5) desiredAlert = "Volume too low! Speak directly into the microphone.";

        if (desiredAlert !== coachingAlertRef.current) {
          alertDebounceRef.current++;
          if (alertDebounceRef.current >= DEBOUNCE_FRAMES) {
            coachingAlertRef.current = desiredAlert;
            setCoachingAlert(desiredAlert);
            alertDebounceRef.current = 0;
          }
        } else {
          alertDebounceRef.current = 0;
        }
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };
      animationFrameRef.current = requestAnimationFrame(checkVolume);
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(audioStream);
      audioChunksRef.current = [];
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
      const fullText = accumulatedTranscriptRef.current + finalTranscript + interimTranscript;
      setTranscript(fullText);
      latestTranscriptRef.current = fullText;
    };

    recognition.onerror = (event) => {
      if (event.error !== "no-speech") console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        accumulatedTranscriptRef.current = latestTranscriptRef.current;
        try { recognition.start(); } catch (err) { console.error("Speech recognition restart failed:", err); }
      } else if (recognitionEndResolveRef.current) {
        recognitionEndResolveRef.current();
        recognitionEndResolveRef.current = null;
      }
    };

    recognition.start();
    recognitionRef.current = recognition;

    const startTime = Date.now() - (durationRef.current * 1000);
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setDuration(elapsed);
      durationRef.current = elapsed;
    }, 1000);
  }, []);

  useEffect(() => {
    let interval;
    if (isPrepping) {
      interval = setInterval(() => {
        setPrepCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsPrepping(false);
            if (inputMode === "voice") startRecording();
            else startWriting();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPrepping, prepCountdown, inputMode, startRecording, startWriting]);

  const stopRecording = useCallback(async () => {
    isRecordingRef.current = false;
    setIsRecording(false);

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (analyserRef.current) {
      analyserRef.current.stop();
      analyserRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);

    const recognitionEndPromise = recognitionRef.current
      ? Promise.race([
          new Promise((resolve) => {
            recognitionEndResolveRef.current = resolve;
            try { recognitionRef.current.stop(); } catch { resolve(); }
          }),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ])
      : Promise.resolve();

    const mediaRecorderPromise = (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive")
      ? new Promise((resolve) => {
          mediaRecorderRef.current.onstop = () => resolve(new Blob(audioChunksRef.current, { type: "audio/webm" }));
          mediaRecorderRef.current.stop();
        })
      : Promise.resolve(null);

    const [, audioBlob] = await Promise.all([recognitionEndPromise, mediaRecorderPromise]);
    const finalDuration = durationRef.current;
    const browserTranscript = latestTranscriptRef.current.trim();

    if (audioBlob && audioBlob.size > 1000) {
      setIsAnalyzing(true);
      setError("Polishing transcript with Whisper AI...");
      try {
        const fd = new FormData();
        fd.append("audio", audioBlob, "recording.webm");
        const data = await apiPost("/api/transcribe-whisper", fd, backendUrl);
        if (data.transcript?.trim()) {
          setTranscript(data.transcript);
          latestTranscriptRef.current = data.transcript;
          setError("");
          runAnalysis(data.transcript, finalDuration);
          return;
        }
      } catch (err) {
        console.warn("Whisper transcription failed, falling back to browser STT:", err.message);
      }
    }

    if (browserTranscript) {
      setError("");
      setTranscript(browserTranscript);
      runAnalysis(browserTranscript, finalDuration);
    } else {
      setIsAnalyzing(false);
      setError("No speech was detected. Please ensure your microphone is working and try speaking louder.");
    }
  }, [runAnalysis, backendUrl]);

  const startImpromptuPrep = async () => {
    setError("");
    setAnalysis(null);
    setTranscript("");
    setDuration(0);
    setIsGeneratingTopic(true);
    setCurrentTopic("");
    setCurrentOutline(null);
    setShowTopicReveal(false);
    setIsPrepping(false);

    try {
      const data = await apiPost("/api/table-topics/generate", { category }, backendUrl);
      setCurrentTopic(data.topic);
      setCurrentOutline(data.suggestedOutline);
      setShowTopicReveal(true);
      setIsPrepping(true);
      setPrepCountdown(prepTimeSetting);
    } catch (err) {
      setError("Failed to generate topic: " + err.message);
    } finally {
      setIsGeneratingTopic(false);
    }
  };

  const resetPractice = () => {
    setTranscript("");
    setTextResponse("");
    setDuration(0);
    setAnalysis(null);
    setError("");
    setCurrentTopic("");
    setCurrentOutline(null);
    setIsPrepping(false);
    setPrepCountdown(0);
    setShowTopicReveal(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;

  const getScoreColor = (score) => {
    if (score >= 75) return "var(--color-success)";
    if (score >= 50) return "var(--color-warning)";
    return "var(--color-danger)";
  };

  const getPacingVibe = (secs) => {
    if (secs < 60) return { text: "Too short (Keep speaking)", color: "var(--color-danger)", progress: (secs / 60) * 50 };
    if (secs < 90) return { text: "Qualified (Good length)", color: "var(--color-success)", progress: 50 + ((secs - 60) / 30) * 25 };
    if (secs <= 120) return { text: "Target length reached", color: "var(--color-warning)", progress: 75 + ((secs - 90) / 30) * 25 };
    return { text: "Over time! Wrap up now", color: "var(--color-danger)", progress: 100 };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", backgroundColor: "var(--color-danger-glow)", border: "1px solid var(--color-danger)", borderRadius: "10px", color: "var(--text-primary)", fontSize: "13px" }}>
          <AlertCircle size={16} color="var(--color-danger)" />
          <span>{error}</span>
        </div>
      )}

      {!analysis && !isRecording && !isPrepping && !showTopicReveal && (
        <div className="practice-mode-toggle" style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
          <button type="button" className={`btn ${practiceMode === "free" ? "btn-primary" : "btn-secondary"}`} onClick={() => setPracticeMode("free")} style={{ flex: 1 }}>
            <Mic size={16} /> Free Practice
          </button>
          <button type="button" className={`btn ${practiceMode === "impromptu" ? "btn-primary" : "btn-secondary"}`} onClick={() => setPracticeMode("impromptu")} style={{ flex: 1 }}>
            <Timer size={16} /> Impromptu Challenge
          </button>
        </div>
      )}

      {!analysis && !isRecording && !isPrepping && !showTopicReveal && practiceMode === "impromptu" && (
        <>
          <div className="card" style={{ borderRadius: "24px", border: "1px solid var(--border-light)" }}>
            <div className="card-title" style={{ fontSize: "16px", color: "var(--text-primary)", fontWeight: "800" }}>
              <Timer size={20} color="var(--color-accent)" /> Impromptu Table Topics Board
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
              Test your quick-thinking and impromptu structure skills! Choose a category board and prep time. The AI will generate a prompt, give you prep time, and start recording automatically.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "24px" }}>
              <div className="form-group">
                <label className="form-label" style={{ marginBottom: "12px", display: "block" }}>Select Speaking Category Board</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {[
                    { id: "fun", label: "🎉 Fun & Quirky", color: "var(--color-accent)", glow: "var(--color-accent-glow)" },
                    { id: "professional", label: "💼 Professional & Career", color: "var(--color-info)", glow: "var(--color-info-glow)" },
                    { id: "philosophical", label: "🧠 Philosophical & Deep", color: "var(--color-success)", glow: "var(--color-success-glow)" },
                    { id: "crisis", label: "🚨 PR Crisis Management", color: "var(--color-warning)", glow: "var(--color-warning-glow)" },
                  ].map((item) => (
                    <button type="button" key={item.id} className="pinterest-chip" onClick={() => setCategory(item.id)} style={{ padding: "10px 18px", borderRadius: "30px", border: "1px solid", borderColor: category === item.id ? item.color : "var(--border-light)", backgroundColor: category === item.id ? item.glow : "var(--bg-card)", color: category === item.id ? item.color : "var(--text-secondary)", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: category === item.id ? `0 4px 12px ${item.glow}` : "none", transition: "all var(--transition-fast)" }}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ marginBottom: "12px", display: "block" }}>Reflect Time (Prep duration)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {[
                    { value: 10, label: "⚡ 10 Seconds" },
                    { value: 20, label: "⏳ 20 Seconds" },
                    { value: 30, label: "🧠 30 Seconds" },
                  ].map((item) => (
                    <button type="button" key={item.value} className="pinterest-chip" onClick={() => setPrepTimeSetting(item.value)} style={{ flex: "1 1 100px", padding: "10px 16px", borderRadius: "30px", border: "1px solid", borderColor: prepTimeSetting === item.value ? "var(--color-accent)" : "var(--border-light)", backgroundColor: prepTimeSetting === item.value ? "var(--color-accent-glow)" : "var(--bg-card)", color: prepTimeSetting === item.value ? "var(--color-accent)" : "var(--text-secondary)", fontSize: "13px", fontWeight: "700", cursor: "pointer", boxShadow: prepTimeSetting === item.value ? "0 4px 12px var(--color-accent-glow)" : "none", transition: "all var(--transition-fast)" }}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ marginBottom: "12px", display: "block" }}>Practice Input Method</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {[
                    { id: "voice", label: "🎙️ Live Speaking (Microphone)" },
                    { id: "text", label: "✍️ Written Practice (Keyboard)" },
                  ].map((item) => (
                    <button type="button" key={item.id} className="pinterest-chip" onClick={() => setInputMode(item.id)} style={{ flex: "1 1 180px", padding: "10px 16px", borderRadius: "30px", border: "1px solid", borderColor: inputMode === item.id ? "var(--color-accent)" : "var(--border-light)", backgroundColor: inputMode === item.id ? "var(--color-accent-glow)" : "var(--bg-card)", color: inputMode === item.id ? "var(--color-accent)" : "var(--text-secondary)", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", boxShadow: inputMode === item.id ? "0 4px 12px var(--color-accent-glow)" : "none", transition: "all var(--transition-fast)" }}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button type="button" className="btn btn-primary" style={{ width: "100%", borderRadius: "30px", padding: "12px 24px" }} onClick={startImpromptuPrep} disabled={isGeneratingTopic}>
              {isGeneratingTopic ? <><RefreshCw className="animate-spin" size={16} /> Preparing topic board...</> : <><Shuffle size={16} /> Generate Impromptu Topic</>}
            </button>
          </div>

          <div className="card" style={{ borderColor: "rgba(255,255,255,0.05)", borderRadius: "24px" }}>
            <div className="card-title" style={{ fontSize: "16px", color: "var(--text-primary)", fontWeight: "800" }}>
              <Lightbulb size={18} color="var(--color-warning)" /> Impromptu Framework Boards
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "20px" }}>
              Review these structures to organize thoughts instantly on any random prompt:
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "16px" }}>
              {[
                { tag: "Structure", tagColor: "var(--color-accent)", icon: "🎯", title: "The P.R.E.P. Method", steps: ["Point: State your stance.", "Reason: Explain your logic.", "Example: Share a brief scenario.", "Point: Restate your position."] },
                { tag: "Story", tagColor: "var(--color-info)", icon: "⏳", title: "Past - Present - Future", steps: ["Past: How it used to be.", "Present: How it manifests today.", "Future: What is next."] },
                { tag: "Pivot", tagColor: "var(--color-warning)", icon: "🔀", title: "The Bridge Technique", steps: ["Acknowledge: Address prompt.", 'Bridge: "This connects to..."', "Pivot: Transition to comfortable grounds."] },
              ].map((fw) => (
                <div key={fw.title} className="pinterest-pin" style={{ padding: "20px", backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border-light)", borderRadius: "20px", display: "flex", flexDirection: "column", gap: "12px", cursor: "default" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: fw.tagColor, backgroundColor: `${fw.tagColor}1f`, padding: "4px 10px", borderRadius: "12px", fontWeight: "700" }}>{fw.tag}</span>
                    <span style={{ fontSize: "14px" }}>{fw.icon}</span>
                  </div>
                  <div style={{ fontWeight: "800", fontSize: "15px", color: "var(--text-primary)" }}>{fw.title}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                    {fw.steps.map((st, i) => <span key={i}>{st}<br /></span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!analysis && !isAnalyzing && (!showTopicReveal || isRecording) && (practiceMode === "free" || isRecording || (practiceMode === "impromptu" && !isPrepping && currentTopic)) && (
        <div className="card">
          <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {inputMode === "voice" ? <Mic size={20} color="var(--color-accent)" /> : <Zap size={20} color="var(--color-accent)" />}
              <span>{practiceMode === "impromptu" ? (inputMode === "voice" ? "Impromptu Speech Recording" : "Impromptu Written Response") : (inputMode === "voice" ? "Speech Practice Session" : "Written Practice Session")}</span>
            </div>
          </div>

          {practiceMode === "impromptu" ? (
            <div style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px", padding: "12px 16px", backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border-light)", borderRadius: "8px" }}>
              <strong>Topic Prompt:</strong> "{currentTopic}"
            </div>
          ) : (
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
              {inputMode === "voice" ? "Record yourself speaking on any topic. Groq AI will evaluate your grammar, clarity, confidence, tone, speaking pace, and filler word usage." : "Type or paste your speech response on any topic. Groq AI will evaluate your grammar, vocabulary, clarity, tone, and content structure."}
            </p>
          )}

          {!isRecording && !isPrepping && (
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              {[
                { id: "voice", label: "🎙️ Speak Response (Microphone)" },
                { id: "text", label: "✍️ Type Response (Keyboard)" },
              ].map((mode) => (
                <button
                  type="button"
                  key={mode.id}
                  className={`btn ${inputMode === mode.id ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => {
                    setInputMode(mode.id);
                    setError("");
                    if (mode.id === "text" && practiceMode === "impromptu" && !timerRef.current) startWriting();
                  }}
                  style={{ flex: 1, padding: "8px 12px", fontSize: "12px", borderRadius: "20px", fontWeight: "700", backgroundColor: inputMode === mode.id ? "var(--color-accent)" : "rgba(255, 255, 255, 0.03)", borderColor: inputMode === mode.id ? "var(--color-accent)" : "var(--border-light)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          )}

          {inputMode === "voice" ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", padding: "32px 0" }}>
              {isRecording && (
                <div style={{ width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "10px", padding: "14px", backgroundColor: "var(--bg-tertiary)", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-secondary)" }}>
                    <span>Pacing: <strong>{liveWpm} WPM</strong></span>
                    <span>Volume: <strong>{liveVolume}%</strong></span>
                  </div>
                  <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(0,0,0,0.15)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(liveVolume, 100)}%`, height: "100%", backgroundColor: "var(--color-accent)", transition: "width 0.1s ease" }} />
                  </div>
                  {coachingAlert && (
                    <div style={{ padding: "6px 10px", borderRadius: "6px", backgroundColor: "rgba(217, 119, 6, 0.12)", border: "1px solid rgba(217, 119, 6, 0.3)", color: "var(--color-warning)", fontSize: "11px", fontWeight: "700", textAlign: "center" }}>
                      ⚠️ {coachingAlert}
                    </div>
                  )}
                </div>
              )}

              <div style={{ fontFamily: "var(--font-mono)", fontSize: "32px", fontWeight: "700", color: isRecording ? "var(--color-danger)" : "var(--text-secondary)" }}>
                {formatTime(duration)}
              </div>

              <button type="button" className={`btn ${isRecording ? "btn-danger" : "btn-primary"}`} onClick={isRecording ? stopRecording : startRecording} style={{ width: "64px", height: "64px", borderRadius: "50%", padding: 0, fontSize: "20px" }}>
                {isRecording ? <Square size={24} /> : <Mic size={24} />}
              </button>

              <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                {isRecording ? "Recording... Click to stop" : "Click to start recording"}
              </div>

              {practiceMode === "impromptu" && isRecording && (
                <div style={{ width: "100%", maxWidth: "400px", marginTop: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                    <span style={{ color: getPacingVibe(duration).color, fontWeight: "700" }}>{getPacingVibe(duration).text}</span>
                    <span style={{ color: "var(--text-muted)" }}>Goal: 1:00 - 2:00</span>
                  </div>
                  <div style={{ width: "100%", height: "8px", backgroundColor: "var(--bg-tertiary)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${getPacingVibe(duration).progress}%`, height: "100%", backgroundColor: getPacingVibe(duration).color, transition: "width 0.5s ease, background-color 0.5s ease" }} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px", padding: "16px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Draft your response below:</span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-mono)", fontSize: "14px", color: "var(--text-secondary)" }}>
                  <Clock size={14} /> {formatTime(duration)}
                </div>
              </div>

              <textarea
                value={textResponse}
                onChange={(e) => {
                  setTextResponse(e.target.value);
                  if (duration === 0 && !timerRef.current) {
                    const startTime = Date.now();
                    timerRef.current = setInterval(() => {
                      const elapsed = Math.floor((Date.now() - startTime) / 1000);
                      setDuration(elapsed);
                      durationRef.current = elapsed;
                    }, 1000);
                  }
                }}
                placeholder="Type or paste your impromptu speech response here. We'll analyze it just like a spoken transcript..."
                style={{ width: "100%", height: "220px", backgroundColor: "rgba(0,0,0,0.25)", color: "var(--text-primary)", border: "1px solid var(--border-light)", borderRadius: "16px", padding: "16px", fontSize: "14px", lineHeight: "1.6", resize: "vertical", outline: "none", fontFamily: "inherit" }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)" }}>
                <span>Words: {textResponse.trim() ? textResponse.trim().split(/\s+/).length : 0}</span>
                <span>Characters: {textResponse.length}</span>
              </div>
            </div>
          )}

          <SuggestedOutlineCard outline={practiceMode === "impromptu" ? currentOutline : null} marginTop="16px" />

          {inputMode === "voice" && transcript && (
            <div style={{ marginTop: "16px" }}>
              <label className="form-label">Live Transcript</label>
              <div style={{ backgroundColor: "rgba(0,0,0,0.2)", borderRadius: "10px", padding: "16px", border: "1px solid var(--border-light)", fontSize: "14px", lineHeight: "1.7", maxHeight: "200px", overflowY: "auto", color: "var(--text-secondary)" }}>
                {transcript}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", marginTop: "16px", justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={resetPractice}>
              <RefreshCw size={14} /> Reset
            </button>
            <button type="button" className="btn btn-primary" onClick={() => runAnalysis(inputMode === "text" ? textResponse : transcript)} disabled={isAnalyzing || isRecording || (inputMode === "text" && !textResponse.trim())}>
              {isAnalyzing ? <><RefreshCw size={14} className="animate-spin" /> Analyzing...</> : <><BarChart3 size={14} /> Analyze {inputMode === "text" ? "Response" : "Speech"}</>}
            </button>
          </div>
        </div>
      )}

      {/* Topic Reveal & Prep Card */}
      {!analysis && !isAnalyzing && !isRecording && showTopicReveal && practiceMode === "impromptu" && (
        <div className="card" style={{ borderColor: "var(--color-accent)", textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px" }}>
            Your Impromptu Prompt
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)", lineHeight: "1.5", marginBottom: "32px", padding: "0 16px" }}>
            "{currentTopic}"
          </div>

          {isPrepping ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              <div className="countdown-ring" style={{ position: "relative", width: "90px", height: "90px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", borderRadius: "50%", border: "4px solid var(--color-accent)", animation: "ping 1.5s infinite", opacity: 0.15 }}></div>
                <div style={{ margin: "auto", fontSize: "36px", fontWeight: "900", color: "var(--color-accent)" }}>{prepCountdown}</div>
              </div>
              <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>seconds of preparation time remaining...</div>
              <button type="button" className="btn btn-secondary" style={{ marginTop: "12px" }} onClick={() => { setIsPrepping(false); if (inputMode === "voice") startRecording(); else startWriting(); }}>
                {inputMode === "voice" ? "Start Speaking Now" : "Start Writing Now"}
              </button>
            </div>
          ) : (
            <div style={{ fontSize: "14px", color: "var(--color-success)" }}>
              {inputMode === "voice" ? "Recording active!" : "Writing active!"}
            </div>
          )}

          <SuggestedOutlineCard outline={currentOutline} marginTop="24px" />
        </div>
      )}

      {/* Analysis Loading Spinner */}
      {isAnalyzing && (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <RefreshCw className="animate-spin" size={48} color="var(--color-accent)" style={{ marginBottom: "20px" }} />
          <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>Analyzing Your Speech...</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Groq AI is evaluating your structure, relevance, pacing, and grammar metrics. Please wait a moment.
          </p>
        </div>
      )}

      {/* Impromptu Speech Scorecard */}
      {analysis?.isTableTopics && (
        <>
          <div className="card" style={{ borderColor: "var(--color-success)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div className="card-title" style={{ margin: 0, color: "var(--color-success)" }}>
                <CheckCircle size={20} /> Impromptu Speech Scorecard
              </div>
              <button type="button" className="btn btn-secondary" onClick={resetPractice}>
                <RefreshCw size={14} /> New Session
              </button>
            </div>

            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "24px", padding: "12px 16px", backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border-light)", borderRadius: "8px" }}>
              <strong>Topic Prompt:</strong> "{analysis.tableTopicsMetadata?.topic}"
            </div>

            <div className="grid-3col" style={{ marginBottom: "24px" }}>
              {[
                { label: "Structure", sub: "Opening, Body, Conclusion", score: analysis.tableTopicsMetadata?.structureScore },
                { label: "Relevance", sub: "Addressed the prompt directly", score: analysis.tableTopicsMetadata?.relevanceScore },
                { label: "Delivery", sub: "Pacing, Tone & Flow", score: analysis.tableTopicsMetadata?.deliveryScore },
              ].map((item) => (
                <div key={item.label} style={{ textAlign: "center", padding: "16px", backgroundColor: "var(--bg-tertiary)", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
                  <div style={{ fontSize: "28px", fontWeight: "800", color: getScoreColor(item.score) }}>{item.score}</div>
                  <div style={{ fontSize: "12px", fontWeight: "700", marginTop: "4px" }}>{item.label}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{item.sub}</div>
                </div>
              ))}
            </div>

            <div className="grid-4col" style={{ marginBottom: "24px" }}>
              <div style={{ textAlign: "center", padding: "12px", backgroundColor: "rgba(0,0,0,0.08)", borderRadius: "8px" }}>
                <div style={{ fontSize: "20px", fontWeight: "800", color: getScoreColor(analysis.clarityScore) }}>{analysis.clarityScore}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Clarity</div>
              </div>
              <div style={{ textAlign: "center", padding: "12px", backgroundColor: "rgba(0,0,0,0.08)", borderRadius: "8px" }}>
                <div style={{ fontSize: "20px", fontWeight: "800", color: getScoreColor(analysis.confidenceScore) }}>{analysis.confidenceScore}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Confidence</div>
              </div>
              <div style={{ textAlign: "center", padding: "12px", backgroundColor: "rgba(0,0,0,0.08)", borderRadius: "8px" }}>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--color-info)" }}>{analysis.wpm}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Words/Min</div>
              </div>
              <div style={{ textAlign: "center", padding: "12px", backgroundColor: "rgba(0,0,0,0.08)", borderRadius: "8px" }}>
                <div style={{ fontSize: "20px", fontWeight: "800", color: analysis.fillerCount > 5 ? "var(--color-danger)" : "var(--color-success)" }}>{analysis.fillerCount}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Filler Words</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", backgroundColor: "var(--color-info-glow)", borderRadius: "10px", border: "1px solid rgba(6,182,212,0.2)" }}>
              <Volume2 size={16} color="var(--color-info)" />
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Speech Delivery Vibe</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-info)" }}>{analysis.toneAnalysis}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="practice-feedback-tabs" style={{ display: "flex", borderBottom: "1px solid var(--border-light)", marginBottom: "20px" }}>
              {[
                { id: "opening", label: "🎯 Opening Hook" },
                { id: "body", label: "💬 Body & Arguments" },
                { id: "conclusion", label: "🏁 Conclusion & Wrap" },
                { id: "relevance", label: "🔍 Relevance Critique" },
                { id: "pivot", label: "💡 Pivot Guide (Alternative)" },
                { id: "exemplarSpeech", label: "🎙️ Model Speech Script" },
              ].map((tab) => (
                <button type="button" key={tab.id} onClick={() => setActiveFeedbackTab(tab.id)} style={{ padding: "12px 16px", backgroundColor: "transparent", border: "none", borderBottom: activeFeedbackTab === tab.id ? "2px solid var(--color-accent)" : "none", color: activeFeedbackTab === tab.id ? "var(--color-accent)" : "var(--text-secondary)", fontWeight: activeFeedbackTab === tab.id ? "700" : "500", cursor: "pointer", transition: "all 0.2s", fontSize: "13px" }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--text-secondary)" }}>
              {activeFeedbackTab === "opening" && <div><h4 style={{ color: "var(--color-accent)", margin: "0 0 8px 0", fontSize: "15px" }}>Opening Hook Analysis</h4><p>{analysis.tableTopicsMetadata?.openingAnalysis}</p></div>}
              {activeFeedbackTab === "body" && <div><h4 style={{ color: "var(--color-accent)", margin: "0 0 8px 0", fontSize: "15px" }}>Body & Argument Analysis</h4><p>{analysis.tableTopicsMetadata?.bodyAnalysis}</p></div>}
              {activeFeedbackTab === "conclusion" && <div><h4 style={{ color: "var(--color-accent)", margin: "0 0 8px 0", fontSize: "15px" }}>Conclusion Analysis</h4><p>{analysis.tableTopicsMetadata?.conclusionAnalysis}</p></div>}
              {activeFeedbackTab === "relevance" && <div><h4 style={{ color: "var(--color-accent)", margin: "0 0 8px 0", fontSize: "15px" }}>Topic Relevance Critique</h4><p>{analysis.tableTopicsMetadata?.relevanceAnalysis}</p></div>}
              {activeFeedbackTab === "pivot" && (
                <div style={{ padding: "12px 16px", backgroundColor: "rgba(139,92,246,0.05)", borderRadius: "8px", border: "1px solid rgba(139,92,246,0.15)" }}>
                  <h4 style={{ color: "var(--color-accent)", margin: "0 0 8px 0", fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Lightbulb size={16} /> Impromptu Pivot Strategy
                  </h4>
                  <p style={{ fontStyle: "italic", margin: 0 }}>{analysis.tableTopicsMetadata?.redirectionAdvice}</p>
                </div>
              )}
              {activeFeedbackTab === "exemplarSpeech" && (
                <div>
                  <h4 style={{ color: "var(--color-accent)", margin: "0 0 12px 0", fontSize: "15px" }}>Model Speech Script (Exemplar)</h4>
                  <div style={{ backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border-light)", borderRadius: "12px", padding: "20px", fontStyle: "italic", lineHeight: "1.7", color: "var(--text-secondary)", whiteSpace: "pre-line", marginBottom: "16px" }}>
                    {analysis.tableTopicsMetadata?.exemplarSpeech || "No exemplar script generated."}
                  </div>
                  <button type="button" className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "12px", borderRadius: "20px", marginLeft: "auto" }} onClick={() => { navigator.clipboard.writeText(analysis.tableTopicsMetadata?.exemplarSpeech || ""); alert("Speech script copied to clipboard!"); }}>
                    📋 Copy Script
                  </button>
                </div>
              )}
            </div>
          </div>

          <FillersBreakdownCard breakdown={analysis.fillersBreakdown} />
          <SuggestionsCard suggestions={analysis.suggestions} />
          <TranscriptCard transcript={analysis.transcript} />
        </>
      )}

      {/* Standard Speech Results */}
      {analysis && !analysis.isTableTopics && (
        <>
          <div className="card" style={{ borderColor: "var(--color-success)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div className="card-title" style={{ margin: 0, color: "var(--color-success)" }}>
                <CheckCircle size={20} /> Speech Analysis Results
              </div>
              <button type="button" className="btn btn-secondary" onClick={resetPractice}>
                <RefreshCw size={14} /> New Session
              </button>
            </div>

            <div className="grid-4col" style={{ marginBottom: "24px" }}>
              <div style={{ textAlign: "center", padding: "16px", backgroundColor: "var(--bg-tertiary)", borderRadius: "12px" }}>
                <div style={{ fontSize: "28px", fontWeight: "800", color: getScoreColor(analysis.clarityScore) }}>{analysis.clarityScore}</div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>Clarity</div>
              </div>
              <div style={{ textAlign: "center", padding: "16px", backgroundColor: "var(--bg-tertiary)", borderRadius: "12px" }}>
                <div style={{ fontSize: "28px", fontWeight: "800", color: getScoreColor(analysis.confidenceScore) }}>{analysis.confidenceScore}</div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>Confidence</div>
              </div>
              <div style={{ textAlign: "center", padding: "16px", backgroundColor: "var(--bg-tertiary)", borderRadius: "12px" }}>
                <div style={{ fontSize: "28px", fontWeight: "800", color: "var(--color-info)" }}>{analysis.wpm}</div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>Words/Min</div>
              </div>
              <div style={{ textAlign: "center", padding: "16px", backgroundColor: "var(--bg-tertiary)", borderRadius: "12px" }}>
                <div style={{ fontSize: "28px", fontWeight: "800", color: analysis.fillerCount > 5 ? "var(--color-danger)" : "var(--color-success)" }}>{analysis.fillerCount}</div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>Filler Words</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", backgroundColor: "var(--color-info-glow)", borderRadius: "10px", border: "1px solid rgba(6,182,212,0.2)", marginBottom: "20px" }}>
              <Volume2 size={16} color="var(--color-info)" />
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Tone Analysis</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-info)" }}>{analysis.toneAnalysis}</div>
              </div>
            </div>
          </div>

          <FillersBreakdownCard breakdown={analysis.fillersBreakdown} />

          {analysis.grammarIssues?.length > 0 && (
            <div className="card">
              <div className="card-title">
                <AlertCircle size={18} color="var(--color-danger)" /> Inline Grammar Corrections & Comparative Diff
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {analysis.grammarIssues.map((issue, idx) => (
                  <div key={idx} style={{ padding: "16px", backgroundColor: "var(--bg-tertiary)", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
                    <div className="grammar-diff-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
                      <div style={{ padding: "12px", borderRadius: "8px", border: "1px solid rgba(220,38,38,0.2)", backgroundColor: "rgba(220,38,38,0.02)" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--color-danger)", display: "block", marginBottom: "6px" }}>Original Text</span>
                        <span style={{ fontSize: "13px", color: "var(--text-primary)", textDecoration: "line-through" }}>"{issue.original}"</span>
                      </div>
                      <div style={{ padding: "12px", borderRadius: "8px", border: "1px solid rgba(34,133,74,0.2)", backgroundColor: "rgba(34,133,74,0.02)" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--color-success)", display: "block", marginBottom: "6px" }}>Corrected Grammar</span>
                        <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: "600" }}>"{issue.correction}"</span>
                      </div>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", gap: "6px" }}>
                      <strong>Coaching Note:</strong> {issue.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <SuggestionsCard suggestions={analysis.suggestions} />
          <TranscriptCard transcript={analysis.transcript} />
        </>
      )}
    </div>
  );
}
