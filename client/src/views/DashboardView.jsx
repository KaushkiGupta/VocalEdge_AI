import { useState, useEffect } from "react";
import {
  BarChart3,
  MessageSquare,
  Briefcase,
  FileText,
  TrendingUp,
  Clock,
  Award,
  Target,
  Flame,
  Mic,
  CheckCircle,
  Lightbulb,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";

export default function DashboardView({ userProfile, stats, recentSessions, recentInterviews, setActiveTab }) {
  const quickActions = [
    { key: "practice", label: "Voice & Text Practice", description: "Speak freely. AI analyses tone, filler words, pace, clarity, vocabulary in seconds.", icon: Mic, color: "var(--color-accent)" },
    { key: "interview", label: "Adaptive Mock Interviews", description: "Realistic role-based interviews. Each follow-up adapts to what you just answered.", icon: Briefcase, color: "var(--color-accent)" },
    { key: "resume", label: "Resume Intelligence", description: "ATS score, missing keywords, suggested roles — and concrete action items.", icon: FileText, color: "var(--color-accent)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* ─── Hero Banner with Visual ───────────────────────────── */}
      <div className="card dashboard-hero-card" style={{
        display: "flex",
        alignItems: "center",
        gap: "36px",
        padding: "32px 36px",
        position: "relative",
        overflow: "hidden",
        background: "var(--bg-secondary)",
        border: "none",
      }}>
        {/* Decorative hand-drawn elements */}
        <svg style={{ position: "absolute", top: "16px", right: "200px", opacity: 0.12 }} width="80" height="12" viewBox="0 0 80 12" fill="none">
          <path d="M3 7 Q20 2 40 7 T77 6" stroke="#c4704b" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
        <div style={{ position: "absolute", top: "20px", right: "40px", opacity: 0.08, fontSize: "40px", color: "rgba(255,255,255,0.2)" }}>✦</div>
        <div style={{ position: "absolute", bottom: "15px", right: "120px", opacity: 0.06, fontSize: "24px", color: "rgba(255,255,255,0.15)" }}>✧</div>

        <div style={{ flex: 1, zIndex: 1 }}>
          <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--color-cta)", marginBottom: "8px" }}>
            Your AI Coach
          </div>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "26px",
            fontWeight: "400",
            color: "#fff",
            marginBottom: "8px",
            lineHeight: "1.3",
          }}>
            Speak with confidence,<br />interview with clarity.
          </h2>
          {/* Hand-drawn underline SVG */}
          <svg width="180" height="10" viewBox="0 0 180 10" style={{ marginBottom: "12px" }}>
            <path d="M3 6 Q45 1 90 6 T177 5" stroke="#c4704b" strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", lineHeight: "1.5", maxWidth: "380px" }}>
            Track your progress, practice daily, and watch your communication skills compound over time.
          </p>
        </div>

        <img
          src="/images/dashboard-hero.png"
          alt="Growth"
          style={{
            width: "160px",
            height: "160px",
            objectFit: "cover",
            borderRadius: "20px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
            flexShrink: 0,
          }}
        />
      </div>

      {/* ─── Stats Overview ─────────────────────────────────── */}
      <div className="grid-4col">
        {[
          { label: "Speech Sessions", value: stats.totalPracticeSessions, icon: MessageSquare, color: "var(--color-accent)" },
          { label: "Mock Interviews", value: stats.totalInterviews, icon: Briefcase, color: "var(--color-accent)" },
          { label: "Avg Speech Score", value: Math.round(stats.averageSpeechScore || 0), icon: TrendingUp, color: "var(--color-success)" },
          { label: "Avg Interview Score", value: Math.round(stats.averageInterviewScore || 0), icon: Target, color: "var(--color-warning)" },
        ].map((stat, idx) => (
          <div className="card" key={idx} style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
              <stat.icon size={16} color={stat.color} />
            </div>
            <div className="stat-value" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ─── Quick Actions — Cadence Feature Card Grid ────────── */}
      <div>
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--color-cta)", marginBottom: "6px" }}>The Platform</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: "400", color: "var(--text-primary)" }}>
            Three tools, one place to practice.
          </h2>
        </div>
        <div className="grid-3col">
          {quickActions.map((action) => (
            <div
              key={action.key}
              className="card"
              style={{ cursor: "pointer" }}
              onClick={() => setActiveTab(action.key)}
            >
              <div style={{ marginBottom: "12px" }}>
                <action.icon size={22} color="var(--text-primary)" strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: "15px", fontWeight: "700", marginBottom: "6px", color: "var(--text-primary)" }}>{action.label}</div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>{action.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Two Column: Recent Activity + Badges ───────────── */}
      <div className="grid-2col">
        {/* Recent Speech Sessions */}
        <div className="card">
          <div className="card-title">
            <BarChart3 size={18} color="var(--color-accent)" />
            Recent Speech Sessions
          </div>
          {recentSessions.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "20px 0", textAlign: "center" }}>
              No speech sessions yet. Start practicing!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recentSessions.map((session) => (
                <div key={session.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", backgroundColor: "var(--bg-tertiary)", borderRadius: "10px", border: "1px solid var(--border-light)" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>Clarity: {session.clarityScore}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={10} /> {new Date(session.timestamp).toLocaleDateString()} • {session.wpm} WPM
                    </div>
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: session.clarityScore >= 70 ? "var(--color-success)" : session.clarityScore >= 50 ? "var(--color-warning)" : "var(--color-danger)" }}>
                    {session.clarityScore}/100
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Badges Collection */}
        <div className="card">
          <div className="card-title">
            <Award size={18} color="var(--color-warning)" />
            Achievements & Badges
          </div>
          {(!userProfile.badges || userProfile.badges.length === 0) ? (
            <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "20px 0", textAlign: "center" }}>
              Complete sessions to unlock badges!
            </div>
          ) : (
            <div className="dashboard-badges-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {userProfile.badges.map((badge) => (
                <div key={badge.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", backgroundColor: "var(--bg-tertiary)", borderRadius: "10px", border: "1px solid var(--border-light)" }}>
                  <div style={{ fontSize: "24px" }}>{badge.icon}</div>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--color-warning)" }}>{badge.title}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{badge.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Recent Interviews ──────────────────────────────── */}
      {recentInterviews.length > 0 && (
        <div className="card">
          <div className="card-title">
            <Briefcase size={18} color="var(--color-accent)" />
            Recent Mock Interviews
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {recentInterviews.map((interview) => (
              <div key={interview.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", backgroundColor: "var(--bg-tertiary)", borderRadius: "10px", border: "1px solid var(--border-light)" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{interview.role}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Clock size={10} /> {new Date(interview.timestamp).toLocaleDateString()} • {interview.interviewType}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Overall</div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: interview.overallScore >= 70 ? "var(--color-success)" : interview.overallScore >= 50 ? "var(--color-warning)" : "var(--color-danger)" }}>
                      {interview.overallScore}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Progress & Skill Tracker & Learning Engine ─────────────────── */}
      <div className="grid-2col" style={{ alignItems: "start" }}>
        {/* Left Column: Streaks & Personalized Goals */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Streaks Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="card-title">
              <Flame size={18} color="var(--color-warning)" />
              Streaks, XP, Badges
            </div>
            <div className="dashboard-streaks-row" style={{ display: "flex", gap: "16px" }}>
              <div style={{ flex: 1, padding: "16px", background: "var(--bg-tertiary)", borderRadius: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", fontWeight: "800", color: "var(--color-warning)" }}>{userProfile.streak || 0}</div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600", marginTop: "4px" }}>Day Streak</div>
              </div>
              <div style={{ flex: 1, padding: "16px", background: "var(--bg-tertiary)", borderRadius: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", fontWeight: "800", color: "var(--color-accent)" }}>{userProfile.xp || 0}</div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600", marginTop: "4px" }}>Total XP</div>
              </div>
              <div style={{ flex: 1, padding: "16px", background: "var(--bg-tertiary)", borderRadius: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "28px", fontWeight: "800", color: "var(--color-accent)" }}>{userProfile.level || 1}</div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600", marginTop: "4px" }}>Level</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-secondary)" }}>
                <span>XP Progress</span>
                <span style={{ fontWeight: "700" }}>{100 - ((userProfile.xp || 0) % 100)} XP to next level</span>
              </div>
              <div className="progress-bar-track" style={{ height: "6px" }}>
                <div className="progress-bar-fill" style={{ width: `${(userProfile.xp || 0) % 100}%`, backgroundColor: "var(--color-accent)" }} />
              </div>
            </div>
          </div>

          {/* Learning Recommendation Card */}
          <LearningRecommendations />
        </div>

        {/* Right Column: Recharts Interactive Analytics */}
        <InteractiveAnalytics recentSessions={recentSessions} recentInterviews={recentInterviews} />
      </div>
    </div>
  );
}

// ─── Learning Recommendations Panel ─────────────────────────────────────────
function LearningRecommendations() {
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const BACKEND_URL = import.meta.env.VITE_API_URL || "";
        const response = await fetch(`${BACKEND_URL}/api/learning/recommendations`, {
          headers: {
            "X-Requested-With": "XMLHttpRequest"
          },
          credentials: "include"
        });
        if (response.ok) {
          const data = await response.json();
          setRecs(data);
        }
      } catch (err) {
        console.warn("Could not fetch recommendations:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
        Loading personalized learning recommendations...
      </div>
    );
  }

  const items = recs || {
    dailyGoals: [
      { id: "1", task: "Complete a 1-minute Free Speech session", completed: false, xpReward: 20 },
    ],
    weeklyGoals: [
      { id: "2", task: "Maintain a 3-day practice streak", completed: false, xpReward: 100 },
    ],
    exercises: [
      { title: "Vocal Pacing Workout", focus: "Pacing", description: "Practice speaking at 130-150 WPM." }
    ],
    interviewPlan: { recommendedRole: "Software Engineer", focusArea: "STAR Method fit" }
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div className="card-title">
        <Lightbulb size={18} color="var(--color-cta)" />
        AI Learning Recommendations
      </div>

      <div>
        <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--color-cta)", marginBottom: "8px", letterSpacing: "1px" }}>
          Daily Checklist
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {items.dailyGoals.map((goal) => (
            <div key={goal.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>
              <CheckCircle size={14} color="var(--color-success)" style={{ flexShrink: 0 }} />
              <span style={{ flexGrow: 1 }}>{goal.task}</span>
              <strong style={{ color: "var(--color-accent)", fontSize: "11px" }}>+{goal.xpReward} XP</strong>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "14px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--color-cta)", marginBottom: "8px", letterSpacing: "1px" }}>
          Recommended Workout
        </div>
        {items.exercises.slice(0, 1).map((ex, idx) => (
          <div key={idx} style={{ padding: "10px", background: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>{ex.title}</div>
            <div style={{ fontSize: "10px", color: "var(--color-accent)", fontWeight: "600", margin: "2px 0" }}>Focus: {ex.focus}</div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{ex.description}</div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "14px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--color-cta)", marginBottom: "4px", letterSpacing: "1px" }}>
          Interview Training Plan
        </div>
        <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>
          Target Role: <strong>{items.interviewPlan.recommendedRole}</strong>
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
          Focus Area: {items.interviewPlan.focusArea}
        </div>
      </div>
    </div>
  );
}

// ─── Interactive Analytics Panel (Recharts) ─────────────────────────────────
function InteractiveAnalytics({ recentSessions, recentInterviews }) {
  const [tab, setTab] = useState("scores"); // "scores" | "pace" | "interview"

  // Process data for charts
  const sessionsData = [...recentSessions].reverse().map((s, idx) => ({
    name: `S${idx + 1}`,
    Clarity: s.clarityScore || 0,
    Confidence: s.confidenceScore || 0,
    WPM: s.wpm || 0,
    Fillers: s.fillerCount || 0,
  }));

  const interviewsData = [...recentInterviews].reverse().map((i, idx) => ({
    name: `Int ${idx + 1}`,
    Overall: i.overallScore || 0,
  }));

  const tabBtnStyle = (active) => ({
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: "600",
    borderRadius: "20px",
    border: "none",
    cursor: "pointer",
    background: active ? "var(--color-accent)" : "var(--bg-tertiary)",
    color: active ? "#fff" : "var(--text-secondary)",
    transition: "all 0.15s ease",
  });

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px", minHeight: "360px" }}>
      <div className="dashboard-analytics-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="card-title" style={{ margin: 0 }}>
          <TrendingUp size={18} color="var(--color-accent)" />
          Interactive Trends
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button style={tabBtnStyle(tab === "scores")} onClick={() => setTab("scores")}>Clarity / Confidence</button>
          <button style={tabBtnStyle(tab === "pace")} onClick={() => setTab("pace")}>Pace / Fillers</button>
          <button style={tabBtnStyle(tab === "interview")} onClick={() => setTab("interview")}>Interviews</button>
        </div>
      </div>

      <div style={{ flexGrow: 1, width: "100%", height: "240px", marginTop: "10px" }}>
        {sessionsData.length === 0 && tab !== "interview" ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: "13px" }}>
            Complete practice sessions to view trend charts.
          </div>
        ) : tab === "scores" ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sessionsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
              <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-light)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Clarity" stroke="var(--color-success)" strokeWidth={2} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Confidence" stroke="var(--color-accent)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : tab === "pace" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sessionsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
              <YAxis stroke="var(--text-muted)" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-light)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="WPM" fill="var(--color-info)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Fillers" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : interviewsData.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: "13px" }}>
            Complete mock interviews to view scorecard charts.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={interviewsData}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-warning)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="var(--color-warning)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
              <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-light)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Overall" stroke="var(--color-warning)" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
