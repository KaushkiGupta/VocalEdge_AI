
import { X, Settings } from "lucide-react";

export default function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  setApiKey,
  isSavingKey,
  handleSaveApiKey,
  lkUrl,
  setLkUrl,
  lkKey,
  setLkKey,
  lkSecret,
  setLkSecret,
  lkAgent,
  setLkAgent,
  handleSaveLivekit,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button
          style={{ position: "absolute", right: "16px", top: "16px", background: "none", border: "none", cursor: "pointer" }}
          onClick={onClose}
        >
          <X size={20} color="var(--text-secondary)" />
        </button>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: "700", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Settings size={20} color="var(--color-accent)" /> Settings Console
        </h2>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
          Configure your Groq and LiveKit API credentials. These credentials are saved securely in the backend server's `.env` file.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <form onSubmit={handleSaveApiKey} style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: "24px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px", color: "var(--color-accent)" }}>Groq AI Settings</h3>
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

          <form onSubmit={handleSaveLivekit}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px", color: "var(--color-success)" }}>LiveKit Settings</h3>
            <div className="form-group" style={{ marginBottom: "12px" }}>
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
            <div className="form-group" style={{ marginBottom: "12px" }}>
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
            <div className="form-group" style={{ marginBottom: "12px" }}>
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
            <div className="form-group" style={{ marginBottom: "12px" }}>
              <label className="form-label">LiveKit Agent Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="assistant-033"
                value={lkAgent}
                onChange={(e) => setLkAgent(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ fontSize: "12px", padding: "6px 16px" }} disabled={isSavingKey || !lkUrl.trim() || !lkKey.trim() || !lkSecret.trim()}>
              {isSavingKey ? "Saving..." : "Save LiveKit Keys"}
            </button>
          </form>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
}
