import { useState } from "react";
import {
  FileText,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Search,
  AlertTriangle,
  Zap,
  Edit3,
} from "lucide-react";

export default function ResumeView({ onSessionComplete, backendUrl }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

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

  const analyzeResume = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please upload a resume file first.");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("resumeFile", selectedFile);
      formData.append("targetRole", targetRole);

      const response = await fetch(`${backendUrl}/api/analyze-resume`, {
        method: "POST",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "include",
        body: formData,
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();

      setAnalysis(data.analysis);
      if (onSessionComplete) onSessionComplete(data.gamification);
    } catch (err) {
      setError("Analysis failed: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    setSelectedFile(null);
    setError("");
  };

  const getScoreColor = (score) => {
    if (score >= 75) return "var(--color-success)";
    if (score >= 50) return "var(--color-warning)";
    return "var(--color-danger)";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ─── Upload & Configure ──────────────────────────────── */}
      {!analysis && (
        <div className="card">
          <div className="card-title">
            <FileText size={20} color="var(--color-accent)" />
            Resume ATS Scanner
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
            Upload your resume to scan it against ATS (Applicant Tracking System)
            specifications. Groq AI deeply scans for keyword density, quantifiable
            achievements, action verb usage, formatting quality, and section
            organization — then provides targeted rewrite suggestions.
          </p>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", backgroundColor: "var(--color-danger-glow)", border: "1px solid var(--color-danger)", borderRadius: "10px", color: "var(--text-primary)", fontSize: "13px", marginBottom: "16px" }}>
              <AlertCircle size={16} color="var(--color-danger)" /> {error}
            </div>
          )}

          <form onSubmit={analyzeResume}>
            <div className="form-group">
              <label className="form-label">Target Role</label>
              <select className="form-control" value={targetRole} onChange={(e) => setTargetRole(e.target.value)}>
                <option value="Software Engineer">Software Engineer</option>
                <option value="Product Manager">Product Manager</option>
                <option value="Data Analyst">Data Analyst</option>
                <option value="UI/UX Designer">UI/UX Designer</option>
                <option value="Financial Analyst">Financial Analyst</option>
                <option value="Customer Success Manager">Customer Success Manager</option>
                <option value="General Professional">General Professional</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Upload Resume (PDF / DOCX)</label>
              <div className="resume-upload-box" style={{ border: "2px dashed var(--border-light)", borderRadius: "12px", padding: "40px 20px", textAlign: "center", backgroundColor: "var(--bg-tertiary)", cursor: "pointer", position: "relative", transition: "all 0.2s ease" }}>
                <input type="file" accept=".pdf,.docx" onChange={handleFileChange} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
                <Upload size={36} color="var(--color-accent)" style={{ marginBottom: "12px", opacity: 0.8 }} />
                <div style={{ fontSize: "14px", fontWeight: "600" }}>
                  {selectedFile ? selectedFile.name : "Drag & drop file here or click to browse"}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Supports PDF and DOCX formats
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={isAnalyzing || !selectedFile}>
              {isAnalyzing ? (
                <><RefreshCw className="animate-spin" size={16} /> Scanning ATS metrics...</>
              ) : (
                <><Search size={16} /> Analyze Resume</>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ─── Analysis Results ────────────────────────────────── */}
      {analysis && (
        <>
          {/* Scores Overview */}
          <div className="card" style={{ borderColor: "var(--color-success)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div className="card-title" style={{ margin: 0, color: "var(--color-success)" }}>
                <CheckCircle size={20} /> ATS Analysis Results — {targetRole}
              </div>
              <button className="btn btn-secondary" onClick={resetAnalysis}>
                <RefreshCw size={14} /> Scan Another
              </button>
            </div>

            <div className="grid-4col" style={{ marginBottom: "24px" }}>
              {[
                { label: "Resume Score", value: analysis.resumeScore, color: getScoreColor(analysis.resumeScore) },
                { label: "Keyword Match", value: analysis.keywordMatchScore, color: getScoreColor(analysis.keywordMatchScore) },
                { label: "Impact Score", value: analysis.impactScore, color: getScoreColor(analysis.impactScore) },
                { label: "Formatting", value: analysis.grammarFormattingScore, color: getScoreColor(analysis.grammarFormattingScore) },
              ].map((item) => (
                <div key={item.label} style={{ textAlign: "center", padding: "16px", backgroundColor: "var(--bg-tertiary)", borderRadius: "12px" }}>
                  <div style={{ fontSize: "28px", fontWeight: "800", color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>{item.label}</div>
                </div>
              ))}
            </div>

            {/* Score Bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Keyword Match", value: analysis.keywordMatchScore, color: "var(--color-accent)" },
                { label: "Impact & Achievements", value: analysis.impactScore, color: "var(--color-info)" },
                { label: "Grammar & Formatting", value: analysis.grammarFormattingScore, color: "var(--color-warning)" },
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                    <span>{item.label}</span>
                    <strong>{item.value}%</strong>
                  </div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div className="grid-2col">
            <div className="card">
              <div className="card-title" style={{ color: "var(--color-success)" }}>
                <CheckCircle size={18} /> Matched Keywords ({analysis.matchedKeywords?.length || 0})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {analysis.matchedKeywords?.map((kw, idx) => (
                  <span key={idx} style={{ padding: "4px 12px", backgroundColor: "var(--color-success-glow)", borderRadius: "20px", border: "1px solid rgba(16,185,129,0.2)", fontSize: "12px", fontWeight: "500", color: "var(--color-success)" }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-title" style={{ color: "var(--color-danger)" }}>
                <AlertCircle size={18} /> Missing Keywords ({analysis.missingKeywords?.length || 0})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {analysis.missingKeywords?.map((kw, idx) => (
                  <span key={idx} style={{ padding: "4px 12px", backgroundColor: "var(--color-danger-glow)", borderRadius: "20px", border: "1px solid rgba(239,68,68,0.2)", fontSize: "12px", fontWeight: "500", color: "var(--color-danger)" }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Strengths & Red Flags */}
          <div className="grid-2col">
            <div className="card" style={{ borderColor: "rgba(16,185,129,0.25)" }}>
              <div className="card-title" style={{ color: "var(--color-success)" }}>
                <TrendingUp size={18} /> Strengths
              </div>
              <ul style={{ paddingLeft: "16px", fontSize: "13px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "8px" }}>
                {analysis.strengths?.map((s, idx) => <li key={idx}>{s}</li>)}
              </ul>
            </div>

            <div className="card" style={{ borderColor: "rgba(239,68,68,0.25)" }}>
              <div className="card-title" style={{ color: "var(--color-danger)" }}>
                <AlertTriangle size={18} /> Red Flags
              </div>
              <ul style={{ paddingLeft: "16px", fontSize: "13px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "8px" }}>
                {analysis.redFlags?.map((r, idx) => <li key={idx}>{r}</li>)}
              </ul>
            </div>
          </div>

          {/* Bullet Rewrites */}
          {analysis.bulletRewrites && analysis.bulletRewrites.length > 0 && (
            <div className="card">
              <div className="card-title">
                <Edit3 size={18} color="var(--color-accent)" />
                Suggested Bullet Point Rewrites
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {analysis.bulletRewrites.map((rewrite, idx) => (
                  <div key={idx} style={{ padding: "16px", backgroundColor: "var(--bg-tertiary)", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", fontWeight: "600" }}>Original:</div>
                    <div style={{ fontSize: "13px", color: "var(--color-danger)", marginBottom: "12px", paddingLeft: "10px", borderLeft: "2px solid var(--color-danger)" }}>
                      {rewrite.original}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", fontWeight: "600" }}>Suggested Rewrite:</div>
                    <div style={{ fontSize: "13px", color: "var(--color-success)", marginBottom: "12px", paddingLeft: "10px", borderLeft: "2px solid var(--color-success)" }}>
                      {rewrite.rewrite}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "flex-start", gap: "6px" }}>
                      <Zap size={12} color="var(--color-accent)" style={{ marginTop: "2px", flexShrink: 0 }} />
                      {rewrite.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
