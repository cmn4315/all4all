// ─── AvatarIcon ───────────────────────────────────────────────────────────────
// Shows the user's uploaded profile photo, or a generic silhouette SVG
// if no photo has been set. Used in the TopNav and ProfilePage.

export default function AvatarIcon({ avatarSrc, size = 40, className = "" }) {
  const circleStyle = {
    width:          size,
    height:         size,
    borderRadius:   "50%",
    flexShrink:     0,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
    border:         "2px solid #e2e8f0",
    background:     "#f1f5f9",
  };

  if (avatarSrc) {
    return (
      <img
        src={avatarSrc}
        alt="Profile"
        style={{ ...circleStyle, objectFit: "cover" }}
        className={className}
      />
    );
  }

  // Default generic silhouette
  return (
    <span style={circleStyle} className={className}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: size * 0.62, height: size * 0.62 }}
      >
        <circle cx="12" cy="8" r="4" fill="#94a3b8" />
        <path
          d="M4 20c0-4.418 3.582-8 8-8s8 3.582 8 8"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  );
}