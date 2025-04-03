import React, { useEffect, useState } from "react";
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

export default ChatThreads;
