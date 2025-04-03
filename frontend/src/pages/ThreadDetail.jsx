// In ThreadDetail.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../api";
import "../styles/ThreadDetail.css";

function ThreadDetail() {
  const location = useLocation();
  const { threadId, topic } = location.state || {};
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Retrieve current user's ACS ID from localStorage
  const currentUserAcsId = localStorage.getItem("user_acs_id");


  useEffect(() => {
    if (!threadId || !currentUserAcsId) return;
    fetchMessages();
    const timer = setInterval(() => fetchMessages(true), 5000);
    return () => clearInterval(timer);
  }, [threadId, currentUserAcsId]);

  const fetchMessages = async (silent = false) => {
    if (!threadId || !currentUserAcsId) return;
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await api.post("/acs/chat/get_messages", { 
        threadId, 
        acs_user_id: currentUserAcsId,
        acs_token: currentUserAcsToken
    });
      setMessages(res.data || []);
      if (res.data.length > 0) {
        const lastMessage = res.data[res.data.length - 1];
        await api.post("/acs/chat/send_read_receipt", {
          threadId,
          messageId: lastMessage.id
        });
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
      if (!silent) setError("Failed to retrieve messages.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    const messageContent = messageInput; 
    if (!messageContent.trim()) return;

    try {
        const response = await fetch("/acs/chat/send_message", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                threadId: currentThreadId, 
                content: messageContent,
                senderDisplayName: loggedInUserName, 
                acs_user_id: loggedInUserAcsId, 
                acs_token: loggedInUserAcsToken, 
            }),
        });

        if (response.ok) {
            setMessageInput(""); // Clear the input box
            fetchMessages(); // Refresh the message list
        } else {
            console.error("Failed to send message:", await response.json());
        }
    } catch (error) {
        console.error("Error sending message:", error);
    }
};

  return (
    <div className="thread-detail-container">
      <h2>{topic || "Chat Thread"}</h2>
      <div className="thread-messages">
        {loading && <p className="loading">Loading messages...</p>}
        {error && <p className="error-message">{error}</p>}
        {!loading && messages.length === 0 && (
          <p className="no-messages">No messages yet.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="message-item">
            <div className="message-sender">{msg.senderDisplayName || "Unknown"}</div>
            <div className="message-content">{msg.content}</div>
            {msg.createdOn && (
              <div className="message-timestamp">
                {new Date(msg.createdOn).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="message-input-container">
        <textarea
          rows={2}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <button onClick={handleSendMessage} className="send-button">
          Send
        </button>
      </div>
    </div>
  );
}

export default ThreadDetail;
