import { useState } from "react";
import "./login_css_vals.css";

import SignIn from "./components/SignIn";
import VolunteerForm from "./components/VolunteerForm";
import OrgForm from "./components/OrgForm";

export default function App() {
  const [tab, setTab] = useState("signin");

  const tabConfig = [
    { id: "signin",    label: "Sign In" },
    { id: "volunteer", label: "Join as Volunteer" },
    { id: "org",       label: "Register Org" },
  ];

  return (
    <div className="a4a-page">
      <div className="a4a-card">

        {/* header TODO: add logo later?*/}
        <div className="a4a-header">
          <div className="a4a-logo">All4All</div>
          <div className="a4a-tagline">Connecting volunteers with organizations that need them most.</div>
        </div>

        <div className="a4a-tabs">
          {tabConfig.map((t) => (
            <button
              key={t.id}
              className={`a4a-tab${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* tabs for logiging in and creating account*/}
        <div className="a4a-body">
          {tab === "signin"    && <SignIn        onSwitch={setTab} />}
          {tab === "volunteer" && <VolunteerForm onSwitch={setTab} />}
          {tab === "org"       && <OrgForm       onSwitch={setTab} />}
        </div>

      </div>
    </div>
  );
}