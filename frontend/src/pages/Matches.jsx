import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/Matches.css";

function Matches() {
  const navigate = useNavigate();
  const { recommendedUsers = [] } = useLocation().state || {};

  const currentUserAcsId = localStorage.getItem("user_acs_id");

/*const handleMessageClick = async (user) => {
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
};*/
const handleMessageClick = async (user) => {
  try {
    const currentUserId = localStorage.getItem("user_acs_id");
    const acsToken = localStorage.getItem("user_acs_token");

    if (!currentUserId || !acsToken || !user.acsId) {
      throw new Error("Missing required credentials");
    }

    console.log("Creating/getting thread for users:", {
      current: currentUserId,
      other: user.acsId
    });

    const response = await fetch('/acs/chat/create_or_get_thread', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant1_id: currentUserId,
        participant2_id: user.acsId,
        acs_token: acsToken,
        topic: `Chat with ${user.username}`
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to start chat");
    }
    
    const data = await response.json();
    console.log("Thread created/retrieved:", data);

    // Navigate to the chat thread
    navigate("/acs/chat/thread", {
      state: {
        threadId: data.threadId,
        topic: data.topic,
      }
    });
  } catch (error) {
    console.error("Error handling message click:", error);
    alert(error.message || "Failed to start chat. Please try again.");
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
