import { jsonp } from "./jsonp";

const API_URL = import.meta.env.VITE_GAS_WEBAPP_URL;

function ensureUrl() {
  if (!API_URL) throw new Error("Missing VITE_GAS_WEBAPP_URL in .env");
  return API_URL;
}

export async function login(username, password) {
  const res = await jsonp(ensureUrl(), { action: "login", username, password });
  if (!res?.ok) throw new Error(res?.error || "Login failed");
  return res.data;
}

export async function getUpcoming(token) {
  const res = await jsonp(ensureUrl(), { action: "getUpcoming", token });
  if (!res?.ok) throw new Error(res?.error || "Failed to load upcoming");
  return res.data?.items || [];
}

export async function scheduleParty(token, party, dateISO) {
  const res = await jsonp(ensureUrl(), { action: "schedule", token, party, date: dateISO });
  if (!res?.ok) throw new Error(res?.error || "Schedule failed");
  return res.data;
}

export async function markMatched(token, party) {
  const res = await jsonp(ensureUrl(), { action: "matched", token, party });
  if (!res?.ok) throw new Error(res?.error || "Log failed");
  return res.data;
}

export async function businessClosed(token, party) {
  const res = await jsonp(ensureUrl(), { action: "businessClosed", token, party });
  if (!res?.ok) throw new Error(res?.error || "Business Closed failed");
  return res.data;
}
