/*import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/ChatThreads.css";

function ChatThreads() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/acs/chat/threads");
      console.log("Chat threads response:", res.data);
      setThreads(res.data || []);
    } catch (err) {
      console.error("Error retrieving chat threads:", err);
      setError("Failed to retrieve chat threads.");
    } finally {
      setLoading(false);
    }
  };

  const handleThreadClick = (thread) => {
    navigate("/acs/chat/thread", {
      state: {
        threadId: thread.thread_id,
        topic: thread.topic
      }
    });
  };
  

  return (
    <div className="chat-threads-container">
      <h2>Chat Threads</h2>

      {loading && <p className="loading">Loading threads...</p>}
      {error && <p className="error-message">{error}</p>}

      {!loading && threads.length === 0 && (
        <p className="no-threads">No chat threads found.</p>
      )}

      <div className="threads-list">
        {threads.map((thread) => (
          <div
            key={thread.thread_id}
            className="thread-item"
            onClick={() => handleThreadClick(thread)}
          >
            <h3 className="thread-topic">{thread.topic || "Untitled Thread"}</h3>
            {thread.created_on && <p className="thread-date">Created on: {thread.created_on}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChatThreads;*/

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ChatThreads.css";

function ChatThreads() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const acsUserId = localStorage.getItem("user_acs_id");
  const acsToken = localStorage.getItem("user_acs_token");

  useEffect(() => {
    const fetchThreads = async () => {
      if (!acsUserId || !acsToken) return;
      
      setLoading(true);
      try {
        const response = await fetch(
          `/acs/chat/threads?acs_user_id=${encodeURIComponent(acsUserId)}&acs_token=${encodeURIComponent(acsToken)}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );
        
        if (!response.ok) {
          throw new Error("Failed to fetch threads");
        }
        const data = await response.json();
        setThreads(data);
      } catch (err) {
        console.error("Error fetching threads:", err);
        setError("Failed to load chat threads");
      } finally {
        setLoading(false);
      }
    };
    fetchThreads();
  }, [acsUserId, acsToken]);

  const handleThreadClick = (thread) => {
    navigate("/acs/chat/thread", {
      state: {
        threadId: thread.thread_id,
        topic: thread.topic
      }
    });
  };

  return (
    <div className="chat-threads-container">
      <h2>Your Conversations</h2>
      {loading && <div className="loading">Loading conversations...</div>}
      {error && <div className="error">{error}</div>}
      
      <div className="threads-list">
        {threads.map((thread) => (
          <div 
            key={thread.thread_id} 
            className="thread-item"
            onClick={() => handleThreadClick(thread)}
          >
            <h3>{thread.topic || "Untitled Thread"}</h3>
            <span className="thread-date">
              {thread.created_on && new Date(thread.created_on).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChatThreads;

