import { useState } from "react";
import Field from "./shared/Field";
import TextInput from "./shared/TextInput";
import { _users, delay } from "../utils/store";

export default function SignIn({ onSwitch }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    async function handleSubmit() {
        if(!username || !password){ 
            setError("Please fill in all fields."); 
            return; 
        }

        setLoading(true); 
        setError(null);
        await delay(500);

        // TODO: replace with a real API call once backend done
        const user = _users.get(username.toLowerCase());
        if(!user){ 
            setError("Username not found.");  
            setLoading(false); 
            return; 
        }

        if(user.password !== password){ 
            setError("Incorrect password."); 
            setLoading(false); 
            return; 
        }
        setLoading(false);
        setSuccess(true);
    }

    if(success) return (
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
            placeholder="your_username"
            />
        </Field>

        <Field label="Password" error={null}>
            <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className="a4a-input"
            />
        </Field>

        {error && <p className="a4a-err">{error}</p>}

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