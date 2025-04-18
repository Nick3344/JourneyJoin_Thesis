import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Home.css";

function Home() {
  const navigate = useNavigate();

  const handleHamburgerClick = () => {
    alert("Menu clicked! (Placeholder for side/drawer navigation)");
  };

  const handleProfileClick = () => {
    navigate("/profile"); 
  };

  return (
    <div className="home-container">
      {/* TOP NAVIGATION BAR 
      <div className="home-top-nav">
        <div className="nav-left">
          <span className="hamburger" onClick={handleHamburgerClick}>
            &#9776; 
          </span>
        </div>

        <div className="nav-center">
          JourneyJoin 
        </div>

        <div className="nav-right">
            <span className="profile-icon" onClick={() => navigate("/profile")}>
            &#128100; 
            </span>
        </div>
      </div>*/}

      {/* MAIN CONTENT: 2x2 GRID OF FEATURE CARDS */}
      <div className="cards-container">
        <div
          className="feature-card"
          onClick={() => navigate("/find-people")} 
        >
          <div className="card-icon">👥</div>
          <div className="card-label">Find People</div>
        </div>

        <div
          className="feature-card"
          onClick={() => navigate("/profile")} 
        >
          <div className="card-icon">👤</div>
          <div className="card-label">Manage Profile</div>
        </div>

        <div
          className="feature-card"
          onClick={() => navigate("/acs/chat/threads")}

        >
          <div className="card-icon">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24"
                width="24"
                viewBox="0 0 24 24"
                fill="#333"
              >
                <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
            </div>

          <div className="card-label">Chat Threads</div>
        </div>

        <div
          className="feature-card"
          onClick={() => navigate("/local-guides")}
        >
          <div className="card-icon">📍</div>
          <div className="card-label">Local Guides</div>
        </div>

      </div>
    </div>
  );
}

export default Home;
