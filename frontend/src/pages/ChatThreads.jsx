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
import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import { ChatClient } from "@azure/communication-chat";
import "../styles/ChatThreads.css";

function ChatThreads() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Retrieve ACS metadata from localStorage
  const acsEndpoint = localStorage.getItem("acs_endpoint");
  const acsUserId = localStorage.getItem("user_acs_id");
  const acsToken = localStorage.getItem("user_acs_token");


  useEffect(() => {
    const fetchThreads = async () => {
      if (!acsEndpoint || !acsToken) {
        setError("ACS endpoint or token is missing.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        // Create a token credential and ChatClient
        const tokenCredential = new AzureCommunicationTokenCredential(acsToken);
        const chatClient = new ChatClient(acsEndpoint, tokenCredential);
        
        // Use async iteration to collect threads
        let fetchedThreads = [];
        const threadsIterator = chatClient.listChatThreads({ maxPageSize: 10 });
        for await (const threadItem of threadsIterator) {
          fetchedThreads.push(threadItem);
        }
        setThreads(fetchedThreads);
      } catch (err) {
        console.error("Error listing chat threads:", err);
        setError("Failed to retrieve chat threads.");
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
  }, [acsEndpoint, acsToken]);

  const handleThreadClick = (thread) => {
    // Navigate to the thread detail page with the thread id and topic
    navigate("/acs/chat/thread", { state: { threadId: thread.id, topic: thread.topic } });
  };

  return (
    <div className="chat-threads-container">
      <h2>Chat Threads</h2>
      {loading && <p className="loading">Loading chat threads...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && threads.length === 0 && <p className="no-threads">No chat threads available.</p>}
      <div className="threads-list">
        {threads.map((thread) => (
          <div key={thread.id} className="thread-card" onClick={() => handleThreadClick(thread)}>
            <h3 className="thread-topic">{thread.topic || "Untitled Thread"}</h3>
            {thread.createdOn && (
              <p className="thread-date">
                Created on: {new Date(thread.createdOn).toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChatThreads;

