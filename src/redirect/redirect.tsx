import { createRoot } from "react-dom/client";
import "./redirect.css";

const RedirectPage = () => {
  const params = new URLSearchParams(window.location.search);
  const domain = params.get("domain") ?? "this site";

  return (
    <div className="redirect-container">
      <div className="redirect-icon">🚫</div>
      <h1>Site Blocked</h1>
      <p>
        <strong>{domain}</strong> is blocked by WhatAreYouDoing.
      </p>
      <p className="redirect-sub">Take a break and come back later.</p>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<RedirectPage />);
