const BASE = "http://localhost:8000";

export const getAccounts = () =>
  fetch(`${BASE}/accounts`).then(r => r.json());

export const createAccount = (data) =>
  fetch(`${BASE}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const updateAccount = (id, data) =>
  fetch(`${BASE}/accounts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const deleteAccount = (id) =>
  fetch(`${BASE}/accounts/${id}`, { method: "DELETE" });