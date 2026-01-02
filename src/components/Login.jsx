import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!username.trim()) return alert("Enter username");
    if (!/^\d{4}(\d{2})?$/.test(password.trim())) return alert("Password must be 4 or 6 digits");
    setBusy(true);
    try {
      await onLogin(username.trim(), password.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="loginWrap">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="badge" aria-hidden="true"><ShieldCheck size={20} /></div>
        <div>
          <h1 className="h1" style={{ margin: 0 }}>Ledger Match Portal</h1>
          <div className="sub">Login with your username & PIN</div>
        </div>
      </div>

      <form onSubmit={submit}>
        <div className="field">
          <div className="label">Username</div>
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. Kuldeep"
            autoComplete="username"
          />
        </div>

        <div className="field">
          <div className="label">Password (4 or 6 digit PIN)</div>
          <input
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="••••"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={6}
          />
        </div>

        <div className="row">
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? <span className="spinner" /> : null}
            Login
          </button>
          <div className="help">
            Tip: Users sheet me Username/Password set karo.
          </div>
        </div>
      </form>
    </div>
  );
}
