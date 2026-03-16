import { useState } from "react";
import "./login_css_vals.css";

import { AuthProvider } from "../backend/login_utils/AuthContext";
import SignIn        from "./components/SignIn";
import VolunteerForm from "./components/VolunteerForm";
import OrgForm       from "./components/OrgForm";
import MainPage      from "./components/MainPage";
import ProfilePage   from "./components/ProfilePage";
import TopNav        from "./components/TopNavBar";

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}

function Router() {
  const [page, setPage]         = useState("login");
  const [loginTab, setLoginTab] = useState("signin");

  function navigate(dest) {
    setPage(dest);
  }

  if (page === "main")          return <MainPage    onNavigate={navigate} />;
  if (page === "profile")       return <ProfilePage onNavigate={navigate} />;
  if (page === "opportunities") return <Placeholder title="Opportunities"    onNavigate={navigate} />;
  if (page === "organizations") return <Placeholder title="Organizations"    onNavigate={navigate} />;
  if (page === "settings")      return <Placeholder title="Settings"         onNavigate={navigate} />;
  if (page === "post")          return <Placeholder title="Post Opportunity" onNavigate={navigate} />;

  const tabConfig = [
    { id: "signin",    label: "Sign In" },
    { id: "volunteer", label: "Join as Volunteer" },
    { id: "org",       label: "Register Org" },
  ];

  return (
    <div className="a4a-page">
      <div className="a4a-card">
        <div className="a4a-header">
          <div className="a4a-logo">All4All</div>
          <div className="a4a-tagline">Connecting volunteers with organizations that need them most.</div>
        </div>

        <div className="a4a-tabs">
          {tabConfig.map((t) => (
            <button
              key={t.id}
              className={`a4a-tab${loginTab === t.id ? " active" : ""}`}
              onClick={() => setLoginTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="a4a-body">
          {loginTab === "signin"    && <SignIn        onSwitch={setLoginTab} onNavigate={navigate} />}
          {loginTab === "volunteer" && <VolunteerForm onSwitch={setLoginTab} onNavigate={navigate} />}
          {loginTab === "org"       && <OrgForm       onSwitch={setLoginTab} onNavigate={navigate} />}
        </div>
      </div>
    </div>
  );
}

function Placeholder({ title, onNavigate }) {
  return (
    <div className="main-page">
      <TopNav onNavigate={onNavigate} currentPage={title.toLowerCase()} />
      <div className="main-content">
        <div className="main-banner">
          <div className="main-banner__text">
            <h1 className="main-banner__title">{title}</h1>
            <p className="main-banner__sub">This page is coming soon.</p>
          </div>
          <button className="main-banner__btn" onClick={() => onNavigate("main")}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}