import { useState, useRef, useEffect } from "react";
import Field from "./shared/Field";
import TextInput from "./shared/TextInput";
import ColorWheelPicker from "./ColorWheelPicker";
import { useAsync } from "../../backend/login_utils/useAsync";
import {
  validateUsernameFormat, isUsernameAvailable,
  validateEmail, isEmailAvailable,
  validatePhone, formatPhone,
  validateZip, validatePassword,
} from "../../backend/login_utils/validators";
import { getPasswordStrength } from "../../backend/login_utils/passwordStrength";


export default function OrgForm({ onSwitch }) {
    const username = useAsync(validateUsernameFormat, isUsernameAvailable, "Username already taken.");
    const email = useAsync(validateEmail, isEmailAvailable, "Email already registered.");

    const [bizName, setBizName] = useState(""); 
    const [bizErr, setBizErr] = useState(null);

    const [phoneRaw, setPhoneRaw] = useState(""); 
    const [phoneErr, setPhoneErr] = useState(null);

    const [password,setPassword] = useState("");
    const [passErr, setPassErr] = useState(null);
    const [showPass, setShowPass]= useState(false);
    const [confirm, setConfirm] = useState("");
    const [confirmErr, setConfirmErr] = useState(null);
    const str = getPasswordStrength(password);

    const [zip, setZip] = useState(""); 
    const [zipErr, setZipErr] = useState(null);

    const [address, setAddress] = useState("");
    const [motto, setMotto] = useState(""); 
    const [mottoErr, setMottoErr] = useState(null);

    const [categories, setCategories] = useState([]);
    const [categoryId, setCategoryId] = useState("");
    const [categoryErr, setCategoryErr] = useState("");

    const [selectedColors,setSelectedColors] = useState([]);
    const [logoPreview,setLogoPreview] = useState(null);
    const fileRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [submitErr, setSubmitErr] = useState(null);


    useEffect(() => {
        fetch("/api/orgCategories")
            .then((res) => res.json())
            .then((data) => setCategories(data))
            .catch(() => setCategoryErr("Could not load categories."));
    }, []);

    
    function handlePhone(e) {
        const f = formatPhone(e.target.value);
        setPhoneRaw(f); 
        setPhoneErr(validatePhone(f));
    }

    function handleLogoFile(e) {
        const file = e.target.files[0];
        if(!file){
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => setLogoPreview(ev.target.result);
        reader.readAsDataURL(file);
    }

    function handlePassword(e) {
        setPassword(e.target.value);
        setPassErr(validatePassword(e.target.value));
        if (confirmErr !== null) { // ✅ was if(confirm)
            setConfirmErr(e.target.value !== confirm ? "Passwords do not match." : null);
        }
    }

    function handleConfirm(e) {
        setConfirm(e.target.value);
        setConfirmErr(password !== e.target.value ? "Passwords do not match." : null);
    }

    async function handleSubmit() {
        const bErr = !bizName.trim() ? "Business name is required." : null;
        const mErr = !motto.trim()
        ? "Motto / summary is required."
        : motto.trim().length < 10 ? "Please write at least 10 characters." : null;
        setBizErr(bErr); 
        setMottoErr(mErr);

        const cErr = !categoryId ? "Please select a category." : null;
        setCategoryErr(cErr);

        const errors = [
            username.err, bErr, email.err,
            validatePhone(phoneRaw), validateZip(zip), mErr,
            validatePassword(password),
            password !== confirm ? "mismatch" : null,
            cErr, 
        ].filter(Boolean);

        if(errors.length){ 
            setSubmitErr("Please fix the errors above."); 
            return; 
        }
        if(username.checking || email.checking){ 
            setSubmitErr("Still checking, please wait."); 
            return; 
        }

        setLoading(true); 
        setSubmitErr(null);

        try {
            console.log("bizName value:", bizName);
            
            const res = await fetch("/api/registerOrg", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: username.val,
                    name: bizName,           // ✅ org name for the organizations table
                    email: email.val,
                    phone: phoneRaw,
                    description: motto,      // ✅ was motto.val
                    password: password,
                    zip_code: zip,           // ✅ was zip
                    category_id: categoryId,
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
        Organization registered!<br />
        <strong>{bizName}</strong> is now part of All4All.<br />
        <span>Start connecting with volunteers today.</span>
        </div>
    );

    return (
        <div>
            <p className="a4a-intro">List your organization and connect with passionate volunteers.</p>

            <Field label="Organization Username *" error={username.err} checking={username.checking} hint="Unique public handle for your org">
                <TextInput value={username.val} onChange={username.onChange} placeholder="green_earth_org" error={username.err} />
            </Field>

            <Field label="Business / Organization Name *" error={bizErr}>
                <TextInput
                value={bizName}
                onChange={(e) => { 
                    setBizName(e.target.value); setBizErr(!e.target.value.trim() ? "Required." : null); 
                }}
                placeholder="Green Earth Foundation"
                error={bizErr}
                />
            </Field>

            <div className="a4a-row">
                <Field label="Organization Email *" error={email.err} checking={email.checking}>
                <TextInput value={email.val} onChange={email.onChange} placeholder="info@org.org" type="email" error={email.err} />
                </Field>
                <Field label="Phone Number *" error={phoneErr}>
                <TextInput value={phoneRaw} onChange={handlePhone} placeholder="(555) 000-0000" error={phoneErr} />
                </Field>
            </div>

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
            

            <div className="a4a-row">
                <Field label="ZIP Code *" error={zipErr}>
                <TextInput
                    value={zip}
                    onChange={(e) => { 
                        setZip(e.target.value); setZipErr(validateZip(e.target.value)); 
                    }}
                    placeholder="90210"
                    error={zipErr}
                />
                </Field>
                <Field label="Address (optional)" error={null}>
                <TextInput value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
                </Field>
            </div>

            <Field
                label="Motto / About Your Organization *"
                error={mottoErr}
                hint="Tell volunteers what you do and what you stand for"
            >
                <textarea
                value={motto}
                onChange={(e) => {
                    setMotto(e.target.value);
                    setMottoErr(!e.target.value.trim() ? "Required." : e.target.value.trim().length < 10 ? "Too short." : null);
                }}

                placeholder="We plant trees and restore ecosystems across the Pacific Northwest…"
                className={`a4a-textarea${mottoErr ? " error" : ""}`}
                />
            </Field>

            <hr className="a4a-divider" />

            <label className="a4a-label" style={{ display: "block", marginBottom: "10px" }}>
                Brand Colors (optional — up to 4)
            </label>
            <ColorWheelPicker selectedColors={selectedColors} onChange={setSelectedColors} />

            <hr className="a4a-divider" />
            
            <Field label="Organization Category *" error={categoryErr}>
                <select
                    value={categoryId}
                    onChange={(e) => {
                        setCategoryId(e.target.value);
                        setCategoryErr(!e.target.value ? "Please select a category." : null);
                    }}
                    className={`a4a-input${categoryErr ? " error" : ""}`}
                >
                    <option value="">— Select a category —</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name}
                        </option>
                    ))}
                </select>
            </Field>

            <label className="a4a-label" style={{ display: "block" }}>Organization Logo (optional)</label>
            <div className="a4a-logo-row">
                {logoPreview && <img src={logoPreview} alt="logo preview" className="a4a-logo-preview" />}
                <button type="button" className="a4a-logo-upload-btn" onClick={() => fileRef.current.click()}>
                Upload Logo
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoFile} />
            </div>

            {submitErr && <p className="a4a-submit-err">{submitErr}</p>}

            <button type="button" className="a4a-btn a4a-btn--mt" disabled={loading} onClick={handleSubmit}>
                {loading ? "Registering…" : "Register Organization"}
            </button>

            <div className="a4a-switch-link">
                Volunteering as an individual?{" "}
                <button className="a4a-switch-btn" onClick={() => onSwitch("volunteer")}>Sign up here</button>
            </div>
        </div>
    );
}