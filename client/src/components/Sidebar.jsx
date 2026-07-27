
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Briefcase,
  FileText,
  Video,
  Settings,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Menu
} from "lucide-react";

export default function Sidebar({
  currentUser,
  keyStatus,
  setShowSettings,
  handleSignOut,
  sidebarOpen,
  setSidebarOpen
}) {
  const navItems = currentUser?.role === "admin"
    ? [{ to: "/admin", label: "Admin Control Center", icon: ShieldCheck }]
    : [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/practice", label: "Speech Practice", icon: MessageSquare },
        { to: "/interview", label: "Mock Interview", icon: Briefcase },
        { to: "/resume", label: "Resume Scan", icon: FileText },
        { to: "/presentation", label: "Pitch Coach", icon: Video },
      ];

  return (
    <div className={`sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
      <div className="sidebar-logo">
        <span>VocalEdge AI</span>
        <button
          className="sidebar-toggle-btn"
          onClick={() => setSidebarOpen(false)}
          title="Collapse Sidebar"
          aria-label="Collapse Sidebar"
        >
          <Menu size={18} />
        </button>
      </div>

      {currentUser && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px",
          marginBottom: "16px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "12px",
        }}>
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "var(--color-cta)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "13px",
            fontWeight: "700",
            flexShrink: 0,
          }}>
            {(currentUser.name || "U").charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentUser.name || "User"}
            </div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentUser.email || ""}
            </div>
          </div>
        </div>
      )}

      <div className="sidebar-menu">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
            onClick={() => {
              if (window.innerWidth <= 768) {
                setSidebarOpen(false);
              }
            }}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="sidebar-footer">
        <div
          className="sidebar-item"
          onClick={() => setShowSettings(true)}
          style={{ padding: "8px 12px", fontSize: "14px" }}
        >
          <Settings size={16} />
          <span>Settings</span>
        </div>

        <div
          className="sidebar-item"
          onClick={handleSignOut}
          style={{ padding: "8px 12px", fontSize: "14px", color: "rgba(255,255,255,0.5)" }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </div>
      </div>
    </div>
  );
}
