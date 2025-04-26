import React, { useState, useEffect, useRef } from 'react';
import ACTIONS from '../Actions';
import '../styles/Chat.css';

const Chat = ({ socketRef, roomId, username, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on(ACTIONS.CHAT_MESSAGE, ({ message, sender, timestamp }) => {
        setMessages(prev => [...prev, { 
          message, 
          sender, 
          timestamp,
          isOwnMessage: sender === username 
        }]);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.CHAT_MESSAGE);
      }
    };
  }, [socketRef.current, username]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socketRef.current) {
      socketRef.current.emit(ACTIONS.CHAT_MESSAGE, {
        roomId,
        message: newMessage,
        sender: username
      });
      setNewMessage('');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="chat-popup">
      <div className="chat-header">
        <h3>Room Chat</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.isOwnMessage ? 'sent' : 'received'}`}>
            <div className="message-info">
              <span className="message-sender">{msg.sender}</span>
              <span className="message-time">{formatTime(msg.timestamp)}</span>
            </div>
            <div className="message-content">{msg.message}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="chat-input-container">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="chat-input"
        />
        <button type="submit" className="send-button">Send</button>
      </form>
    </div>
  );
};

export default Chat; 