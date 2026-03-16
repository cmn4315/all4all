import { useState, useRef } from "react";
import { useAuth } from "../../backend/login_utils/AuthContext";
import TopNav from "./TopNavBar";
import AvatarIcon from "../profile/AvatarIcon";
import ColorWheelPicker from "./ColorWheelPicker";
import { validateUsernameFormat, validateZip, validatePassword, validatePhone, formatPhone } from "../../backend/login_utils/validators";
import { getPasswordStrength } from "../../backend/login_utils/passwordStrength.js";

export default function ProfilePage({ onNavigate }) {
    const { currentUser, updateUser, logout } = useAuth();
    const [editing, setEditing] = useState(false);
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({ ...currentUser });
    const [errors, setErrors] = useState({});
    const [showPass, setShowPass] = useState(false);
    const [newPass, setNewPass]  = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const fileRef = useRef(null);

    const isVolunteer = currentUser?.type === "volunteer";
    const str = getPasswordStrength(newPass);

    function handleField(key, value) {
        setForm((f) => ({ ...f, [key]: value }));
        setErrors((e) => ({ ...e, [key]: null }));
    }

    function handlePhone(e) {
        handleField("phone", formatPhone(e.target.value));
    }

    function handleAvatarFile(e) {
        const file = e.target.files[0];
        if (!file){
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => handleField("avatar", ev.target.result);
        reader.readAsDataURL(file);
    }

    function validate() {
        const errs = {};
        const uErr = validateUsernameFormat(form.username);
        if (uErr){
            errs.username = uErr;
        }

        const zErr = validateZip(form.zip);
        if (zErr){
            errs.zip = zErr;
        }

        const pErr = validatePhone(form.phone);
        if (pErr){
            errs.phone = pErr;
        }
        if (isVolunteer) {
            if (!form.firstName?.trim()){
                errs.firstName = "First name is required.";
            }
            if (!form.lastName?.trim()){
                errs.lastName  = "Last name is required.";
            }
        } 
        else {
            if (!form.bizName?.trim()){
                errs.bizName = "Organization name is required.";
            }
            if (!form.motto?.trim()){
                errs.motto= "Motto is required.";
            }
        }

        if (newPass) {
            const passErr = validatePassword(newPass);
            if (passErr){
                errs.newPass = passErr;
            }
            if (newPass !== confirmPass){
                errs.confirmPass = "Passwords do not match.";
            }
        }
        return errs;
    }

    function handleSave() {
        const errs = validate();
        
        if (Object.keys(errs).length) {
            setErrors(errs); 
            return;
        }

        const updated = { ...form };
        if (newPass){
            updated.password = newPass;
        }

        updateUser(updated);
        setNewPass("");
        setConfirmPass("");
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    }

    function handleCancel() {
        setForm({ ...currentUser });
        setNewPass("");
        setConfirmPass("");
        setErrors({});
        setEditing(false);
    }

    function handleLogout() {
        logout();
        onNavigate("login");
    }

    const displayName = isVolunteer
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : currentUser.bizName;

    return (
        <div className="prof-page">
        <TopNav onNavigate={onNavigate} currentPage="profile" />

        <div className="prof-content">

            <div className="prof-header-card">
            <div className="prof-avatar-wrap">
                <AvatarIcon user={form} size={96} />
                {editing && (
                <button
                    className="prof-avatar-edit"
                    onClick={() => fileRef.current.click()}
                    title="Change photo"
                >
                    +
                </button>
                )}
                <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleAvatarFile}
                />
            </div>

            <div className="prof-header-info">
                <div className="prof-header-info__name">{displayName}</div>
                <div className="prof-header-info__username">@{currentUser.username}</div>
                <span className={`prof-header-info__badge prof-header-info__badge--${currentUser.type}`}>
                {isVolunteer ? "Volunteer" : "Organization"}
                </span>
            </div>

            <div className="prof-header-actions">
                {!editing ? (
                <button className="prof-btn" onClick={() => setEditing(true)}>
                    Edit Profile
                </button>
                ) : (
                <div className="prof-btn-group">
                    <button className="prof-btn" onClick={handleSave}>Save</button>
                    <button className="prof-btn prof-btn--ghost" onClick={handleCancel}>Cancel</button>
                </div>
                )}
            </div>
            </div>

            {saved && (
            <div className="prof-toast">Profile updated successfully.</div>
            )}

            <div className="prof-section">
            <div className="prof-section__title">
                {isVolunteer ? "Personal Information" : "Organization Information"}
            </div>

            {isVolunteer ? (
                <div className="prof-row">
                <div className="prof-field">
                    <label className="prof-label">First Name</label>
                    {editing ? (
                    <>
                        <input className={`prof-input${errors.firstName ? " error" : ""}`} value={form.firstName || ""} onChange={(e) => handleField("firstName", e.target.value)} />
                        {errors.firstName && <p className="prof-err">{errors.firstName}</p>}
                    </>
                    ) : (
                    <div className="prof-value">{currentUser.firstName}</div>
                    )}
                </div>
                <div className="prof-field">
                    <label className="prof-label">Last Name</label>
                    {editing ? (
                    <>
                        <input className={`prof-input${errors.lastName ? " error" : ""}`} value={form.lastName || ""} onChange={(e) => handleField("lastName", e.target.value)} />
                        {errors.lastName && <p className="prof-err">{errors.lastName}</p>}
                    </>
                    ) : (
                    <div className="prof-value">{currentUser.lastName}</div>
                    )}
                </div>
                </div>
            ) : (
                <>
                <div className="prof-field">
                    <label className="prof-label">Organization Name</label>
                    {editing ? (
                    <>
                        <input className={`prof-input${errors.bizName ? " error" : ""}`} value={form.bizName || ""} onChange={(e) => handleField("bizName", e.target.value)} />
                        {errors.bizName && <p className="prof-err">{errors.bizName}</p>}
                    </>
                    ) : (
                    <div className="prof-value">{currentUser.bizName}</div>
                    )}
                </div>
                <div className="prof-field">
                    <label className="prof-label">Motto / About</label>
                    {editing ? (
                    <>
                        <textarea className="prof-textarea" value={form.motto || ""} onChange={(e) => handleField("motto", e.target.value)} />
                        {errors.motto && <p className="prof-err">{errors.motto}</p>}
                    </>
                    ) : (
                    <div className="prof-value">{currentUser.motto || <span className="prof-value--muted">Not set</span>}</div>
                    )}
                </div>
                </>
            )}

            <div className="prof-field">
                <label className="prof-label">Username</label>
                {editing ? (
                <>
                    <input className={`prof-input${errors.username ? " error" : ""}`} value={form.username || ""} onChange={(e) => handleField("username", e.target.value)} />
                    {errors.username && <p className="prof-err">{errors.username}</p>}
                </>
                ) : (
                <div className="prof-value">@{currentUser.username}</div>
                )}
            </div>

            <div className="prof-row">
                <div className="prof-field">
                <label className="prof-label">Email</label>
                <div className="prof-value prof-value--muted" title="Email cannot be changed here">
                    {currentUser.email}
                </div>
                </div>
                <div className="prof-field">
                <label className="prof-label">Phone</label>
                {editing ? (
                    <>
                    <input className={`prof-input${errors.phone ? " error" : ""}`} value={form.phone || ""} onChange={handlePhone} placeholder="(555) 123-4567" />
                    {errors.phone && <p className="prof-err">{errors.phone}</p>}
                    </>
                ) : (
                    <div className="prof-value">{currentUser.phone || <span className="prof-value--muted">Not set</span>}</div>
                )}
                </div>
            </div>

            <div className="prof-row">
                <div className="prof-field">
                <label className="prof-label">ZIP Code</label>
                {editing ? (
                    <>
                    <input className={`prof-input${errors.zip ? " error" : ""}`} value={form.zip || ""} onChange={(e) => handleField("zip", e.target.value)} placeholder="90210" style={{ maxWidth: "140px" }} />
                    {errors.zip && <p className="prof-err">{errors.zip}</p>}
                    </>
                ) : (
                    <div className="prof-value">{currentUser.zip || <span className="prof-value--muted">Not set</span>}</div>
                )}
                </div>
                {!isVolunteer && (
                <div className="prof-field">
                    <label className="prof-label">Address</label>
                    {editing ? (
                    <input className="prof-input" value={form.address || ""} onChange={(e) => handleField("address", e.target.value)} placeholder="123 Main St" />
                    ) : (
                    <div className="prof-value">{currentUser.address || <span className="prof-value--muted">Not set</span>}</div>
                    )}
                </div>
                )}
            </div>
            </div>

            {!isVolunteer && (
            <div className="prof-section">
                <div className="prof-section__title">Brand Colors</div>
                {editing ? (
                <ColorWheelPicker
                    selectedColors={form.colors || []}
                    onChange={(c) => handleField("colors", c)}
                />
                ) : (
                <div className="prof-colors-display">
                    {currentUser.colors?.length ? currentUser.colors.map((c) => (
                    <div key={c} className="prof-color-chip">
                        <span className="prof-color-chip__swatch" style={{ background: c }} />
                        <span className="prof-color-chip__hex">{c}</span>
                    </div>
                    )) : <span className="prof-value--muted" style={{ fontSize: "13px" }}>No brand colors set.</span>}
                </div>
                )}
            </div>
            )}

            {editing && (
            <div className="prof-section">
                <div className="prof-section__title">Change Password</div>
                <p className="prof-section__hint">Leave blank to keep your current password.</p>

                <div className="prof-row">
                <div className="prof-field">
                    <label className="prof-label">New Password</label>
                    <div className="prof-pass-wrap">
                    <input
                        type={showPass ? "text" : "password"}
                        className={`prof-input${errors.newPass ? " error" : ""}`}
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        placeholder="New password"
                        autoComplete="new-password"
                    />
                    <button type="button" className="prof-eye-btn" onClick={() => setShowPass((s) => !s)}>
                        {showPass ? "Hide" : "Show"}
                    </button>
                    </div>
                    {newPass && (
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
                    {errors.newPass && <p className="prof-err">{errors.newPass}</p>}
                </div>
                <div className="prof-field">
                    <label className="prof-label">Confirm New Password</label>
                    <input
                    type="password"
                    className={`prof-input${errors.confirmPass ? " error" : ""}`}
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Repeat new password"
                    />
                    {errors.confirmPass && <p className="prof-err">{errors.confirmPass}</p>}
                </div>
                </div>
            </div>
            )}

            <div className="prof-section prof-section--danger">
            <div className="prof-section__title">Account</div>
            <div className="prof-danger-row">
                <div>
                <div className="prof-danger-label">Log Out</div>
                <div className="prof-danger-desc">Sign out of your All4All account.</div>
                </div>
                <button className="prof-btn prof-btn--danger" onClick={handleLogout}>
                Log Out
                </button>
            </div>
            </div>

        </div>
        </div>
    );
}