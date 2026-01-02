import React from "react";
import { RefreshCw, LogOut, Landmark } from "lucide-react";

export default function TopBar({ user, onLogout, onRefresh, loading }) {
  return (
    <div className="topbar">
      <div className="brand">
        <div className="badge" aria-hidden="true">
          <Landmark size={20} />
        </div>
        <div>
          <h1 className="h1">Ledger Match Portal</h1>
          <div className="sub">Welcome, <b>{user}</b></div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn" onClick={onRefresh} disabled={loading} title="Refresh">
          {loading ? <span className="spinner dark" /> : <RefreshCw size={16} />}
          Refresh
        </button>
        <button className="btn" onClick={onLogout} title="Logout">
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );
}
