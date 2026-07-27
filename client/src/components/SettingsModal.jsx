import React, { useState, useEffect } from "react";
import { X, Settings, User, Palette, Shield, Sun, Moon, Monitor, Check } from "lucide-react";
import { THEME_KEY, setThemePreference } from "../utils/theme";

export default function SettingsModal({ isOpen, onClose }) {
  const [activeSection, setActiveSection] = useState("account");
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "system");

  // User details state (read-only until backend persistence is available)
  const [userData, setUserData] = useState({ name: "User", email: "user@vocaledge.ai" });
  const [savedFeedback, setSavedFeedback] = useState("");

  // Privacy toggles state
  const [saveHistory, setSaveHistory] = useState(() => {
    return localStorage.getItem("vocaledge_privacy_history") !== "false";
  });

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem("vocaledge_user");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setUserData(parsed);
        } catch {
          // Fallback if parsing fails
        }
      }
    }
  }, [isOpen]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    setThemePreference(newTheme);
  };

  const handleToggleHistory = (e) => {
    const val = e.target.checked;
    setSaveHistory(val);
    localStorage.setItem("vocaledge_privacy_history", val ? "true" : "false");
  };

  const handleResetPreferences = () => {
    if (window.confirm("Are you sure you want to reset local application settings to defaults?")) {
      localStorage.removeItem("vocaledge_privacy_history");
      setSaveHistory(true);
      handleThemeChange("system");
      setSavedFeedback("Reset application settings to defaults.");
      setTimeout(() => setSavedFeedback(""), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px", padding: "24px" }}>
        <button
          style={{ position: "absolute", right: "16px", top: "16px", background: "none", border: "none", cursor: "pointer" }}
          onClick={onClose}
          aria-label="Close settings"
        >
          <X size={20} color="var(--text-secondary)" />
        </button>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: "700", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Settings size={20} color="var(--color-accent)" /> User Settings
        </h2>

        {/* Section Tabs */}
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeSection === "account" ? "active" : ""}`}
            onClick={() => setActiveSection("account")}
          >
            <User size={15} /> Account
          </button>
          <button
            className={`settings-tab ${activeSection === "appearance" ? "active" : ""}`}
            onClick={() => setActiveSection("appearance")}
          >
            <Palette size={15} /> Appearance
          </button>
          <button
            className={`settings-tab ${activeSection === "privacy" ? "active" : ""}`}
            onClick={() => setActiveSection("privacy")}
          >
            <Shield size={15} /> Privacy
          </button>
        </div>

        {/* Saved Feedback Alert */}
        {savedFeedback && (
          <div style={{ padding: "8px 12px", background: "var(--color-success-glow)", color: "var(--color-success)", borderRadius: "8px", fontSize: "13px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Check size={14} /> {savedFeedback}
          </div>
        )}

        {/* Account Section (Read-only until backend persistence endpoint is implemented) */}
        {activeSection === "account" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group" style={{ marginBottom: "0" }}>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                value={userData.name || "User"}
                disabled
                style={{ opacity: 0.75, cursor: "not-allowed" }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: "0" }}>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                value={userData.email || "user@vocaledge.ai"}
                disabled
                style={{ opacity: 0.75, cursor: "not-allowed" }}
              />
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
              Account profile details are managed via your authentication provider.
            </span>
          </div>
        )}

        {/* Appearance Section */}
        {activeSection === "appearance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label className="form-label" style={{ marginBottom: "8px" }}>Interface Theme</label>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  className={`theme-option-card ${theme === "light" ? "active" : ""}`}
                  onClick={() => handleThemeChange("light")}
                >
                  <Sun size={22} />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  className={`theme-option-card ${theme === "dark" ? "active" : ""}`}
                  onClick={() => handleThemeChange("dark")}
                >
                  <Moon size={22} />
                  <span>Dark</span>
                </button>

                <button
                  type="button"
                  className={`theme-option-card ${theme === "system" ? "active" : ""}`}
                  onClick={() => handleThemeChange("system")}
                >
                  <Monitor size={22} />
                  <span>System</span>
                </button>
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              {theme === "system"
                ? "System theme dynamically syncs with your operating system preference."
                : `Currently using ${theme} theme mode.`}
            </p>
          </div>
        )}

        {/* Privacy Section */}
        {activeSection === "privacy" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "var(--bg-tertiary)", borderRadius: "8px" }}>
              <div>
                <div style={{ fontWeight: "600", fontSize: "13px", color: "var(--text-primary)" }}>Save Practice History</div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Store practice scores and analytics locally in browser</div>
              </div>
              <input
                type="checkbox"
                checked={saveHistory}
                onChange={handleToggleHistory}
                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--color-accent)" }}
              />
            </div>

            <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "16px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetPreferences}
                style={{ fontSize: "12px", width: "100%", justifyContent: "center" }}
              >
                Reset Application Settings
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px", paddingTop: "12px", borderTop: "1px solid var(--border-light)" }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ fontSize: "13px" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
