import { useState, useEffect, useRef } from "react";
import { getSources, uploadSource, deleteSource } from "../api/sources";
import { getAccounts } from "../api/accounts";
import GraphViewer from "./GraphViewer";

const ARTIFACT_TYPES = ["SOW", "Proposal", "DesignDocument", "ProcessMap", "DiscoveryNotes", "Other"];

export default function RepoDetail({ repo, onBack }) {
  const [activeTab, setActiveTab] = useState("sources");

  return (
    <div style={{ padding: "32px", fontFamily: "sans-serif", maxWidth: "1200px", margin: "0 auto", color: "#1a1a1a", background: "#f0f0f0", minHeight: "100vh" }}>
      <button onClick={onBack} style={{ marginBottom: "16px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#555" }}>
        ← Back to Repos
      </button>
      <h2 style={{ margin: "0 0 4px", color: "#1a1a1a" }}>{repo.name}</h2>
      <p style={{ margin: "0 0 24px", color: "#666" }}>{repo.description}</p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "2px solid #ddd" }}>
        {["sources", "graph", "viewer"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "8px 20px", border: "none", cursor: "pointer", fontWeight: activeTab === tab ? "bold" : "normal",
            background: activeTab === tab ? "#1a1a1a" : "#eee",
            color: activeTab === tab ? "white" : "#333",
            borderRadius: "6px 6px 0 0"
          }}>
            {tab === "sources" ? "Sources" : tab === "graph" ? "Knowledge Graph" : "Knowledge Viewer"}
          </button>
        ))}
      </div>

      {activeTab === "sources" && <SourcesTab repo={repo} />}
      {activeTab === "graph" && <GraphTab repo={repo} />}
      {activeTab === "viewer" && <GraphViewer repo={repo} />}
    </div>
  );
}

// ─── SOURCES TAB ─────────────────────────────────────────────────────────────
function SourcesTab({ repo }) {
  const [sources, setSources] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [form, setForm] = useState({ artifact_type: "SOW", linked_to: "internal", account_id: "", file: null });
  const [uploading, setUploading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");

  useEffect(() => {
    getSources(repo.id).then(setSources);
    getAccounts().then(setAccounts);
  }, [repo.id]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setForm(f => ({ ...f, file }));

    // Auto-detect artifact type
    setDetecting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`http://localhost:8000/repos/${repo.id}/sources/detect-type`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.artifact_type) {
        setForm(f => ({ ...f, file, artifact_type: data.artifact_type }));
      }
    } catch (err) {
      console.error("Auto-detect failed", err);
    }
    setDetecting(false);
  };

  const handleUpload = async () => {
    if (!form.file) return alert("Please select a file");
    if (form.linked_to === "account" && !form.account_id) return alert("Please select an account");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", form.file);
    fd.append("artifact_type", form.artifact_type);
    fd.append("is_internal", form.linked_to === "internal" ? "true" : "false");
    if (form.linked_to === "account") fd.append("account_id", form.account_id);
    await uploadSource(repo.id, fd);
    const updated = await getSources(repo.id);
    setSources(updated);
    setUploading(false);
    setShowModal(false);
    setSuccess(true);
    setSelectedFileName("");
    setForm({ artifact_type: "SOW", linked_to: "internal", account_id: "", file: null });
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this source?")) return;
    await deleteSource(id);
    setSources(await getSources(repo.id));
  };

  const tdStyle = { padding: "10px 14px", fontSize: "14px", color: "#1a1a1a" };

  return (
    <div>
      {success && <div style={{ background: "#d4edda", color: "#155724", padding: "10px 16px", borderRadius: "6px", marginBottom: "16px" }}>✅ Source uploaded successfully!</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ color: "#666" }}>{sources.length} source(s)</span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setShowBulkModal(true)} style={{ padding: "8px 16px", background: "white", color: "#1a1a1a", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }}>📁 Bulk Upload</button>
          <button onClick={() => setShowModal(true)} style={{ padding: "8px 16px", background: "#1a1a1a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>+ Add Source</button>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "8px", overflow: "hidden" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            {["Filename", "Artifact Type", "Linked To", "Uploaded At", ""].map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "13px", color: "#555" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sources.map(s => (
            <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
              <td style={tdStyle}>{s.filename}</td>
              <td style={tdStyle}>{s.artifact_type}</td>
              <td style={tdStyle}>{s.is_internal ? "Internal" : (s.account_name || s.account_id)}</td>
              <td style={{ ...tdStyle, color: "#888", fontSize: "13px" }}>{new Date(s.uploaded_at).toLocaleDateString()}</td>
              <td style={{ padding: "10px 14px" }}>
                <button onClick={() => handleDelete(s.id)} style={{ background: "none", border: "1px solid #ddd", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", color: "#c00", fontSize: "12px" }}>Delete</button>
              </td>
            </tr>
          ))}
          {sources.length === 0 && <tr><td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "#aaa" }}>No sources yet</td></tr>}
        </tbody>
      </table>

      {/* Single Upload Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: "10px", padding: "28px", width: "440px", color: "#1a1a1a" }}>
            <h3 style={{ margin: "0 0 20px", color: "#1a1a1a" }}>Add Source</h3>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "13px", color: "#555" }}>File</label><br />
              <input type="file" accept=".docx,.pdf,.png,.pptx" onChange={handleFileChange} style={{ marginTop: "6px" }} />
              {selectedFileName && <div style={{ marginTop: "6px", fontSize: "13px", color: "#333" }}>📎 {selectedFileName}</div>}
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "13px", color: "#555" }}>
                Artifact Type
                {detecting && <span style={{ marginLeft: "8px", fontSize: "11px", color: "#888" }}>🔍 Auto-detecting...</span>}
                {!detecting && selectedFileName && <span style={{ marginLeft: "8px", fontSize: "11px", color: "#22c55e" }}>✓ Auto-detected</span>}
              </label><br />
              <select value={form.artifact_type} onChange={e => setForm({ ...form, artifact_type: e.target.value })}
                style={{ marginTop: "6px", width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd", color: "#1a1a1a" }}>
                {ARTIFACT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "13px", color: "#555" }}>Linked To</label><br />
              <div style={{ marginTop: "8px", display: "flex", gap: "16px", color: "#1a1a1a" }}>
                <label><input type="radio" value="internal" checked={form.linked_to === "internal"} onChange={() => setForm({ ...form, linked_to: "internal", account_id: "" })} /> Internal</label>
                <label><input type="radio" value="account" checked={form.linked_to === "account"} onChange={() => setForm({ ...form, linked_to: "account" })} /> Account</label>
              </div>
            </div>
            {form.linked_to === "account" && (
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "13px", color: "#555" }}>Account</label><br />
                <select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })}
                  style={{ marginTop: "6px", width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd", color: "#1a1a1a" }}>
                  <option value="">-- Select Account --</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
              <button onClick={() => { setShowModal(false); setSelectedFileName(""); }} style={{ padding: "8px 16px", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer", background: "white", color: "#1a1a1a" }}>Cancel</button>
              <button onClick={handleUpload} disabled={uploading || detecting} style={{ padding: "8px 16px", background: "#1a1a1a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <BulkUploadModal
          repo={repo}
          accounts={accounts}
          onClose={() => setShowBulkModal(false)}
          onDone={async () => {
            setShowBulkModal(false);
            setSources(await getSources(repo.id));
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
          }}
        />
      )}
    </div>
  );
}

// ─── BULK UPLOAD MODAL ────────────────────────────────────────────────────────
function BulkUploadModal({ repo, accounts, onClose, onDone }) {
  const [files, setFiles] = useState([]);
  const [linkedTo, setLinkedTo] = useState("internal");
  const [accountId, setAccountId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");

  const handleFilesChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleBulkUpload = async () => {
    if (files.length === 0) return alert("Please select files");
    if (linkedTo === "account" && !accountId) return alert("Please select an account");
    setUploading(true);
    setProgress(`Uploading ${files.length} files...`);

    const fd = new FormData();
    files.forEach(f => fd.append("files", f));
    fd.append("is_internal", linkedTo === "internal" ? "true" : "false");
    if (linkedTo === "account") fd.append("account_id", accountId);

    try {
      const res = await fetch(`http://localhost:8000/repos/${repo.id}/sources/bulk`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      setProgress(`✅ Uploaded ${data.count} files successfully!`);
      setTimeout(() => onDone(), 1500);
    } catch (err) {
      setProgress("❌ Upload failed. Please try again.");
      setUploading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "white", borderRadius: "10px", padding: "28px", width: "480px", color: "#1a1a1a" }}>
        <h3 style={{ margin: "0 0 8px", color: "#1a1a1a" }}>📁 Bulk Upload</h3>
        <p style={{ fontSize: "13px", color: "#666", margin: "0 0 20px" }}>Select multiple files at once. Artifact type will be auto-detected for each file.</p>

        <div style={{ marginBottom: "14px" }}>
          <label style={{ fontSize: "13px", color: "#555" }}>Files (select multiple)</label><br />
          <input type="file" multiple accept=".docx,.pdf,.png,.pptx" onChange={handleFilesChange} style={{ marginTop: "6px" }} />
          {files.length > 0 && (
            <div style={{ marginTop: "8px", fontSize: "12px", color: "#555" }}>
              {files.length} file(s) selected: {files.map(f => f.name).join(", ")}
            </div>
          )}
        </div>

        <div style={{ marginBottom: "14px" }}>
          <label style={{ fontSize: "13px", color: "#555" }}>Linked To</label><br />
          <div style={{ marginTop: "8px", display: "flex", gap: "16px", color: "#1a1a1a" }}>
            <label><input type="radio" value="internal" checked={linkedTo === "internal"} onChange={() => setLinkedTo("internal")} /> Internal</label>
            <label><input type="radio" value="account" checked={linkedTo === "account"} onChange={() => setLinkedTo("account")} /> Account</label>
          </div>
        </div>

        {linkedTo === "account" && (
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "13px", color: "#555" }}>Account</label><br />
            <select value={accountId} onChange={e => setAccountId(e.target.value)}
              style={{ marginTop: "6px", width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ddd", color: "#1a1a1a" }}>
              <option value="">-- Select Account --</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}

        {progress && (
          <div style={{ padding: "10px", background: "#f5f5f5", borderRadius: "6px", fontSize: "13px", color: "#333", marginBottom: "14px" }}>
            {progress}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer", background: "white", color: "#1a1a1a" }}>Cancel</button>
          <button onClick={handleBulkUpload} disabled={uploading} style={{ padding: "8px 16px", background: "#1a1a1a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
            {uploading ? "Uploading..." : `Upload ${files.length > 0 ? files.length + " files" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── GRAPH TAB ───────────────────────────────────────────────────────────────
function GraphTab({ repo }) {
  const [building, setBuilding] = useState(false);
  const [status, setStatus] = useState(null);
  const [artifacts, setArtifacts] = useState([]);
  const [expanded, setExpanded] = useState({});
  const pollRef = useRef(null);

  const fetchGraph = async () => {
    const res = await fetch(`http://localhost:8000/repos/${repo.id}/graph`);
    const data = await res.json();
    setArtifacts(data);
  };

  useEffect(() => {
    fetchGraph();
  }, [repo.id]);

  const startBuild = async () => {
    setBuilding(true);
    setStatus({ status: "running", message: "Starting...", artifacts_done: 0, artifacts_total: 0 });
    await fetch(`http://localhost:8000/repos/${repo.id}/build-graph`, { method: "POST" });

    pollRef.current = setInterval(async () => {
      const res = await fetch(`http://localhost:8000/repos/${repo.id}/build-graph/status`);
      const data = await res.json();
      setStatus(data);
      if (data.status === "done" || data.status === "error") {
        clearInterval(pollRef.current);
        setBuilding(false);
        fetchGraph();
      }
    }, 2000);
  };

  const toggleExpand = (sourceId) => {
    setExpanded(prev => ({ ...prev, [sourceId]: !prev[sourceId] }));
  };

  const tdStyle = { padding: "10px 14px", fontSize: "14px", color: "#1a1a1a" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <button onClick={startBuild} disabled={building} style={{ padding: "10px 20px", background: building ? "#999" : "#1a1a1a", color: "white", border: "none", borderRadius: "6px", cursor: building ? "not-allowed" : "pointer", fontWeight: "bold" }}>
          {building ? "Building..." : "🔨 Build Graph Now"}
        </button>
        {status && (
          <div style={{ fontSize: "14px", color: status.status === "error" ? "#c00" : "#555" }}>
            {status.message}
            {status.status === "running" && status.artifacts_total > 0 && (
              <span style={{ marginLeft: "8px", color: "#1a1a1a", fontWeight: "bold" }}>
                ({status.artifacts_done}/{status.artifacts_total} artifacts)
              </span>
            )}
          </div>
        )}
      </div>

      {artifacts.length > 0 && (
        <>
          <h3 style={{ margin: "0 0 12px", fontSize: "16px", color: "#1a1a1a" }}>Artifacts Overview</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "8px", overflow: "hidden" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                {["Artifact Name", "Type", "Owned By", "Sections", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "13px", color: "#555" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {artifacts.map(a => (
                <>
                  <tr key={a.source_id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={tdStyle}>{a.artifact_name}</td>
                    <td style={tdStyle}>{a.artifact_type}</td>
                    <td style={tdStyle}>{a.owned_by}</td>
                    <td style={tdStyle}>{a.section_count}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => toggleExpand(a.source_id)} style={{ background: "none", border: "1px solid #ddd", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", fontSize: "12px", color: "#1a1a1a" }}>
                        {expanded[a.source_id] ? "▲ Hide" : "▼ Expand"}
                      </button>
                    </td>
                  </tr>
                  {expanded[a.source_id] && (
                    <tr key={`${a.source_id}-sections`}>
                      <td colSpan={5} style={{ padding: "0 14px 14px 28px", background: "#fafafa" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", paddingTop: "10px" }}>
                          {a.sections.map(s => (
                            <div key={s.sub_type} style={{ background: "#e8f0fe", borderRadius: "6px", padding: "6px 12px", fontSize: "13px", color: "#1a1a1a" }}>
                              <strong>{s.label}</strong>
                              {s.content && <div style={{ color: "#555", marginTop: "4px", fontSize: "12px", maxWidth: "300px" }}>{s.content.slice(0, 120)}{s.content.length > 120 ? "..." : ""}</div>}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </>
      )}

      {artifacts.length === 0 && !building && (
        <div style={{ textAlign: "center", color: "#aaa", padding: "40px" }}>No graph built yet. Click "Build Graph Now" to start.</div>
      )}
    </div>
  );
}
