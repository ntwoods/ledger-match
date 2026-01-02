import React from "react";
import { CalendarClock, CheckCircle2, Ban } from "lucide-react";
import { motion } from "framer-motion";

export default function PartyCard({ item, busyId, onSchedule, onMatched, onClosed }) {
  const { party, dateDisplay, dateISO } = item;
  const busySchedule = busyId === party + "|schedule";
  const busyMatched = busyId === party + "|matched";
  const busyClosed = busyId === party + "|closed";

  return (
    <motion.div
      className="card"
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
        <div className="datePill">{dateDisplay}</div>
      </div>

      <div className="actions">
        <button
          className="btn"
          onClick={() => onSchedule(party, dateISO)}
          disabled={busySchedule || busyMatched || busyClosed}
          title="Schedule"
        >
          {busySchedule ? <span className="spinner dark" /> : <CalendarClock size={16} />}
          Schedule
        </button>

        <button
          className="btn success"
          onClick={() => onMatched(party, dateISO)}
          disabled={busySchedule || busyMatched || busyClosed}
          title="Ledger Matched"
        >
          {busyMatched ? <span className="spinner dark" /> : <CheckCircle2 size={16} />}
          Ledger Matched
        </button>

        <button
          className="btn danger"
          onClick={() => onClosed(party, dateISO)}
          disabled={busySchedule || busyMatched || busyClosed}
          title="Business Closed"
        >
          {busyClosed ? <span className="spinner dark" /> : <Ban size={16} />}
          Business Closed
        </button>
      </div>
    </motion.div>
  );
}
