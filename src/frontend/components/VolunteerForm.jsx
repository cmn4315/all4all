import { useState } from "react";
import Field from "./shared/Field";
import TextInput from "./shared/TextInput";
import { useAsync } from "../../backend/login_utils/useAsync";
import { validateUsernameFormat, isUsernameAvailable,
  validateEmail, isEmailAvailable,
  validatePhone, formatPhone,
  validateZip, validatePassword,
} from "../../backend/login_utils/validators";
import { getPasswordStrength } from "../../backend/login_utils/passwordStrength";

export default function VolunteerForm({ onSwitch }) {
    const firstName = useAsync((v) => (!v?.trim() ? "First name is required." : v.trim().length < 2 ? "Too short." : null), null, "");
    const lastName = useAsync((v) => (!v?.trim() ? "Last name is required."  : v.trim().length < 2 ? "Too short." : null), null, "");
    const username = useAsync(validateUsernameFormat, isUsernameAvailable, "Username already taken.");
    const email = useAsync(validateEmail, isEmailAvailable, "Email already registered.");

    const [phoneRaw, setPhoneRaw] = useState("");
    const [phoneErr, setPhoneErr] = useState(null);
    const [password,setPassword] = useState("");
    const [passErr, setPassErr] = useState(null);
    const [confirm, setConfirm] = useState("");
    const [confirmErr, setConfirmErr] = useState(null);
    const [zip, setZip] = useState("");
    const [zipErr, setZipErr] = useState(null);
    const [showPass, setShowPass]= useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [submitErr,setSubmitErr]= useState(null);

    const str = getPasswordStrength(password);

    function handlePhone(e) {
        const f = formatPhone(e.target.value);
        setPhoneRaw(f); 
        setPhoneErr(validatePhone(f));
    }

    function handlePassword(e) {
        setPassword(e.target.value);
        setPassErr(validatePassword(e.target.value));
        if(confirm){
            setConfirmErr(e.target.value !== confirm ? "Passwords do not match." : null);
        }
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

        if(errors.length){
            setSubmitErr("Please fix the errors above."); 
            return; 
        }

        if(username.checking || email.checking){ 
            setSubmitErr("Still checking uniqueness, please wait."); 
            return; 
        }

        setLoading(true); 
        setSubmitErr(null);

        try {
            const res = await fetch("/api/registerVolunteer", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: username.val,
                    email: email.val,
                    password: password,
                    firstName: firstName.val,
                    lastName: lastName.val,
                    phone: phoneRaw,
                    zip: zip
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to register");
            }

            const data = await res.json();
            console.log("Created user id:", data.id);

            setSuccess(true);

        } catch (err) {
            console.error(err);
            setSubmitErr("Failed to create account. Please try again.");
        }

        setLoading(false);
    }

    if (success) return (
        <div className="a4a-success">
            Welcome to All4All, <strong>{firstName.val}</strong>!<br />
        <span>Your volunteer account is ready.</span>
        </div>
    ) ;

    return (
        <div>
        <p className="a4a-intro">Join thousands of volunteers making a difference every day.</p>

        <div className="a4a-row">
            <Field label="First Name *" error={firstName.err}>
                <TextInput value={firstName.val} onChange={firstName.onChange} placeholder="Jane" error={firstName.err} />
            </Field>
        
            <Field label="Last Name *" error={lastName.err}>
                <TextInput value={lastName.val} onChange={lastName.onChange} placeholder="Doe" error={lastName.err} />
            </Field>
        </div>

        <Field label="Username *" error={username.err} checking={username.checking} hint="Letters, numbers, _ . - allowed">
            <TextInput value={username.val} onChange={username.onChange} placeholder="jane_doe42" error={username.err} />
        </Field>

        <Field label="Email Address *" error={email.err} checking={email.checking}>
            <TextInput value={email.val} onChange={email.onChange} placeholder="jane@email.com" type="email" error={email.err} />
        </Field>

        <Field label="Phone Number *" error={phoneErr}>
            <TextInput value={phoneRaw} onChange={handlePhone} placeholder="(555) 123-4567" error={phoneErr} />
        </Field>

        <div className="a4a-row">
            <Field label="Password *" error={passErr}>
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
                        {showPass ? "" : ""}
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
            </Field>

            <Field label="Confirm Password *" error={confirmErr}>
                <TextInput value={confirm} onChange={handleConfirm} placeholder="Repeat password" type="password" error={confirmErr} />
            </Field>
        </div>

        <Field label="ZIP Code (optional)" error={zipErr} hint="Helps match you with local opportunities">
            <TextInput
                value={zip}
                onChange={(e) => { 
                setZip(e.target.value); 
                    setZipErr(validateZip(e.target.value)); 
                }}
                placeholder="90210"
                error={zipErr}
                className="a4a-input--zip"
            />
        </Field>

        {submitErr && <p className="a4a-submit-err">{submitErr}</p>}

        <button type="button" className="a4a-btn" disabled={loading} onClick={handleSubmit}>
            {loading ? "Creating account…" : "Create Volunteer Account"}
        </button>

        <div className="a4a-switch-link">
            Registering an organization?{" "}
            <button className="a4a-switch-btn" onClick={() => onSwitch("org")}>Sign up here</button>
        </div>
    </div>
  );
}