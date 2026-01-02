import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function addDaysISO(baseISO, days) {
  const [y, m, d] = baseISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function ScheduleModal({ open, party, currentDateISO, busy, onClose, onSubmit }) {
  const defaultISO = useMemo(() => {
    if (!currentDateISO) return "";
    // default next day
    return addDaysISO(currentDateISO, 1);
  }, [currentDateISO]);

  const [dateISO, setDateISO] = useState(defaultISO);

  useEffect(() => {
    if (open) setDateISO(defaultISO);
  }, [open, defaultISO]);

  function submit() {
    if (!dateISO) return alert("Select a date");
    onSubmit(dateISO);
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="modalOverlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target.classList.contains("modalOverlay")) onClose();
          }}
        >
          <motion.div
            className="modal"
            initial={{ scale: 0.95, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
          >
            <h3 className="modalTitle">Schedule Ledger Match</h3>
            <div className="modalSub">
              Party: <b>{party}</b> • Current mark: <b>{currentDateISO}</b>
            </div>

            <div className="field" style={{ marginTop: 14 }}>
              <div className="label">New Schedule Date</div>
              <input
                className="input"
                type="date"
                value={dateISO}
                onChange={(e) => setDateISO(e.target.value)}
              />
            </div>

            <div className="modalActions">
              <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
              <button className="btn primary" onClick={submit} disabled={busy}>
                {busy ? <span className="spinner" /> : null}
                Save Schedule
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
