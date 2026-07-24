import { useState, useRef, useEffect } from "react";
import {
  Video,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  AlertCircle,
  FileText,
  CheckCircle,
  Eye,
  Camera,
  CameraOff,
  User,
  Sparkles,
  Flame,
  TrendingUp,
} from "lucide-react";

export default function PresentationView() {
  const [script, setScript] = useState(
    "Introduce yourself briefly: Hello, my name is... and I am a... I specialize in... and have experience with... Recently, I have worked on projects like... I am looking to bring my skills in... to your team. Thank you!",
  );
  const [error, setError] = useState("");

  // Teleprompter states
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(5); // 1-10 range
  const teleprompterRef = useRef(null);
  const scrollIntervalRef = useRef(null);

  // Webcam & FaceMesh states
  const [cameraActive, setCameraActive] = useState(false);
  const [metrics, setMetrics] = useState({
    eyeContact: 95,
    posture: 98,
    engagement: 85,
    attention: 90,
    confidenceScore: 92,
  });
  const [coachingAlert, setCoachingAlert] = useState("");
  const [confidenceBoostActive, setConfidenceBoostActive] = useState(false);
  const [confidenceStreak, setConfidenceStreak] = useState(0);
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(() => !!(window.FaceMesh && window.Camera));

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const localStreamRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraHelperRef = useRef(null);
  const metricsIntervalRef = useRef(null);

  // Load MediaPipe scripts on mount
  useEffect(() => {
    if (window.FaceMesh && window.Camera) {
      return;
    }

    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        setModelsLoaded(true);
      }
    };

    const script1 = document.createElement("script");
    script1.src = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";
    script1.async = true;
    script1.onload = checkLoaded;
    document.body.appendChild(script1);

    const script2 = document.createElement("script");
    script2.src = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";
    script2.async = true;
    script2.onload = checkLoaded;
    document.body.appendChild(script2);
  }, []);

  // Monitor Confidence Streak & Play Sound Chimes
  useEffect(() => {
    if (!cameraActive || !confidenceBoostActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Expected design: reset streak values immediately when camera is toggled or feature is off
      setConfidenceStreak(0);
      return;
    }
    const currentConf = Math.round((metrics.eyeContact * 0.4) + (metrics.posture * 0.3) + (metrics.engagement * 0.3));
    if (currentConf >= 85) {
      const timer = setTimeout(() => {
        setConfidenceStreak((prev) => {
          const next = prev + 1;
          if (next > 0 && next % 5 === 0) {
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              const oscillator = audioCtx.createOscillator();
              const gainNode = audioCtx.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioCtx.destination);
              oscillator.type = "sine";
              oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
              oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12); // E5
              oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.24); // G5
              gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
              oscillator.start();
              oscillator.stop(audioCtx.currentTime + 0.5);
            } catch (e) {
              console.log("Audio not initialized:", e);
            }
          }
          return next;
        });
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setConfidenceStreak(0);
    }
  }, [metrics.eyeContact, metrics.posture, metrics.engagement, confidenceBoostActive, cameraActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(scrollIntervalRef.current);
      clearInterval(metricsIntervalRef.current);
      if (cameraHelperRef.current) {
        cameraHelperRef.current.stop();
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Handle Teleprompter Auto-Scroll
  useEffect(() => {
    if (isScrolling) {
      const intervalSpeed = 100 - scrollSpeed * 8;
      scrollIntervalRef.current = setInterval(() => {
        if (teleprompterRef.current) {
          teleprompterRef.current.scrollTop += 1;
          if (
            teleprompterRef.current.scrollTop +
              teleprompterRef.current.clientHeight >=
            teleprompterRef.current.scrollHeight
          ) {
            teleprompterRef.current.scrollTop = 0;
          }
        }
      }, intervalSpeed);
    } else {
      clearInterval(scrollIntervalRef.current);
    }
    return () => clearInterval(scrollIntervalRef.current);
  }, [isScrolling, scrollSpeed]);

  const resetTeleprompter = () => {
    setIsScrolling(false);
    if (teleprompterRef.current) {
      teleprompterRef.current.scrollTop = 0;
    }
  };

  // FaceMesh coordinates processing
  const onFaceMeshResults = (results) => {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      setCoachingAlert("Face not detected. Look at the camera.");
      setMetrics({
        eyeContact: 0,
        posture: 0,
        engagement: 0,
        attention: 0,
        confidenceScore: 0,
      });
      return;
    }

    setCoachingAlert("");
    const landmarks = results.multiFaceLandmarks[0];

    // Landmark indexes: 
    // Nose tip: 1
    // Left eye center approximate: 159
    // Right eye center approximate: 386
    // Forehead: 10
    // Chin: 152

    const nose = landmarks[1];
    const leftEye = landmarks[159];
    const rightEye = landmarks[386];
    
    // 1. Posture tilt (head alignment relative to shoulders/screen)
    const eyeDiffY = Math.abs(leftEye.y - rightEye.y);
    const postureScore = Math.max(0, 100 - Math.round(eyeDiffY * 500));

    // 2. Eye Contact (estimated gaze centering on nose relative to eyes)
    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const gazeOffset = Math.abs(nose.x - eyeCenterX);
    let eyeContactScore = Math.max(0, 100 - Math.round(gazeOffset * 400));

    // Calculate Eye Aspect Ratio (EAR) to detect closed/covered eyes
    // Landmarks: Left eye corners (33, 133), eyelids (159, 145). Right eye corners (362, 263), eyelids (386, 374).
    const leftEAR = Math.abs(landmarks[159].y - landmarks[145].y) / Math.max(0.001, Math.abs(landmarks[33].x - landmarks[133].x));
    const rightEAR = Math.abs(landmarks[386].y - landmarks[374].y) / Math.max(0.001, Math.abs(landmarks[263].x - landmarks[362].x));
    const averageEAR = (leftEAR + rightEAR) / 2;

    const eyesVisible = averageEAR >= 0.15;
    if (!eyesVisible) {
      eyeContactScore = 0;
    }

    // 3. Facial Engagement (mouth openness / smiling approximate)
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const lipDistance = Math.abs(upperLip.y - lowerLip.y);
    const engagementScore = Math.max(60, 100 - Math.round(lipDistance * 250));

    // 4. Attention (distance to camera / centering)
    const attentionScore = Math.max(0, 100 - Math.round(Math.abs(nose.x - 0.5) * 150));

    const overallConf = Math.round((eyeContactScore * 0.4) + (postureScore * 0.3) + (engagementScore * 0.3));

    setMetrics({
      eyeContact: eyeContactScore,
      posture: postureScore,
      engagement: engagementScore,
      attention: attentionScore,
      confidenceScore: overallConf,
    });

    // Real-Time Coaching Alerts
    if (!eyesVisible) {
      setCoachingAlert("Keep your eyes open and visible to the camera.");
    } else if (eyeContactScore < 75) {
      setCoachingAlert("Maintain eye contact with the screen.");
    } else if (postureScore < 85) {
      setCoachingAlert("Sit upright and center your posture.");
    } else if (engagementScore < 70) {
      setCoachingAlert("Try speaking with more dynamic expressions.");
    }
  };


  // Monitor cameraActive state to start/stop the camera track safely
  useEffect(() => {
    let active = true;
    const setupCamera = async () => {
      if (!cameraActive) {
        // Stop logic
        setIsSimulationActive(false);
        clearInterval(metricsIntervalRef.current);
        if (cameraHelperRef.current) {
          try {
            cameraHelperRef.current.stop();
          } catch (e) {
            console.debug("Camera helper stop error:", e);
          }
          cameraHelperRef.current = null;
        }
        if (faceMeshRef.current) {
          try {
            faceMeshRef.current.close();
          } catch (e) {
            console.debug("FaceMesh close error:", e);
          }
          faceMeshRef.current = null;
        }
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
          localStreamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        return;
      }

      try {
        setError("");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;

        // Wait one frame to ensure DOM is updated and ref is bound
        if (!videoRef.current) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn("videoRef.current.play() interrupted:", playErr);
          }
        }

        // Initialize FaceMesh if loaded from CDN
        if (window.FaceMesh && window.Camera) {
          setIsSimulationActive(false);
          const faceMesh = new window.FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
          });

          faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });

          faceMesh.onResults((results) => {
            onFaceMeshResults(results);
          });

          const camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (localStreamRef.current && videoRef.current) {
                try {
                  await faceMesh.send({ image: videoRef.current });
                } catch (err) {
                  console.debug("FaceMesh send error:", err);
                }
              }
            },
            width: 640,
            height: 480,
          });
          camera.start();

          faceMeshRef.current = faceMesh;
          cameraHelperRef.current = camera;
        } else {
          // Fallback simulation metrics when MediaPipe library is loading/unsupported
          setIsSimulationActive(true);
          metricsIntervalRef.current = setInterval(() => {
            const eye = Math.max(70, Math.min(100, 90 + Math.round((Math.random() - 0.5) * 10)));
            const post = Math.max(80, Math.min(100, 95 + Math.round((Math.random() - 0.5) * 6)));
            const eng = Math.max(75, Math.min(100, 85 + Math.round((Math.random() - 0.5) * 12)));
            const att = Math.max(85, Math.min(100, 92 + Math.round((Math.random() - 0.5) * 8)));
            const conf = Math.round((eye * 0.4) + (post * 0.3) + (eng * 0.3));
            setMetrics({
              eyeContact: eye,
              posture: post,
              engagement: eng,
              attention: att,
              confidenceScore: conf,
            });
          }, 1500);
        }
      } catch (err) {
        setError("Webcam access failed: " + err.message);
        setCameraActive(false);
      }
    };

    setupCamera();

    return () => {
      active = false;
    };
  }, [cameraActive, modelsLoaded]);



  const toggleCamera = () => {
    setCameraActive((prev) => !prev);
  };



  const getMetricColor = (val) => {
    if (val >= 85) return "var(--color-success)";
    if (val >= 70) return "var(--color-warning)";
    return "var(--color-danger)";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="card">
        <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Video size={20} color="var(--color-accent)" />
            Pitch Coach & Webcam Analysis
          </div>
          <button
            className={`btn ${cameraActive ? "btn-danger" : "btn-primary"}`}
            onClick={toggleCamera}
            style={{ padding: "8px 16px", fontSize: "13px" }}
          >
            {cameraActive ? (
              <><CameraOff size={14} /> Turn Camera Off</>
            ) : (
              <><Camera size={14} /> Enable Pitch Camera</>
            )}
          </button>
        </div>
        
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
          Rehearse with the teleprompter while our MediaPipe FaceMesh module tracks eye contact, alignment, head posture, and engagement in real-time.
        </p>

        {cameraActive && (
          <div className="confidence-boost-banner" style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-light)",
            borderRadius: "12px",
            padding: "12px 16px",
            marginBottom: "20px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <TrendingUp size={18} color="var(--color-accent)" />
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700" }}>Confidence Boost Engine</div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  Enforce strong posture, eye contact, and smiles with real-time audio alerts & visual cues.
                </div>
              </div>
            </div>
            <button
              onClick={() => setConfidenceBoostActive(!confidenceBoostActive)}
              className={`btn ${confidenceBoostActive ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "6px 12px", fontSize: "12px" }}
            >
              {confidenceBoostActive ? "🚀 Boost Mode ON" : "Boost Mode OFF"}
            </button>
          </div>
        )}

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", backgroundColor: "var(--color-danger-glow)", border: "1px solid var(--color-danger)", borderRadius: "10px", color: "var(--text-primary)", fontSize: "13px", marginBottom: "16px" }}>
            <AlertCircle size={16} color="var(--color-danger)" /> {error}
          </div>
        )}

        {/* Dynamic Split Layout */}
        <div className="presentation-split-grid" style={{ display: "grid", gridTemplateColumns: cameraActive ? "1fr 1fr" : "1fr", gap: "24px" }}>
          
          {/* Teleprompter Column */}
          <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                <FileText size={16} color="var(--color-accent)" />
                Teleprompter Script
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button className="btn btn-secondary" style={{ padding: "6px", borderRadius: "4px" }} onClick={() => setIsScrolling(!isScrolling)}>
                  {isScrolling ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button className="btn btn-secondary" style={{ padding: "6px", borderRadius: "4px" }} onClick={resetTeleprompter}>
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            <div
              ref={teleprompterRef}
              className="teleprompter-box"
              style={{
                minHeight: "240px",
                maxHeight: "240px",
                fontSize: "16px",
                lineHeight: "1.8",
                color: "#e4e4e7",
                backgroundColor: "#09090b",
                padding: "16px 20px",
                borderRadius: "8px",
                overflowY: "auto",
                border: "1px solid var(--border-light)",
                whiteSpace: "pre-wrap"
              }}
            >
              {script}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", borderTop: "1px solid var(--border-light)", paddingTop: "12px" }}>
              <Sliders size={16} color="var(--text-secondary)" />
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Scroll Speed:</span>
              <input type="range" min="1" max="10" value={scrollSpeed} onChange={(e) => setScrollSpeed(Number(e.target.value))} style={{ flexGrow: 1, accentColor: "var(--color-accent)" }} />
              <span style={{ fontSize: "12px", fontWeight: "700", width: "20px" }}>{scrollSpeed}</span>
            </div>
          </div>

          {/* Camera & Engagement Metrics Column */}
          {cameraActive && (
            <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Sparkles size={16} color="var(--color-warning)" />
                  Real-Time Tracking & Eye Gaze
                </div>
                {isSimulationActive ? (
                  <span style={{ fontSize: "10px", color: "var(--color-warning)", backgroundColor: "var(--color-warning-glow)", padding: "2px 8px", borderRadius: "10px", fontWeight: "700" }}>
                    Demo Simulation Mode
                  </span>
                ) : (
                  <span style={{ fontSize: "10px", color: "var(--color-success)", backgroundColor: "var(--color-success-glow)", padding: "2px 8px", borderRadius: "10px", fontWeight: "700" }}>
                    Live AI Active
                  </span>
                )}
              </div>

              {/* Video container with active glow on high confidence */}
              <div style={{
                position: "relative",
                width: "100%",
                height: "200px",
                borderRadius: "12px",
                backgroundColor: "#000",
                overflow: "hidden",
                border: "1px solid var(--border-light)",
                boxShadow: confidenceBoostActive && (metrics.confidenceScore || 0) >= 85
                  ? "0 0 25px var(--color-success)"
                  : "none",
                transition: "all 0.3s ease"
              }}>
                <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} muted />
                <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
                
                {/* Confidence Streak overlay */}
                {confidenceBoostActive && confidenceStreak > 0 && (
                  <div style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(22, 163, 74, 0.9)",
                    color: "#fff",
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: "700",
                    animation: "pulse 1.5s infinite"
                  }}>
                    <Flame size={12} fill="#fff" /> {confidenceStreak}s Streak
                  </div>
                )}

                {/* Alert Coaching overlay */}
                {coachingAlert && (
                  <div style={{ position: "absolute", bottom: "10px", left: "10px", right: "10px", padding: "8px 12px", background: "rgba(239, 68, 68, 0.85)", color: "#fff", fontSize: "11px", fontWeight: "700", borderRadius: "6px", textAlign: "center", zIndex: 5, boxShadow: "0 4px 10px rgba(0,0,0,0.3)" }}>
                    {coachingAlert}
                  </div>
                )}
              </div>

              {/* Real-Time Metrics Grids */}
              <div className="presentation-metrics-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {[
                  { name: "Confidence Score", val: metrics.confidenceScore || 0, icon: TrendingUp },
                  { name: "Eye Contact", val: metrics.eyeContact, icon: Eye },
                  { name: "Head Posture", val: metrics.posture, icon: User },
                  { name: "Engagement", val: metrics.engagement, icon: Sparkles },
                ].map((m, idx) => (
                  <div key={idx} style={{
                    padding: "10px 14px",
                    background: "var(--bg-tertiary)",
                    borderRadius: "8px",
                    border: m.name === "Confidence Score" && confidenceBoostActive ? "1px solid var(--color-success)" : "1px solid var(--border-light)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <m.icon size={11} color={m.name === "Confidence Score" && confidenceBoostActive ? "var(--color-success)" : "var(--color-accent)"} /> {m.name}
                      </span>
                      <strong style={{ fontSize: "13px", color: getMetricColor(m.val) }}>{m.val}%</strong>
                    </div>
                    <div className="progress-bar-track" style={{ height: "4px" }}>
                      <div className="progress-bar-fill" style={{ width: `${m.val}%`, backgroundColor: getMetricColor(m.val) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Script Editor & Coach checkmarks */}
        <div className="presentation-editor-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginTop: "24px" }}>
          <div className="card" style={{ padding: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px" }}>
              Customize Prompter Script Text
            </div>
            <textarea
              className="form-control"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Paste your presentation slides keywords or speech scripts details here..."
              style={{ minHeight: "100px", fontSize: "13px" }}
            />
          </div>

          <div className="card" style={{ padding: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <AlertCircle size={14} color="var(--color-info)" /> Coaching Checkpoints
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle size={12} color="var(--color-success)" /> Keep shoulders aligned and posture centered
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle size={12} color="var(--color-success)" /> Maintain constant focus on the camera lens
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle size={12} color="var(--color-success)" /> Smile naturally during greetings
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
