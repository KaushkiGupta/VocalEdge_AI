import { useState } from "react";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";

export default function AuthView({ onAuthComplete }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const endpoint = mode === "signin" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "signin"
        ? { email: formData.email, password: formData.password }
        : { email: formData.email, password: formData.password, name: formData.name };

      const BACKEND_URL = import.meta.env.VITE_API_URL || "";
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Authentication failed");
      }

      const data = await response.json();
      onAuthComplete(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: "🎤", title: "Voice Analysis", desc: "Real-time speech clarity scoring" },
    { icon: "💼", title: "Mock Interviews", desc: "AI-powered adaptive interviews" },
    { icon: "📄", title: "Resume Scan", desc: "ATS compatibility analysis" },
    { icon: "🔥", title: "Streak System", desc: "Gamified daily practice" },
  ];

  return (
    <div className="auth-container" style={{
      display: "flex",
      minHeight: "100vh",
      background: "var(--bg-primary)",
      fontFamily: "var(--font-body)",
    }}>
      {/* ─── Left Panel — Branding & Visual ────────────────────── */}
      <div className="auth-left-panel" style={{
        flex: "0 0 50%",
        background: "var(--bg-secondary)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative hand-drawn elements */}
        <div style={{ position: "absolute", top: "30px", left: "30px", opacity: 0.15, fontSize: "120px", color: "rgba(255,255,255,0.1)", fontFamily: "var(--font-display)" }}>✦</div>
        <div style={{ position: "absolute", bottom: "50px", right: "40px", opacity: 0.1, fontSize: "80px", color: "rgba(255,255,255,0.1)" }}>✧</div>
        <div style={{ position: "absolute", top: "15%", right: "15%", opacity: 0.08, fontSize: "40px", color: "rgba(255,255,255,0.15)" }}>⭐</div>
        
        {/* Wavy decorative line */}
        <svg style={{ position: "absolute", top: "20%", left: "10%", opacity: 0.12, width: "120px" }} viewBox="0 0 120 20" fill="none">
          <path d="M0 10 Q15 0 30 10 T60 10 T90 10 T120 10" stroke="rgba(196,112,75,0.6)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        </svg>
        <svg style={{ position: "absolute", bottom: "25%", right: "8%", opacity: 0.12, width: "100px" }} viewBox="0 0 100 20" fill="none">
          <path d="M0 10 Q12 0 25 10 T50 10 T75 10 T100 10" stroke="rgba(196,112,75,0.6)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        </svg>

        {/* Hero Image */}
        <div style={{ marginBottom: "36px", position: "relative" }}>
          <img
            className="auth-hero-img"
            src="/images/auth-hero.png"
            alt="VocalEdge AI"
            style={{
              width: "280px",
              height: "280px",
              objectFit: "cover",
              borderRadius: "24px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          />
          {/* Floating badge */}
          <div style={{
            position: "absolute",
            top: "-12px",
            right: "-16px",
            background: "var(--color-cta)",
            color: "#fff",
            padding: "6px 14px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: "700",
            boxShadow: "0 4px 12px rgba(196,112,75,0.4)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}>
            <Sparkles size={12} /> AI Powered
          </div>
        </div>

        {/* Brand Title */}
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "36px",
          fontWeight: "400",
          color: "#fff",
          textAlign: "center",
          marginBottom: "12px",
          letterSpacing: "-0.5px",
        }}>
          VocalEdge AI
        </h1>
        
        {/* Hand-drawn style underline */}
        <svg width="140" height="12" viewBox="0 0 140 12" style={{ marginBottom: "20px" }}>
          <path d="M5 8 Q35 2 70 7 T135 6" stroke="#c4704b" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        </svg>

        <p style={{
          color: "rgba(255,255,255,0.65)",
          fontSize: "15px",
          textAlign: "center",
          maxWidth: "340px",
          lineHeight: "1.6",
          marginBottom: "36px",
        }}>
          Your AI communication coach. Practice speaking, ace interviews, and build confidence — one session at a time.
        </p>

        {/* Feature Chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", maxWidth: "380px" }}>
          {features.map((f, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              background: "rgba(255,255,255,0.08)",
              borderRadius: "30px",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.8)",
              fontSize: "12px",
              fontWeight: "500",
            }}>
              <span style={{ fontSize: "14px" }}>{f.icon}</span>
              {f.title}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Right Panel — Auth Form ──────────────────────────── */}
      <div className="auth-right-panel" style={{
        flex: "0 0 50%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px",
        position: "relative",
      }}>
        {/* Decorative elements on form side */}
        <div style={{ position: "absolute", top: "40px", right: "40px", opacity: 0.06, fontSize: "80px", color: "var(--color-accent)" }}>✦</div>
        <svg style={{ position: "absolute", bottom: "15%", left: "8%", opacity: 0.08, width: "80px" }} viewBox="0 0 80 20" fill="none">
          <path d="M0 10 Q10 0 20 10 T40 10 T60 10 T80 10" stroke="var(--color-cta)" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>

        <div style={{ width: "100%", maxWidth: "400px" }}>
          {/* Mode Toggle */}
          <div style={{
            display: "flex",
            background: "var(--bg-tertiary)",
            borderRadius: "var(--radius-full)",
            padding: "4px",
            marginBottom: "36px",
          }}>
            <button
              type="button"
              onClick={() => setMode("signin")}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "var(--radius-full)",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                fontFamily: "var(--font-body)",
                background: mode === "signin" ? "var(--bg-card)" : "transparent",
                color: mode === "signin" ? "var(--text-primary)" : "var(--text-muted)",
                boxShadow: mode === "signin" ? "var(--shadow-sm)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "var(--radius-full)",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                fontFamily: "var(--font-body)",
                background: mode === "signup" ? "var(--bg-card)" : "transparent",
                color: mode === "signup" ? "var(--text-primary)" : "var(--text-muted)",
                boxShadow: mode === "signup" ? "var(--shadow-sm)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              Sign Up
            </button>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: "32px" }}>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontSize: "28px",
              fontWeight: "400",
              color: "var(--text-primary)",
              marginBottom: "8px",
            }}>
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              {mode === "signin"
                ? "Sign in to continue your practice sessions."
                : "Start your journey to better communication."}
            </p>
          </div>

          {error && (
            <div style={{
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: "rgba(220, 38, 38, 0.12)",
              border: "1px solid rgba(220, 38, 38, 0.4)",
              color: "#ef4444",
              fontSize: "13px",
              marginBottom: "16px",
              textAlign: "left"
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {mode === "signup" && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Name</label>
                <div style={{ position: "relative" }}>
                  <User size={16} color="var(--text-muted)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required={mode === "signup"}
                    style={{ paddingLeft: "42px" }}
                  />
                </div>
              </div>
            )}

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Email Address</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="email"
                  className="form-control"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  style={{ paddingLeft: "42px" }}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  placeholder={mode === "signup" ? "Create a strong password" : "Enter your password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  style={{ paddingLeft: "42px", paddingRight: "42px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  {showPassword
                    ? <EyeOff size={16} color="var(--text-muted)" />
                    : <Eye size={16} color="var(--text-muted)" />}
                </button>
              </div>
            </div>

            {mode === "signin" && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "-8px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer" }}>
                  <input type="checkbox" style={{ accentColor: "var(--color-accent)" }} />
                  Remember me
                </label>
                <button type="button" style={{ background: "none", border: "none", color: "var(--color-cta)", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "var(--font-body)" }}>
                  Forgot password?
                </button>
              </div>
            )}

            {mode === "signup" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "-4px" }}>
                {[
                  { met: formData.password.length >= 8, label: "At least 8 characters" },
                  { met: /[A-Z]/.test(formData.password), label: "One uppercase letter" },
                  { met: /[0-9]/.test(formData.password), label: "One number" },
                ].map((rule, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: rule.met ? "var(--color-success)" : "var(--text-muted)" }}>
                    <Check size={12} />
                    {rule.label}
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || !formData.email || !formData.password}
              style={{
                width: "100%",
                padding: "14px",
                fontSize: "15px",
                marginTop: "4px",
              }}
            >
              {isLoading ? (
                <span className="animate-spin" style={{ display: "inline-block", width: "18px", height: "18px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
              ) : (
                <>
                  {mode === "signin" ? "Sign In" : "Create Account"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "28px 0" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--border-light)" }} />
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "500" }}>or continue with</span>
            <div style={{ flex: 1, height: "1px", background: "var(--border-light)" }} />
          </div>

          {/* Social Buttons */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              onClick={() => onAuthComplete({ name: "User", email: "user@google.com" })}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "12px",
                borderRadius: "var(--radius-full)",
                border: "1px solid var(--border-hover)",
                background: "var(--bg-card)",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-card)"; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => onAuthComplete({ name: "User", email: "user@github.com" })}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "12px",
                borderRadius: "var(--radius-full)",
                border: "1px solid var(--border-hover)",
                background: "var(--bg-card)",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-card)"; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </button>
          </div>

          {/* Footer text */}
          <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", marginTop: "28px", lineHeight: "1.6" }}>
            By continuing, you agree to VocalEdge AI's<br />
            <span style={{ color: "var(--color-cta)", cursor: "pointer", fontWeight: "500" }}>Terms of Service</span> and{" "}
            <span style={{ color: "var(--color-cta)", cursor: "pointer", fontWeight: "500" }}>Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}
