import { useState } from "react";
import TextInput from "./shared/TextInput";
import { useAsync } from "../../backend/login_utils/useAsync";
import { validateUsernameFormat, isUsernameAvailable,
  validateEmail, isEmailAvailable,
  validatePhone, formatPhone,
  validateZip, validatePassword,
} from "../../backend/login_utils/validators";
import { getPasswordStrength } from "../../backend/login_utils/passwordStrength";
import { _users, _emails, delay } from "../../backend/login_utils/store";

// ─── Volunteer Registration form ──────────────────────────────────────────────
export default function VolunteerForm({ onSwitch, onNavigate }) {
  const { login } = useAuth();
  const firstName = useAsync((v) => (!v?.trim() ? "First name is required." : v.trim().length < 2 ? "Too short." : null), null, "");
  const lastName  = useAsync((v) => (!v?.trim() ? "Last name is required."  : v.trim().length < 2 ? "Too short." : null), null, "");
  const username  = useAsync(validateUsernameFormat, isUsernameAvailable, "Username already taken.");
  const email     = useAsync(validateEmail, isEmailAvailable, "Email already registered.");

  const [phoneRaw,   setPhoneRaw]   = useState("");
  const [phoneErr,   setPhoneErr]   = useState(null);
  const [password,   setPassword]   = useState("");
  const [passErr,    setPassErr]    = useState(null);
  const [confirm,    setConfirm]    = useState("");
  const [confirmErr, setConfirmErr] = useState(null);
  const [zip,        setZip]        = useState("");
  const [zipErr,     setZipErr]     = useState(null);
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [submitErr,  setSubmitErr]  = useState(null);

  const str = getPasswordStrength(password);

  function handlePhone(e) {
    const f = formatPhone(e.target.value);
    setPhoneRaw(f); setPhoneErr(validatePhone(f));
  }
  function handlePassword(e) {
    setPassword(e.target.value);
    setPassErr(validatePassword(e.target.value));
    if (confirm) setConfirmErr(e.target.value !== confirm ? "Passwords do not match." : null);
  }
  function handleConfirm(e) {
    setConfirm(e.target.value);
    setConfirmErr(password !== e.target.value ? "Passwords do not match." : null);
  }

  async function handleSubmit() {
    const errors = [
      firstName.err, lastName.err, username.err, email.err,
      validatePhone(phoneRaw), validatePassword(password),
      password !== confirm ? "mismatch" : null,
      validateZip(zip),
    ].filter(Boolean);
    if (errors.length)                       { setSubmitErr("Please fix the errors above."); return; }
    if (username.checking || email.checking) { setSubmitErr("Still checking uniqueness, please wait."); return; }
    setLoading(true); setSubmitErr(null);
    await delay(500);
    const newUser = {
      type: "volunteer",
      firstName: firstName.val, lastName: lastName.val,
      username: username.val, email: email.val,
      phone: phoneRaw, password, zip, avatar: null,
    };
    _users.set(username.val.toLowerCase(), newUser);
    _emails.add(email.val.toLowerCase());
    login(newUser);
    onNavigate("main");
  }


  return (
    <div>
      <p className="a4a-intro">Join thousands of volunteers making a difference every day.</p>

      <div className="a4a-row">
        <div className="a4a-field">
          <label className="a4a-label">First Name *</label>
          <input className={`a4a-input${firstName.err ? " error" : ""}`} value={firstName.val} onChange={firstName.onChange} placeholder="Jane" autoComplete="off" />
          {firstName.err && <p className="a4a-err">{firstName.err}</p>}
        </div>
        <div className="a4a-field">
          <label className="a4a-label">Last Name *</label>
          <input className={`a4a-input${lastName.err ? " error" : ""}`} value={lastName.val} onChange={lastName.onChange} placeholder="Doe" autoComplete="off" />
          {lastName.err && <p className="a4a-err">{lastName.err}</p>}
        </div>
      </div>

      <div className="a4a-field">
        <label className="a4a-label">Username *</label>
        <input className={`a4a-input${username.err ? " error" : ""}`} value={username.val} onChange={username.onChange} placeholder="jane_doe42" autoComplete="off" />
        {username.checking && <p className="a4a-checking">Checking...</p>}
        {!username.checking && username.err && <p className="a4a-err">{username.err}</p>}
        {!username.err && !username.checking && <p className="a4a-hint">Letters, numbers, _ . - allowed</p>}
      </div>

      <div className="a4a-field">
        <label className="a4a-label">Email Address *</label>
        <input type="email" className={`a4a-input${email.err ? " error" : ""}`} value={email.val} onChange={email.onChange} placeholder="jane@email.com" autoComplete="off" />
        {email.checking && <p className="a4a-checking">Checking...</p>}
        {!email.checking && email.err && <p className="a4a-err">{email.err}</p>}
      </div>

      <div className="a4a-field">
        <label className="a4a-label">Phone Number *</label>
        <input className={`a4a-input${phoneErr ? " error" : ""}`} value={phoneRaw} onChange={handlePhone} placeholder="(555) 123-4567" autoComplete="off" />
        {phoneErr && <p className="a4a-err">{phoneErr}</p>}
      </div>

      <div className="a4a-field">
        <label className="a4a-label">Password *</label>
        <div className="a4a-pass-wrap">
          <input
            type={showPass ? "text" : "password"}
            value={password}
            onChange={handlePassword}
            placeholder="Create a password"
            className={`a4a-input${passErr ? " error" : ""}`}
            autoComplete="new-password"
          />
          <button type="button" className="a4a-eye-btn" onClick={() => setShowPass((s) => !s)}>
            {showPass ? "Hide" : "Show"}
          </button>
        </div>
        {password && (
          <>
            <div className="a4a-strength-bar">
              <div className="a4a-strength-fill" style={{ width: `${str.pct}%`, background: str.color }} />
            </div>
            <div className="a4a-strength-meta">
              <span className="a4a-strength-label" style={{ color: str.color }}>{str.label}</span>
              <span className="a4a-strength-score">{str.score}/6</span>
            </div>
          </>
        )}
        {passErr && <p className="a4a-err">{passErr}</p>}
      </div>

      <div className="a4a-field">
        <label className="a4a-label">Confirm Password *</label>
        <input
          type="password"
          value={confirm}
          onChange={handleConfirm}
          placeholder="Repeat password"
          className={`a4a-input${confirmErr ? " error" : ""}`}
        />
        {confirmErr && <p className="a4a-err">{confirmErr}</p>}
      </div>

      <div className="a4a-field">
        <label className="a4a-label">ZIP Code (optional)</label>
        <input
          className={`a4a-input a4a-input--zip${zipErr ? " error" : ""}`}
          value={zip}
          onChange={(e) => { setZip(e.target.value); setZipErr(validateZip(e.target.value)); }}
          placeholder="90210"
          autoComplete="off"
        />
        {zipErr && <p className="a4a-err">{zipErr}</p>}
        {!zipErr && <p className="a4a-hint">Helps match you with local opportunities</p>}
      </div>

      {submitErr && <p className="a4a-submit-err">{submitErr}</p>}

      <button type="button" className="a4a-btn" disabled={loading} onClick={handleSubmit}>
        {loading ? "Creating account..." : "Create Volunteer Account"}
      </button>

      <div className="a4a-switch-link">
        Registering an organization?{" "}
        <button className="a4a-switch-btn" onClick={() => onSwitch("org")}>Sign up here</button>
      </div>
    </div>
  );
}