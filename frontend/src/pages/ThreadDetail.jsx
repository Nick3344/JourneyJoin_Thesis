import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import "../styles/ThreadDetail.css";

function ThreadDetail() {
  const location = useLocation();
  const { threadId, topic } = location.state || {};
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  const acsUserId = localStorage.getItem("user_acs_id");
  const acsToken = localStorage.getItem("user_acs_token");

  // Fetch messages function with added status check for Forbidden (403)
  const fetchMessages = useCallback(async () => {
    if (!threadId || !acsUserId || !acsToken) return;
    
    setLoading(true);
    try {
      const response = await fetch('/acs/chat/get_messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          threadId, 
          acs_user_id: acsUserId, 
          acs_token: acsToken 
        }),
      });

      if (response.status === 403) {
        throw new Error('Forbidden: The token may not have permission to fetch messages.');
      }
      
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.statusText}`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setMessages(data);
      } else {
        console.error('Unexpected messages format:', data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [threadId, acsUserId, acsToken]);

  // Socket connection effect
  useEffect(() => {
    if (!threadId || !acsUserId) return;

    socketRef.current = io('http://127.0.0.1:5000', {
      transports: ['websocket'],
      query: { 
        threadId,
        acs_user_id: acsUserId 
      }
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      socketRef.current.emit('join_thread', { threadId });
    });

    socketRef.current.on('new_message', (message) => {
      console.log('New message received:', message);
      setMessages(prev => [...prev, message]);
    });

    // Initial message fetch
    fetchMessages();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [threadId, acsUserId, fetchMessages]);

  // Scroll to bottom effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Updated handleSendMessage with check for Forbidden response
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await fetch('/acs/chat/send_message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          content: newMessage.trim(),
          senderDisplayName: "You",
          acs_user_id: acsUserId,
          acs_token: acsToken
        }),
      });

      if (response.status === 403) {
        throw new Error('Forbidden: The token may not have permission to send messages.');
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      // Optionally clear error on a successful send
      setError('');
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
    }
  };

  if (!threadId) {
    return <div className="error-container">Invalid thread ID</div>;
  }

  return (
    <div className="thread-detail-container">
      <div className="thread-header">
        <h2>{topic || "Chat Thread"}</h2>
      </div>
      <div className="messages-container">
        {loading && <div className="loading">Loading messages...</div>}
        {error && <div className="error">{error}</div>}
        
        <div className="messages-list">
          {messages.map((msg, index) => (
            <div 
              key={msg.id || index}
              className={`message-item ${msg.senderDisplayName === "You" ? "sent" : "received"}`}
            >
              <div className="message-sender">{msg.senderDisplayName}</div>
              <div className="message-content">{msg.content}</div>
              {msg.createdOn && (
                <div className="message-time">
                  {new Date(msg.createdOn).toLocaleTimeString()}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="message-input-container">
          <textarea
            className="message-input"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <button 
            className="send-button"
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default ThreadDetail;