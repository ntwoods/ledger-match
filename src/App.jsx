import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { getUpcoming, login, scheduleParty, markMatched } from "./api/index.js";
import TopBar from "./components/TopBar.jsx";
import Login from "./components/Login.jsx";
import PartyCard from "./components/PartyCard.jsx";
import ScheduleModal from "./components/ScheduleModal.jsx";

const DEBUG = false;

const LS = {
  token: "lmp_token",
  user: "lmp_user",
  suppress: "lmp_suppress_v1",
};

function loadSuppress() {
  try { return JSON.parse(localStorage.getItem(LS.suppress) || "{}"); } catch { return {}; }
}
function saveSuppress(obj) {
  localStorage.setItem(LS.suppress, JSON.stringify(obj));
}
function suppressKey(party, dateISO, action) {
  return `${dateISO}__${party}__${action}`.toLowerCase();
}

const IST_TZ = "Asia/Kolkata";
const IST_OFFSET_MS = 330 * 60 * 1000;

const IST_DATE_DTF = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function makeISTStartDate(year, month1Based, day) {
  // Create a Date that represents 00:00 in IST for the given Y/M/D.
  const utcMidnightMs = Date.UTC(year, month1Based - 1, day, 0, 0, 0, 0);
  return new Date(utcMidnightMs - IST_OFFSET_MS);
}

function istDateKeyFromDate(date) {
  return IST_DATE_DTF.format(date); // YYYY-MM-DD in IST
}

function parseMarkedOnToISTStart(value) {
  if (value == null) return null;

  if (Object.prototype.toString.call(value) === "[object Date]") {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const key = istDateKeyFromDate(d);
    const [y, m, day] = key.split("-").map(Number);
    return makeISTStartDate(y, m, day);
  }

  const s = String(value).trim();
  if (!s) return null;

  const nums = s.match(/\d+/g);
  if (!nums || nums.length < 3) return null;

  const a = nums[0];
  const b = nums[1];
  const c = nums[2];

  let year;
  let month;
  let day;

  if (a.length === 4) {
    // YYYY-MM-DD (or YYYY/MM/DD) possibly with time after
    year = Number(a);
    month = Number(b);
    day = Number(c);
  } else if (c.length === 4) {
    // DD-MM-YYYY (or DD/MM/YYYY) possibly with time after
    day = Number(a);
    month = Number(b);
    year = Number(c);
  } else if (c.length === 2) {
    // DD-MM-YY (or DD/MM/YY) possibly with time after
    day = Number(a);
    month = Number(b);
    const yy = Number(c);
    year = yy >= 70 ? 1900 + yy : 2000 + yy;
  } else {
    return null;
  }

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (year < 1900 || year > 2500) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const dt = makeISTStartDate(year, month, day);
  // Validate: JS Date auto-rolls invalid dates (e.g., 31 Feb). Ensure it stays in same month/day in IST.
  const key = istDateKeyFromDate(dt);
  const [vy, vm, vd] = key.split("-").map(Number);
  if (vy !== year || vm !== month || vd !== day) return null;

  return dt;
}

function getISTTodayStart() {
  const key = istDateKeyFromDate(new Date());
  const [y, m, day] = key.split("-").map(Number);
  return makeISTStartDate(y, m, day);
}

function dateKeyFromAny(value) {
  const d = parseMarkedOnToISTStart(value);
  return d ? istDateKeyFromDate(d) : "";
}

function rawMatchedStatus(item) {
  return item?.matchedStatus ?? item?.matched ?? item?.status ?? item?.isMatched ?? item?.colC ?? "";
}

function isExplicitlyMatched(item) {
  const raw = rawMatchedStatus(item);
  if (typeof raw === "boolean") return raw === true;
  if (typeof raw === "number") return raw !== 0;
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return false; // blank => pending
  return s === "matched"; // only explicit "Matched" counts as matched
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(LS.token) || "");
  const [user, setUser] = useState(() => localStorage.getItem(LS.user) || "");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suppressMap, setSuppressMap] = useState(() => loadSuppress());

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedulePartyName, setSchedulePartyName] = useState("");
  const [scheduleCurrentDate, setScheduleCurrentDate] = useState("");

  const [busyId, setBusyId] = useState(""); // party|action

  useEffect(() => {
    setSuppressMap(loadSuppress());
  }, [token]);

  const filteredItems = useMemo(() => {
    return items
      .filter((it) => !isExplicitlyMatched(it)) // keep "only pending/unmatched" behavior
      .filter((it) => {
        const dateISO = dateKeyFromAny(it.dateISO) || String(it.dateISO || "").trim();
        const k1 = suppressKey(it.party, dateISO, "matched");
        const k2 = suppressKey(it.party, dateISO, "schedule");
        // hide if handled recently (client-side only)
        return !suppressMap[k1] && !suppressMap[k2];
      });
  }, [items, suppressMap]);

  const grouped = useMemo(() => {
    const todayStart = getISTTodayStart();
    const todayMs = todayStart.getTime();
    const overdue = [];
    const today = [];
    const upcoming = [];

    for (const it of filteredItems) {
      const markedStart = parseMarkedOnToISTStart(it.dateISO);
      if (!markedStart) {
        today.push(it);
        continue;
      }

      const ms = markedStart.getTime();
      if (ms < todayMs) overdue.push(it);
      else if (ms === todayMs) today.push(it);
      else upcoming.push(it);
    }

    const byDateThenParty = (a, b) =>
      String(a.dateISO || "").localeCompare(String(b.dateISO || "")) ||
      String(a.party || "").localeCompare(String(b.party || ""));

    overdue.sort(byDateThenParty);
    today.sort(byDateThenParty);
    upcoming.sort(byDateThenParty);

    return { overdue, today, upcoming, todayISO: istDateKeyFromDate(todayStart) };
  }, [filteredItems]);

  const debugLoggedRef = useRef(false);
  useEffect(() => {
    if (!DEBUG || debugLoggedRef.current || !token) return;

    const todayStart = getISTTodayStart();
    const todayKey = istDateKeyFromDate(todayStart);

    const rows = items.slice(0, 12).map((it) => {
      const rawDate = it?.dateISO;
      const parsed = parseMarkedOnToISTStart(rawDate);
      const parsedKey = parsed ? istDateKeyFromDate(parsed) : "";
      const matchedRaw = rawMatchedStatus(it);
      const pending = !isExplicitlyMatched(it);

      const dateKey = parsedKey || String(rawDate || "").trim();
      const suppressedMatched = Boolean(suppressMap[suppressKey(it.party, dateKey, "matched")]);
      const suppressedSchedule = Boolean(suppressMap[suppressKey(it.party, dateKey, "schedule")]);

      const bucket =
        parsed == null ? "invalid-date" :
          parsed.getTime() < todayStart.getTime() ? "overdue" :
            parsed.getTime() === todayStart.getTime() ? "today" : "upcoming";

      return {
        party: it.party,
        rawDate,
        parsedKey,
        todayKey,
        matchedRaw,
        pending,
        bucket,
        suppressedMatched,
        suppressedSchedule,
      };
    });

    // eslint-disable-next-line no-console
    console.groupCollapsed("[LMP DEBUG] grouping sample (first 12 items)");
    // eslint-disable-next-line no-console
    console.log("todayStart(IST):", todayKey, todayStart.toISOString());
    // eslint-disable-next-line no-console
    console.table(rows);
    // eslint-disable-next-line no-console
    console.groupEnd();

    debugLoggedRef.current = true;
  }, [items, suppressMap, token]);

  async function handleLogin(username, password) {
    const t = toast.loading("Logging in...");
    try {
      const res = await login(username, password);
      localStorage.setItem(LS.token, res.token);
      localStorage.setItem(LS.user, res.user);
      setToken(res.token);
      setUser(res.user);
      toast.success("Login successful", { id: t });
    } catch (e) {
      toast.error(e.message || "Login failed", { id: t });
      throw e;
    }
  }

  function logout() {
    localStorage.removeItem(LS.token);
    localStorage.removeItem(LS.user);
    setToken("");
    setUser("");
    setItems([]);
    toast("Logged out");
  }

  async function refresh() {
    if (!token) return;
    setLoading(true);
    try {
      const list = await getUpcoming(token);
      setItems(list);
    } catch (e) {
      const msg = e?.message || "Failed to load data";
      toast.error(msg);
      if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("login")) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function markSuppressed(party, dateISO, action) {
    const normalizedISO = dateKeyFromAny(dateISO) || String(dateISO || "").trim();
    setSuppressMap((prev) => {
      const map = { ...(prev || {}) };
      map[suppressKey(party, normalizedISO, action)] = Date.now();

      // auto-clean old entries (keep only last ~400 by recency)
      const keys = Object.keys(map);
      if (keys.length > 500) {
        keys.sort((a, b) => map[b] - map[a]);
        const keep = keys.slice(0, 400);
        const next = {};
        keep.forEach((k) => (next[k] = map[k]));
        saveSuppress(next);
        return next;
      }

      saveSuppress(map);
      return map;
    });
  }

  async function onScheduleClick(party, dateISO) {
    setSchedulePartyName(party);
    setScheduleCurrentDate(dateISO);
    setScheduleOpen(true);
  }

  async function submitSchedule(newDateISO) {
    const party = schedulePartyName;
    const t = toast.loading("Scheduling...");
    setBusyId(party + "|schedule");
    try {
      await scheduleParty(token, party, newDateISO);
      markSuppressed(party, scheduleCurrentDate, "schedule");
      toast.success("Scheduled & logged", { id: t });
      setScheduleOpen(false);
      await refresh();
    } catch (e) {
      toast.error(e.message || "Schedule failed", { id: t });
    } finally {
      setBusyId("");
    }
  }

  async function onMatchedClick(party, dateISO) {
    const t = toast.loading("Saving log...");
    setBusyId(party + "|matched");
    try {
      await markMatched(token, party);
      // Optimistic UI: remove card immediately, then background refresh for consistency.
      const targetKey = dateKeyFromAny(dateISO) || String(dateISO || "").trim();
      setItems((prev) =>
        prev.filter((it) => !(it.party === party && (dateKeyFromAny(it.dateISO) || String(it.dateISO || "").trim()) === targetKey)),
      );
      markSuppressed(party, dateISO, "matched");
      toast.success("Logged: Ledger Matched", { id: t });
      void refresh();
    } catch (e) {
      toast.error(e.message || "Failed", { id: t });
    } finally {
      setBusyId("");
    }
  }

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="container">
      <TopBar user={user} onLogout={logout} onRefresh={refresh} loading={loading} />

      <div style={{ marginTop: 14, color: "var(--muted)", fontSize: 12 }}>
        Grouped by Mark Date in IST (<b>{grouped.todayISO}</b>). Auto refresh: <b>30s</b>.
      </div>

      <motion.div
        className="board"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="boardCol">
          <div className="boardHeader">
            <div className="boardTitle">Overdue Tasks</div>
            <div className="boardCount">{grouped.overdue.length}</div>
          </div>
          <div className="boardList">
            <AnimatePresence mode="popLayout">
              {grouped.overdue.map((it) => (
                <PartyCard
                  key={it.party + it.dateISO}
                  item={it}
                  busyId={busyId}
                  onSchedule={onScheduleClick}
                  onMatched={onMatchedClick}
                />
              ))}
            </AnimatePresence>
            {grouped.overdue.length === 0 ? (
              <div className="boardEmpty">{loading ? "Loading..." : "No overdue tasks."}</div>
            ) : null}
          </div>
        </div>

        <div className="boardDivider" />

        <div className="boardCol">
          <div className="boardHeader">
            <div className="boardTitle">Today</div>
            <div className="boardCount">{grouped.today.length}</div>
          </div>
          <div className="boardList">
            <AnimatePresence mode="popLayout">
              {grouped.today.map((it) => (
                <PartyCard
                  key={it.party + it.dateISO}
                  item={it}
                  busyId={busyId}
                  onSchedule={onScheduleClick}
                  onMatched={onMatchedClick}
                />
              ))}
            </AnimatePresence>
            {grouped.today.length === 0 ? (
              <div className="boardEmpty">{loading ? "Loading..." : "No tasks for today."}</div>
            ) : null}
          </div>
        </div>

        <div className="boardDivider" />

        <div className="boardCol">
          <div className="boardHeader">
            <div className="boardTitle">Upcoming</div>
            <div className="boardCount">{grouped.upcoming.length}</div>
          </div>
          <div className="boardList">
            <AnimatePresence mode="popLayout">
              {grouped.upcoming.map((it) => (
                <PartyCard
                  key={it.party + it.dateISO}
                  item={it}
                  busyId={busyId}
                  onSchedule={onScheduleClick}
                  onMatched={onMatchedClick}
                />
              ))}
            </AnimatePresence>
            {grouped.upcoming.length === 0 ? (
              <div className="boardEmpty">{loading ? "Loading..." : "No upcoming tasks."}</div>
            ) : null}
          </div>
        </div>
      </motion.div>

      <ScheduleModal
        open={scheduleOpen}
        party={schedulePartyName}
        currentDateISO={scheduleCurrentDate}
        busy={busyId === schedulePartyName + "|schedule"}
        onClose={() => setScheduleOpen(false)}
        onSubmit={submitSchedule}
      />
    </div>
  );
}
