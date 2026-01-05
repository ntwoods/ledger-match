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

  const rawItems = res.data?.items || [];
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map(normalizeUpcomingItem).filter((it) => it.party);
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

function normalizeUpcomingItem(raw) {
  if (Array.isArray(raw)) {
    // Supports potential row-array responses: [party, markedOn, matchedStatus, ..., weeklyDay]
    const party = String(raw[0] || "").trim();
    const dateISO = raw[1] ?? "";
    const matchedStatus = raw[2] ?? "";
    const weeklyDay = raw[5] ?? raw[4] ?? "";
    return {
      party,
      dateISO,
      dateDisplay: raw[3] ?? "",
      matchedStatus,
      weeklyDay,
    };
  }

  const obj = raw && typeof raw === "object" ? raw : {};
  const party = String(obj.party ?? obj.particulars ?? obj.Particulars ?? obj.name ?? "").trim();
  const dateISO = obj.dateISO ?? obj.date ?? obj.markDate ?? obj.markedOn ?? obj.markedOnISO ?? "";
  const dateDisplay = obj.dateDisplay ?? obj.displayDate ?? obj.markedOnDisplay ?? obj.markDateDisplay ?? dateISO ?? "";
  const matchedStatus = obj.matchedStatus ?? obj.matched ?? obj.status ?? obj.colC ?? "";
  const weeklyDay =
    obj.weeklyDay ??
    obj.weeklyDayRule ??
    obj.weekly ??
    obj.weekday ??
    obj.dayRule ??
    obj.colF ??
    "";

  return {
    ...obj,
    party,
    dateISO,
    dateDisplay,
    matchedStatus,
    weeklyDay,
  };
}
