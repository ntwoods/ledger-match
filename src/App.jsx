import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { getUpcoming, login, scheduleParty, markMatched, businessClosed } from "./api/index.js";
import TopBar from "./components/TopBar.jsx";
import Login from "./components/Login.jsx";
import PartyCard from "./components/PartyCard.jsx";
import ScheduleModal from "./components/ScheduleModal.jsx";

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

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(LS.token) || "");
  const [user, setUser] = useState(() => localStorage.getItem(LS.user) || "");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedulePartyName, setSchedulePartyName] = useState("");
  const [scheduleCurrentDate, setScheduleCurrentDate] = useState("");

  const [busyId, setBusyId] = useState(""); // party|action
  const suppressMap = useMemo(() => loadSuppress(), [token]);

  const filteredItems = useMemo(() => {
    return items.filter(it => {
      const k1 = suppressKey(it.party, it.dateISO, "matched");
      const k2 = suppressKey(it.party, it.dateISO, "closed");
      const k3 = suppressKey(it.party, it.dateISO, "schedule");
      // hide if handled recently (client-side only)
      return !suppressMap[k1] && !suppressMap[k2] && !suppressMap[k3];
    });
  }, [items, suppressMap]);

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
    const map = loadSuppress();
    map[suppressKey(party, dateISO, action)] = Date.now();
    // auto-clean old entries (keep only last 500)
    const keys = Object.keys(map);
    if (keys.length > 500) {
      keys.sort((a,b)=>map[b]-map[a]);
      const keep = keys.slice(0, 400);
      const next = {};
      keep.forEach(k => next[k] = map[k]);
      saveSuppress(next);
    } else {
      saveSuppress(map);
    }
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
      markSuppressed(party, dateISO, "matched");
      toast.success("Logged: Ledger Matched", { id: t });
    } catch (e) {
      toast.error(e.message || "Failed", { id: t });
    } finally {
      setBusyId("");
    }
  }

  async function onClosedClick(party, dateISO) {
    const ok = confirm(`Business Closed for "${party}"?\nThis will remove the party from Ledger_Match.`);
    if (!ok) return;

    const t = toast.loading("Closing...");
    setBusyId(party + "|closed");
    try {
      await businessClosed(token, party);
      markSuppressed(party, dateISO, "closed");
      toast.success("Business Closed + removed", { id: t });
      await refresh();
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
        Showing parties scheduled for <b>today + next 2 days</b>. Auto refresh: <b>30s</b>.
      </div>

      <AnimatePresence>
        {filteredItems.length === 0 ? (
          <motion.div
            key="empty"
            className="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            {loading ? "Loading..." : "No parties found for the next 3 days."}
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            className="grid"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            {filteredItems.map((it) => (
              <PartyCard
                key={it.party + it.dateISO}
                item={it}
                busyId={busyId}
                onSchedule={onScheduleClick}
                onMatched={onMatchedClick}
                onClosed={onClosedClick}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

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
