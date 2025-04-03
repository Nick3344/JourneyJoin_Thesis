import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/Matches.css";

function Matches() {
  const navigate = useNavigate();
  const { recommendedUsers = [] } = useLocation().state || {};

  const currentUserAcsId = localStorage.getItem("user_acs_id");

const handleMessageClick = async (user) => {
  const currentUserAcsId = localStorage.getItem("user_acs_id");
  if (!currentUserAcsId || !user.acsId) {
    alert("ACS ID missing for current or matched user.");
    return;
  }
  const payload = {
    participant1_id: currentUserAcsId,  // local user
    participant2_id: user.acsId,       // matched user
    topic: `Chat with ${user.username}`
  };
  try {
    const res = await api.post("/acs/chat/create_or_get_thread", payload);
    const { threadId } = res.data;
    navigate("/acs/chat/thread", { state: { threadId, topic: payload.topic } });
  } catch (err) {
    console.error("Failed to create chat thread:", err);
    alert("Failed to start chat.");
  }
};


  return (
    <div className="matches-container">
      <h2>Recommended Users</h2>
      {recommendedUsers.length === 0 ? (
        <p>No recommended users found.</p>
      ) : (
        <div className="matches-grid">
          {recommendedUsers.map((user) => (
            <div key={user.id} className="match-card">
              {user.profile_pic ? (
                <img
                  src={`http://127.0.0.1:5000/${user.profile_pic}`}
                  alt={`${user.username} profile`}
                  className="match-pic"
                />
              ) : (
                <div className="match-pic-placeholder">No Image</div>
              )}
              <div className="match-info">
                <h3>@{user.username}</h3>
                <p>
                  <strong>City:</strong> {user.city}
                </p>
                <p>
                  <strong>Bio:</strong> {user.bio}
                </p>
                <p>
                  <strong>Trips:</strong> {user.successful_trips} |{" "}
                  <strong>Credibility:</strong> {user.credibility_score}
                </p>
              </div>
              <button
                className="message-button"
                onClick={() => handleMessageClick(user)}
              >
                Message
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Matches;
