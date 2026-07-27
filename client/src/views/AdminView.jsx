import React, { useState, useEffect, useCallback } from "react";
import { Users, Briefcase, MessageSquare, Search, ShieldCheck, ShieldAlert, Cpu, Activity } from "lucide-react";

export default function AdminView({
  backendUrl = "",
  apiKey = "",
  setApiKey = () => {},
  isSavingKey = false,
  handleSaveApiKey = (e) => e.preventDefault(),
  lkUrl = "",
  setLkUrl = () => {},
  lkKey = "",
  setLkKey = () => {},
  lkSecret = "",
  setLkSecret = () => {},
  lkAgent = "",
  setLkAgent = () => {},
  handleSaveLivekit = (e) => e.preventDefault(),
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({ totalUsers: 0, totalInterviews: 0, totalSessions: 0 });
  const [usersList, setUsersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" };

      const [statsRes, usersRes] = await Promise.all([
        fetch(`${backendUrl}/api/admin/stats`, { headers, credentials: "include" }),
        fetch(`${backendUrl}/api/admin/users?search=${encodeURIComponent(searchQuery)}`, { headers, credentials: "include" }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsersList(usersData.users || []);
      }
    } catch (err) {
      console.warn("Could not load admin stats:", err.message);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, searchQuery]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Admin Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: "400", color: "var(--text-primary)", marginBottom: "4px" }}>
            Admin Control Center
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
            System overview, user management, and AI infrastructure settings.
          </p>
        </div>
      </div>

      {/* Admin Section Navigation Tabs */}
      <div className="settings-tabs" style={{ marginBottom: "8px" }}>
        <button
          className={`settings-tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <Activity size={15} /> Overview
        </button>
        <button
          className={`settings-tab ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          <Users size={15} /> Users Directory
        </button>
        <button
          className={`settings-tab ${activeTab === "aisettings" ? "active" : ""}`}
          onClick={() => setActiveTab("aisettings")}
        >
          <Cpu size={15} /> AI Infrastructure
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="grid-4col">
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
                <Users size={18} color="var(--color-accent)" />
              </div>
              <div className="stat-value" style={{ color: "var(--color-accent)" }}>
                {loading ? "..." : stats.totalUsers}
              </div>
              <div className="stat-label">Total Users</div>
            </div>

            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
                <Briefcase size={18} color="var(--color-warning)" />
              </div>
              <div className="stat-value" style={{ color: "var(--color-warning)" }}>
                {loading ? "..." : stats.totalInterviews}
              </div>
              <div className="stat-label">Mock Interviews</div>
            </div>

            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
                <MessageSquare size={18} color="var(--color-success)" />
              </div>
              <div className="stat-value" style={{ color: "var(--color-success)" }}>
                {loading ? "..." : stats.totalSessions}
              </div>
              <div className="stat-label">Practice Sessions</div>
            </div>
          </div>
        </div>
      )}

      {/* Users Directory Tab */}
      {activeTab === "users" && (
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>User Accounts</h3>
            <div style={{ position: "relative", width: "240px" }}>
              <Search size={14} color="var(--text-muted)" style={{ position: "absolute", left: "10px", top: "10px" }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: "32px", fontSize: "12px", height: "34px" }}
              />
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-light)", textAlign: "left", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "10px" }}>Name</th>
                  <th style={{ padding: "10px" }}>Email</th>
                  <th style={{ padding: "10px" }}>Role</th>
                  <th style={{ padding: "10px" }}>Registration Date</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
                      {loading ? "Loading user list..." : "No users found."}
                    </td>
                  </tr>
                ) : (
                  usersList.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td style={{ padding: "10px", fontWeight: "600", color: "var(--text-primary)" }}>{u.name || "User"}</td>
                      <td style={{ padding: "10px", color: "var(--text-secondary)" }}>{u.email}</td>
                      <td style={{ padding: "10px" }}>
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "600",
                          background: u.role === "admin" ? "var(--color-accent-glow)" : "var(--bg-tertiary)",
                          color: u.role === "admin" ? "var(--color-accent)" : "var(--text-secondary)",
                        }}>
                          {u.role || "user"}
                        </span>
                      </td>
                      <td style={{ padding: "10px", color: "var(--text-secondary)" }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Infrastructure Settings Tab */}
      {activeTab === "aisettings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "12px", color: "var(--color-accent)" }}>Groq AI Configuration</h3>
            <form onSubmit={handleSaveApiKey}>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label className="form-label">Groq API Key</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="gsk_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ fontSize: "12px", padding: "6px 16px" }} disabled={isSavingKey || !apiKey.trim()}>
                {isSavingKey ? "Saving..." : "Save Groq Key"}
              </button>
            </form>
          </div>

          <div className="card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "12px", color: "var(--color-success)" }}>LiveKit WebRTC Configuration</h3>
            <form onSubmit={handleSaveLivekit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="form-group" style={{ marginBottom: "0" }}>
                <label className="form-label">LiveKit Server URL</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="wss://..."
                  value={lkUrl}
                  onChange={(e) => setLkUrl(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: "0" }}>
                <label className="form-label">LiveKit API Key</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="devkey..."
                  value={lkKey}
                  onChange={(e) => setLkKey(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: "0" }}>
                <label className="form-label">LiveKit API Secret</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="secret..."
                  value={lkSecret}
                  onChange={(e) => setLkSecret(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: "0" }}>
                <label className="form-label">LiveKit Agent Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="assistant-033"
                  value={lkAgent}
                  onChange={(e) => setLkAgent(e.target.value)}
                />
              </div>
              <div style={{ marginTop: "8px" }}>
                <button type="submit" className="btn btn-primary" style={{ fontSize: "12px", padding: "6px 16px" }} disabled={isSavingKey || !lkUrl.trim() || !lkKey.trim() || !lkSecret.trim()}>
                  {isSavingKey ? "Saving..." : "Save LiveKit Credentials"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
