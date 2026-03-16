import { useAuth } from "../../backend/login_utils/AuthContext.jsx";
import TopNav from "./TopNavBar";

export default function MainPage({ onNavigate }) {
    const { currentUser } = useAuth();
    const isVolunteer = currentUser?.type === "volunteer";

    const displayName = isVolunteer
        ? currentUser.firstName
        : currentUser.bizName;

    return (
        <div className="main-page">
        <TopNav onNavigate={onNavigate} currentPage="main" />

        <div className="main-content">
            <div className="main-banner">
            <div className="main-banner__text">
                <h1 className="main-banner__title">Welcome back, {displayName}.</h1>
                <p className="main-banner__sub">
                {isVolunteer
                    ? "Discover opportunities and organizations near you."
                    : "Manage your listings and connect with volunteers."}
                </p>
            </div>
            {isVolunteer && (
                <button className="main-banner__btn" onClick={() => onNavigate("opportunities")}>
                Browse Opportunities
                </button>
            )}
            {!isVolunteer && (
                <button className="main-banner__btn" onClick={() => onNavigate("post")}>
                Post an Opportunity
                </button>
            )}
            </div>

            <div className="main-stats">
            {isVolunteer ? (
                <>
                <StatCard label="Hours Logged"      value="0"  />
                <StatCard label="Events Attended"   value="0"  />
                <StatCard label="Organizations"     value="0"  />
                <StatCard label="Badges Earned"     value="0"  />
                </>
            ) : (
                <>
                <StatCard label="Active Listings"   value="0"  />
                <StatCard label="Total Applicants"  value="0"  />
                <StatCard label="Volunteers Placed" value="0"  />
                <StatCard label="Events This Month" value="0"  />
                </>
            )}
            </div>

            <div className="main-columns">

            <div className="main-col">
                <div className="main-card">
                <div className="main-card__title">
                    {isVolunteer ? "Recommended Opportunities" : "Your Active Listings"}
                </div>
                <div className="main-card__empty">
                    Nothing here yet. Check back soon!
                </div>
                </div>
            </div>

            <div className="main-col main-col--side">
                <div className="main-card">
                <div className="main-card__title">
                    {isVolunteer ? "Nearby Organizations" : "Recent Applicants"}
                </div>
                <div className="main-card__empty">
                    Nothing here yet.
                </div>
                </div>

                <div className="main-card">
                <div className="main-card__title">Announcements</div>
                <div className="main-card__announcement">
                    <div className="main-card__ann-title">Welcome to All4All!</div>
                    <div className="main-card__ann-body">
                    We are glad to have you. Start exploring opportunities or organizations near you.
                    </div>
                </div>
                </div>
            </div>

            </div>
        </div>
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div className="main-stat">
        <div className="main-stat__value">{value}</div>
        <div className="main-stat__label">{label}</div>
        </div>
    );
}