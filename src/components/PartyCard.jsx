import React from "react";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

function normalizeWeekday(raw) {
  // Safer fallback: unknown/invalid strings are treated as blank => show "NoWeekly".
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return "";

  const cleaned = s.replace(/[^A-Z]/g, "");
  const map = {
    MON: "MONDAY",
    MONDAY: "MONDAY",
    TUE: "TUESDAY",
    TUES: "TUESDAY",
    TUESDAY: "TUESDAY",
    WED: "WEDNESDAY",
    WEDNESDAY: "WEDNESDAY",
    THU: "THURSDAY",
    THUR: "THURSDAY",
    THURS: "THURSDAY",
    THURSDAY: "THURSDAY",
    FRI: "FRIDAY",
    FRIDAY: "FRIDAY",
    SAT: "SATURDAY",
    SATURDAY: "SATURDAY",
  };

  return map[cleaned] || "";
}

export default function PartyCard({ item, busyId, onSchedule, onMatched }) {
  const { party, dateDisplay, dateISO } = item;
  const busySchedule = busyId === party + "|schedule";
  const busyMatched = busyId === party + "|matched";
  const busyAny = busySchedule || busyMatched;

  const weeklyRaw =
    item?.weeklyDay ??
    item?.weeklyDayRule ??
    item?.weekly ??
    item?.weekday ??
    item?.dayRule ??
    item?.colF ??
    "";
  const weekday = normalizeWeekday(weeklyRaw);
  const isNoWeekly = !weekday;

  return (
    <motion.div
      className={"card " + (isNoWeekly ? "noWeekly" : "weekly")}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
    >
      <div className="cardTop">
        <div>
          <h3 className="party">{party}</h3>
          <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 12 }}>
            Mark Date in sheet
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div className="datePill">{dateDisplay}</div>
          {isNoWeekly ? <div className="weeklyBadge">NoWeekly</div> : null}
        </div>
      </div>

      <div className="actions">
        <button
          className="btn"
          onClick={() => onSchedule(party, dateISO)}
          disabled={busyAny}
          title="Schedule"
        >
          {busySchedule ? <span className="spinner dark" /> : <CalendarClock size={16} />}
          Schedule
        </button>

        <button
          className="btn success"
          onClick={() => onMatched(party, dateISO)}
          disabled={busyAny}
          title="Ledger Matched"
        >
          {busyMatched ? <span className="spinner dark" /> : <CheckCircle2 size={16} />}
          Ledger Matched
        </button>
      </div>
    </motion.div>
  );
}
