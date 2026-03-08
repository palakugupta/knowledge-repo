const BASE = "http://localhost:8000";

export const getSources = (repoId) =>
  fetch(`${BASE}/repos/${repoId}/sources`).then(r => r.json());

export const uploadSource = (repoId, formData) =>
  fetch(`${BASE}/repos/${repoId}/sources`, {
    method: "POST",
    body: formData,
  });

export const deleteSource = (id) =>
  fetch(`${BASE}/sources/${id}`, { method: "DELETE" });