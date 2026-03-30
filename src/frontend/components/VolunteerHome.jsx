import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ProfilePage from "./ProfilePage";

// ─── Mock API helpers (replace URLs with real endpoints when ready) ───────────
const API = {
  getVolunteer: async (userId) => {
    const res = await fetch(`/api/volunteers/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch volunteer");
    return res.json();
  },
  getPublishedEvents: async () => {
    const res = await fetch("/api/events");
    if (!res.ok) throw new Error("Failed to fetch events");
    return res.json();
  },
  getOrganizationEvents: async (orgId) => {
    const res = await fetch(`/api/organizations/${orgId}/events?publishedOnly=true`);
    if (!res.ok) throw new Error("Failed to fetch org events");
    return res.json();
  },
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function initials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}
function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });
}
function calcHours(start, end) {
  if (!start || !end) return null;
  const diff = (new Date(end) - new Date(start)) / 36e5;
  return diff > 0 ? diff.toFixed(1) : null;
}

// ─── MOCK event data (used when real API isn't wired yet) ─────────────────────
const MOCK_EVENTS = [
  {
    id: 1, name: "River Cleanup Drive", status: "PUBLISHED",
    description: "Join us for a morning cleaning up litter along the Genesee River trail. Gloves and bags provided.",
    organization_name: "Clean Earth Rochester", category: "Environment",
    roles: ["Litter Collector", "Team Leader", "Logistics Support"],
    start_time: "2026-04-12T09:00:00", end_time: "2026-04-12T12:00:00",
    address: "500 Genesee Park Blvd", city: "Rochester", state: "NY", zip_code: "14619",
    distance_miles: 1.4,
  },
  {
    id: 2, name: "Community Food Pantry", status: "PUBLISHED",
    description: "Help sort and distribute food donations at our weekly food pantry for families in need.",
    organization_name: "Feed ROC", category: "Food & Hunger",
    roles: ["Food Sorter", "Distribution Assistant", "Greeter"],
    start_time: "2026-04-15T14:00:00", end_time: "2026-04-15T17:00:00",
    address: "274 N Goodman St", city: "Rochester", state: "NY", zip_code: "14607",
    distance_miles: 2.1,
  },
  {
    id: 3, name: "Youth Coding Workshop", status: "PUBLISHED",
    description: "Mentor middle-school students learning Scratch and Python basics in an after-school session.",
    organization_name: "Tech Kids ROC", category: "Education",
    roles: ["Coding Mentor", "Floater Assistant"],
    start_time: "2026-04-18T16:00:00", end_time: "2026-04-18T18:30:00",
    address: "39 Main St E", city: "Rochester", state: "NY", zip_code: "14604",
    distance_miles: 3.7,
  },
  {
    id: 4, name: "Senior Center Game Day", status: "PUBLISHED",
    description: "Spend the afternoon playing board games and cards with residents at the Westside Senior Center.",
    organization_name: "Westside Senior Living", category: "Elder Care",
    roles: ["Activity Companion", "Event Setup"],
    start_time: "2026-04-20T13:00:00", end_time: "2026-04-20T15:00:00",
    address: "155 W Ave", city: "Rochester", state: "NY", zip_code: "14611",
    distance_miles: 0.8,
  },
  {
    id: 5, name: "Park Trail Restoration", status: "PUBLISHED",
    description: "Help plant native species and mulch hiking trails at Cobbs Hill Park.",
    organization_name: "Green Spaces ROC", category: "Environment",
    roles: ["Planting Crew", "Trail Maintenance"],
    start_time: "2026-04-26T08:30:00", end_time: "2026-04-26T12:00:00",
    address: "Cobbs Hill Park", city: "Rochester", state: "NY", zip_code: "14610",
    distance_miles: 4.2,
  },
];

const CATEGORIES = ["All", "Environment", "Food & Hunger", "Education", "Elder Care", "Health", "Animals"];
const DISTANCES  = ["Any Distance", "< 1 mi", "< 2 mi", "< 5 mi", "< 10 mi"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ src, name, size = 38 }) {
  return src
    ? <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
    : (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "linear-gradient(135deg,#16a34a,#15803d)",
        color: "#fff", display: "flex", alignItems: "center",
        justifyContent: "center", fontWeight: 800, fontSize: size * 0.36,
        letterSpacing: 0.5, flexShrink: 0,
      }}>
        {initials(name)}
      </div>
    );
}

function HoursBadge({ hours }) {
  return (
    <div style={{
      background: "linear-gradient(135deg,#16a34a 0%,#15803d 100%)",
      borderRadius: 16, padding: "18px 28px", color: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center",
      boxShadow: "0 8px 24px rgba(22,163,74,0.28)", minWidth: 140,
    }}>
      <span style={{ fontSize: 36, fontWeight: 900, lineHeight: 1 }}>{hours}</span>
      <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.85, marginTop: 4, letterSpacing: 0.5 }}>
        HOURS COMPLETED
      </span>
    </div>
  );
}

function CategoryPill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer",
      fontFamily: "inherit", fontSize: 12.5, fontWeight: active ? 700 : 500,
      background: active ? "#16a34a" : "#f1f5f9",
      color: active ? "#fff" : "#475569",
      transition: "all 0.18s", whiteSpace: "nowrap",
      boxShadow: active ? "0 2px 8px rgba(22,163,74,0.22)" : "none",
    }}>
      {label}
    </button>
  );
}

function EventCard({ event, onRegister }) {
  const [expanded, setExpanded] = useState(false);
  const hours = calcHours(event.start_time, event.end_time);

  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "20px 22px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: "1px solid #e2e8f0",
      transition: "transform 0.18s, box-shadow 0.18s", cursor: "default",
      display: "flex", flexDirection: "column", gap: 12,
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.10)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)"; }}
    >
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            {event.category && (
              <span style={{
                background: "#f0fdf4", color: "#15803d", fontSize: 11, fontWeight: 700,
                padding: "2px 9px", borderRadius: 99, border: "1px solid #bbf7d0",
              }}>
                {event.category}
              </span>
            )}
            {hours && (
              <span style={{
                background: "#eff6ff", color: "#1d4ed8", fontSize: 11, fontWeight: 700,
                padding: "2px 9px", borderRadius: 99, border: "1px solid #bfdbfe",
              }}>
                {hours} hrs
              </span>
            )}
          </div>
          <h3 style={{ fontSize: 15.5, fontWeight: 800, color: "#1e293b", lineHeight: 1.3 }}>{event.name}</h3>
          <p style={{ fontSize: 12.5, color: "#16a34a", fontWeight: 600, marginTop: 2 }}>
            {event.organization_name}
          </p>
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0 }}>
        {event.description}
      </p>

      {/* Expanded: roles */}
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

      {/* Meta row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12.5, color: "#64748b" }}>
        <span>📅 {formatDate(event.start_time)} · {formatTime(event.start_time)} – {formatTime(event.end_time)}</span>
        {event.distance_miles != null && (
          <span>📍 {event.city}, {event.state} · {event.distance_miles} mi away</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <button onClick={() => setExpanded(p => !p)} style={{
          background: "none", border: "1.5px solid #e2e8f0", borderRadius: 8,
          padding: "7px 14px", fontSize: 12.5, fontWeight: 600, color: "#475569",
          cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#16a34a"; e.currentTarget.style.color = "#16a34a"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#475569"; }}
        >
          {expanded ? "Show less" : "See roles"}
        </button>
        <button onClick={() => onRegister(event)} style={{
          flex: 1, background: "linear-gradient(135deg,#16a34a,#15803d)",
          border: "none", borderRadius: 8, padding: "7px 14px",
          fontSize: 12.5, fontWeight: 700, color: "#fff",
          cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s",
          boxShadow: "0 2px 8px rgba(22,163,74,0.25)",
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          Register
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VolunteerHome() {
    const navigate = useNavigate();

  // Pull volunteerId from wherever you store session (see step 3)
  //const volunteerId = 1; // temporary hardcode — replace in step 3

  const onNavigateProfile = () => navigate("/profile");

  const [volunteer, setVolunteer]     = useState(null);
  const [events, setEvents]           = useState(MOCK_EVENTS);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [activeCategory, setCategory] = useState("All");
  const [distanceFilter, setDistance] = useState("Any Distance");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast]             = useState(null);
  const searchRef = useRef();

  // Fetch volunteer info
    useEffect(() => {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user) {
    navigate("/");
    return;
  }
  API.getVolunteer(user.id)
    .then(setVolunteer)
    .catch(console.error)
    .finally(() => setLoading(false));
}, []);

  // Fetch published events (falls back to mock data if server not running)
  useEffect(() => {
    API.getPublishedEvents()
      .then(setEvents)
      .catch(() => setEvents(MOCK_EVENTS)); // graceful fallback
  }, []);

  // ── Filtering ──
  const filtered = events.filter(ev => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      ev.name?.toLowerCase().includes(q) ||
      ev.description?.toLowerCase().includes(q) ||
      ev.organization_name?.toLowerCase().includes(q) ||
      ev.city?.toLowerCase().includes(q);

    const matchCat = activeCategory === "All" || ev.category === activeCategory;

    const maxDist = { "< 1 mi": 1, "< 2 mi": 2, "< 5 mi": 5, "< 10 mi": 10 }[distanceFilter];
    const matchDist = !maxDist || (ev.distance_miles != null && ev.distance_miles < maxDist);

    const matchFrom = !dateFrom || new Date(ev.start_time) >= new Date(dateFrom);
    const matchTo   = !dateTo   || new Date(ev.start_time) <= new Date(dateTo + "T23:59:59");

    return matchSearch && matchCat && matchDist && matchFrom && matchTo;
  });

  // ── Register handler ──
  function handleRegister(event) {
    // TODO: wire to POST /api/events/:id/register with { volunteer_id }
    setToast(`Registered for "${event.name}"! 🎉`);
    setTimeout(() => setToast(null), 3500);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 40%,#bbf7d0 100%)" }}>
        <div style={{ color: "#16a34a", fontWeight: 700, fontSize: 16 }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 40%,#bbf7d0 100%)",
      fontFamily: "'Nunito','Segoe UI',sans-serif",
    }}>

      {/* ── Top Nav ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.90)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #e2e8f0",
        padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg,#16a34a,#15803d)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>🤝</div>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#15803d", letterSpacing: -0.5 }}>
            All4All
          </span>
        </div>

        {/* Profile button */}
        <button
          onClick={onNavigateProfile}
          title="View profile"
          style={{
            background: "none", border: "2px solid #16a34a",
            borderRadius: "50%", padding: 2, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "box-shadow 0.18s",
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.18)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
        >
          <Avatar src={volunteer?.profile_pic} name={volunteer?.full_name} size={36} />
        </button>
      </nav>

      {/* ── Main content ── */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 16px 64px" }}>

        {/* ── Welcome + Hours ── */}
        <section style={{
          background: "#fff", borderRadius: 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: "1px solid #e2e8f0",
          padding: "24px 28px", marginBottom: 28,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar src={volunteer?.profile_pic} name={volunteer?.full_name} size={52} />
            <div>
              <p style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>Welcome back 👋</p>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", lineHeight: 1.2 }}>
                {volunteer?.full_name}
              </h2>
            </div>
          </div>
          <HoursBadge hours={volunteer?.hours_completed ?? "—"} />
        </section>

        {/* ── Search + Filters ── */}
        <section style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            {/* Search bar */}
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                fontSize: 16, pointerEvents: "none",
              }}>🔍</span>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search events or organizations…"
                style={{
                  width: "100%", padding: "11px 14px 11px 40px",
                  borderRadius: 12, border: "1.5px solid #e2e8f0",
                  fontSize: 14, fontFamily: "inherit", fontWeight: 500,
                  outline: "none", background: "#fff", color: "#1e293b",
                  transition: "border-color 0.18s",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = "#16a34a"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
              />
            </div>

            {/* Filter toggle */}
            <button onClick={() => setShowFilters(p => !p)} style={{
              padding: "11px 18px", borderRadius: 12, cursor: "pointer",
              border: showFilters ? "1.5px solid #16a34a" : "1.5px solid #e2e8f0",
              background: showFilters ? "#f0fdf4" : "#fff",
              color: showFilters ? "#16a34a" : "#475569",
              fontFamily: "inherit", fontWeight: 600, fontSize: 13.5,
              display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.18s",
            }}>
              ⚙️ Filters {showFilters ? "▲" : "▼"}
            </button>
          </div>

          {/* Category pills */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
            {CATEGORIES.map(c => (
              <CategoryPill key={c} label={c} active={c === activeCategory} onClick={() => setCategory(c)} />
            ))}
          </div>

          {/* Expanded filter panel */}
          {showFilters && (
            <div style={{
              marginTop: 12, background: "#fff", borderRadius: 14,
              border: "1.5px solid #e2e8f0", padding: "18px 20px",
              display: "flex", flexWrap: "wrap", gap: 18,
            }}>
              {/* Distance */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Distance
                </label>
                <select value={distanceFilter} onChange={e => setDistance(e.target.value)} style={{
                  padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                  fontSize: 13, fontFamily: "inherit", color: "#334155", background: "#fff",
                  cursor: "pointer", outline: "none",
                }}>
                  {DISTANCES.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>

              {/* Date from */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  From
                </label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{
                  padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                  fontSize: 13, fontFamily: "inherit", color: "#334155", background: "#fff", outline: "none",
                }} />
              </div>

              {/* Date to */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  To
                </label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{
                  padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                  fontSize: 13, fontFamily: "inherit", color: "#334155", background: "#fff", outline: "none",
                }} />
              </div>

              {/* Clear */}
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button onClick={() => { setDistance("Any Distance"); setDateFrom(""); setDateTo(""); setCategory("All"); }} style={{
                  background: "none", border: "1.5px solid #fca5a5", borderRadius: 8,
                  padding: "7px 14px", fontSize: 12.5, fontWeight: 600, color: "#ef4444",
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                  Clear all
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Results header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>
            {filtered.length} event{filtered.length !== 1 ? "s" : ""} found
          </h3>
        </div>

        {/* ── Event cards ── */}
        {filtered.length === 0 ? (
          <div style={{
            background: "#fff", borderRadius: 16, padding: "48px 24px",
            textAlign: "center", color: "#94a3b8", fontSize: 14, fontWeight: 500,
            border: "1.5px dashed #e2e8f0",
          }}>
            No events match your filters. Try adjusting your search!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filtered.map(ev => (
              <EventCard key={ev.id} event={ev} onRegister={handleRegister} />
            ))}
          </div>
        )}
      </main>

      {/* ── Toast notification ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          background: "#15803d", color: "#fff", borderRadius: 12,
          padding: "12px 24px", fontSize: 14, fontWeight: 700,
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)", zIndex: 9999,
          animation: "fadeUp 0.25s ease",
          whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0);    }
        }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #bbf7d0; border-radius: 99px; }
      `}</style>
    </div>
  );
}