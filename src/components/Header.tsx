import React, { useState, useRef, useEffect } from 'react';
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
  Users, 
  Activity,
  Square,
  UserX,
  Shield,
  Smartphone,
  Laptop
} from 'lucide-react';
import type { StreamType, User, ConnectionStats } from '../types';
import { soundFX } from '../utils/soundEffects';

interface HeaderProps {
  roomId: string;
  isHost: boolean;
  peerCount: number;
  streamType: StreamType;
  streamTitle?: string;
  connectionStats: ConnectionStats;
  isTheaterMode: boolean;
  onToggleTheater: () => void;
  onOpenInvite: () => void;
  onOpenMediaModal: () => void;
  onOpenNetflixGuide: () => void;
  onOpenStatsModal: () => void;
  ambientGlow: boolean;
  onToggleGlow: () => void;
  peers: User[];
  currentUser: User;
  onStopMedia?: () => void;
  onKickPeer?: (peerId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  roomId,
  peerCount,
  streamType,
  streamTitle,
  connectionStats,
  isTheaterMode,
  onToggleTheater,
  onOpenInvite,
  onOpenMediaModal,
  onOpenNetflixGuide,
  onOpenStatsModal,
  ambientGlow,
  onToggleGlow,
  peers,
  currentUser,
  onStopMedia,
  onKickPeer,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(soundFX.getMuted());
  const [copied, setCopied] = useState<boolean>(false);
  const [showParticipantsDropdown, setShowParticipantsDropdown] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

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

  // Close participants dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowParticipantsDropdown(false);
      }
    };
    if (showParticipantsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showParticipantsDropdown]);

  const getStreamBadge = () => {
    switch (streamType) {
      case 'screen':
        return { label: 'Screen Stream Active', icon: <Tv size={14} />, color: '#E50914' };
      case 'video':
        return { label: streamTitle || 'Synchronized Movie', icon: <Film size={14} />, color: '#F59E0B' };
      case 'youtube':
        return { label: 'YouTube Sync', icon: <Film size={14} />, color: '#EF4444' };
      case 'dual_sync':
        return { label: 'Dual Netflix Sync', icon: <Tv size={14} />, color: '#06B6D4' };
      default:
        return { label: 'Party Ready', icon: <Film size={14} />, color: '#9CA3AF' };
    }
  };

  const badge = getStreamBadge();
  const totalUsers = 1 + (peerCount > 0 ? peerCount : peers.length);

  const getNetworkQualityDot = () => {
    switch (connectionStats.networkQuality) {
      case 'excellent':
        return 'dot-green';
      case 'good':
        return 'dot-cyan';
      case 'fair':
        return 'dot-amber';
      default:
        return 'dot-red';
    }
  };

  const handleKickClick = (peerId: string, peerName: string) => {
    if (window.confirm(`Are you sure you want to remove ${peerName} from the watch party?`)) {
      if (onKickPeer) onKickPeer(peerId);
    }
  };

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

        {/* Network Traversal Indicator */}
        <button 
          className="network-status-pill" 
          onClick={onOpenStatsModal}
          title={`Network Quality: ${connectionStats.networkQuality.toUpperCase()} (${connectionStats.isRelayed ? 'TURN Relay' : 'Direct P2P'}). Click for diagnostics.`}
        >
          <span className={`network-dot ${getNetworkQualityDot()}`}></span>
          <Activity size={12} />
          <span className="network-ping">{connectionStats.rtt ? `${connectionStats.rtt}ms` : 'P2P'}</span>
        </button>

        <div className="stream-badge" style={{ borderColor: `${badge.color}33`, color: badge.color }}>
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      </div>

      <div className="header-right">
        {/* Active Participants Stack & Dropdown */}
        <div className="participants-wrapper" ref={dropdownRef}>
          <div 
            className="participants-stack" 
            onClick={() => setShowParticipantsDropdown((prev) => !prev)}
            title="Click to view and manage participants"
          >
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
                title={`${peer.name}`}
              >
                {peer.name.charAt(0).toUpperCase()}
              </div>
            ))}
            <div className="users-count-tag">
              <Users size={12} />
              <span>{totalUsers}</span>
            </div>
          </div>

          {/* Participants Dropdown */}
          {showParticipantsDropdown && (
            <div className="participants-popover-dropdown">
              <div className="popover-header">
                <h4>Room Members ({totalUsers})</h4>
              </div>
              <div className="popover-list">
                {/* You */}
                <div className="popover-user-row">
                  <div className="popover-avatar" style={{ backgroundColor: currentUser.avatarColor }}>
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="popover-user-info">
                    <div className="user-name-line">
                      <span className="user-name-text">{currentUser.name}</span>
                      <span className="you-pill">You</span>
                      {currentUser.isHost && (
                        <span className="host-pill" title="Room Host">
                          <Shield size={10} />
                          <span>Host</span>
                        </span>
                      )}
                    </div>
                    <span className="device-info-sub">
                      {currentUser.deviceType === 'desktop' ? <Laptop size={11} /> : <Smartphone size={11} />}
                      <span>{currentUser.deviceType}</span>
                    </span>
                  </div>
                </div>

                {/* Connected Peers */}
                {peers.length === 0 ? (
                  <div className="empty-peers-notice">
                    <span>Waiting for friends to join... Share invite link!</span>
                  </div>
                ) : (
                  peers.map((peer) => (
                    <div key={peer.id} className="popover-user-row">
                      <div className="popover-avatar" style={{ backgroundColor: peer.avatarColor }}>
                        {peer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="popover-user-info">
                        <div className="user-name-line">
                          <span className="user-name-text">{peer.name}</span>
                          {peer.isHost && (
                            <span className="host-pill" title="Room Host">
                              <Shield size={10} />
                              <span>Host</span>
                            </span>
                          )}
                        </div>
                        <span className="device-info-sub">
                          {peer.deviceType === 'desktop' ? <Laptop size={11} /> : <Smartphone size={11} />}
                          <span>{peer.ping ? `${peer.ping}ms` : 'Connected'}</span>
                        </span>
                      </div>

                      {/* Kick Button (Host Only) */}
                      {currentUser.isHost && !peer.isHost && onKickPeer && (
                        <button 
                          className="btn-kick-peer"
                          onClick={() => handleKickClick(peer.id, peer.name)}
                          title={`Remove ${peer.name} from room`}
                        >
                          <UserX size={14} />
                          <span>Kick</span>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stop Stream Button (Active Media) */}
        {streamType !== 'idle' && onStopMedia && (
          <button 
            className="header-action-btn stop-media-btn"
            onClick={onStopMedia}
            title="Stop Current Stream & Return to Stage"
          >
            <Square size={14} fill="currentColor" />
            <span className="btn-label">Stop Stream</span>
          </button>
        )}

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
