import { useState, useEffect } from "react";
import { getSources, uploadSource, deleteSource } from "../api/sources";
import { getAccounts } from "../api/accounts";

export default function RepoDetail({ repo, onBack }) {
  const [sources, setSources] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [file, setFile] = useState(null);
  const [artifactType, setArtifactType] = useState("SOW");
  const [linkedTo, setLinkedTo] = useState("internal");
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => getSources(repo.id).then(setSources);
  useEffect(() => { load(); getAccounts().then(setAccounts); }, []);

  const handleUpload = async () => {
    setError("");
    if (!file) { setError("Please select a file"); return; }
    if (linkedTo === "account" && !accountId) { setError("Please select an account"); return; }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("artifact_type", artifactType);
    formData.append("is_internal", linkedTo === "internal" ? "true" : "false");
    if (linkedTo === "account" && accountId) formData.append("account_id", accountId);

    const res = await uploadSource(repo.id, formData);
    setUploading(false);

    if (res.ok) {
      setShowAddModal(false);
      setFile(null);
      setArtifactType("SOW");
      setLinkedTo("internal");
      setAccountId("");
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
      load();
    } else {
      const d = await res.json();
      setError(d.detail || "Upload failed");
    }
  };

  const handleDelete = async () => {
    await deleteSource(confirmDelete.id);
    setConfirmDelete(null);
    load();
  };

  const formatSize = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={styles.page}>
      <button style={styles.backBtn} onClick={onBack}>← Back to Repos</button>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>📁 {repo.name}</h1>
          {repo.description && <p style={styles.desc}>{repo.description}</p>}
          <p style={styles.stat}>{sources.length} source{sources.length !== 1 ? "s" : ""}</p>
        </div>
        <button style={styles.btnPrimary} onClick={() => setShowAddModal(true)}>+ Add Source</button>
      </header>

      {uploadSuccess && (
        <div style={styles.successBanner}>✓ File uploaded successfully!</div>
      )}

      {sources.length === 0 ? (
        <p style={styles.empty}>No sources yet. Click "Add Source" to upload files.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Filename</th>
              <th style={styles.th}>Artifact Type</th>
              <th style={styles.th}>Linked To</th>
              <th style={styles.th}>Size</th>
              <th style={styles.th}>Uploaded At</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.map(source => (
              <tr key={source.id} style={styles.tr}>
                <td style={{ ...styles.td, fontWeight: 600 }}>{source.filename}</td>
                <td style={styles.td}><span style={styles.badge}>{source.artifact_type}</span></td>
                <td style={styles.td}>
                  {source.is_internal
                    ? <span style={styles.internalBadge}>Internal</span>
                    : <span style={styles.accountBadge}>{source.account_name}</span>
                  }
                </td>
                <td style={styles.td}>{formatSize(source.size_bytes)}</td>
                <td style={styles.td}>{new Date(source.uploaded_at).toLocaleDateString()}</td>
                <td style={styles.td}>
                  <button style={styles.btnDelete} onClick={() => setConfirmDelete(source)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showAddModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Add Source</h2>

            <label style={styles.label}>File *</label>
            <input
              type="file"
              accept=".docx,.pdf,.png,.pptx"
              style={styles.fileInput}
              onChange={e => setFile(e.target.files[0])}
            />
            {file && <p style={styles.fileSelected}>📄 {file.name}</p>}

            <label style={styles.label}>Artifact Type *</label>
            <select style={styles.input} value={artifactType} onChange={e => setArtifactType(e.target.value)}>
              <option value="SOW">SOW</option>
              <option value="Proposal">Proposal</option>
              <option value="DesignDocument">Design Document</option>
              <option value="ProcessMap">Process Map</option>
              <option value="DiscoveryNotes">Discovery Notes</option>
              <option value="Other">Other</option>
            </select>

            <label style={styles.label}>Linked To *</label>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input type="radio" value="internal" checked={linkedTo === "internal"} onChange={() => setLinkedTo("internal")} />
                <span>Internal</span>
              </label>
              <label style={styles.radioLabel}>
                <input type="radio" value="account" checked={linkedTo === "account"} onChange={() => setLinkedTo("account")} />
                <span>Account</span>
              </label>
            </div>

            {linkedTo === "account" && (
              <>
                <label style={styles.label}>Select Account *</label>
                <select style={styles.input} value={accountId} onChange={e => setAccountId(e.target.value)}>
                  <option value="">— Select Account —</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </>
            )}

            {error && <p style={styles.error}>⚠️ {error}</p>}

            <div style={styles.modalActions}>
              <button style={styles.btnSecondary} onClick={() => { setShowAddModal(false); setError(""); }}>Cancel</button>
              <button style={styles.btnPrimary} onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Delete Source?</h2>
            <p>Delete <strong>"{confirmDelete.filename}"</strong>? This cannot be undone.</p>
            <div style={styles.modalActions}>
              <button style={styles.btnSecondary} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button style={styles.btnDeleteConfirm} onClick={handleDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "40px 32px", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", background: "#f0f0f0", minHeight: "100vh" },
  backBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#555", marginBottom: 16, padding: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 },
  title: { fontSize: 24, fontWeight: 700, margin: "0 0 4px", color: "#1a1a1a" },
  desc: { color: "#777", fontSize: 14, margin: "0 0 4px" },
  stat: { color: "#999", fontSize: 13, margin: 0 },
  empty: { color: "#999", textAlign: "center", marginTop: 80, fontSize: 15 },
  successBanner: { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontWeight: 600, fontSize: 14 },
  fileSelected: { color: "#555", fontSize: 13, margin: "-8px 0 12px", fontStyle: "italic" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  th: { padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#555", borderBottom: "1px solid #eee", background: "#fafafa" },
  tr: { borderBottom: "1px solid #f0f0f0" },
  td: { padding: "14px 16px", fontSize: 14, color: "#444" },
  badge: { background: "#e0e7ff", color: "#3730a3", padding: "3px 8px", borderRadius: 5, fontSize: 12, fontWeight: 600 },
  internalBadge: { background: "#f0fdf4", color: "#166534", padding: "3px 8px", borderRadius: 5, fontSize: 12, fontWeight: 600 },
  accountBadge: { background: "#fff7ed", color: "#9a3412", padding: "3px 8px", borderRadius: 5, fontSize: 12, fontWeight: 600 },
  btnPrimary: { background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer", fontWeight: 600, fontSize: 13.5 },
  btnSecondary: { background: "#ebebeb", color: "#333", border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer", fontSize: 13.5 },
  btnDelete: { background: "#fee2e2", color: "#c0392b", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 },
  btnDeleteConfirm: { background: "#c0392b", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer", fontWeight: 600 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#fff", borderRadius: 16, padding: 32, width: 480, maxWidth: "90vw", boxShadow: "0 24px 60px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" },
  modalTitle: { margin: "0 0 20px", fontSize: 19, fontWeight: 700, color: "#1a1a1a" },
  label: { display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: "#555", textTransform: "uppercase", letterSpacing: "0.4px" },
  input: { width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: "border-box", color: "#1a1a1a", background: "#fafafa" },
  fileInput: { width: "100%", marginBottom: 8, fontSize: 14 },
  radioGroup: { display: "flex", gap: 20, marginBottom: 16 },
  radioLabel: { display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer", color: "#1a1a1a" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 },
  error: { color: "#c0392b", fontSize: 13, margin: "-8px 0 12px", fontWeight: 500 },
};