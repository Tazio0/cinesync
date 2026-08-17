import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  MessageSquare, 
  ChevronRight, 
  Users, 
  Video as VideoIcon, 
  VideoOff 
} from 'lucide-react';
import type { ChatMessage, User } from '../types';

interface ChatSidebarProps {
  messages: ChatMessage[];
  currentUser: User;
  peers: User[];
  typingUsers: string[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
  onSendTyping: (isTyping: boolean) => void;
  unreadCount: number;
  onResetUnread: () => void;
  onToggleCamera: () => void;
}

const QUICK_REACTIONS = ['🍿', '❤️', '🔥', '😂', '🤯', '👏', '😭', '✨'];

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  messages,
  currentUser,
  peers,
  typingUsers,
  isCollapsed,
  onToggleCollapse,
  onSendMessage,
  onSendReaction,
  onSendTyping,
  unreadCount,
  onResetUnread,
  onToggleCamera,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isCollapsed) {
      onResetUnread();
    }
  }, [isCollapsed, onResetUnread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    // Broadcast typing indicator
    onSendTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 1800);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText);
    setInputText('');
    onSendTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <aside className={`chat-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Collapsed floating toggle pill */}
      {isCollapsed ? (
        <div className="collapsed-trigger-bar">
          <button 
            className="collapsed-toggle-btn"
            onClick={onToggleCollapse}
            title="Open Chat (C)"
            aria-label="Open Chat Sidebar"
          >
            <MessageSquare size={18} />
            {unreadCount > 0 && (
              <span className="floating-unread-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {/* Quick Reaction Bar in Collapsed Mode */}
          <div className="collapsed-reactions-column">
            {QUICK_REACTIONS.slice(0, 4).map((emoji) => (
              <button
                key={emoji}
                className="collapsed-reaction-btn"
                onClick={() => onSendReaction(emoji)}
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="chat-container">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-title-row">
                <MessageSquare size={16} className="text-accent" />
                <h3>Live Chat</h3>
                <span className="live-dot-pulse"></span>
              </div>
              <div className="chat-presence-summary">
                <Users size={12} />
                <span>{1 + peers.length} in room</span>
              </div>
            </div>

            <div className="chat-header-actions">
              {/* Optional Cam / Mic Toggle */}
              <button
                className={`cam-toggle-btn ${currentUser.isVideoOn ? 'active' : ''}`}
                onClick={onToggleCamera}
                title={currentUser.isVideoOn ? 'Turn off camera & mic' : 'Turn on webcam & mic'}
              >
                {currentUser.isVideoOn ? <VideoIcon size={15} /> : <VideoOff size={15} />}
              </button>

              <button
                className="collapse-sidebar-btn"
                onClick={onToggleCollapse}
                title="Collapse Chat"
                aria-label="Collapse Chat"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Quick Reaction Row */}
          <div className="quick-reactions-bar">
            <span className="reactions-label">Reactions</span>
            <div className="reactions-scroll">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  className="quick-reaction-btn"
                  onClick={() => onSendReaction(emoji)}
                  title={`Send ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Stream */}
          <div className="messages-stream">
            {messages.length === 0 ? (
              <div className="empty-chat-hint">
                <div className="empty-chat-icon">🍿</div>
                <h4>Your watch party is ready</h4>
                <p>Send a message or drop a popcorn reaction to kick things off!</p>
              </div>
            ) : (
              messages.map((msg) => {
                if (msg.type === 'system') {
                  return (
                    <div key={msg.id} className="system-message">
                      <span className="system-pill">{msg.text}</span>
                    </div>
                  );
                }

                const isMe = msg.senderId === currentUser.id;

                return (
                  <div
                    key={msg.id}
                    className={`message-bubble-wrapper ${isMe ? 'is-self' : 'is-peer'}`}
                  >
                    {!isMe && (
                      <div
                        className="msg-avatar"
                        style={{ backgroundColor: msg.avatarColor || '#6366F1' }}
                      >
                        {msg.senderName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="msg-content-block">
                      <div className="msg-meta-row">
                        <span className="msg-sender-name">
                          {isMe ? 'You' : msg.senderName}
                        </span>
                        {msg.isHost && <span className="host-tag">HOST</span>}
                        <span className="msg-time">{formatTime(msg.timestamp)}</span>
                      </div>
                      <div className="msg-text-bubble">{msg.text}</div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="typing-indicator-row">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="typing-names">
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form className="chat-input-bar" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Type a message..."
              value={inputText}
              onChange={handleInputChange}
              className="chat-text-input"
            />
            <button
              type="submit"
              className="send-msg-btn"
              disabled={!inputText.trim()}
              title="Send message"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
};
