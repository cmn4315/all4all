import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/all4allLogo.png";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function calcHours(start, end) {
  if (!start || !end) return null;
  const diff = (new Date(end) - new Date(start)) / 36e5;
  return diff > 0 ? diff.toFixed(1) : null;
}

const API = {
  getPublishedEvents: async () => {
    const res = await fetch("/api/events");
    if (!res.ok) throw new Error("Failed to fetch events");
    return res.json();
  },
};

const DISTANCES = ["Any Distance", "< 1 mi", "< 2 mi", "< 5 mi", "< 10 mi"];
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

// ─── Sub-components ───────────────────────────────────────────────────────────
function Avatar({ src, name, size = 38 }) {
  return src
    ? <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
    : (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: size * 0.36, letterSpacing: 0.5, flexShrink: 0,
      }}>
        {initials(name)}
      </div>
    );
}

function StatBadge({ value, label, color = "#2563eb" }) {
  return (
    <div style={{
      background: `linear-gradient(135deg,${color} 0%,${color}cc 100%)`,
      borderRadius: 16, padding: "16px 24px", color: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center",
      boxShadow: `0 8px 24px ${color}44`, minWidth: 120,
    }}>
      <span style={{ fontSize: 30, fontWeight: 900, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85, marginTop: 4, letterSpacing: 0.5, textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

function CategoryPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer",
        fontFamily: "inherit", fontSize: 12.5,
        fontWeight: active ? 700 : 500,
        background: active ? "#15803d" : "#f1f5f9",
        color: active ? "#fff" : "#475569",
        transition: "all 0.18s", whiteSpace: "nowrap",
        boxShadow: active ? "0 2px 8px rgba(37,99,235,0.22)" : "none",
      }}>
      {label}
    </button>
  );
}

function EventCard({ event, isOwnEvent, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const hours = calcHours(event.start_time, event.end_time);
  const isDraft = event.status === "DRAFT";
  const [registrants, setRegistrants] = useState([]);
  const [showRegistrants, setShowRegistrants] = useState(false);

  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "20px 22px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${isOwnEvent ? "#bfdbfe" : "#e2e8f0"}`,
      transition: "transform 0.18s, box-shadow 0.18s",
      display: "flex", flexDirection: "column", gap: 12,
      position: "relative",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.10)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)"; }}
    >
      {isOwnEvent && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: isDraft ? "#fef9c3" : "#eff6ff",
          color: isDraft ? "#854d0e" : "#1d4ed8",
          border: `1px solid ${isDraft ? "#fde68a" : "#bfdbfe"}`,
          borderRadius: 99, fontSize: 10.5, fontWeight: 700,
          padding: "2px 9px", letterSpacing: 0.3, textTransform: "uppercase",
        }}>
          {isDraft ? "Draft" : "Your Event"}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            {event.category && (
              <span style={{
                background: "#eff6ff", color: "#1d4ed8", fontSize: 11, fontWeight: 700,
                padding: "2px 9px", borderRadius: 99, border: "1px solid #bfdbfe",
              }}>
                {event.category}
              </span>
            )}
            {hours && (
              <span style={{
                background: "#f0fdf4", color: "#15803d", fontSize: 11, fontWeight: 700,
                padding: "2px 9px", borderRadius: 99, border: "1px solid #bbf7d0",
              }}>
                {hours} hrs
              </span>
            )}
          </div>
          <h3 style={{ fontSize: 15.5, fontWeight: 800, color: "#1e293b", lineHeight: 1.3 }}>{event.name}</h3>
          <p style={{ fontSize: 12.5, color: "#2563eb", fontWeight: 600, marginTop: 2 }}>
            {event.organization_name || "Your Organization"}
          </p>
        </div>
      </div>

      <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0 }}>{event.description}</p>
      
      {event.tags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {event.tags.map(tag => (
            <span key={tag} style={{
              background: "#f0fdf4", color: "#15803d", fontSize: 11, fontWeight: 600,
              padding: "2px 10px", borderRadius: 99, border: "1px solid #bbf7d0",
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {expanded && event.roles?.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Available Roles
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {event.roles.map(r => (
              <span key={r} style={{
                background: "#f8fafc", border: "1px solid #e2e8f0",
                borderRadius: 8, padding: "4px 10px", fontSize: 12.5, color: "#334155", fontWeight: 500,
              }}>{r}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12.5, color: "#64748b" }}>
        <span>📅 {formatDate(event.start_time)} · {formatTime(event.start_time)} – {formatTime(event.end_time)}</span>
        {event.city && <span>📍 {event.city}, {event.state} · {event.distance_miles} mi away</span>}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        {event.roles?.length > 0 && (
          <button onClick={() => setExpanded(p => !p)} style={{
            background: "none", border: "1.5px solid #e2e8f0", borderRadius: 8,
            padding: "7px 14px", fontSize: 12.5, fontWeight: 600, color: "#475569",
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.color = "#2563eb"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#475569"; }}
          >
            {expanded ? "Show less" : "See roles"}
          </button>
        )}
        {isOwnEvent ? (
          <>
            <button onClick={() => onEdit(event)} style={{
              flex: 1, background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
              border: "none", borderRadius: 8, padding: "7px 14px",
              fontSize: 12.5, fontWeight: 700, color: "#fff",
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
            }}>
              Edit Event
            </button>
            <button onClick={() => onDelete(event)} style={{
              background: "#fff", border: "1.5px solid #fecaca", borderRadius: 8,
              padding: "7px 14px", fontSize: 12.5, fontWeight: 700, color: "#ef4444",
              cursor: "pointer", fontFamily: "inherit",
            }}>
              Delete
            </button>
          </>
        ) : (
          <div style={{
            flex: 1, background: "#f8fafc", border: "1.5px solid #e2e8f0",
            borderRadius: 8, padding: "7px 14px", fontSize: 12.5,
            fontWeight: 600, color: "#94a3b8", textAlign: "center",
          }}>
            View Only
          </div>
        )}
      </div>
    <button
    onClick={async () => {
      if (!showRegistrants && registrants.length === 0) {
        const data = await fetch(`/api/events/${event.id}/registrations`).then(r => r.json());
        setRegistrants(data);
      }
      setShowRegistrants(p => !p);
    }}
    style={{
      background: "none", border: "1.5px solid #e2e8f0", borderRadius: 8,
      padding: "7px 14px", fontSize: 12.5, fontWeight: 600, color: "#475569",
      cursor: "pointer", fontFamily: "inherit",
    }}
  >
    👥 {showRegistrants ? "Hide" : "See"} Registrants
  </button>

  {showRegistrants && (
    <div style={{
      background: "#f8fafc", borderRadius: 10, padding: "12px 14px",
      border: "1px solid #e2e8f0", marginTop: 4,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>
        {registrants.length} volunteer{registrants.length !== 1 ? "s" : ""} registered
      </div>
      {registrants.length === 0 ? (
        <p style={{ fontSize: 13, color: "#94a3b8" }}>No one registered yet.</p>
      ) : registrants.map((r, i) => (
        <div key={i} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "6px 0", borderBottom: i < registrants.length - 1 ? "1px solid #e2e8f0" : "none",
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{r.full_name}</div>
            <div style={{ fontSize: 11.5, color: "#64748b" }}>{r.email}</div>
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>
            {new Date(r.registered_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  )}

    </div>
  );
}

// ─── Create/Edit Event Modal ──────────────────────────────────────────────────
const AVAILABLE_TAGS = [
  "Environment", "Outdoors", "Family Friendly", "Physical Activity",
  "Weekend", "Education", "Food & Hunger", "Elder Care", "Animals", "Health",
];

const AVAILABLE_BADGES = [
  { id: "top_volunteer", icon: "🏅", label: "Top Volunteer" },
  { id: "eco_warrior",   icon: "🌱", label: "Eco Warrior" },
  { id: "team_player",   icon: "🤝", label: "Team Player" },
  { id: "first_timer",   icon: "⭐", label: "First Timer" },
  { id: "ten_hr_club",   icon: "🔥", label: "10hr Club" },
];

const STEPS = ["Details", "Location & Time", "Roles & Tags", "Photos & Badges"];

function EventModal({ event, orgId, onClose, onSaved }) {
  const isEdit = !!event;
  const photoInputRef = useRef(null);

  const [form, setForm] = useState({
    name:          event?.name          || "",
    description:   event?.description   || "",
    contact_email: event?.contact_email || "",
    contact_phone: event?.contact_phone || "",
    start_time:    event?.start_time?.slice(0, 16) || "",
    end_time:      event?.end_time?.slice(0, 16)   || "",
    address:       event?.address   || "",
    city:          event?.city      || "",
    state:         event?.state     || "NY",
    zip_code:      event?.zip_code  || "",
    color:         event?.color     || "#15803d",
  });

  const [roles, setRoles] = useState(event?.roles ?? [{ id: Date.now(), name: "", spots: "" }]);
  const [selectedTags, setSelectedTags]     = useState(new Set(event?.tags ?? []));
  const [selectedBadges, setSelectedBadges] = useState(new Set(event?.badges?.map(b => b.id) ?? []));
  const [photos, setPhotos]   = useState(event?.photos ?? []);
  const [tab, setTab]         = useState(0);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [submitErr, setSubmitErr] = useState(null);

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: null }));
  }

  function addRole() {
    setRoles(r => [...r, { id: Date.now(), name: "", spots: "" }]);
  }
  function updateRole(id, key, val) {
    setRoles(r => r.map(role => role.id === id ? { ...role, [key]: val } : role));
  }
  function removeRole(id) {
    setRoles(r => r.filter(role => role.id !== id));
  }

  function toggleTag(tag) {
    setSelectedTags(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }
  function toggleBadge(id) {
    setSelectedBadges(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handlePhotoFiles(files) {
    const newPhotos = Array.from(files).map(file => ({
      url: URL.createObjectURL(file),
      alt: file.name,
      file,
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
  }
  function removePhoto(idx) {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  }
  
// Add inside EventModal, after the useState declarations
  useEffect(() => {
        if (!event?.id) return;
        fetch(`/api/events/${event.id}/roles`)
          .then(r => r.json())
          .then(data => {
            if (data.length > 0) {
              setRoles(data.map(r => ({ id: r.id, name: r.name, spots: r.spots })));
            }
          })
          .catch(console.error);
  }, [event?.id]);

  function validate() {
    const errs = {};
    if (!form.name.trim())        errs.name        = "Event name is required.";
    if (!form.description.trim()) errs.description = "Description is required.";
    if (!form.start_time)         errs.start_time  = "Start time is required.";
    if (!form.end_time)           errs.end_time    = "End time is required.";
    if (form.start_time && form.end_time && new Date(form.end_time) <= new Date(form.start_time))
      errs.end_time = "End time must be after start time.";
    if (!form.zip_code.trim())    errs.zip_code    = "ZIP code is required.";
    return errs;
  }

  async function handleSubmit(status) {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      if (errs.name || errs.description) return setTab(0);
      if (errs.start_time || errs.end_time || errs.zip_code) return setTab(1);
      return;
    }
    setLoading(true);
    setSubmitErr(null);
    try {
      const payload = { organization_id: orgId, ...form };
      const url    = isEdit ? `/api/events/${event.id}` : "/api/events";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save event");
      const saved = await res.json();

      const eventId = isEdit ? event.id : saved.id;  // ✅ declare once, up top

      if (status === "PUBLISHED") {
        const pubRes = await fetch(`/api/events/${eventId}/publish`, { method: "PUT" });
        if (!pubRes.ok) throw new Error("Failed to publish event");
      }

      if (roles.some(r => r.name?.trim())) {
        await fetch(`/api/events/${eventId}/roles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roles }),
        });
      }

      // Save tags
      const tagsArray = [...selectedTags];
      await fetch(`/api/events/${eventId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: tagsArray }),
      });

      onSaved({
        ...form,
        id: isEdit ? event.id : saved.id,
        status,
        roles,
        tags: [...selectedTags],
        badges: AVAILABLE_BADGES.filter(b => selectedBadges.has(b.id)),
        photos,
      }, isEdit);

      onClose();
    } catch (err) {
      console.error(err);
      setSubmitErr("Failed to save event. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inp = (errKey) => ({
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: `1.5px solid ${errors[errKey] ? "#fca5a5" : "#e2e8f0"}`,
    fontSize: 13.5, fontFamily: "inherit", color: "#1e293b",
    outline: "none", background: "#fff", boxSizing: "border-box",
    transition: "border-color .15s",
  });
  const lbl = { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".6px", display: "block", marginBottom: 5 };
  const errStyle = { fontSize: 11.5, color: "#ef4444", marginTop: 3 };
  const row = { display: "flex", gap: 12 };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999, padding: 16, backdropFilter: "blur(6px)",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#fff", borderRadius: 22,
        width: "100%", maxWidth: 680, maxHeight: "92vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 40px 100px rgba(0,0,0,.35)",
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#0f172a" }}>
              {isEdit ? "Edit Event" : "Create New Event"}
            </h2>
            <button onClick={onClose} style={{
              background: "#f1f5f9", border: "none", borderRadius: 8,
              width: 32, height: 32, cursor: "pointer", fontSize: 15, color: "#64748b",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>

          {/* Step tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9" }}>
            {STEPS.map((label, i) => (
              <button
                key={i}
                onClick={() => setTab(i)}
                style={{
                  flex: 1, padding: "10px 4px 12px", textAlign: "center",
                  fontSize: 12, fontWeight: 600,
                  color: i === tab ? "#15803d" : i < tab ? "#15803d" : "#94a3b8",
                  borderBottom: `2px solid ${i === tab ? "#15803d" : "transparent"}`,
                  background: "none", border: "none",
                  cursor: "pointer", fontFamily: "inherit", transition: "color .2s",
                }}
              >
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 20, height: 20, borderRadius: "50%",
                  background: i <= tab ? "#15803d" : "#f1f5f9",
                  color: i <= tab ? "#fff" : "#94a3b8",
                  fontSize: 10, fontWeight: 700, marginRight: 6,
                }}>
                  {i < tab ? "✓" : i + 1}
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px" }}>

          {/* Tab 0 — Details */}
          {tab === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>Event Name *</label>
                <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Community Cleanup Day" style={inp("name")} />
                {errors.name && <div style={errStyle}>{errors.name}</div>}
              </div>
              <div>
                <label style={lbl}>Description *</label>
                <textarea value={form.description} onChange={e => set("description", e.target.value)}
                  placeholder="Describe the event, what volunteers will do, what to bring…"
                  style={{ ...inp("description"), minHeight: 90, resize: "vertical" }} />
                {errors.description && <div style={errStyle}>{errors.description}</div>}
              </div>
              <div style={row}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Contact Email</label>
                  <input type="email" value={form.contact_email} onChange={e => set("contact_email", e.target.value)} placeholder="contact@org.org" style={inp()} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Contact Phone</label>
                  <input type="tel" value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)} placeholder="(585) 555-0100" style={inp()} />
                </div>
              </div>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={lbl}>Event Color</label>
            <input
              type="color"
              value={form.color}
              onChange={e => set("color", e.target.value)}
              style={{ width: 40, height: 36, padding: 2, borderRadius: 8, border: "1.5px solid #e2e8f0", cursor: "pointer" }}
            />
            <span style={{ fontSize: 12.5, color: "#64748b" }}>Shown as accent color on event cards</span>
          </div>

          {/* Tab 1 — Location & Time */}
          {tab === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={row}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Start Time *</label>
                  <input type="datetime-local" value={form.start_time} onChange={e => set("start_time", e.target.value)} style={inp("start_time")} />
                  {errors.start_time && <div style={errStyle}>{errors.start_time}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>End Time *</label>
                  <input type="datetime-local" value={form.end_time} onChange={e => set("end_time", e.target.value)} style={inp("end_time")} />
                  {errors.end_time && <div style={errStyle}>{errors.end_time}</div>}
                </div>
              </div>
              <div>
                <label style={lbl}>Address</label>
                <input value={form.address} onChange={e => set("address", e.target.value)} placeholder="123 Main St" style={inp()} />
              </div>
              <div style={row}>
                <div style={{ flex: 2 }}>
                  <label style={lbl}>City</label>
                  <input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Rochester" style={inp()} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>State</label>
                  <select value={form.state} onChange={e => set("state", e.target.value)} style={inp()}>
                    {US_STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>ZIP *</label>
                  <input value={form.zip_code} onChange={e => set("zip_code", e.target.value)} placeholder="14604" style={inp("zip_code")} />
                  {errors.zip_code && <div style={errStyle}>{errors.zip_code}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2 — Roles & Tags */}
          {tab === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={lbl}>Volunteer Roles</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                  {roles.map(role => (
                    <div key={role.id} style={{
                      display: "flex", gap: 8, alignItems: "center",
                      background: "#f8fafc", borderRadius: 10, padding: "10px 12px",
                      border: "1.5px solid #e2e8f0",
                    }}>
                      <input
                        value={role.name}
                        onChange={e => updateRole(role.id, "name", e.target.value)}
                        placeholder="Role name (e.g. Trail Cleanup)"
                        style={{ border: "none", background: "transparent", fontSize: 13.5, flex: 1, outline: "none", fontFamily: "inherit", color: "#1e293b" }}
                      />
                      <input
                        type="number" value={role.spots}
                        onChange={e => updateRole(role.id, "spots", e.target.value)}
                        placeholder="Spots" min="1"
                        style={{ width: 70, padding: "4px 8px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 13, textAlign: "center", fontFamily: "inherit" }}
                      />
                      <button onClick={() => removeRole(role.id)} style={{
                        background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16, flexShrink: 0,
                      }}>✕</button>
                    </div>
                  ))}
                </div>
                <button onClick={addRole} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "#f0fdf4", border: "1.5px dashed #86efac",
                  color: "#15803d", borderRadius: 10, padding: "9px 14px",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", width: "100%",
                }}>
                  ＋ Add Role
                </button>
              </div>

              <div>
                <label style={lbl}>Event Tags</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {AVAILABLE_TAGS.map(tag => (
                    <button key={tag} onClick={() => toggleTag(tag)} style={{
                      padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${selectedTags.has(tag) ? "#15803d" : "#e2e8f0"}`,
                      background: selectedTags.has(tag) ? "#15803d" : "#f8fafc",
                      color: selectedTags.has(tag) ? "#fff" : "#475569",
                      cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
                    }}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3 — Photos & Badges */}
          {tab === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={lbl}>Event Photos</label>
                <div
                  onClick={() => photoInputRef.current.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handlePhotoFiles(e.dataTransfer.files); }}
                  style={{
                    border: "2px dashed #cbd5e1", borderRadius: 12,
                    padding: "22px 16px", textAlign: "center", cursor: "pointer",
                    background: "#f8fafc", transition: "border-color .2s, background .2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#15803d"; e.currentTarget.style.background = "#f0fdf4"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.background = "#f8fafc"; }}
                >
                  <div style={{ fontSize: 30, marginBottom: 6 }}>📸</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>
                    <strong style={{ color: "#15803d" }}>Click to upload</strong> or drag &amp; drop
                    <br /><span style={{ fontSize: 11, color: "#94a3b8" }}>PNG, JPG up to 10MB each</span>
                  </div>
                  <input
                    ref={photoInputRef} type="file" accept="image/*" multiple
                    style={{ display: "none" }}
                    onChange={e => handlePhotoFiles(e.target.files)}
                  />
                </div>
                {photos.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 12 }}>
                    {photos.map((p, i) => (
                      <div key={i} style={{
                        aspectRatio: "4/3", borderRadius: 10, overflow: "hidden",
                        position: "relative", background: "#e8f5ec",
                        backgroundImage: `url(${p.url})`,
                        backgroundSize: "cover", backgroundPosition: "center",
                        border: "2px solid #d1fae5",
                      }}>
                        <button onClick={() => removePhoto(i)} style={{
                          position: "absolute", top: 5, right: 5,
                          background: "rgba(0,0,0,.55)", color: "#fff", border: "none",
                          borderRadius: "50%", width: 22, height: 22, fontSize: 11,
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={lbl}>
                  Badges Offered{" "}
                  <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#94a3b8" }}>
                    (volunteers earn these)
                  </span>
                </label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {AVAILABLE_BADGES.map(b => {
                    const on = selectedBadges.has(b.id);
                    return (
                      <button key={b.id} onClick={() => toggleBadge(b.id)} style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                        padding: "10px 14px", borderRadius: 12,
                        background: on ? "#f0fdf4" : "#f8fafc",
                        border: `1.5px solid ${on ? "#15803d" : "#e2e8f0"}`,
                        cursor: "pointer", fontFamily: "inherit",
                        fontSize: 11, color: on ? "#15803d" : "#64748b",
                        transition: "all .15s",
                      }}>
                        <span style={{ fontSize: 26 }}>{b.icon}</span>
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {submitErr && (
            <div style={{ color: "#ef4444", fontSize: 13, marginTop: 12, textAlign: "center" }}>
              {submitErr}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px 18px", borderTop: "1px solid #f1f5f9",
          display: "flex", gap: 8, flexShrink: 0, background: "#fff",
        }}>
          
          {isEdit && (
            <button
              onClick={() => handleSubmit("PUBLISHED")}
              disabled={loading}
              style={{
                width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg,#15803d,#166534)",
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", marginBottom: 8,
                boxShadow: "0 2px 8px rgba(21,128,61,0.3)",
              }}
            >
              {loading ? "Publishing…" : "🚀 Publish / Re-publish Event"}
            </button>
          )}
          {tab > 0 && (
            <button onClick={() => setTab(t => t - 1)} style={{
              padding: "10px 18px", borderRadius: 10, border: "1.5px solid #e2e8f0",
              background: "#f8fafc", color: "#475569", fontSize: 13.5, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}>← Back</button>
          )}
          {tab < STEPS.length - 1 ? (
            <button onClick={() => setTab(t => t + 1)} style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
              background: "#0f172a", color: "#fff", fontSize: 13.5, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}>Next →</button>
          ) : (
            <>
              <button onClick={() => handleSubmit("DRAFT")} disabled={loading} style={{
                flex: 1, padding: "10px 0", borderRadius: 10, border: "1.5px solid #e2e8f0",
                background: "#f8fafc", color: "#475569", fontSize: 13.5, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                {loading ? "Saving…" : "Save as Draft"}
              </button>
              <button onClick={() => handleSubmit("PUBLISHED")} disabled={loading} style={{
                flex: 2, padding: "10px 0", borderRadius: 10, border: "none",
                background: "#15803d", color: "#fff", fontSize: 13.5, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                {loading ? "Publishing…" : "Publish Event"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
// Add this component above OrgHome
function DeleteConfirmModal({ event, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 99999, padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "32px 28px",
        maxWidth: 400, width: "100%", textAlign: "center",
        boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
      }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>
          Delete Event?
        </h2>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
          Are you sure you want to delete <strong>"{event.name}"</strong>?
          This action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "11px 0", borderRadius: 10,
            border: "1.5px solid #e2e8f0", background: "#f8fafc",
            color: "#475569", fontSize: 14, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit",
          }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: "11px 0", borderRadius: 10,
            border: "none", background: "#ef4444",
            color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit",
          }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrgHome() {
  const navigate = useNavigate();

  const [org, setOrg]               = useState(null);
  const [allEvents, setAllEvents]   = useState([]);
  const [myEvents, setMyEvents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState("browse");
  const [search, setSearch]         = useState("");
  const [activeCategories, setActiveCategories] = useState(["All"]);
  const [distanceFilter, setDistance] = useState("Any Distance");
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast]           = useState(null);
  const [showModal, setShowModal]   = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryErr, setCategoryErr] = useState(null);
  const searchRef = useRef();
  const [deletingEvent, setDeletingEvent] = useState(null);

  const user = JSON.parse(localStorage.getItem("user") || "null");

  function toggleCategory(category) {
    setActiveCategories(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      if (category === "All") return ["All"];
      const next = arr.includes(category)
        ? arr.filter(c => c !== category)
        : [...arr.filter(c => c !== "All"), category];
      return next.length ? next : ["All"];
    });
  }

  useEffect(() => {
    fetch("/api/orgCategories")
      .then(res => res.json())
      .then(data => setCategories(["All", ...data]))
      .catch(() => setCategoryErr("Could not load categories."));
  }, []);

  // ✅ Single fetch for all published events
  useEffect(() => {
    API.getPublishedEvents()
      .then(setAllEvents)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    fetch(`/api/organizations/by-user/${user.id}`)
      .then(r => r.json())
      .then(setOrg)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!org?.id) return;
    fetch(`/api/organizations/${org.id}/events`)
      .then(r => r.json())
      .then(setMyEvents)
      .catch(() => setMyEvents([]));
  }, [org]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function handleSavedEvent(saved, isEdit) {
    if (isEdit) {
      setMyEvents(prev => prev.map(e => e.id === saved.id ? saved : e));
      showToast("Event updated! ✅");
    } else {
      setMyEvents(prev => [saved, ...prev]);
      showToast("Event created! 🎉");
    }
  }

  async function handleDelete(event) {
    setDeletingEvent(event);
  }

  async function confirmDelete() {
    try {
      await fetch(`/api/events/${deletingEvent.id}`, { method: "DELETE" });
      setMyEvents(prev => prev.filter(e => e.id !== deletingEvent.id));
      showToast("Event deleted.");
    } catch {
      showToast("Failed to delete event.");
    } finally {
      setDeletingEvent(null);
    }
  }

  const myEventIds = new Set(myEvents.map(e => e.id));

  // ✅ Fixed: "All" check now works correctly
  const filtered = allEvents.filter(ev => {
    const q = search.toLowerCase();
    const matchSearch = !q || ev.name?.toLowerCase().includes(q) || ev.description?.toLowerCase().includes(q) || ev.organization_name?.toLowerCase().includes(q);
    const matchCat  = activeCategories.includes("All") || activeCategories.includes(ev.category);
    const maxDist   = { "< 1 mi": 1, "< 2 mi": 2, "< 5 mi": 5, "< 10 mi": 10 }[distanceFilter];
    const matchDist = !maxDist || (ev.distance_miles != null && ev.distance_miles < maxDist);
    const matchFrom = !dateFrom || new Date(ev.start_time) >= new Date(dateFrom);
    const matchTo   = !dateTo   || new Date(ev.start_time) <= new Date(dateTo + "T23:59:59");
    return matchSearch && matchCat && matchDist && matchFrom && matchTo;
  });

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#eff6ff 0%,#dbeafe 40%,#bfdbfe 100%)" }}>
        <div style={{ color: "#15803d", fontWeight: 700, fontSize: 16 }}>Loading…</div>
      </div>
    );
  }

  const publishedCount = myEvents.filter(e => e.status === "PUBLISHED").length;
  const draftCount     = myEvents.filter(e => e.status === "DRAFT").length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#a3c9b1 0%,#a3c9b1 100%)",
      fontFamily: "'Nunito','Segoe UI',sans-serif",
    }}>

      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.90)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #e2e8f0",
        padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="home-nav__logo-icon">
            <img src={logo} alt="All4All Logo" className="home-nav__logo-img" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#15803d", letterSpacing: -0.5 }}>All4All</span>
        </div>
        <button
          onClick={() => navigate("/profile")}
          title="View profile"
          style={{
            background: "none", border: "2px solid #15803d",
            borderRadius: "50%", padding: 2, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.18)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
        >
          <Avatar src={org?.logo_url} name={org?.name || user?.username} size={36} />
        </button>
      </nav>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 16px 64px" }}>

        {/* Header card */}
        <section style={{
          background: "#fff", borderRadius: 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: "1px solid #e2e8f0",
          padding: "24px 28px", marginBottom: 20,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar src={org?.logo_url} name={org?.name || user?.username} size={52} />
            <div>
              <p style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>Organization Dashboard</p>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", lineHeight: 1.2 }}>
                {org?.name || user?.username}
              </h2>
              {org?.description && (
                <p style={{ fontSize: 12.5, color: "#64748b", marginTop: 2, maxWidth: 340 }}>{org.description}</p>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatBadge value={publishedCount} label="Published" color="#2563eb" />
            <StatBadge value={draftCount}     label="Drafts"    color="#7c3aed" />
            <StatBadge value={myEvents.length} label="Total Events" color="#0891b2" />
          </div>
        </section>

        {/* Tabs + Create button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 12, padding: 4 }}>
            {[["browse", "🌐 Browse Events"], ["my-events", "📋 My Events"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                background: tab === key ? "#fff" : "transparent",
                color: "#64748b",
                boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.18s",
              }}>{label}</button>
            ))}
          </div>
          <button onClick={() => { setEditingEvent(null); setShowModal(true); }} style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: "#15803d", color: "#fff",
            fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 2px 8px rgba(21,128,61,0.30)",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            + Create Event
          </button>
        </div>

        {/* My Events Tab */}
        {tab === "my-events" && (
          <div>
            {myEvents.length === 0 ? (
              <div style={{
                background: "#fff", borderRadius: 16, padding: "48px 24px",
                textAlign: "center", color: "#94a3b8", fontSize: 14, fontWeight: 500,
                border: "1.5px dashed #bfdbfe",
              }}>
                No events yet. Create your first event to get started!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {myEvents.map(ev => (
                  <EventCard
                    key={ev.id} event={ev} isOwnEvent={true}
                    onEdit={e => { setEditingEvent(e); setShowModal(true); }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Browse Tab */}
        {tab === "browse" && (
          <>
            <section style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</span>
                  <input
                    ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search events or organizations…"
                    style={{
                      width: "100%", padding: "11px 14px 11px 40px", borderRadius: 12,
                      border: "1.5px solid #e2e8f0", fontSize: 14, fontFamily: "inherit",
                      fontWeight: 500, outline: "none", background: "#fff", color: "#1e293b",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = "#15803d"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
                  />
                </div>
                <button onClick={() => setShowFilters(p => !p)} style={{
                  padding: "11px 18px", borderRadius: 12, cursor: "pointer",
                  border: showFilters ? "1.5px solid #15803d" : "1.5px solid #e2e8f0",
                  background: showFilters ? "#f0fdf4" : "#fff",
                  color: showFilters ? "#15803d" : "#475569",
                  fontFamily: "inherit", fontWeight: 600, fontSize: 13.5,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  Filters {showFilters ? "▲" : "▼"}
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingBottom: 4 }}>
                {categories.map(c => {
                  const name = c.name || c;
                  return (
                    <CategoryPill
                      key={c.id || name}
                      label={name}
                      active={activeCategories.includes(name)}
                      onClick={() => toggleCategory(name)}
                    />
                  );
                })}
              </div>

              {showFilters && (
                <div style={{
                  marginTop: 12, background: "#fff", borderRadius: 14,
                  border: "1.5px solid #e2e8f0", padding: "18px 20px",
                  display: "flex", flexWrap: "wrap", gap: 18,
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Distance</label>
                    <select value={distanceFilter} onChange={e => setDistance(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", color: "#334155", background: "#fff", outline: "none" }}>
                      {DISTANCES.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>From</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", color: "#334155", background: "#fff", outline: "none" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>To</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", color: "#334155", background: "#fff", outline: "none" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <button
                      onClick={() => {
                        setDistance("Any Distance");
                        setDateFrom("");
                        setDateTo("");
                        setActiveCategories(["All"]); // ✅ fixed: array, not string
                      }}
                      style={{ background: "none", border: "1.5px solid #fca5a5", borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              )}
            </section>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>
                {filtered.length} event{filtered.length !== 1 ? "s" : ""} found
              </h3>
            </div>

            {filtered.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 16, padding: "48px 24px", textAlign: "center", color: "#94a3b8", fontSize: 14, fontWeight: 500, border: "1.5px dashed #e2e8f0" }}>
                No events match your filters.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {filtered.map(ev => (
                  <EventCard
                    key={ev.id} event={ev}
                    isOwnEvent={myEventIds.has(ev.id)}
                    onEdit={e => { setEditingEvent(e); setShowModal(true); }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <EventModal
          event={editingEvent}
          orgId={org?.id}
          onClose={() => { setShowModal(false); setEditingEvent(null); }}
          onSaved={handleSavedEvent}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          background: "#1d4ed8", color: "#fff", borderRadius: 12,
          padding: "12px 24px", fontSize: 14, fontWeight: 700,
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)", zIndex: 9999, whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}

      <style>{`
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #a3c9b1; border-radius: 99px; }
      `}</style>

      {deletingEvent && (
        <DeleteConfirmModal
          event={deletingEvent}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingEvent(null)}
        />
      )}
    </div>
  );
}