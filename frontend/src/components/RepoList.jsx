import { useState, useEffect } from "react";
import { getRepos, createRepo, updateRepo, deleteRepo } from "../api/repos";

export default function RepoList({ onOpenRepo, onOpenAccounts }) {
  const [repos, setRepos] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => getRepos().then(setRepos);
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ name: "", description: "" });
    setError("");
    setModal("create");
  };

  const openEdit = (repo) => {
    setForm({ name: repo.name, description: repo.description || "" });
    setError("");
    setModal(repo);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Repo name is required"); return; }
    const isEdit = modal !== "create";
    const res = isEdit ? await updateRepo(modal.id, form) : await createRepo(form);
    if (res.ok) { setModal(null); load(); }
    else { const d = await res.json(); setError(d.detail || "Something went wrong"); }
  };

  const handleDelete = async () => {
    await deleteRepo(confirmDelete.id);
    setConfirmDelete(null);
    load();
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>📚 Knowledge Repositories</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={styles.btnSecondary} onClick={onOpenAccounts}>👥 Accounts</button>
          <button style={styles.btnPrimary} onClick={openCreate}>+ Create Repo</button>
        </div>
      </header>

      {repos.length === 0 ? (
        <p style={styles.empty}>No repositories yet. Click "Create Repo" to get started.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Repo Name</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Sources</th>
              <th style={styles.th}>Last Updated</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {repos.map(repo => (
              <tr key={repo.id} style={styles.tr}>
                <td style={{ ...styles.td, fontWeight: 600, cursor: "pointer", color: "#1a1a1a" }} onClick={() => onOpenRepo(repo)}>{repo.name}</td>
                <td style={styles.td}>{repo.description || <em style={{ color: "#aaa" }}>—</em>}</td>
                <td style={styles.td}>{repo.source_count}</td>
                <td style={styles.td}>{new Date(repo.updated_at).toLocaleDateString()}</td>
                <td style={styles.td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={styles.btnOpen} onClick={() => onOpenRepo(repo)}>Open</button>
                    <button style={styles.btnEdit} onClick={() => openEdit(repo)}>Edit</button>
                    <button style={styles.btnDelete} onClick={() => setConfirmDelete(repo)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>{modal === "create" ? "Create Repo" : "Edit Repo"}</h2>
            <label style={styles.label}>Repo Name *</label>
            <input style={styles.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Salesforce SI Knowledge" />
            <label style={styles.label}>Description (optional)</label>
            <textarea style={{ ...styles.input, height: 80, resize: "vertical" }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What is this repo for?" />
            {error && <p style={styles.error}>⚠️ {error}</p>}
            <div style={styles.modalActions}>
              <button style={styles.btnSecondary} onClick={() => setModal(null)}>Cancel</button>
              <button style={styles.btnPrimary} onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Delete Repo?</h2>
            <p>Delete <strong>"{confirmDelete.name}"</strong> and all its sources metadata? This cannot be undone.</p>
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
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 },
  title: { fontSize: 24, fontWeight: 700, margin: 0, color: "#1a1a1a" },
  empty: { color: "#999", textAlign: "center", marginTop: 80, fontSize: 15 },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  th: { padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#555", borderBottom: "1px solid #eee", background: "#fafafa" },
  tr: { borderBottom: "1px solid #f0f0f0" },
  td: { padding: "14px 16px", fontSize: 14, color: "#444" },
  btnPrimary: { background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer", fontWeight: 600, fontSize: 13.5 },
  btnSecondary: { background: "#ebebeb", color: "#333", border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer", fontSize: 13.5 },
  btnOpen: { background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 },
  btnEdit: { background: "#f4f4f4", color: "#444", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 },
  btnDelete: { background: "#fee2e2", color: "#c0392b", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 },
  btnDeleteConfirm: { background: "#c0392b", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer", fontWeight: 600 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#fff", borderRadius: 16, padding: 32, width: 440, maxWidth: "90vw", boxShadow: "0 24px 60px rgba(0,0,0,0.15)" },
  modalTitle: { margin: "0 0 20px", fontSize: 19, fontWeight: 700, color: "#1a1a1a" },
  label: { display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: "#555", textTransform: "uppercase", letterSpacing: "0.4px" },
  input: { width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: "border-box", color: "#1a1a1a", background: "#fafafa" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 },
  error: { color: "#c0392b", fontSize: 13, margin: "-8px 0 12px", fontWeight: 500 },
};