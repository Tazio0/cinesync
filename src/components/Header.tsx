import React, { useState } from 'react';
import { 
  Tv, 
  Volume2, 
  VolumeX, 
  Share2, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  HelpCircle, 
  Film, 
  Copy, 
  Check, 
  Users 
} from 'lucide-react';
import type { StreamType, User } from '../types';
import { soundFX } from '../utils/soundEffects';

interface HeaderProps {
  roomId: string;
  isHost: boolean;
  peerCount: number;
  streamType: StreamType;
  streamTitle?: string;
  isTheaterMode: boolean;
  onToggleTheater: () => void;
  onOpenInvite: () => void;
  onOpenMediaModal: () => void;
  onOpenNetflixGuide: () => void;
  ambientGlow: boolean;
  onToggleGlow: () => void;
  peers: User[];
  currentUser: User;
}

export const Header: React.FC<HeaderProps> = ({
  roomId,
  peerCount,
  streamType,
  streamTitle,
  isTheaterMode,
  onToggleTheater,
  onOpenInvite,
  onOpenMediaModal,
  onOpenNetflixGuide,
  ambientGlow,
  onToggleGlow,
  peers,
  currentUser,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(soundFX.getMuted());
  const [copied, setCopied] = useState<boolean>(false);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundFX.setMuted(next);
  };

  const copyRoomLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStreamBadge = () => {
    switch (streamType) {
      case 'screen':
        return { label: 'Netflix Screen Stream', icon: <Tv size={14} />, color: '#E50914' };
      case 'video':
        return { label: streamTitle || 'Synchronized Movie', icon: <Film size={14} />, color: '#F59E0B' };
      case 'youtube':
        return { label: 'YouTube Sync', icon: <Film size={14} />, color: '#EF4444' };
      case 'dual_sync':
        return { label: 'Dual Netflix Sync', icon: <Tv size={14} />, color: '#06B6D4' };
      default:
        return { label: 'Cinema Ready', icon: <Film size={14} />, color: '#9CA3AF' };
    }
  };

  const badge = getStreamBadge();
  const totalUsers = 1 + (peerCount > 0 ? peerCount : peers.length);

  return (
    <header className={`app-header ${isTheaterMode ? 'theater-header' : ''}`}>
      <div className="header-left">
        <div className="brand-badge">
          <div className="brand-icon-wrap">
            <span className="popcorn-emoji">🍿</span>
          </div>
          <div className="brand-text">
            <span className="brand-name">CineSync</span>
            <span className="brand-tagline">watch together</span>
          </div>
        </div>

        {roomId && (
          <div className="room-pill" onClick={copyRoomLink} title="Click to copy invite link">
            <div className="status-dot-pulse"></div>
            <span className="room-code-label">Room: <strong>{roomId}</strong></span>
            <button className="pill-copy-btn" aria-label="Copy room link">
              {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
            </button>
          </div>
        )}

        <div className="stream-badge" style={{ borderColor: `${badge.color}33`, color: badge.color }}>
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      </div>

      <div className="header-right">
        {/* Active Participants */}
        <div className="participants-stack" title={`${totalUsers} active participant(s)`}>
          <div 
            className="user-avatar-small" 
            style={{ backgroundColor: currentUser.avatarColor }}
            title={`${currentUser.name} (You)`}
          >
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          {peers.map((peer) => (
            <div
              key={peer.id}
              className="user-avatar-small"
              style={{ backgroundColor: peer.avatarColor }}
              title={`${peer.name} (Friend)`}
            >
              {peer.name.charAt(0).toUpperCase()}
            </div>
          ))}
          <div className="users-count-tag">
            <Users size={12} />
            <span>{totalUsers}</span>
          </div>
        </div>

        {/* Source Switcher */}
        <button 
          className="header-action-btn primary-action" 
          onClick={onOpenMediaModal}
          title="Change Video or Screen Source"
        >
          <Film size={16} />
          <span className="btn-label">Media Source</span>
        </button>

        {/* Invite Friend */}
        <button 
          className="header-action-btn" 
          onClick={onOpenInvite}
          title="Share Invite Link & QR Code"
        >
          <Share2 size={16} />
          <span className="btn-label">Invite</span>
        </button>

        {/* Netflix Audio & Stream Guide */}
        <button 
          className="header-action-btn icon-only" 
          onClick={onOpenNetflixGuide}
          title="Netflix Tab Audio & DRM Guide"
          aria-label="Netflix Guide"
        >
          <HelpCircle size={17} />
        </button>

        {/* Ambient Glow Toggle */}
        <button 
          className={`header-action-btn icon-only ${ambientGlow ? 'active-glow-btn' : ''}`}
          onClick={onToggleGlow}
          title={ambientGlow ? 'Disable Ambient Backlight' : 'Enable Ambient Backlight Glow'}
          aria-label="Toggle Ambient Glow"
        >
          <Sparkles size={17} />
        </button>

        {/* Sound FX Toggle */}
        <button 
          className="header-action-btn icon-only" 
          onClick={toggleMute}
          title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
          aria-label="Toggle Sound Effects"
        >
          {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>

        {/* Theater / Fullscreen Mode */}
        <button 
          className={`header-action-btn icon-only ${isTheaterMode ? 'active-theater-btn' : ''}`}
          onClick={onToggleTheater}
          title={isTheaterMode ? 'Exit Theater Mode' : 'Enter Theater Mode'}
          aria-label="Toggle Theater Mode"
        >
          {isTheaterMode ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
      </div>
    </header>
  );
};
