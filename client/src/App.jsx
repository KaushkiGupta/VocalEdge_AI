import React, { useState, useEffect, Suspense, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Flame, Zap, Award, X, Menu, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

import AuthView from "./views/AuthView";
import Sidebar from "./components/Sidebar";
import SettingsModal from "./components/SettingsModal";

// Lazy loaded views
const DashboardView = React.lazy(() => import("./views/DashboardView"));
const PracticeView = React.lazy(() => import("./views/PracticeView"));
const InterviewView = React.lazy(() => import("./views/InterviewView"));
const ResumeView = React.lazy(() => import("./views/ResumeView"));
const PresentationView = React.lazy(() => import("./views/PresentationView"));

const BACKEND_URL = import.meta.env.VITE_API_URL || "";

const getAuthHeaders = () => {
  return {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem("vocaledge_user");
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("vocaledge_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState(false);
  const [lkUrl, setLkUrl] = useState("");
  const [lkKey, setLkKey] = useState("");
  const [lkSecret, setLkSecret] = useState("");
  const [lkAgent, setLkAgent] = useState("assistant-033");

  // User profile and history states
  const [userProfile, setUserProfile] = useState({
    name: "User",
    xp: 0,
    level: 1,
    streak: 0,
    longestStreak: 0,
    lastPracticeDate: "",
    badges: [],
  });
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentInterviews, setRecentInterviews] = useState([]);
  const [stats, setStats] = useState({
    totalPracticeSessions: 0,
    totalInterviews: 0,
    averageSpeechScore: 0,
    averageInterviewScore: 0,
  });

  // Level Up / Badge animation states
  const [levelupInfo, setLevelupInfo] = useState(null);
  const [unlockedBadges, setUnlockedBadges] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" && window.innerWidth > 768);

  const handleSignOut = useCallback(async () => {
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      });
    } catch (err) {
      console.warn("Could not sign out on the server:", err.message);
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem("vocaledge_user");
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) {
        handleSignOut();
      }
    } catch {
      console.warn("Could not check authentication credentials");
    }
  }, [handleSignOut]);

  const checkApiKeyStatus = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings/status`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setKeyStatus(data.hasKey);
      }
    } catch {
      console.warn("Could not connect to api status route.");
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/dashboard`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.userProfile);
        setRecentSessions(data.recentSessions);
        setRecentInterviews(data.recentInterviews);
        setStats(data.stats);
      }
    } catch {
      console.warn("Could not connect to backend server.");
    }
  }, []);

  useEffect(() => {
    if (levelupInfo || unlockedBadges.length > 0) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [levelupInfo, unlockedBadges]);

  useEffect(() => {
    if (isAuthenticated) {
      const initializeData = async () => {
        await fetchMe();
        await checkApiKeyStatus();
        await fetchDashboardData();
      };
      initializeData();
    }
  }, [isAuthenticated, fetchMe, checkApiKeyStatus, fetchDashboardData]);

  const handleAuthComplete = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem("vocaledge_user", JSON.stringify(user));
  };

  const handleSaveLivekit = async (e) => {
    e.preventDefault();
    if (!lkUrl.trim() || !lkKey.trim() || !lkSecret.trim()) return;

    setIsSavingKey(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings/livekit`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          url: lkUrl.trim(),
          key: lkKey.trim(),
          secret: lkSecret.trim(),
          agentName: lkAgent.trim() || "assistant-033",
        }),
      });

      if (response.ok) {
        setKeyStatus(true);
        alert("LiveKit Credentials configured successfully!");
      } else {
        const data = await response.json();
        alert("Error saving LiveKit credentials: " + data.error);
      }
    } catch (err) {
      alert("Failed to communicate with the server: " + err.message);
    } finally {
      setIsSavingKey(false);
      checkApiKeyStatus();
    }
  };

  const handleSaveApiKey = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setIsSavingKey(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings/apikey`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      if (response.ok) {
        setKeyStatus(true);
        setShowSettings(false);
        fetchDashboardData();
        alert("Groq API Key configured successfully!");
      } else {
        const data = await response.json();
        alert("Error saving API Key: " + data.error);
      }
    } catch (err) {
      alert("Failed to communicate with the server: " + err.message);
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleSessionComplete = (gamification) => {
    if (!gamification) return;
    const { profile, leveledUp, newBadges } = gamification;
    setUserProfile(profile);
    if (leveledUp) setLevelupInfo({ level: profile.level });
    if (newBadges && newBadges.length > 0) setUnlockedBadges((prev) => [...prev, ...newBadges]);
    fetchDashboardData();
  };

  if (!isAuthenticated) {
    return <AuthView onAuthComplete={handleAuthComplete} />;
  }

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <Sidebar
          currentUser={currentUser}
          keyStatus={keyStatus}
          setShowSettings={setShowSettings}
          handleSignOut={handleSignOut}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {/* Main Content */}
        <div className="main-content">
          {/* Top Header */}
          <div className="app-header">
            <div className="header-left">
              <div className="header-title">
                <div className="header-title-row">
                  {!sidebarOpen && (
                    <button
                      className="hamburger-btn"
                      onClick={() => setSidebarOpen(true)}
                      aria-label="Open Sidebar"
                      title="Open Sidebar"
                    >
                      <Menu size={18} />
                    </button>
                  )}
                  <h1>Welcome back, {currentUser?.name || userProfile.name}</h1>
                </div>
                <p>Ready to level up your communication and interview skills?</p>
              </div>
            </div>

            <div className="header-actions">
              <div className="gamification-badge badge-streak" title="Daily streak">
                <Flame size={16} />
                <span>{userProfile.streak || 0} Day Streak</span>
              </div>
              <div className="gamification-badge badge-xp">
                <Zap size={16} />
                <span>{userProfile.xp || 0} XP</span>
              </div>
              <div className="gamification-badge badge-level">
                <Award size={16} />
                <span>Level {userProfile.level || 1}</span>
              </div>
            </div>
          </div>

          {/* Router Views */}
          <Suspense fallback={<div style={{ color: "var(--text-secondary)", padding: "20px" }}>Loading View...</div>}>
            <Routes>
              <Route
                path="/dashboard"
                element={
                  <DashboardView
                    userProfile={userProfile}
                    stats={stats}
                    recentSessions={recentSessions}
                    recentInterviews={recentInterviews}
                    setActiveTab={() => { }}
                  />
                }
              />
              <Route
                path="/practice"
                element={<PracticeView onSessionComplete={handleSessionComplete} backendUrl={BACKEND_URL} />}
              />
              <Route
                path="/interview"
                element={<InterviewView onSessionComplete={handleSessionComplete} backendUrl={BACKEND_URL} currentUser={currentUser} />}
              />
              <Route
                path="/resume"
                element={<ResumeView onSessionComplete={handleSessionComplete} backendUrl={BACKEND_URL} />}
              />
              <Route
                path="/presentation"
                element={<PresentationView />}
              />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </div>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          apiKey={apiKey}
          setApiKey={setApiKey}
          isSavingKey={isSavingKey}
          handleSaveApiKey={handleSaveApiKey}
          lkUrl={lkUrl}
          setLkUrl={setLkUrl}
          lkKey={lkKey}
          setLkKey={setLkKey}
          lkSecret={lkSecret}
          setLkSecret={setLkSecret}
          lkAgent={lkAgent}
          setLkAgent={setLkAgent}
          handleSaveLivekit={handleSaveLivekit}
        />

        {/* Level Up Overlay */}
        {levelupInfo && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ textAlign: "center", borderColor: "var(--color-warning)", padding: "40px" }}>
              <div style={{ fontSize: "64px", marginBottom: "16px" }}>🎉</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: "400", color: "var(--color-warning)", marginBottom: "8px" }}>
                Leveled Up!
              </h2>
              <p style={{ fontSize: "16px", color: "var(--text-primary)", marginBottom: "24px" }}>
                Congratulations! You've reached <strong>Level {levelupInfo.level}</strong>!
              </p>
              <button className="btn btn-primary" onClick={() => setLevelupInfo(null)} style={{ padding: "10px 32px" }}>
                Awesome!
              </button>
            </div>
          </div>
        )}

        {/* Badge Unlocked Overlay */}
        {unlockedBadges.length > 0 && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ textAlign: "center", borderColor: "var(--color-warning)", padding: "40px" }}>
              <div style={{ fontSize: "64px", marginBottom: "16px" }}>{unlockedBadges[0].icon}</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: "400", color: "var(--color-warning)", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <Sparkles color="var(--color-warning)" /> Badge Unlocked! <Sparkles color="var(--color-warning)" />
              </h2>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
                {unlockedBadges[0].title}
              </div>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
                {unlockedBadges[0].description}
              </p>
              <button className="btn btn-primary" onClick={() => setUnlockedBadges((prev) => prev.slice(1))} style={{ padding: "10px 32px" }}>
                Collect Reward
              </button>
            </div>
          </div>
        )}
      </div>
    </BrowserRouter>
  );
}
