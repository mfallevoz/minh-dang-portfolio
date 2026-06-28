"use client";

import { useState } from "react";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      window.location.reload();
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <main className="admin-login">
      <form className="admin-login-box" onSubmit={submit}>
        <div className="admin-login-label">Admin</div>
        <h1 className="admin-login-title">Minh&nbsp;Dang</h1>
        <input
          className="admin-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <div className="admin-error">Wrong password.</div>}
        <button className="admin-btn admin-btn-primary" type="submit" disabled={busy}>
          {busy ? "…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
