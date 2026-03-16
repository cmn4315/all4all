import { useState, useRef } from "react";
import Field from "./shared/Field";
import TextInput from "./shared/TextInput";
import ColorWheelPicker from "./ColorWheelPicker";
import { useAsync } from "../../backend/login_utils/useAsync";
import {
  validateUsernameFormat, isUsernameAvailable,
  validateEmail, isEmailAvailable,
  validatePhone, formatPhone,
  validateZip,
} from "../../backend/login_utils/validators";

export default function OrgForm({ onSwitch }) {
    const username = useAsync(validateUsernameFormat, isUsernameAvailable, "Username already taken.");
    const email = useAsync(validateEmail, isEmailAvailable, "Email already registered.");

    const [bizName, setBizName] = useState(""); 
    const [bizErr, setBizErr] = useState(null);

    const [phoneRaw, setPhoneRaw] = useState(""); 
    const [phoneErr, setPhoneErr] = useState(null);

    const [zip, setZip] = useState(""); 
    const [zipErr, setZipErr] = useState(null);

    const [address, setAddress] = useState("");
    const [motto, setMotto] = useState(""); 
    const [mottoErr, setMottoErr] = useState(null);

    const [selectedColors,setSelectedColors] = useState([]);
    const [logoPreview,setLogoPreview] = useState(null);
    const fileRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [submitErr, setSubmitErr] = useState(null);

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

    async function handleSubmit() {
        const bErr = !bizName.trim() ? "Business name is required." : null;
        const mErr = !motto.trim()
        ? "Motto / summary is required."
        : motto.trim().length < 10 ? "Please write at least 10 characters." : null;
        setBizErr(bErr); 
        setMottoErr(mErr);

        const errors = [
            username.err, bErr, email.err,
            validatePhone(phoneRaw), validateZip(zip), mErr,
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
            const res = await fetch("/api/registerOrg", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: username.val,
                    email: email.val,
                    phone: phoneRaw,
                    description: motto.val, 
                    password: "1234", //TODO: do organizations need passwords too? Org needs user_id and user needs password
                    category_id: "1" //TODO: require user input for organization category (based on options in db)
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