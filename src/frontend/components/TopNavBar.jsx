import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../backend/login_utils/AuthContext.jsx";
import AvatarIcon from "../profile/AvatarIcon.jsx";

export default function TopNav({ onNavigate, currentPage }) {
    const { currentUser, logout } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const displayName = currentUser?.type === "volunteer"
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : currentUser?.bizName;

    return (
        <nav className="topnav">
        <button className="topnav__logo" onClick={() => onNavigate("main")}>
            All4All
        </button>

        <div className="topnav__links">
            <button
                className={`topnav__link${currentPage === "main" ? " active" : ""}`}
                onClick={() => onNavigate("main")}
            >
            Home
            </button>
            <button
                className={`topnav__link${currentPage === "opportunities" ? " active" : ""}`}
                onClick={() => onNavigate("opportunities")}
            >
            Opportunities
            </button>
            <button
                className={`topnav__link${currentPage === "organizations" ? " active" : ""}`}
                onClick={() => onNavigate("organizations")}
            >
            Organizations
            </button>
        </div>

        <div className="topnav__avatar-wrap" ref={dropdownRef}>
            <button
                className="topnav__avatar-btn"
                onClick={() => setDropdownOpen((o) => !o)}
                title="Account menu"
                >
                <AvatarIcon user={currentUser} size={36} />
            </button>

            {dropdownOpen && (
            <div className="topnav__dropdown">
                <div className="topnav__dropdown-header">
                    <span className="topnav__dropdown-name">{displayName}</span>
                    <span className="topnav__dropdown-username">@{currentUser?.username}</span>
                </div>
                    <hr className="topnav__dropdown-divider" />
                    <button
                        className="topnav__dropdown-item"
                        onClick={() => { setDropdownOpen(false); onNavigate("profile"); }}
                        >
                        My Profile
                    </button>
                    <button
                        className="topnav__dropdown-item"
                        onClick={() => { setDropdownOpen(false); onNavigate("settings"); }}
                        >
                        Settings
                    </button>
                    <hr className="topnav__dropdown-divider" />
                    <button
                        className="topnav__dropdown-item topnav__dropdown-item--danger"
                        onClick={() => { setDropdownOpen(false); logout(); onNavigate("login"); }}
                        >
                        Log Out
                    </button>
            </div>
            )}
        </div>
        </nav>
    );
}