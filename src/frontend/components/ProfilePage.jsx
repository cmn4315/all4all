import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AvatarIcon from "./profile/AvatarIcon";
import Field from "./shared/Field";
import TextInput from "./shared/TextInput";
import ColorWheelPicker from "./ColorWheelPicker";
import logo from "../../assets/all4allLogo.png";
import {
  validateUsernameFormat,
  validatePhone, formatPhone,
  validateZip, validatePassword,
} from "../../backend/login_utils/validators";
import { getPasswordStrength } from "../../backend/login_utils/passwordStrength";
import "../styles/profile.css";

export default function ProfilePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [form, setForm] = useState({
    ...user,
    avatar: localStorage.getItem("userAvatar") || user?.avatar || null,
  });

  const isVolunteer = user?.role === "VOLUNTEER";

  // ── Edit mode toggle ──
  const [editing,  setEditing]  = useState(false);
  const [saved,    setSaved]    = useState(false);

  // ── Form state (mirrors user object) ──
  const [errors,   setErrors]   = useState({});

  // ── Password change ──
  const [newPass,     setNewPass]     = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [passErr,     setPassErr]     = useState(null);
  const [confirmErr,  setConfirmErr]  = useState(null);

  // ── Avatar (volunteers only) ──
  const fileRef = useRef(null);

  const [displayName, setDisplayName] = useState("");


  useEffect(() => {
    if (!user?.id) return;

    // need to edit for biz name
    /*fetch(`/api/full_name?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => {
        setDisplayName(data.name);
        if (isVolunteer) {
          const [firstName, ...rest] = data.name.split(" ");
          setForm(f => ({ ...f, firstName, lastName: rest.join(" ") }));
        } else {
          setForm(f => ({ ...f, name: data.name })); // ← sets form.name for orgs
        }
      })*/
    fetch(`/api/full_name?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => {
        setDisplayName(data.name);
        if (isVolunteer) {
          const [firstName, ...rest] = data.name.split(" ");
          setForm(f => ({ ...f, firstName, lastName: rest.join(" ") }));
        } else {
          setForm(f => ({ ...f, name: data.name }));
        }
    })

    fetch(`/api/phone?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => setForm(f => ({ ...f, phone: data.phone })))
      .catch(err => console.error("Error fetching phone:", err));
    
    fetch(`/api/phone?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => setForm(f => ({ ...f, phone: data.phone })))
      .catch(err => console.error("Error fetching phone:", err));
    
    // get zip code
    const zipUrl = isVolunteer
      ? `/api/volunteers/zip_code?user_id=${user.id}`
      : `/api/organizations/zip_code?user_id=${user.id}`;

    fetch(zipUrl)
      .then(res => res.json())
      .then(data => setForm(f => ({ ...f, zip_code: data.zip_code || "" })))
      .catch(err => console.error("Error fetching zipcode:", err));

    //fetch(`/api/organizations/zip_code?user_id=${user.id}`)
    // .then(res => res.json())
    //  .then(data => setForm(f => ({ ...f, zipcode: data.zipcode })))
    //  .catch(err => console.error("Error fetching zipcode:", err));

    // get address
    fetch(`/api/organizations/address?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => setForm(f => ({ ...f, address: data.address })))
      .catch(err => console.error("Error fetching address:", err));

    // get motto
    if(!isVolunteer){
      fetch(`/api/organizations/motto?user_id=${user.id}`)
        .then(res => res.json())
        .then(data => setForm(f => ({ ...f, motto: data.motto })))
        .catch(err => console.error("Error fetching motto:", err));
    }
    // get brand colors
    fetch(`/api/organizations/brand_colors?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => setForm(f => ({ ...f, colors: data.colors || [] })))
      .catch(err => console.error("Error fetching brand colors:", err));
  }, []);

  const str = getPasswordStrength(newPass);

  // ── Field helpers ──
  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: null }));
  }

  function handlePhone(e) {
    set("phone", formatPhone(e.target.value));
  }

  function handleAvatarFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const MAX = 100;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const compressed = canvas.toDataURL("image/jpeg", 0.6);
      URL.revokeObjectURL(url);
      set("avatar", compressed);
    };

    img.src = url;
  }

  function handleNewPass(e) {
    setNewPass(e.target.value);
    setPassErr(e.target.value ? validatePassword(e.target.value) : null);
    if (confirmPass) setConfirmErr(e.target.value !== confirmPass ? "Passwords do not match." : null);
  }

  function handleConfirmPass(e) {
    setConfirmPass(e.target.value);
    setConfirmErr(newPass !== e.target.value ? "Passwords do not match." : null);
  }

  // ── Validation ──
  function validate() {
    const errs = {};
    const uErr = validateUsernameFormat(form.username);
    if (uErr) errs.username = uErr;
    const zErr = validateZip(form.zip_code);
    if (zErr) errs.zip_code = zErr;
    const pErr = validatePhone(form.phone);
    if (pErr) errs.phone = pErr;
    if (isVolunteer) {
      if (!form.firstName?.trim()) errs.firstName = "First name is required.";
      if (!form.lastName?.trim())  errs.lastName  = "Last name is required.";
    } else {
      if (!form.name?.trim()) errs.name = "Organization name is required.";
      if (!form.motto?.trim())   errs.motto   = "Motto is required.";
    }
    if (newPass) {
      const pErr2 = validatePassword(newPass);
      if (pErr2) errs.newPass = pErr2;
      if (newPass !== confirmPass) errs.confirmPass = "Passwords do not match.";
    }
    return errs;
  }

  // ── Save ──
  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const updated = { ...form };
    if (newPass) updated.password = newPass;

    if (updated.avatar) {
      localStorage.setItem("userAvatar", updated.avatar);
      delete updated.avatar;
    }

    try {
    if (isVolunteer) {
      await fetch("/api/volunteers/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          firstName: form.firstName,
          lastName: form.lastName,
          zip_code: form.zip_code,
        }),
      });
    } else {
      await fetch("/api/organizations/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          name: form.name,
          address: form.address,
          zip_code: form.zip_code,
          motto: form.motto,
          brand_colors: form.colors || [],
        }),
      });
    }
  } catch (err) {
    console.error("Failed to save profile:", err);
  }

    localStorage.setItem("user", JSON.stringify(updated));
    setUser(updated);

    setNewPass("");
    setConfirmPass("");
    setErrors({});
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleCancel() {
    setForm({ ...user });
    setNewPass("");
    setConfirmPass("");
    setErrors({});
    setEditing(false);
  }

  console.log("FORM STATE:", form);
  return (
    <div className="prof-page">

      {/* ── Nav bar ── */}
      <nav className="prof-nav">

        {/* Logo + wordmark — top left */}
        <button
          className="prof-nav__logo"
          onClick={() => navigate(isVolunteer ? "/home" : "/org-home")}
        >
          <img src={logo} alt="All4All logo" style={{ height: 32, width: "auto" }} />
          <span>All4All</span>
        </button>

        {/* Back to Home — top right, white, larger */}
        <button
          className="prof-nav__back"
          onClick={() => navigate(isVolunteer ? "/home" : "/org-home")}
        >
          ← Back to Home
        </button>
      </nav>

      <div className="prof-content">

        {/* ── Header card ── */}
        <div className="prof-header-card">

          {/* Avatar — editable for volunteers */}
          <div className="prof-avatar-wrap">
            <AvatarIcon avatarSrc={form.avatar} size={88} />
            {editing && isVolunteer && (
              <>
                <button
                  className="prof-avatar-edit-btn"
                  onClick={() => fileRef.current.click()}
                  title="Change photo"
                >
                  +
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleAvatarFile}
                />
              </>
            )}
          </div>

          {/* Name + badge */}
          <div className="prof-header-info">
            <div className="prof-header-name">{displayName}</div>
            <div className="prof-header-username">@{user.username}</div>
            <span className={`prof-badge prof-badge--${user.type}`}>
              {isVolunteer ? "Volunteer" : "Organization"}
            </span>
          </div>

          {/* Edit / Save / Cancel — inside the header card, far right */}
          <div className="prof-header-actions">
            {!editing ? (
              <button className="prof-btn" onClick={() => setEditing(true)}>
                Edit Profile
              </button>
            ) : (
              <div className="prof-btn-group">
                <button className="prof-btn" onClick={handleSave}>Save Changes</button>
                <button className="prof-btn prof-btn--ghost" onClick={handleCancel}>Cancel</button>
              </div>
            )}
          </div>
        </div>

        {/* ── Save toast ── */}
        {saved && <div className="prof-toast">Profile updated successfully.</div>}

        {/* ══════════════════════════════════════
            VOLUNTEER FIELDS
        ══════════════════════════════════════ */}
        {isVolunteer && (
          <div className="prof-section">
            <div className="prof-section-title">Personal Information</div>

            <div className="prof-row">
              <Field label="First Name" error={errors.firstName}>
                {editing ? (
                  <TextInput
                    value={form.firstName || ""}
                    onChange={(e) => set("firstName", e.target.value)}
                    error={errors.firstName}
                    placeholder="Jane"
                  />
                ) : (
                  <div className="prof-value">{form.firstName}</div>
                )}
              </Field>
              <Field label="Last Name" error={errors.lastName}>
                {editing ? (
                  <TextInput
                    value={form.lastName || ""}
                    onChange={(e) => set("lastName", e.target.value)}
                    error={errors.lastName}
                    placeholder="Doe"
                  />
                ) : (
                  <div className="prof-value">{form.lastName}</div>
                )}
              </Field>
            </div>

            <Field label="Username" error={errors.username}>
              {editing ? (
                <TextInput
                  value={form.username || ""}
                  onChange={(e) => set("username", e.target.value)}
                  error={errors.username}
                  placeholder="jane_doe42"
                />
              ) : (
                <div className="prof-value">@{user.username}</div>
              )}
            </Field>

            <Field label="Email" hint="Contact support to change your email.">
              <div className="prof-value prof-value--locked">{user.email}</div>
            </Field>

            <div className="prof-row">
              <Field label="Phone" error={errors.phone}>
                {editing ? (
                  <TextInput
                    value={form.phone || ""}
                    onChange={handlePhone}
                    error={errors.phone}
                    placeholder="(555) 123-4567"
                  />
                ) : (
                  <div className="prof-value">{form.phone || <span className="prof-value--muted">Not set</span>}</div>
                )}
              </Field>
              <Field label="ZIP Code" error={errors.zip_code}>
                {editing ? (
                  <TextInput
                    value={form.zip_code || ""}
                    onChange={(e) => set("zip_code", e.target.value)}
                    error={errors.zip_code}
                    placeholder="90210"
                    className="a4a-input--zip"
                  />
                ) : (
                  <div className="prof-value">{form.zip_code || <span className="prof-value--muted">Not set</span>}</div>
                )}
              </Field>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            ORGANIZATION FIELDS
        ══════════════════════════════════════ */}
        {!isVolunteer && (
          <div className="prof-section">
            <div className="prof-section-title">Organization Information</div>

            <Field label="Organization Name" error={errors.name}>
              {editing ? (
                <TextInput
                  value={form.name || ""}
                  onChange={(e) => set("name", e.target.value)}
                  error={errors.name}
                  placeholder="Green Earth Foundation"
                />
              ) : (
                <div className="prof-value">{form.name}</div>
              )}
            </Field>

            <Field label="Username" error={errors.username}>
              {editing ? (
                <TextInput
                  value={form.username || ""}
                  onChange={(e) => set("username", e.target.value)}
                  error={errors.username}
                  placeholder="green_earth_org"
                />
              ) : (
                <div className="prof-value">@{user.username}</div>
              )}
            </Field>

            <Field label="Email" hint="Contact support to change your email.">
              <div className="prof-value prof-value--locked">{user.email}</div>
            </Field>

            <div className="prof-row">
              <Field label="Phone" error={errors.phone}>
                {editing ? (
                  <TextInput
                    value={form.phone || ""}
                    onChange={handlePhone}
                    error={errors.phone}
                    placeholder="(555) 000-0000"
                  />
                ) : (
                  <div className="prof-value">{form.phone || <span className="prof-value--muted">Not set</span>}</div>
                )}
              </Field>
              <Field label="ZIP Code" error={errors.zip_code}>
                {editing ? (
                  <TextInput
                    value={form.zip_code || ""}
                    onChange={(e) => set("zip_code", e.target.value)}
                    error={errors.zip_code}
                    placeholder="90210"
                  />
                ) : (
                  <div className="prof-value">{form.zip_code || <span className="prof-value--muted">Not set</span>}</div>
                )}
              </Field>
            </div>

            <Field label="Address" error={null}>
              {editing ? (
                <TextInput
                  value={form.address || ""}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="123 Main St"
                />
              ) : (
                <div className="prof-value">{form.address || <span className="prof-value--muted">Not set</span>}</div>
              )}
            </Field>

            <Field label="Motto / About" error={errors.motto}>
              {editing ? (
                <textarea
                  value={form.motto || ""}
                  onChange={(e) => set("motto", e.target.value)}
                  placeholder="We plant trees and restore ecosystems..."
                  className={`a4a-textarea${errors.motto ? " error" : ""}`}
                />
              ) : (
                <div className="prof-value">{form.motto || <span className="prof-value--muted">Not set</span>}</div>
              )}
            </Field>

            {/* Brand colors */}
            <div className="a4a-field">
              <label className="a4a-label">Brand Colors (up to 4)</label>
              {editing ? (
                <ColorWheelPicker
                  selectedColors={form.colors || []}
                  onChange={(c) => set("colors", c)}
                />
              ) : (
                <div className="prof-colors-row">
                  {form.colors?.length ? form.colors.map((c) => (
                    <div key={c} className="prof-color-chip">
                      <span className="prof-color-chip__swatch" style={{ background: c }} />
                      <span className="prof-color-chip__hex">{c}</span>
                    </div>
                  )) : <span className="prof-value--muted" style={{ fontSize: "13px" }}>No brand colors set.</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            CHANGE PASSWORD
        ══════════════════════════════════════ */}
        {editing && (
          <div className="prof-section">
            <div className="prof-section-title">Change Password</div>
            <p className="prof-section-hint">Leave blank to keep your current password.</p>

            <Field label="New Password" error={errors.newPass || passErr}>
              <div className="a4a-pass-wrap">
                <input
                  type={showPass ? "text" : "password"}
                  value={newPass}
                  onChange={handleNewPass}
                  placeholder="New password"
                  className={`a4a-input${errors.newPass || passErr ? " error" : ""}`}
                  autoComplete="new-password"
                />
                <button type="button" className="a4a-eye-btn" onClick={() => setShowPass((s) => !s)}>
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
            </Field>

            <Field label="Confirm New Password" error={errors.confirmPass || confirmErr}>
              <TextInput
                type="password"
                value={confirmPass}
                onChange={handleConfirmPass}
                placeholder="Repeat new password"
                error={errors.confirmPass || confirmErr}
              />
            </Field>
          </div>
        )}

        {/* ══════════════════════════════════════
            LOG OUT
        ══════════════════════════════════════ */}
        <div className="prof-section prof-section--danger">
          <div className="prof-section-title">Account</div>
          <div className="prof-danger-row">
            <div>
              <div className="prof-danger-label">Log Out</div>
              <div className="prof-danger-desc">Sign out of your All4All account on this device.</div>
            </div>
            <button
              className="prof-btn prof-btn--danger"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/");
              }}
            >
              Log Out
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}