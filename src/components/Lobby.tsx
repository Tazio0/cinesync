import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Sparkles, 
  ArrowRight, 
  Users, 
  Zap, 
  MessageSquare,
  Smartphone,
  Laptop
} from 'lucide-react';
import { getDeviceType } from '../utils/deviceInfo';

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

  const deviceType = getDeviceType();

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

  const extractCleanRoomId = (raw: string): string => {
    let clean = raw.trim();
    if (clean.includes('#room=')) {
      clean = clean.split('#room=')[1]?.split('&')[0] || clean;
    } else if (clean.includes('room=')) {
      clean = clean.split('room=')[1]?.split('&')[0] || clean;
    }
    return clean.toLowerCase().replace(/^cinesync[_-]/, '').replace(/[^a-z0-9-]/g, '');
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
    const cleanId = extractCleanRoomId(joinCode);
    if (!cleanId) return;
    const finalName = name.trim() || 'Friend 🍿';
    localStorage.setItem('cinesync_username', finalName);
    onJoinRoom(cleanId, finalName, false);
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
            Screen Sharing & Movies <span className="headline-highlight">Across Any Device</span>
          </h1>
          <p className="lobby-subtitle">
            Synchronized 60 FPS tab & screen sharing with stereo audio, peer-to-peer across networks with zero installs needed.
          </p>

          {/* Device Capability Badge */}
          <div className="device-status-badge">
            {deviceType === 'desktop' ? <Laptop size={14} /> : <Smartphone size={14} />}
            <span>
              {deviceType === 'desktop'
                ? 'Desktop detected — HD 60 FPS Tab Audio Sharing Ready'
                : 'Mobile / Tablet detected — HD Watch & Stream Ready'}
            </span>
          </div>
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

        {/* Feature Highlights Grid */}
        <div className="lobby-features-grid">
          <div className="feature-item">
            <div className="feature-icon">
              <Tv size={20} />
            </div>
            <div className="feature-text">
              <h4>Screen & Tab Sharing</h4>
              <p>Stream any browser tab or window in 1080p 60fps with clear audio</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <Zap size={20} />
            </div>
            <div className="feature-text">
              <h4>Cross-Network WebRTC</h4>
              <p>Seamless NAT & firewall traversal with automatic STUN/TURN relays</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <Smartphone size={20} />
            </div>
            <div className="feature-text">
              <h4>Any Device, Zero Installs</h4>
              <p>Works on iPhone, Android, iPad, Mac, Windows, Linux, and Smart TVs</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <MessageSquare size={20} />
            </div>
            <div className="feature-text">
              <h4>Live Chat & Popcorn Pops</h4>
              <p>Real-time chat with floating popcorn bursts and live video PiP</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
