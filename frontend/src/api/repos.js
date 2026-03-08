const BASE = "http://localhost:8000";

export const getRepos = () =>
  fetch(`${BASE}/repos`).then(r => r.json());

export const getRepo = (id) =>
  fetch(`${BASE}/repos/${id}`).then(r => r.json());

export const createRepo = (data) =>
  fetch(`${BASE}/repos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const updateRepo = (id, data) =>
  fetch(`${BASE}/repos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const deleteRepo = (id) =>
  fetch(`${BASE}/repos/${id}`, { method: "DELETE" });