import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/home.css";
import logo from "../../assets/all4allLogo.png";

function sanitizeId(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 && String(n) === String(value) ? n : null;
}

const API = {
  getVolunteer: async (userId) => {
    const safeId = sanitizeId(userId);
    if (!safeId) throw new Error("Invalid user ID");
    const res = await fetch(`/api/volunteers/${safeId}`);
    if (!res.ok) throw new Error("Failed to fetch volunteer");
    return res.json();
  },
  getPublishedEvents: async () => {
    const res = await fetch("/api/events");
    if (!res.ok) throw new Error("Failed to fetch events");
    return res.json();
  },
};

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

const DISTANCES = ["Any Distance", "< 1 mi", "< 2 mi", "< 5 mi", "< 10 mi"];

function Avatar({ src, name, size = 38 }) {
  if (src) {
    return <img src={src} alt={name} className="home-avatar" style={{ width: size, height: size }} />;
  }
  return (
    <div className="home-avatar--initials" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials(name)}
    </div>
  );
}

function CategoryPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 99,
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 12.5,
        fontWeight: active ? 700 : 500,
        background: active ? "#15803d" : "#f1f5f9",
        color: active ? "#fff" : "#475569",
        transition: "all 0.18s",
        whiteSpace: "nowrap",
        boxShadow: active ? "0 2px 8px rgba(37,99,235,0.22)" : "none",
      }}>
      {label}
    </button>
  );
}

// FIX [6]: Removed duplicate nested <div className="home-card"> — the outer div
// was setting the border-left accent color, then immediately re-opened another
// home-card div, duplicating the container and causing layout issues.
function EventCard({ event, onViewDetails }) {
  const hours = calcHours(event.start_time, event.end_time);

  return (
    <div className="home-card" style={{ borderLeft: `4px solid ${event.color || "#15803d"}` }}>
      <div className="home-card__top">
        <div style={{ flex: 1 }}>
          <div className="home-card__badges">
            {event.category && (
              <span className="home-card__tag home-card__tag--category">{event.category}</span>
            )}
            {hours && (
              <span className="home-card__tag home-card__tag--hours">{hours} hrs</span>
            )}
          </div>
          <h3 className="home-card__title">{event.name}</h3>
          {/* Org name + logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            {event.organization_logo ? (
              <img
                src={event.organization_logo}
                alt={event.organization_name}
                style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                background: "linear-gradient(135deg,#15803d,#166534)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 800, color: "#fff", flexShrink: 0,
              }}>
                {(event.organization_name || "?")[0]}
              </div>
            )}
            <p style={{ fontSize: 12.5, color: "#2563eb", fontWeight: 600, margin: 0 }}>
              {event.organization_name || "Your Organization"}
            </p>
          </div>
        </div>
      </div>

      <p className="home-card__desc">{event.description}</p>
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
      <div style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>
        👥 {event.volunteer_count ?? 0} volunteer{event.volunteer_count !== 1 ? "s" : ""} signed up
      </div>

      <div className="home-card__meta">
        <span>📅 {formatDate(event.start_time)} · {formatTime(event.start_time)} – {formatTime(event.end_time)}</span>
        {event.distance_miles != null && (
          <span>📍 {event.city}, {event.state} · {event.distance_miles} mi away</span>
        )}
      </div>
      {event.recurrence && (
        <span style={{
          background: "#fdf4ff", color: "#7c3aed", fontSize: 11, fontWeight: 700,
          padding: "2px 9px", borderRadius: 99, border: "1px solid #e9d5ff",
        }}>
          🔁 {event.recurrence === "biweekly" ? "Every 2 weeks" : event.recurrence.charAt(0).toUpperCase() + event.recurrence.slice(1)}
        </span>
      )}

      <div className="home-card__actions">
        <button
          className="home-card__btn home-card__btn--register"
          onClick={() => onViewDetails(event)}
        >
          View Details
        </button>
      </div>
    </div>
  );
}

// ─── Small modal helpers ───────────────────────────────────────────────────────
function SectionLabel({ color, children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "1.5px",
      textTransform: "uppercase", color, marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, color: "#999", fontWeight: 600, marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 14, color: "#222", fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  );
}

function carouselBtnStyle(side) {
  return {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    [side === "left" ? "left" : "right"]: 10,
    background: "rgba(255,255,255,.9)", border: "none",
    width: 34, height: 34, borderRadius: "50%",
    fontSize: 18, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,.15)", transition: "background .15s",
  };
}

// ─── EventDetailModal ─────────────────────────────────────────────────────────
function EventDetailModal({
  event,
  volunteerId,
  isRegistered: initialRegistered,
  onClose,
  onRegisterChange,
}) {
  const [attendee, setAttendee] = useState(false);
  const [orgData, setOrgData]             = useState(null);
  const [registered, setRegistered]       = useState(initialRegistered);
  const [selectedRoles, setSelectedRoles] = useState(new Set());
  const [loading, setLoading]             = useState(false);
  const [carouselIdx, setCarouselIdx]     = useState(0);
  const slidesRef = useRef(null);
  const [roles, setRoles] = useState([]);
  const [myRoleId, setMyRoleId] = useState(null);

  // FIX [4]: Replace alert() with inline error state
  const [registerError, setRegisterError] = useState(null);

  const brandColor = orgData?.brand_color || "#2e7d45";
  const brandLight = orgData?.brand_color ? `${orgData.brand_color}18` : "#e8f5ec";
  const [registrantCount, setRegistrantCount] = useState(0);
  const [eventBadges, setEventBadges] = useState([]);

  useEffect(() => {
    if (!event?.id || !volunteerId || !registered) return;
    // Sanitize both IDs before interpolating into the URL path (Sonar L226)
    const safeEventId = sanitizeId(event.id);
    const safeVolunteerId = sanitizeId(volunteerId);
    if (!safeEventId || !safeVolunteerId) return;
    fetch(`/api/events/${safeEventId}/volunteer-role/${safeVolunteerId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.role_id) setMyRoleId(data.role_id); })
      .catch(() => {});
  }, [event?.id, volunteerId, registered]);

  useEffect(() => {
    if (!event?.id) return;
    // Sanitize event.id before using it in any URL path (Sonar L234, L239, L247)
    const safeEventId = sanitizeId(event.id);
    if (!safeEventId) return;

    fetch(`/api/events/${safeEventId}/registrations/count`)
      .then(r => r.json())
      .then(data => setRegistrantCount(data.total))
      .catch(() => {});

    fetch(`/api/events/${safeEventId}/roles`)
      .then(r => r.json())
      .then(data => setRoles(data.map(r => ({
        ...r,
        spots_available: r.spots - parseInt(r.filled),
      }))))
      .catch(() => {});

    fetch(`/api/events/${safeEventId}/badges`)
      .then(r => r.json())
      .then(setEventBadges)
      .catch(() => {});
  }, [event?.id]);

  useEffect(() => {
    if (!event?.organization_id) return;
    // Sanitize organization_id before interpolating into URL path (Sonar L255)
    const safeOrgId = sanitizeId(event.organization_id);
    if (!safeOrgId) return;
    fetch(`/api/organizations/${safeOrgId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setOrgData(data))
      .catch(() => {});
  }, [event?.organization_id]);

  const photos = event?.photos ?? [];
  const totalSlides = Math.max(photos.length, 1);

  function slideBy(dir) {
    setCarouselIdx(i => (i + dir + totalSlides) % totalSlides);
  }

  function toggleRole(roleId) {
    setSelectedRoles(prev => {
      const next = new Set();
      if (!prev.has(roleId)) next.add(roleId);
      return next;
    });
  }

  async function handleRegister() {
    if (!volunteerId) {
      setRegisterError("Please log in to register.");
      return;
    }

    if (!registered && roles.length > 0 && selectedRoles.size === 0) {
      setRegisterError("Please select a role before registering.");
      return;
    }

    // Sanitize all externally-sourced IDs before URL construction
    const safeEventId = sanitizeId(event.id);
    const safeVolunteerId = sanitizeId(volunteerId);
    if (!safeEventId || !safeVolunteerId) {
      setRegisterError("Invalid event or volunteer ID. Please close and try again.");
      return;
    }

    setRegisterError(null);
    setLoading(true);
    try {
      if (!registered) {
        const res = await fetch(`/api/events/${safeEventId}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ volunteer_id: safeVolunteerId }),
        });
        if (!res.ok) throw new Error(await res.text());

        for (const roleId of selectedRoles) {
          const safeRoleId = sanitizeId(roleId);
          if (!safeRoleId) continue;
          await fetch(`/api/roles/${safeRoleId}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ volunteer_id: safeVolunteerId }),
          });
        }

        const updatedRoles = await fetch(`/api/events/${safeEventId}/roles`).then(r => r.json());
        setRoles(updatedRoles.map(r => ({ ...r, spots_available: r.spots - parseInt(r.filled) })));

        setRegistered(true);
        onRegisterChange?.(event.id, true);
      } else {
        const res = await fetch(`/api/events/${safeEventId}/register`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ volunteer_id: safeVolunteerId }),
        });
        if (!res.ok) throw new Error(await res.text());

        if (myRoleId) {
          const safeMyRoleId = sanitizeId(myRoleId);
          if (safeMyRoleId) {
            await fetch(`/api/roles/${safeMyRoleId}/register`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ volunteer_id: safeVolunteerId }),
            }).catch(() => {});
          }
        }

        setMyRoleId(null);
        setSelectedRoles(new Set());
        setRegistered(false);
        onRegisterChange?.(event.id, false);

        const updatedRoles = await fetch(`/api/events/${safeEventId}/roles`).then(r => r.json());
        setRoles(updatedRoles.map(r => ({ ...r, spots_available: r.spots - parseInt(r.filled) })));
      }
    } catch {
      setRegisterError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!event) return null;

  const totalSpots = roles.reduce((sum, r) => sum + (r.spots_available ?? 0), 0);
  const badges = eventBadges;

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, zIndex: 1000,
        animation: "evFadeIn .2s ease",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
      role="button"
      tabIndex={0}
      onKeyDown={e => (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && onClose()}
    >
      <style>{`
        @keyframes evFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes evSlideUp { from { transform:translateY(28px);opacity:0 } to { transform:translateY(0);opacity:1 } }
        .ev-role-item { transition: border-color .15s, background .15s; }
        .ev-role-item:hover { border-color: var(--ev-brand) !important; background: var(--ev-light) !important; }
        .ev-reg-btn:hover { opacity: .88; }
        .ev-reg-btn:active { transform: scale(.98); }
        .ev-close:hover { background: #fff !important; }
        .ev-car-btn:hover { background: #fff !important; }
      `}</style>

      <div
        style={{
          "--ev-brand": brandColor,
          "--ev-light": brandLight,
          background: "#fff",
          borderRadius: 24,
          width: "100%", maxWidth: 960,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
          boxShadow: "0 32px 80px rgba(0,0,0,.35)",
          borderTop: `5px solid ${brandColor}`,
          animation: "evSlideUp .3s cubic-bezier(.22,1,.36,1)",
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          className="ev-close"
          onClick={onClose}
          style={{
            position: "absolute", top: 14, left: 14, zIndex: 10,
            background: "rgba(255,255,255,.92)",
            border: "none", width: 36, height: 36, borderRadius: "50%",
            fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,.12)", color: "#333",
          }}
          title="Back to events"
        >
          ←
        </button>

        {/* Top bar */}
        <div style={{
          padding: "14px 20px 14px 60px",
          borderBottom: "1px solid #f0f0f0",
          display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, color: "#666" }}>
            Events · <strong style={{ color: "#111" }}>{event.name}</strong>
          </span>
        </div>

        {/* Body */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          overflow: "hidden", flex: 1,
        }}>

          {/* LEFT */}
          <div style={{
            overflowY: "auto",
            padding: "28px 24px 28px 28px",
            borderRight: "1px solid #f0f0f0",
            display: "flex", flexDirection: "column", gap: 22,
          }}>
            {/* Org logo + name + badges */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              {orgData?.logo_url ? (
                <img
                  src={orgData.logo_url}
                  alt={orgData.name}
                  style={{
                    width: 64, height: 64, borderRadius: 14,
                    objectFit: "cover", border: "2px solid #f0f0f0", flexShrink: 0,
                  }}
                />
              ) : (
                <div style={{
                  width: 64, height: 64, borderRadius: 14,
                  background: brandLight, border: `2px solid ${brandColor}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, flexShrink: 0,
                }}>
                  🌿
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 20, fontWeight: 700, color: "#111",
                  lineHeight: 1.25, marginBottom: 3,
                }}>
                  {event.name}
                </div>
                <div style={{ fontSize: 13, color: "#777", marginBottom: 8 }}>
                  {orgData?.name ?? "Loading…"}
                </div>
                {badges.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    {badges.map(b => (
                      <div key={b.id} style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                        minWidth: 48,
                      }}>
                        {b.image_url ? (
                          <img
                            src={b.image_url} alt={b.name} title={b.name}
                            style={{ width: 34, height: 34, borderRadius: "50%", border: `2px solid ${brandColor}`, objectFit: "cover" }}
                          />
                        ) : (
                          <span style={{ fontSize: 28 }} title={b.name}>🏅</span>
                        )}
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#555", textAlign: "center", maxWidth: 56, lineHeight: 1.2 }}>
                          {b.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mission */}
            {orgData?.description && (
              <div>
                <SectionLabel color={brandColor}>Our Mission</SectionLabel>
                <p style={{
                  fontSize: 14, color: "#333", lineHeight: 1.7,
                  fontStyle: "italic",
                  borderLeft: `3px solid ${brandColor}`,
                  paddingLeft: 14, margin: 0,
                }}>
                  {orgData.description}
                </p>
              </div>
            )}

            {/* Event details */}
            <div>
              <SectionLabel color={brandColor}>Event Details</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <InfoRow icon="📝" label="Description" value={event.description} />
                <InfoRow
                  icon="📍"
                  label="Location"
                  value={[event.address, event.city, event.state, event.zip_code].filter(Boolean).join(", ")}
                />
                <InfoRow
                  icon="🕐"
                  label="Time"
                  value={`${formatDate(event.start_time)} · ${formatTime(event.start_time)} – ${formatTime(event.end_time)}`}
                />
                {(event.contact_email || orgData?.contact_email) && (
                  <InfoRow
                    icon="📧"
                    label="Event Contact"
                    value={[
                      event.contact_email ?? orgData?.contact_email,
                      event.contact_phone ?? orgData?.phone_number,
                    ].filter(Boolean).join(" · ")}
                  />
                )}
              </div>
            </div>

            {/* Tags */}
            {event.tags?.length > 0 && (
              <div>
                <SectionLabel color={brandColor}>Tags</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {event.tags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        background: brandLight, color: brandColor,
                        fontSize: 12, fontWeight: 600,
                        padding: "4px 12px", borderRadius: 20,
                        border: `1px solid ${brandColor}33`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div style={{
            display: "flex", flexDirection: "column",
            background: "#fafafa", overflowY: "auto",
          }}>
            {/* Carousel */}
            <div style={{
              position: "relative", aspectRatio: "16/10",
              background: "#e8e8e8", overflow: "hidden", flexShrink: 0,
            }}>
              <div
                ref={slidesRef}
                style={{
                  display: "flex", height: "100%",
                  transform: `translateX(-${carouselIdx * 100}%)`,
                  transition: "transform .4s cubic-bezier(.22,1,.36,1)",
                }}
              >
                {photos.length > 0 ? photos.map((p, i) => (
                  <img
                    key={i}
                    src={p.url}
                    alt={p.alt ?? `Event photo ${i + 1}`}
                    style={{ minWidth: "100%", height: "100%", objectFit: "cover" }}
                  />
                )) : (
                  <div style={{
                    minWidth: "100%", height: "100%",
                    background: brandLight,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 48,
                  }}>
                    📸
                  </div>
                )}
              </div>
              {photos.length > 1 && (
                <>
                  <button className="ev-car-btn" onClick={() => slideBy(-1)} style={carouselBtnStyle("left")}>‹</button>
                  <button className="ev-car-btn" onClick={() => slideBy(1)} style={carouselBtnStyle("right")}>›</button>
                  <div style={{
                    position: "absolute", bottom: 10,
                    left: "50%", transform: "translateX(-50%)",
                    display: "flex", gap: 5,
                  }}>
                    {photos.map((_, i) => (
                      <div
                        key={i}
                        onClick={() => setCarouselIdx(i)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => (e.key === "Enter" || e.key === " ") && setCarouselIdx(i)}
                        style={{
                          width: 6, height: 6, borderRadius: "50%", cursor: "pointer",
                          background: i === carouselIdx ? "#fff" : "rgba(255,255,255,.5)",
                          transform: i === carouselIdx ? "scale(1.3)" : "scale(1)",
                          transition: "background .2s, transform .2s",
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Roles */}
            <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, color: "#555" }}>
                <strong style={{ fontSize: 15, color: "#111" }}>{totalSpots}</strong>{" "}
                volunteer spot{totalSpots !== 1 ? "s" : ""} available
              </div>
              {roles.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {roles.map(role => {
                    const isFull = role.spots_available <= 0;
                    const checked = selectedRoles.has(role.id);
                    return (
                      <div
                        key={role.id}
                        className="ev-role-item"
                        onClick={() => !isFull && toggleRole(role.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => (e.key === "Enter" || e.key === " ") && !isFull && toggleRole(role.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 14px",
                          background: isFull ? "#f8f8f8" : checked ? brandLight : "#fff",
                          borderRadius: 10,
                          border: `1.5px solid ${isFull ? "#eee" : checked ? brandColor : "#eee"}`,
                          cursor: isFull ? "not-allowed" : "pointer",
                          userSelect: "none", opacity: isFull ? 0.5 : 1,
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                          border: `2px solid ${isFull ? "#ccc" : checked ? brandColor : "#ccc"}`,
                          background: checked ? brandColor : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, color: "#fff",
                        }}>
                          {checked ? "✓" : ""}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 500, color: isFull ? "#aaa" : "#222" }}>
                          {role.name}
                        </span>
                        <span style={{ marginLeft: "auto", fontSize: 12, color: isFull ? "#f87171" : "#999" }}>
                          {isFull ? "Full" : `${role.spots_available} spot${role.spots_available !== 1 ? "s" : ""}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // No roles — show Attendee option
                <div
                  className="ev-role-item"
                  onClick={() => setAttendee(p => !p)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && setAttendee(p => !p)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px",
                    background: attendee ? brandLight : "#fff",
                    borderRadius: 10,
                    border: `1.5px solid ${attendee ? brandColor : "#eee"}`,
                    cursor: "pointer", userSelect: "none",
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                    border: `2px solid ${attendee ? brandColor : "#ccc"}`,
                    background: attendee ? brandColor : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: "#fff",
                  }}>
                    {attendee ? "✓" : ""}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#222" }}>Attendee</span>
                </div>
              )}

              {/* FIX [4]: Inline error display replaces alert() */}
              {registerError && (
                <p style={{ fontSize: 13, color: "#ef4444", margin: 0, fontWeight: 600 }}>
                  {registerError}
                </p>
              )}
            </div>

            {/* Register button */}
            <div style={{
              padding: "14px 20px",
              background: "#fff", borderTop: "1px solid #f0f0f0", flexShrink: 0,
            }}>
              {registered ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{
                    width: "100%", padding: 14, borderRadius: 12,
                    background: "#f0fdf4", border: "1.5px solid #bbf7d0",
                    color: "#15803d", fontSize: 14, fontWeight: 700,
                    textAlign: "center", letterSpacing: .3,
                  }}>
                    ✓ You're Registered!
                  </div>
                  <button
                    className="ev-reg-btn"
                    onClick={handleRegister}
                    disabled={loading}
                    style={{
                      width: "100%", padding: 10, border: "1.5px solid #fecaca",
                      borderRadius: 12, background: "#fff",
                      color: "#ef4444", fontSize: 13, fontWeight: 700, cursor: "pointer",
                      letterSpacing: .3, transition: "opacity .15s",
                      opacity: loading ? .7 : 1,
                    }}
                  >
                    {loading ? "…" : "Unregister"}
                  </button>
                </div>
              ) : (
                <button
                  className="ev-reg-btn"
                  onClick={handleRegister}
                  disabled={loading}
                  style={{
                    width: "100%", padding: 14, border: "none", borderRadius: 12,
                    background: brandColor,
                    color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
                    letterSpacing: .3, transition: "opacity .15s, transform .1s",
                    opacity: loading ? .7 : 1,
                  }}
                >
                  {loading ? "…" : "Register for this Event"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MyEventsSlider({ events, onViewDetails, open, onToggle }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      border: "1.5px solid #bbf7d0", marginBottom: 20,
      overflow: "hidden",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", padding: "14px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>📋</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#15803d" }}>
            My Registered Events
          </span>
          <span style={{
            background: "#f0fdf4", color: "#15803d", fontSize: 12, fontWeight: 700,
            padding: "2px 9px", borderRadius: 99, border: "1px solid #bbf7d0",
          }}>
            {events.length}
          </span>
        </div>
        <span style={{ fontSize: 18, color: "#15803d" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{
          overflowX: "auto", display: "flex", gap: 12,
          padding: "0 20px 16px",
        }}>
          {events.length === 0 ? (
            <p style={{ fontSize: 13, color: "#94a3b8", padding: "8px 0" }}>
              You haven't registered for any events yet.
            </p>
          ) : events.map(ev => (
            <div
              key={ev.id}
              onClick={() => onViewDetails(ev)}
              role="button"
              tabIndex={0}
              onKeyDown={e => (e.key === "Enter" || e.key === " ") && onViewDetails(ev)}
              style={{
                minWidth: 200, background: "#f0fdf4", borderRadius: 12,
                padding: "12px 14px", cursor: "pointer",
                border: "1.5px solid #bbf7d0", flexShrink: 0,
                transition: "transform 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform = ""}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>{ev.name}</div>
                <span style={{
                  background: "#15803d", color: "#fff", fontSize: 10, fontWeight: 700,
                  padding: "1px 7px", borderRadius: 99, flexShrink: 0, marginLeft: 6,
                }}>✓ Registered</span>
              </div>
              <div style={{ fontSize: 11.5, color: "#64748b" }}>
                📅 {new Date(ev.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
              {ev.city && (
                <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                  📍 {ev.city}, {ev.state}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VolunteerHome() {
  const navigate = useNavigate();

  const [volunteer, setVolunteer] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategories, setActiveCategories] = useState(["All"]);
  const [distanceFilter, setDistance] = useState("Any Distance");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState(null);
  const [categories, setCategories] = useState(["All"]);
  const [categoryErr, setCategoryErr] = useState(null);

  const [activeEvent, setActiveEvent] = useState(null);
  const [myRegistrations, setMyRegistrations] = useState(new Set());

  const [myRegisteredEvents, setMyRegisteredEvents] = useState([]);
  const [sliderOpen, setSliderOpen] = useState(false);
  const searchRef = useRef();

  // FIX [2]: Parse localStorage safely with try/catch to prevent a JSON parse
  // error from crashing the entire page on malformed or tampered storage data.
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const [badges, setBadges] = useState([]);

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
    API.getPublishedEvents()
      .then(setEvents)
      .catch(() => {}); // FIX [1]: Don't log internal API errors to console
  }, []);

  useEffect(() => {
    // Check currentUser at the top of the effect and redirect immediately,
    // before any async work, so the page never renders with null user data.
    if (!currentUser) { navigate("/"); return; }

    // Sanitize currentUser.id before using it in any URL path (Sonar L903, L907)
    const safeUserId = sanitizeId(currentUser.id);
    if (!safeUserId) { navigate("/"); return; }

    API.getVolunteer(safeUserId)
      .then(v => {
        setVolunteer(v);
        fetch(`/api/volunteers/${safeUserId}/badges`)
          .then(r => r.json())
          .then(setBadges)
          .catch(() => {});
        return fetch(`/api/volunteers/${safeUserId}/registrations`);
      })
      .then(r => r.json())
      .then(data => {
        setMyRegisteredEvents(data);
        setMyRegistrations(new Set(data.map(ev => ev.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/eventCategories")
      .then(res => res.json())
      .then(data => setCategories(["All", ...data]))
      .catch(() => setCategoryErr("Could not load categories."));
  }, []);

  const filtered = events.filter(ev => {
    const q = search.toLowerCase();
    const matchSearch = !q || ev.name?.toLowerCase().includes(q) || ev.description?.toLowerCase().includes(q) || ev.organization_name?.toLowerCase().includes(q) || ev.city?.toLowerCase().includes(q);
    const matchCat = activeCategories.includes("All") ||
      (Array.isArray(ev.tags) && ev.tags.some(tag => activeCategories.includes(tag)));
    const maxDist   = { "< 1 mi": 1, "< 2 mi": 2, "< 5 mi": 5, "< 10 mi": 10 }[distanceFilter];
    const matchDist = !maxDist || (ev.distance_miles != null && ev.distance_miles < maxDist);
    const matchFrom = !dateFrom || new Date(ev.start_time) >= new Date(dateFrom);
    const matchTo   = !dateTo   || new Date(ev.start_time) <= new Date(dateTo + "T23:59:59");
    return matchSearch && matchCat && matchDist && matchFrom && matchTo;
  });

  function handleRegisterChange(eventId, nowRegistered) {
    setMyRegistrations(prev => {
      const next = new Set(prev);
      nowRegistered ? next.add(eventId) : next.delete(eventId);
      return next;
    });

    if (!nowRegistered) {
      setMyRegisteredEvents(prev => prev.filter(e => e.id !== eventId));
    } else if (activeEvent) {
      setMyRegisteredEvents(prev => [...prev, activeEvent]);
    }

    setToast(nowRegistered ? "Registered! 🎉" : "Unregistered successfully.");
    setTimeout(() => setToast(null), 3500);
  }

  if (loading) {
    return (
      <div className="home-loading">
        <div className="home-loading__text">Loading…</div>
      </div>
    );
  }

  return (
    <div className="home-page">

      {/* Nav */}
      <nav className="home-nav">
        <div className="home-nav__logo">
          <div className="home-nav__logo-icon">
            <img src={logo} alt="All4All Logo" className="home-nav__logo-img" />
          </div>
          <span className="home-nav__logo-text">All4All</span>
        </div>
        <button
          className="home-nav__profile-btn"
          onClick={() => navigate("/profile")}
          title="View profile"
        >
          <Avatar src={volunteer?.profile_pic} name={volunteer?.full_name} size={36} />
        </button>
      </nav>

      <main className="home-main">

        {/* Welcome card */}
        <section className="home-welcome-card">
          <div className="home-welcome-left">
            <Avatar src={volunteer?.profile_pic} name={volunteer?.full_name} size={52} />
            <div className="home-welcome-text">
              <p>Welcome Back!</p>
              <h2>{volunteer?.full_name}</h2>
            </div>
          </div>
          <div className="home-badge">
            <span className="home-badge__value">{volunteer?.hours_completed ?? "—"}</span>
            <span className="home-badge__label">Hours Completed</span>
          </div>
        </section>

        <MyEventsSlider
          events={myRegisteredEvents}
          onViewDetails={setActiveEvent}
          open={sliderOpen}
          onToggle={() => setSliderOpen(p => !p)}
        />

        {badges.length > 0 && (
          <section style={{
            background: "#fff", borderRadius: 16, padding: "16px 20px",
            border: "1px solid #e2e8f0", marginBottom: 20,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
              🏅 My Badges
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {badges.map((b, i) => (
                <div key={i} title={b.description} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  background: "#fafafa", borderRadius: 12, padding: "10px 14px",
                  border: "1.5px solid #e2e8f0", minWidth: 80, textAlign: "center",
                }}>
                  {b.image_url
                    ? <img src={b.image_url} alt={b.name} style={{ width: 36, height: 36, borderRadius: "50%" }} />
                    : <span style={{ fontSize: 28 }}>🏅</span>
                  }
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>{b.name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Search + Filters */}
        <section className="home-search-section">
          <div className="home-search-row">
            <div className="home-search-wrap">
              <span className="home-search-icon">🔍</span>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search events or organizations…"
                className="home-search-input"
              />
            </div>
            <button
              className={`home-filter-btn${showFilters ? " active" : ""}`}
              onClick={() => setShowFilters(p => !p)}
            >
              Filters {showFilters ? "▲" : "▼"}
            </button>
          </div>

          <div className="home-pills">
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

          {categoryErr && (
            <p style={{ fontSize: 12, color: "#ef4444", margin: "4px 0 0" }}>{categoryErr}</p>
          )}

          {showFilters && (
            <div className="home-filter-panel">
              <div className="home-filter-group">
                <label className="home-filter-label">Distance</label>
                <select className="home-filter-select" value={distanceFilter} onChange={e => setDistance(e.target.value)}>
                  {DISTANCES.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="home-filter-group">
                <label className="home-filter-label">From</label>
                <input type="date" className="home-filter-date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="home-filter-group">
                <label className="home-filter-label">To</label>
                <input type="date" className="home-filter-date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              <button
                className="home-filter-clear"
                onClick={() => {
                  setDistance("Any Distance");
                  setDateFrom("");
                  setDateTo("");
                  setActiveCategories(["All"]);
                }}
              >
                Clear all
              </button>
            </div>
          )}
        </section>

        {/* Results */}
        <div className="home-results-header">
          <h3 className="home-results-count">
            {filtered.length} event{filtered.length !== 1 ? "s" : ""} found
          </h3>
        </div>

        {filtered.length === 0 ? (
          <div className="home-empty">No events match your filters. Try adjusting your search!</div>
        ) : (
          <div className="home-cards">
            {filtered.map(ev => (
              <EventCard
                key={ev.id}
                event={ev}
                onViewDetails={setActiveEvent}
              />
            ))}
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && <div className="home-toast">{toast}</div>}

      {/* Event Detail Modal */}
      {activeEvent && (
        <EventDetailModal
          event={activeEvent}
          volunteerId={volunteer?.id}
          isRegistered={myRegistrations.has(activeEvent.id)}
          onClose={() => setActiveEvent(null)}
          onRegisterChange={handleRegisterChange}
        />
      )}
    </div>
  );
}