import { useState } from "react";
import Field from "./shared/Field";
import TextInput from "./shared/TextInput";
import { _users, delay } from "../../backend/login_utils/store";

export default function SignIn({ onSwitch }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (!username || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);
    await delay(500);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          password: password
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message);
      }
      const data = await res.json();
      setToken(data.token)
      setUsername(data.user.username);
      console.log("Successfully signed in user:", data.user.username);

      setSuccess(true);

    } catch (err) {
      console.error(err);
      setError(err);
      setSuccess(false);
    }
    setLoading(false);
  }

  if (success) return (
    <div className="a4a-success">
      Welcome back, <strong>{username}</strong>!<br />
      <span>You are now signed in.</span>
    </div>
  );

  return (
    <div>
      <p className="a4a-intro a4a-intro--lg">Welcome back! Sign in to continue making a difference.</p>

      <Field label="Username" error={null}>
        <TextInput
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your Username"
        />
      </Field>

      <Field label="Password" error={null}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your Password"
          className="a4a-input"
        />
      </Field>

      {error && <p className="a4a-err">{error.message}</p>}

      <button type="button" className="a4a-btn" disabled={loading} onClick={handleSubmit}>
        {loading ? "Signing in…" : "Sign In"}
      </button>

      <div className="a4a-switch-link">
        Don't have an account?{" "}
        <button className="a4a-switch-btn" onClick={() => onSwitch("volunteer")}>Create one</button>
      </div>
    </div>
  );
}
