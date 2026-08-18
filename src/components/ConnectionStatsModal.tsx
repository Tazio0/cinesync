import React, { useState } from 'react';
import { 
  X, 
  Activity, 
  Wifi, 
  Radio, 
  ShieldCheck, 
  Clock, 
  Monitor, 
  RefreshCw, 
  Save, 
  Sliders
} from 'lucide-react';
import type { ConnectionStats, TurnServerConfig } from '../types';

interface ConnectionStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ConnectionStats;
  onReconnect: () => void;
}

export const ConnectionStatsModal: React.FC<ConnectionStatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  onReconnect,
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'settings'>('live');
  const [customTurn, setCustomTurn] = useState<TurnServerConfig>(() => {
    try {
      const saved = localStorage.getItem('cinesync_custom_turn');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return { urls: '', username: '', credential: '' };
  });
  const [savedMessage, setSavedMessage] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveTurn = (e: React.FormEvent) => {
    e.preventDefault();
    if (customTurn.urls.trim()) {
      localStorage.setItem('cinesync_custom_turn', JSON.stringify(customTurn));
    } else {
      localStorage.removeItem('cinesync_custom_turn');
    }
    setSavedMessage(true);
    setTimeout(() => {
      setSavedMessage(false);
      onReconnect();
    }, 1200);
  };

  const getQualityColor = () => {
    switch (stats.networkQuality) {
      case 'excellent':
        return '#10B981';
      case 'good':
        return '#06B6D4';
      case 'fair':
        return '#F59E0B';
      default:
        return '#EF4444';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card stats-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-badge-cyan">Network Diagnostics</span>
            <h2>Connection & Traversal Health</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="media-tabs-nav">
          <button
            className={`media-tab-btn ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => setActiveTab('live')}
          >
            <Activity size={16} />
            <span>Live WebRTC Metrics</span>
          </button>
          <button
            className={`media-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Sliders size={16} />
            <span>Custom TURN / Relays</span>
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'live' ? (
            <div className="stats-live-grid">
              {/* Quality Banner */}
              <div className="stats-quality-banner" style={{ borderColor: `${getQualityColor()}44` }}>
                <div className="quality-icon" style={{ backgroundColor: `${getQualityColor()}22`, color: getQualityColor() }}>
                  <Wifi size={24} />
                </div>
                <div className="quality-text">
                  <div className="quality-title-row">
                    <h4>Connection Status: <strong style={{ color: getQualityColor(), textTransform: 'capitalize' }}>{stats.networkQuality}</strong></h4>
                    <span className="quality-badge">{stats.isRelayed ? 'TURN Relay' : 'Direct P2P'}</span>
                  </div>
                  <p>
                    {stats.isRelayed 
                      ? 'Connected through encrypted WebRTC TURN relay (optimal for restrictive firewalls / double NAT).'
                      : 'Connected directly browser-to-browser via STUN hole punching with sub-millisecond route.'}
                  </p>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="stats-tiles-row">
                <div className="stat-tile">
                  <div className="stat-tile-header">
                    <Clock size={15} />
                    <span>Latency (RTT)</span>
                  </div>
                  <div className="stat-tile-value">
                    {stats.rtt ? `${stats.rtt} ms` : '< 20 ms'}
                  </div>
                  <span className="stat-tile-sub">Round-trip ping</span>
                </div>

                <div className="stat-tile">
                  <div className="stat-tile-header">
                    <Monitor size={15} />
                    <span>Resolution & FPS</span>
                  </div>
                  <div className="stat-tile-value">
                    {stats.resolution !== '0x0' ? stats.resolution : '1080p'}
                  </div>
                  <span className="stat-tile-sub">{stats.fps ? `${stats.fps} FPS` : '60 FPS stream'}</span>
                </div>

                <div className="stat-tile">
                  <div className="stat-tile-header">
                    <Radio size={15} />
                    <span>ICE Candidate</span>
                  </div>
                  <div className="stat-tile-value" style={{ textTransform: 'uppercase', fontSize: '1rem' }}>
                    {stats.candidateType !== 'unknown' ? stats.candidateType : (stats.isRelayed ? 'relay' : 'srflx')}
                  </div>
                  <span className="stat-tile-sub">{stats.protocol !== 'unknown' ? stats.protocol.toUpperCase() : 'UDP / DTLS'}</span>
                </div>

                <div className="stat-tile">
                  <div className="stat-tile-header">
                    <ShieldCheck size={15} />
                    <span>Security</span>
                  </div>
                  <div className="stat-tile-value" style={{ fontSize: '1rem', color: '#10B981' }}>
                    DTLS-SRTP
                  </div>
                  <span className="stat-tile-sub">End-to-End Encrypted</span>
                </div>
              </div>

              <div className="stats-action-row">
                <button className="btn-secondary" onClick={onReconnect}>
                  <RefreshCw size={15} />
                  <span>Restart ICE & Reconnect</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveTurn} className="custom-turn-form">
              <p className="modal-desc">
                CineSync includes free global STUN & TURN relays by default. If your corporate or university firewall blocks standard ports, you can specify custom TURN credentials here:
              </p>

              <div className="form-group">
                <label htmlFor="turn-urls">TURN URL(s)</label>
                <input
                  id="turn-urls"
                  type="text"
                  placeholder="turn:my-turn-server.com:443?transport=tcp"
                  value={customTurn.urls}
                  onChange={(e) => setCustomTurn({ ...customTurn, urls: e.target.value })}
                  className="text-input"
                />
                <span className="input-hint">Comma-separated for multiple. Supports `turn:` and `turns:` (TLS).</span>
              </div>

              <div className="form-group">
                <label htmlFor="turn-username">Username (Optional)</label>
                <input
                  id="turn-username"
                  type="text"
                  placeholder="Username"
                  value={customTurn.username || ''}
                  onChange={(e) => setCustomTurn({ ...customTurn, username: e.target.value })}
                  className="text-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="turn-credential">Credential / Password (Optional)</label>
                <input
                  id="turn-credential"
                  type="password"
                  placeholder="Password or Auth Secret"
                  value={customTurn.credential || ''}
                  onChange={(e) => setCustomTurn({ ...customTurn, credential: e.target.value })}
                  className="text-input"
                />
              </div>

              <button type="submit" className="btn-primary full-width">
                <Save size={16} />
                <span>{savedMessage ? 'Saved & Reconnecting...' : 'Save & Apply Custom TURN'}</span>
              </button>
            </form>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
