import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Matches.css";

function Matches() {
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve recommended users from location.state
  const recommendedUsers = location.state?.recommendedUsers || [];

  return (
    <div className="matches-container">
      <h2>Recommended Users</h2>

      {recommendedUsers.length === 0 ? (
        <p>No recommended users found.</p>
      ) : (
        <div className="matches-grid">
          {recommendedUsers.map((user) => (
            <div key={user.id} className="match-card">
              <img
                src={`http://127.0.0.1:5000/${user.profile_pic}`}
                alt={`${user.username} profile`}
                className="match-pic"
              />
              <div className="match-info">
                <h3>@{user.username}</h3>
                <p><strong>City:</strong> {user.city}</p>
                <p><strong>Bio:</strong> {user.bio}</p>
                <p><strong>Interests:</strong> {(user.interests || []).join(", ")}</p>
                <p>
                  <strong>Trips:</strong> {user.successful_trips} 
                  {" | "}
                  <strong>Credibility:</strong> {user.credibility_score}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="back-button" onClick={() => navigate("/")}>
        Back to Home
      </button>
    </div>
  );
}

export default Matches;
