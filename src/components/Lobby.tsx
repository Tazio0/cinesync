import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Film, 
  Sparkles, 
  ArrowRight, 
  Users, 
  Zap, 
  MessageSquare
} from 'lucide-react';

interface LobbyProps {
  initialRoomId?: string;
  onJoinRoom: (roomId: string, name: string, isHost: boolean) => void;
}

const DEFAULT_NAMES = [
  'Alex 🍿', 'Jordan 🎬', 'Sam 🍿', 'Taylor 🍿', 'Morgan 🎬', 'Casey 🍿', 'Riley 🎬'
];

const COLOR_CHOICES = [
  '#E50914', '#F59E0B', '#10B981', '#06B6D4', '#6366F1', '#EC4899', '#8B5CF6'
];

export const Lobby: React.FC<LobbyProps> = ({ initialRoomId, onJoinRoom }) => {
  const [name, setName] = useState<string>(() => {
    return localStorage.getItem('cinesync_username') || DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)];
  });
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_CHOICES[0]);
  const [joinCode, setJoinCode] = useState<string>(initialRoomId || '');
  const [isJoiningWithCode, setIsJoiningWithCode] = useState<boolean>(!!initialRoomId);

  useEffect(() => {
    if (initialRoomId) {
      setJoinCode(initialRoomId);
      setIsJoiningWithCode(true);
    }
  }, [initialRoomId]);

  const generateRandomRoomId = () => {
    const adjectives = ['cosmic', 'velvet', 'neon', 'cinema', 'star', 'amber', 'lunar', 'epic'];
    const nouns = ['party', 'room', 'vault', 'lounge', 'theater', 'nest', 'studio'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(100 + Math.random() * 900);
    return `${adj}-${noun}-${num}`;
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || 'Movie Lover 🍿';
    localStorage.setItem('cinesync_username', finalName);
    const newRoomId = generateRandomRoomId();
    onJoinRoom(newRoomId, finalName, true);
  };

  const handleJoinExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    const finalName = name.trim() || 'Friend 🍿';
    localStorage.setItem('cinesync_username', finalName);
    onJoinRoom(joinCode.trim().toLowerCase(), finalName, false);
  };

  return (
    <div className="lobby-viewport">
      {/* Ambient background cinema glow */}
      <div className="lobby-glow-canvas" aria-hidden="true">
        <div className="lobby-glow-blob red-blob"></div>
        <div className="lobby-glow-blob amber-blob"></div>
      </div>

      <div className="lobby-container">
        {/* Header Branding */}
        <div className="lobby-brand-header">
          <div className="lobby-logo-badge">
            <span className="lobby-popcorn-icon">🍿</span>
            <span className="lobby-brand-title">CineSync</span>
          </div>
          <h1 className="lobby-headline">
            Watch Netflix & Movies <span className="headline-highlight">Together</span>
          </h1>
          <p className="lobby-subtitle">
            Synchronized playback, HD screen sharing with stereo audio, and real-time chat. Zero installs needed for your friends.
          </p>
        </div>

        {/* Main Card */}
        <div className="lobby-card-wrapper">
          <div className="lobby-card">
            {/* User Profile Customization */}
            <div className="user-customization-section">
              <label className="section-label" htmlFor="user-name-input">Your Display Name</label>
              <div className="name-input-row">
                <div 
                  className="avatar-preview-badge" 
                  style={{ backgroundColor: selectedColor }}
                  title="Your Avatar"
                >
                  {(name.trim() || 'A').charAt(0).toUpperCase()}
                </div>
                <input
                  id="user-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name..."
                  className="lobby-name-input"
                  maxLength={24}
                />
              </div>

              {/* Avatar Color Picker */}
              <div className="color-picker-row">
                <span className="color-label">Avatar Color:</span>
                <div className="color-dots-group">
                  {COLOR_CHOICES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-dot-btn ${selectedColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Action Tabs / Toggle */}
            {initialRoomId ? (
              /* Invited to Join Mode */
              <form className="join-form-direct" onSubmit={handleJoinExisting}>
                <div className="invite-banner-card">
                  <div className="invite-banner-icon">
                    <Sparkles size={20} className="text-accent" />
                  </div>
                  <div className="invite-banner-info">
                    <span className="banner-small">You were invited to room</span>
                    <strong className="banner-room-name">{initialRoomId}</strong>
                  </div>
                </div>

                <button type="submit" className="btn-lobby-primary">
                  <span>Enter Watch Party</span>
                  <ArrowRight size={18} />
                </button>
              </form>
            ) : (
              /* Create or Join Options */
              <div className="lobby-actions-block">
                {!isJoiningWithCode ? (
                  <div className="create-room-flow">
                    <button
                      type="button"
                      className="btn-lobby-primary"
                      onClick={handleCreateRoom}
                    >
                      <Sparkles size={18} />
                      <span>Create New Watch Party</span>
                      <ArrowRight size={18} />
                    </button>

                    <div className="divider-or">
                      <span>or have a room code?</span>
                    </div>

                    <button
                      type="button"
                      className="btn-lobby-secondary"
                      onClick={() => setIsJoiningWithCode(true)}
                    >
                      <Users size={16} />
                      <span>Join Existing Room</span>
                    </button>
                  </div>
                ) : (
                  <form className="join-room-flow" onSubmit={handleJoinExisting}>
                    <div className="form-group">
                      <label htmlFor="room-code-input">Enter Room Code</label>
                      <input
                        id="room-code-input"
                        type="text"
                        required
                        placeholder="e.g. cosmic-party-849"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        className="lobby-code-input"
                      />
                    </div>

                    <div className="join-buttons-row">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setIsJoiningWithCode(false)}
                      >
                        Back
                      </button>
                      <button type="submit" className="btn-lobby-primary flex-1">
                        <span>Join Party</span>
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Feature Highlights Minimalist Grid */}
        <div className="lobby-features-grid">
          <div className="feature-item">
            <div className="feature-icon">
              <Tv size={20} />
            </div>
            <div className="feature-text">
              <h4>Netflix & Tab Streaming</h4>
              <p>Stream any browser tab in 1080p 60fps with clear audio</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <MessageSquare size={20} />
            </div>
            <div className="feature-text">
              <h4>Live Chat & Reactions</h4>
              <p>Real-time chat with floating popcorn & emoji bursts</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <Film size={20} />
            </div>
            <div className="feature-text">
              <h4>Synchronized Playback</h4>
              <p>Play YouTube, MP4 videos, and local files in sync</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <Zap size={20} />
            </div>
            <div className="feature-text">
              <h4>Zero Installs Needed</h4>
              <p>Pure peer-to-peer WebRTC right in your web browser</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
