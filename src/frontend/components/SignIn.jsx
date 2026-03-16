import { useState } from "react";
import TextInput from "./shared/TextInput";
import {useAuth} from "../../backend/login_utils/AuthContext"
import { _users, _orgUsernames, delay } from "../../backend/login_utils/store";

// ─── Sign In form ─────────────────────────────────────────────────────────────
export default function SignIn({ onSwitch, onNavigate }) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit() {
    if (!username || !password) { setError("Please fill in all fields."); return; }
    setLoading(true); setError(null);
    await delay(500);
    const volunteerUser = _users.get(username.toLowerCase());
    const orgUser       = _orgUsernames.get(username.toLowerCase());
    const user          = volunteerUser || orgUser;
    if (!user)                      { setError("Username not found.");  setLoading(false); return; }
    if (user.password !== password) { setError("Incorrect password."); setLoading(false); return; }
    // Ensure type is always set correctly regardless of how it was stored
    const typedUser = { ...user, type: volunteerUser ? "volunteer" : "org" };
    login(typedUser);
    onNavigate("main");
  }

  return (
    <div>
      <p className="a4a-intro a4a-intro--lg">Welcome back! Sign in to continue making a difference.</p>

      <div className="a4a-field">
        <label className="a4a-label">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="your_username"
          className="a4a-input"
          autoComplete="off"
        />
      </div>

      <div className="a4a-field">
        <label className="a4a-label">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          className="a4a-input"
        />
      </div>

      {error && <p className="a4a-err">{error}</p>}

      <button type="button" className="a4a-btn" disabled={loading} onClick={handleSubmit}>
        {loading ? "Signing in..." : "Sign In"}
      </button>

      <div className="a4a-switch-link">
        Don't have an account?{" "}
        <button className="a4a-switch-btn" onClick={() => onSwitch("volunteer")}>Create one</button>
      </div>
    </div>
  );
}