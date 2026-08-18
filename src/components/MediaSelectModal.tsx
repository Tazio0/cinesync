import React, { useState } from 'react';
import { 
  X, 
  Tv, 
  Film, 
  Link, 
  FolderUp, 
  Sparkles, 
  Play, 
  Clock, 
  Timer,
  Camera
} from 'lucide-react';
import type { SampleMedia } from '../types';
import { SAMPLE_MOVIES } from '../utils/sampleMedia';
import { isScreenShareSupported } from '../utils/deviceInfo';

interface MediaSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScreenShare: () => void;
  onSelectCameraStream: () => void;
  onSelectVideoUrl: (url: string, title: string) => void;
  onSelectYouTube: (url: string) => void;
  onSelectLocalFile: (file: File) => void;
  onSelectDualSync: () => void;
  onSelectSampleMovie: (movie: SampleMedia) => void;
}

export const MediaSelectModal: React.FC<MediaSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectScreenShare,
  onSelectCameraStream,
  onSelectVideoUrl,
  onSelectYouTube,
  onSelectLocalFile,
  onSelectDualSync,
  onSelectSampleMovie,
}) => {
  const isScreenSupported = isScreenShareSupported();
  const [activeTab, setActiveTab] = useState<'screen' | 'camera' | 'url' | 'youtube' | 'local' | 'sample' | 'dual'>(
    isScreenSupported ? 'screen' : 'camera'
  );
  const [customUrl, setCustomUrl] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');

  if (!isOpen) return null;

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    onSelectVideoUrl(customUrl.trim(), customTitle.trim() || 'Custom Stream');
    onClose();
  };

  const handleYouTubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;
    onSelectYouTube(youtubeUrl.trim());
    onClose();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectLocalFile(file);
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card media-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-badge-amber">Playback Source</span>
            <h2>Select What to Stream & Watch</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="media-tabs-nav">
          {isScreenSupported && (
            <button
              className={`media-tab-btn ${activeTab === 'screen' ? 'active' : ''}`}
              onClick={() => setActiveTab('screen')}
            >
              <Tv size={16} />
              <span>Share Screen</span>
            </button>
          )}
          <button
            className={`media-tab-btn ${activeTab === 'camera' ? 'active' : ''}`}
            onClick={() => setActiveTab('camera')}
          >
            <Camera size={16} />
            <span>Live Camera</span>
          </button>
          <button
            className={`media-tab-btn ${activeTab === 'sample' ? 'active' : ''}`}
            onClick={() => setActiveTab('sample')}
          >
            <Sparkles size={16} />
            <span>Featured Movies</span>
          </button>
          <button
            className={`media-tab-btn ${activeTab === 'url' ? 'active' : ''}`}
            onClick={() => setActiveTab('url')}
          >
            <Link size={16} />
            <span>Direct Video URL</span>
          </button>
          <button
            className={`media-tab-btn ${activeTab === 'youtube' ? 'active' : ''}`}
            onClick={() => setActiveTab('youtube')}
          >
            <Film size={16} />
            <span>YouTube</span>
          </button>
          <button
            className={`media-tab-btn ${activeTab === 'dual' ? 'active' : ''}`}
            onClick={() => setActiveTab('dual')}
          >
            <Timer size={16} />
            <span>Dual Netflix Sync</span>
          </button>
          <button
            className={`media-tab-btn ${activeTab === 'local' ? 'active' : ''}`}
            onClick={() => setActiveTab('local')}
          >
            <FolderUp size={16} />
            <span>Local Video</span>
          </button>
        </div>

        <div className="modal-body media-tab-content">
          {/* SCREEN / NETFLIX TAB */}
          {activeTab === 'screen' && (
            <div className="tab-pane screen-pane">
              <div className="pane-hero-card">
                <div className="hero-icon-netflix">
                  <Tv size={36} />
                </div>
                <h3>Share Screen / Netflix Tab with Stereo Audio</h3>
                <p>
                  Broadcast your Netflix, YouTube, browser tab, or entire desktop across networks in 1080p 60fps with clear stereo audio.
                </p>
                <button
                  className="btn-primary-netflix hero-action"
                  onClick={() => {
                    onClose();
                    onSelectScreenShare();
                  }}
                >
                  <Tv size={18} />
                  <span>Start Sharing Screen Now</span>
                </button>
                <div className="pane-helper-note">
                  Tip: When the browser dialog pops up, choose <strong>"Chrome Tab"</strong> and check <strong>"Also share tab audio"</strong> for crisp movie sound.
                </div>
              </div>
            </div>
          )}

          {/* LIVE CAMERA BROADCAST */}
          {activeTab === 'camera' && (
            <div className="tab-pane camera-pane">
              <div className="pane-hero-card">
                <div className="hero-icon-camera" style={{ color: '#10B981' }}>
                  <Camera size={36} />
                </div>
                <h3>Broadcast Live Camera & Mic</h3>
                <p>
                  Stream your mobile or webcam video + audio directly to everyone in the room. Works on any smartphone, tablet, or laptop.
                </p>
                <button
                  className="btn-primary hero-action"
                  style={{ background: '#10B981' }}
                  onClick={() => {
                    onClose();
                    onSelectCameraStream();
                  }}
                >
                  <Camera size={18} />
                  <span>Start Camera Live Stream</span>
                </button>
                <div className="pane-helper-note">
                  Perfect for mobile streaming, presentations, watch party reactions, and live demonstrations.
                </div>
              </div>
            </div>
          )}

          {/* FEATURED / SAMPLE MOVIES */}
          {activeTab === 'sample' && (
            <div className="tab-pane sample-movies-grid">
              {SAMPLE_MOVIES.map((movie) => (
                <div
                  key={movie.id}
                  className="sample-movie-card"
                  onClick={() => {
                    onSelectSampleMovie(movie);
                    onClose();
                  }}
                >
                  <div className="sample-thumbnail-wrap">
                    <img src={movie.thumbnail} alt={movie.title} />
                    <div className="play-overlay">
                      <Play size={24} fill="currentColor" />
                    </div>
                    <span className="movie-duration-badge">
                      <Clock size={11} />
                      {movie.duration}
                    </span>
                  </div>
                  <div className="sample-movie-info">
                    <h4>{movie.title}</h4>
                    <p>{movie.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* DIRECT VIDEO URL */}
          {activeTab === 'url' && (
            <div className="tab-pane form-pane">
              <form onSubmit={handleCustomUrlSubmit}>
                <p className="pane-subtitle">
                  Paste any direct video stream link (MP4, WebM, HLS m3u8, OGG) to watch in synchronized sync across devices.
                </p>
                <div className="form-group">
                  <label htmlFor="video-url">Video Stream URL</label>
                  <input
                    id="video-url"
                    type="url"
                    required
                    placeholder="https://example.com/movie.mp4"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="text-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="video-title">Title (Optional)</label>
                  <input
                    id="video-title"
                    type="text"
                    placeholder="Movie or Episode Title"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="text-input"
                  />
                </div>
                <button type="submit" className="btn-primary full-width">
                  <Play size={16} />
                  <span>Load Synchronized Video</span>
                </button>
              </form>
            </div>
          )}

          {/* YOUTUBE */}
          {activeTab === 'youtube' && (
            <div className="tab-pane form-pane">
              <form onSubmit={handleYouTubeSubmit}>
                <p className="pane-subtitle">
                  Paste a YouTube video link to watch synchronously together.
                </p>
                <div className="form-group">
                  <label htmlFor="youtube-url">YouTube Link / Video ID</label>
                  <input
                    id="youtube-url"
                    type="text"
                    required
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="text-input"
                  />
                </div>
                <button type="submit" className="btn-primary full-width">
                  <Play size={16} />
                  <span>Load YouTube Video</span>
                </button>
              </form>
            </div>
          )}

          {/* DUAL NETFLIX SYNC */}
          {activeTab === 'dual' && (
            <div className="tab-pane dual-pane">
              <div className="dual-hero-card">
                <div className="dual-icon-box">
                  <Timer size={32} />
                </div>
                <h3>Dual-Account Sync Assistant</h3>
                <p>
                  Both of you open Netflix in your own browser windows on the same movie. Use CineSync's synchronized countdown timer & chime to press play simultaneously!
                </p>
                <button
                  className="btn-primary hero-action"
                  onClick={() => {
                    onSelectDualSync();
                    onClose();
                  }}
                >
                  <Timer size={18} />
                  <span>Activate Dual Sync Controller</span>
                </button>
              </div>
            </div>
          )}

          {/* LOCAL FILE */}
          {activeTab === 'local' && (
            <div className="tab-pane local-pane">
              <div className="dropzone-box">
                <FolderUp size={36} className="dropzone-icon" />
                <h3>Select Local Video File</h3>
                <p>Play a video file stored directly on your computer (MP4, MKV, WebM).</p>
                <label className="file-upload-btn">
                  <span>Browse Files</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileInput}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
