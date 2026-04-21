import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Field from "./shared/Field";
import TextInput from "./shared/TextInput";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000; 

export default function SignIn({ onSwitch }) {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);

  const isLocked = lockedUntil && Date.now() < lockedUntil;

  async function handleSubmit() {
    if (isLocked) {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
      setError(`Too many failed attempts. Please wait ${secs}s before trying again.`);
      return;
    }

    if (!username || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const text = await res.text();
        // Use a generic message for the user; avoid echoing raw server internals.
        const userMessage = res.status === 401
          ? "Invalid username or password."
          : "Sign in failed. Please try again.";

        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        if (nextAttempts >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_MS);
          setAttempts(0);
          setError(`Too many failed attempts. Please wait ${LOCKOUT_MS / 1000}s before trying again.`);
        } else {
          setError(userMessage);
        }

        void text;
        setLoading(false);
        return;
      }

      const data = await res.json();

      // Sanitize token — must be a non-empty string containing only safe
      // base64url / JWT characters (letters, digits, _, -, .)
      const TOKEN_RE = /^[A-Za-z0-9\-_.]+$/;
      const rawToken = typeof data.token === "string" ? data.token.trim() : "";
      const safeToken = TOKEN_RE.test(rawToken) ? rawToken : null;

      // Sanitize each user field individually
      const ALLOWED_ROLES = new Set(["VOLUNTEER", "ORGANIZATION"]);
      const rawUser = data.user ?? {};
      const safeUser = {
        id: Number.isInteger(rawUser.id) ? rawUser.id : null,
        username: typeof rawUser.username === "string" ? rawUser.username.trim().replace(/[<>"']/g, "") : "",
        email: typeof rawUser.email === "string" ? rawUser.email.trim().replace(/[<>"']/g, "") : "",
        role: ALLOWED_ROLES.has(rawUser.role) ? rawUser.role : null,
      };

      if (!safeToken || !safeUser.id || !safeUser.role) {
        setError("Sign in failed. Please try again.");
        setLoading(false);
        return;
      }

      // Write only fully-validated, explicitly-constructed primitives to storage
      localStorage.setItem("token", safeToken);
      localStorage.setItem("user", JSON.stringify({
        id: safeUser.id,
        username: safeUser.username,
        email: safeUser.email,
        role: safeUser.role,
      }));

      // Reset attempt counter on success
      setAttempts(0);
      setLockedUntil(null);

      if (safeUser.role === "VOLUNTEER") {
        navigate("/home");
      } else if (safeUser.role === "ORGANIZATION") {
        navigate("/org-home");
      }

    } catch {
      setError("An unexpected error occurred. Please try again.");
    }

    setLoading(false);
  }

  return (
    <div>
      <p className="a4a-intro a4a-intro--lg">Welcome back! Sign in to continue making a difference.</p>

      <Field label="Username" error={null}>
        <TextInput
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your Username"
          autoComplete="username"
        />
      </Field>

      <Field label="Password" error={null}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your Password"
          className="a4a-input"
          autoComplete="current-password"
        />
      </Field>

      {error && <p className="a4a-err">{error}</p>}

      <button
        type="button"
        className="a4a-btn"
        disabled={loading || isLocked}
        onClick={handleSubmit}
      >
        {loading ? "Signing in…" : isLocked ? "Too many attempts…" : "Sign In"}
      </button>

      <div className="a4a-switch-link">
        Don't have an account?{" "}
        <button className="a4a-switch-btn" onClick={() => onSwitch("volunteer")}>Create one</button>
      </div>
    </div>
  );
}