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
      {/* TOP NAVIGATION BAR */}
      <div className="home-top-nav">
        <div className="nav-left">
          <span className="hamburger" onClick={handleHamburgerClick}>
            &#9776; {/* Hamburger icon as a character */}
          </span>
        </div>

        <div className="nav-center">
          JourneyJoin {/* or your brand name */}
        </div>

        <div className="nav-right">
            <span className="profile-icon" onClick={() => navigate("/profile")}>
            &#128100; 
            </span>
        </div>
      </div>

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
          onClick={() => navigate("/travel-search")} 
        >
          <div className="card-icon">✈️</div>
          <div className="card-label">Travel Search</div>
        </div>

        <div
          className="feature-card"
          onClick={() => navigate("/your-trips")} 
        >
          <div className="card-icon">🗓</div>
          <div className="card-label">Your Trips</div>
        </div>

        <div className="feature-card" onClick={() => navigate("/guide/search")}>
          <div className="card-icon">📍</div>
          <div className="card-label">Local Guides</div>
        </div>

      </div>
    </div>
  );
}

export default Home;
