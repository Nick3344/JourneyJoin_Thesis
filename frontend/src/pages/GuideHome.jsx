import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/GuideHome.css";

function GuideHome() {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate("/guide/profile");
  };

  const handleMessagesClick = () => {
    alert("Messages feature coming soon!");
  };

  return (
    <div className="guide-home-container">
      <h2>Guide Dashboard</h2>

      <div className="guide-cards-container">
        {/* First card: Manage Guide Profile */}
        <div className="guide-card" onClick={handleProfileClick}>
          <h3>Manage Profile</h3>
          <p>
            Update your guide details, location, expertise, and service offerings.
          </p>
        </div>

        {/* Second card: Messages (placeholder for message feature) */}
        <div className="guide-card" onClick={handleMessagesClick}>
          <h3>Messages</h3>
          <p>Coming soon: Chat with travelers or respond to requests!</p>
        </div>
      </div>
    </div>
  );
}

export default GuideHome;
