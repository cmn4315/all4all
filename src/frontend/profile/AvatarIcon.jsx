export default function AvatarIcon({ user, size = 40, className = "" }) {
    const style = {
        width:        size,
        height:       size,
        borderRadius: "50%",
        objectFit:    "cover",
        display:      "block",
        flexShrink:   0,
    };

    if (user?.avatar) {
        return (
        <img
            src={user.avatar}
            alt="Profile"
            style={style}
            className={className}
        />
        );
    }

    // default: generic silhouette SVG
    return (
        <span
        className={`avatar-default ${className}`}
        style={{
            ...style,
            background:     "#e2e8f0",
            border:         "2px solid #bbf7d0",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            overflow:       "hidden",
        }}
        >
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: size * 0.65, height: size * 0.65 }}
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