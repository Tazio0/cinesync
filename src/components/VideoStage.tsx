import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Tv, 
  Film, 
  Sparkles, 
  RotateCcw, 
  RotateCw,
  Timer,
  HelpCircle,
  Maximize2,
  Camera,
  Activity,
  Layers
} from 'lucide-react';
import type { 
  StreamType, 
  SyncMediaState, 
  User, 
  ReactionItem, 
  ConnectionStats, 
  VideoViewMode 
} from '../types';
import { FloatingReactions } from './FloatingReactions';
import { isScreenShareSupported } from '../utils/deviceInfo';

interface VideoStageProps {
  streamType: StreamType;
  syncState: SyncMediaState;
  connectionStats: ConnectionStats;
  localScreenStream: MediaStream | null;
  remoteScreenStream: MediaStream | null;
  localCamStream: MediaStream | null;
  remoteCamStream: MediaStream | null;
  countdown: { active: boolean; count: number; initiator: string };
  reactions: ReactionItem[];
  ambientGlow: boolean;
  isHost: boolean;
  currentUser: User;
  peers: User[];
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  onStartCameraMainStream: () => void;
  onOpenMediaModal: () => void;
  onOpenNetflixGuide: () => void;
  onOpenStatsModal: () => void;
  onStartDualCountdown: () => void;
  onSyncAction: (action: 'play' | 'pause' | 'seek' | 'change_source', state: Partial<SyncMediaState>) => void;
}

export const VideoStage: React.FC<VideoStageProps> = ({
  streamType,
  syncState,
  connectionStats,
  localScreenStream,
  remoteScreenStream,
  localCamStream,
  remoteCamStream,
  countdown,
  reactions,
  ambientGlow,
  peers,
  onStartScreenShare,
  onStopScreenShare,
  onStartCameraMainStream,
  onOpenMediaModal,
  onOpenNetflixGuide,
  onOpenStatsModal,
  onStartDualCountdown,
  onSyncAction,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const localCamRef = useRef<HTMLVideoElement | null>(null);
  const remoteCamRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<VideoViewMode>('contain');
  const [needsAutoplayTap, setNeedsAutoplayTap] = useState<boolean>(false);
  
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeScreenStream = remoteScreenStream || localScreenStream;
  const isStreamingLocal = !!localScreenStream;
  const screenShareSupported = isScreenShareSupported();

  // Handle Fullscreen state change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Bind screen stream to video element & handle mobile autoplay policies
  useEffect(() => {
    const vid = screenVideoRef.current;
    if (vid) {
      if (activeScreenStream) {
        vid.srcObject = activeScreenStream;
        // On iOS Safari / Chrome, unmuted autoplay can reject with NotAllowedError
        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setNeedsAutoplayTap(false);
            })
            .catch((err) => {
              console.warn('Autoplay prevented by browser policy:', err);
              setNeedsAutoplayTap(true);
            });
        }
      } else {
        vid.srcObject = null;
        setNeedsAutoplayTap(false);
      }
    }
  }, [activeScreenStream]);

  // Bind webcam streams
  useEffect(() => {
    if (localCamRef.current && localCamStream) {
      localCamRef.current.srcObject = localCamStream;
    }
  }, [localCamStream]);

  useEffect(() => {
    if (remoteCamRef.current && remoteCamStream) {
      remoteCamRef.current.srcObject = remoteCamStream;
    }
  }, [remoteCamStream]);

  // Handle synchronized video state changes
  useEffect(() => {
    if (streamType === 'video' || streamType === 'local') {
      const vid = videoRef.current;
      if (!vid) return;

      if (syncState.isPlaying && vid.paused) {
        vid.play().catch(() => {});
        setIsPlaying(true);
      } else if (!syncState.isPlaying && !vid.paused) {
        vid.pause();
        setIsPlaying(false);
      }

      if (syncState.currentTime !== undefined && Math.abs(vid.currentTime - syncState.currentTime) > 1.2) {
        vid.currentTime = syncState.currentTime;
        setCurrentTime(syncState.currentTime);
      }
    }
  }, [syncState, streamType]);

  // Auto-hide controls on mouse idle
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying || streamType === 'screen') {
        setShowControls(false);
      }
    }, 3500);
  };

  const handleManualPlayTap = () => {
    if (screenVideoRef.current) {
      screenVideoRef.current.play().then(() => {
        setNeedsAutoplayTap(false);
      }).catch(() => {});
    }
  };

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;

    if (vid.paused) {
      vid.play().catch(() => {});
      setIsPlaying(true);
      onSyncAction('play', { isPlaying: true, currentTime: vid.currentTime });
    } else {
      vid.pause();
      setIsPlaying(false);
      onSyncAction('pause', { isPlaying: false, currentTime: vid.currentTime });
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      onSyncAction('seek', { currentTime: newTime, isPlaying });
    }
  };

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      onSyncAction('seek', { currentTime: newTime, isPlaying });
    }
  };

  const toggleMute = () => {
    const targetVideo = videoRef.current || screenVideoRef.current;
    if (!targetVideo) return;
    targetVideo.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    const targetVideo = videoRef.current || screenVideoRef.current;
    if (targetVideo) {
      targetVideo.volume = val;
      targetVideo.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    const targetVideo = screenVideoRef.current || videoRef.current;
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else if (targetVideo && (targetVideo as unknown as { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen) {
        // Fallback for iOS Safari
        (targetVideo as unknown as { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const togglePictureInPicture = async () => {
    const targetVideo = screenVideoRef.current || videoRef.current;
    if (!targetVideo) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await targetVideo.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP error:', err);
    }
  };

  const cycleViewMode = () => {
    setViewMode((prev) => (prev === 'contain' ? 'cover' : prev === 'cover' ? 'zoom' : 'contain'));
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getYouTubeEmbedUrl = (url: string) => {
    let videoId = '';
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1]?.split('&')[0] || '';
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    } else {
      videoId = url;
    }
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0`;
  };

  return (
    <div
      ref={containerRef}
      className={`video-stage-container ${isFullscreen ? 'is-fullscreen' : ''} ${
        ambientGlow ? 'has-ambient-glow' : ''
      }`}
      onMouseMove={handleMouseMove}
      onDoubleClick={toggleFullscreen}
    >
      {/* Dynamic Ambient Backlight Glow Canvas */}
      {ambientGlow && (
        <div className="ambient-backlight-canvas" aria-hidden="true">
          <div className="ambient-glow-orb glow-red"></div>
          <div className="ambient-glow-orb glow-amber"></div>
        </div>
      )}

      {/* Floating Reactions Layer */}
      <FloatingReactions reactions={reactions} />

      {/* Dual Countdown Overlay */}
      {countdown.active && (
        <div className="dual-countdown-overlay">
          <div className="countdown-content">
            <span className="countdown-label">
              {countdown.initiator ? `${countdown.initiator} started countdown` : 'Get Ready!'}
            </span>
            <div className="countdown-number">
              {countdown.count === 0 ? 'PLAY! 🍿' : countdown.count}
            </div>
            <span className="countdown-hint">Press play in your Netflix window!</span>
          </div>
        </div>
      )}

      {/* Media Content Display */}
      <div className="video-player-wrapper">
        {/* 1. SCREEN SHARE (NETFLIX TAB / DESKTOP / MOBILE STREAM) */}
        {streamType === 'screen' && (
          <div className="screen-stream-view">
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              className={`main-stream-video mode-${viewMode}`}
            />

            {/* Mobile Autoplay Tap-to-Play Overlay */}
            {needsAutoplayTap && (
              <div className="autoplay-tap-overlay" onClick={handleManualPlayTap}>
                <button className="btn-autoplay-tap">
                  <Play size={20} fill="currentColor" />
                  <span>Tap to Watch Stream & Enable Sound</span>
                </button>
              </div>
            )}

            {/* Top Stream Status Overlay */}
            <div className={`stream-overlay-info ${showControls ? 'visible' : 'hidden'}`}>
              <div className="stream-live-tag">
                <span className="live-pulse"></span>
                <span>
                  {isStreamingLocal 
                    ? 'You are Sharing Live Screen' 
                    : (syncState.streamerName ? `${syncState.streamerName}'s Live Stream` : "Friend's Screen Stream")}
                </span>
                {syncState.hasAudio && (
                  <span className="audio-live-pill" title="Stereo Audio Stream Active">
                    <Volume2 size={12} />
                    <span>HD Audio</span>
                  </span>
                )}
              </div>

              <div className="top-right-controls">
                {/* Diagnostics Quality Badge */}
                <button className="stream-stats-pill-btn" onClick={onOpenStatsModal} title="View Network & WebRTC Diagnostics">
                  <Activity size={13} />
                  <span>{connectionStats.rtt ? `${connectionStats.rtt}ms` : 'P2P'}</span>
                </button>

                {isStreamingLocal && (
                  <button className="stop-stream-pill-btn" onClick={onStopScreenShare}>
                    Stop Sharing
                  </button>
                )}
              </div>
            </div>

            {/* Floating Controls for Screen Stream */}
            <div className={`screen-floating-controls ${showControls ? 'visible' : 'hidden'}`}>
              {/* Fit / Fill / Zoom Toggle */}
              <button 
                className="screen-control-pill" 
                onClick={cycleViewMode}
                title={`View Mode: ${viewMode.toUpperCase()} (Click to toggle Fit / Fill / Zoom)`}
              >
                <Layers size={15} />
                <span className="pill-text-sm">{viewMode === 'contain' ? 'Fit' : viewMode === 'cover' ? 'Fill' : 'Zoom'}</span>
              </button>

              {/* Picture in Picture */}
              {typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && (
                <button 
                  className="screen-control-pill" 
                  onClick={togglePictureInPicture}
                  title="Picture in Picture (PiP)"
                >
                  <Maximize size={15} />
                </button>
              )}

              {/* Audio Mute/Unmute */}
              <button 
                className="screen-control-pill" 
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              {/* Fullscreen */}
              <button 
                className="screen-control-pill fullscreen-pill" 
                onClick={toggleFullscreen}
                title="Fullscreen (Double-click or F)"
              >
                {isFullscreen ? <Minimize size={16} /> : <Maximize2 size={16} />}
                <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. SYNCHRONIZED DIRECT VIDEO PLAYER */}
        {(streamType === 'video' || streamType === 'local') && (
          <div className="html5-video-view">
            <video
              ref={videoRef}
              src={syncState.url}
              className={`main-stream-video mode-${viewMode}`}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onClick={togglePlay}
              playsInline
            />

            {!isPlaying && (
              <div className="center-play-button-overlay" onClick={togglePlay}>
                <div className="play-circle-glow">
                  <Play size={44} fill="currentColor" />
                </div>
              </div>
            )}

            <div className={`video-controls-bar ${showControls ? 'visible' : 'hidden'}`}>
              <div className="progress-bar-container">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="timeline-slider"
                />
                <div
                  className="progress-filled"
                  style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                ></div>
              </div>

              <div className="controls-row">
                <div className="controls-left">
                  <button className="control-btn" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
                  </button>

                  <button className="control-btn" onClick={() => handleSkip(-10)} title="Rewind 10s">
                    <RotateCcw size={17} />
                  </button>

                  <button className="control-btn" onClick={() => handleSkip(10)} title="Forward 10s">
                    <RotateCw size={17} />
                  </button>

                  <div className="volume-control-wrap">
                    <button className="control-btn" onClick={toggleMute}>
                      {isMuted || volume === 0 ? <VolumeX size={19} /> : <Volume2 size={19} />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="volume-slider"
                    />
                  </div>

                  <div className="timecode-display">
                    <span>{formatTime(currentTime)}</span>
                    <span className="time-separator">/</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="controls-right">
                  <span className="video-sync-title">{syncState.title}</span>
                  <button 
                    className="control-btn" 
                    onClick={cycleViewMode} 
                    title={`View Mode: ${viewMode}`}
                  >
                    <Layers size={17} />
                  </button>
                  <button 
                    className="control-btn" 
                    onClick={toggleFullscreen} 
                    title="Fullscreen (Double click or F)"
                  >
                    {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. YOUTUBE SYNC */}
        {streamType === 'youtube' && (
          <div className="youtube-player-view">
            <iframe
              src={getYouTubeEmbedUrl(syncState.url)}
              title="YouTube Watch Party"
              className="youtube-iframe"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
            <div className={`screen-floating-controls ${showControls ? 'visible' : 'hidden'}`}>
              <button 
                className="screen-control-pill fullscreen-pill" 
                onClick={toggleFullscreen}
                title="Fullscreen (F)"
              >
                {isFullscreen ? <Minimize size={16} /> : <Maximize2 size={16} />}
                <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. DUAL NETFLIX SYNC CONTROLLER */}
        {streamType === 'dual_sync' && (
          <div className="dual-sync-stage-view">
            <div className="dual-sync-card">
              <div className="dual-header-badge">
                <Timer size={28} />
                <h2>Dual-Account Netflix Sync</h2>
              </div>
              <p className="dual-subtitle">
                Open Netflix in your own browser tab or second screen. When you're both ready on the same movie, hit countdown to play simultaneously!
              </p>

              <div className="dual-actions-box">
                <button className="btn-countdown-trigger" onClick={onStartDualCountdown}>
                  <Sparkles size={20} />
                  <span>Start 3-2-1 Play Countdown</span>
                </button>
              </div>

              <div className="dual-guide-hints">
                <div className="hint-pill">
                  <span>1. Pause both Netflix players at 0:00</span>
                </div>
                <div className="hint-pill">
                  <span>2. Trigger countdown</span>
                </div>
                <div className="hint-pill">
                  <span>3. Press Spacebar on "PLAY!"</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. IDLE / WELCOME CINEMA STAGE */}
        {streamType === 'idle' && (
          <div className="idle-welcome-stage">
            <div className="idle-hero-content">
              <div className="idle-popcorn-emblem">🍿</div>
              <h1 className="idle-hero-title">Ready for Screen Share & Movies</h1>
              <p className="idle-hero-subtitle">
                Stream your Netflix tab across any network with crystal-clear audio, watch synchronized videos, or broadcast live video seamlessly.
              </p>

              <div className="idle-cta-grid">
                {screenShareSupported ? (
                  <div className="cta-action-card netflix-card" onClick={onStartScreenShare}>
                    <div className="cta-card-icon">
                      <Tv size={26} />
                    </div>
                    <div className="cta-card-text">
                      <h3>Share Screen / Netflix Tab</h3>
                      <p>Stream 1080p 60 FPS tab or window with stereo audio</p>
                    </div>
                    <button className="cta-btn-red">Start Sharing</button>
                  </div>
                ) : (
                  <div className="cta-action-card netflix-card" onClick={onStartCameraMainStream}>
                    <div className="cta-card-icon">
                      <Camera size={26} />
                    </div>
                    <div className="cta-card-text">
                      <h3>Broadcast Live Camera</h3>
                      <p>Stream your mobile camera live to the party</p>
                    </div>
                    <button className="cta-btn-red">Go Live</button>
                  </div>
                )}

                <div className="cta-action-card media-card" onClick={onOpenMediaModal}>
                  <div className="cta-card-icon">
                    <Film size={26} />
                  </div>
                  <div className="cta-card-text">
                    <h3>Synchronized Videos</h3>
                    <p>Play 4K featured movies, YouTube, or direct links</p>
                  </div>
                  <button className="cta-btn-amber">Browse Media</button>
                </div>
              </div>

              <div className="idle-footer-helper">
                <button className="text-helper-btn" onClick={onOpenNetflixGuide}>
                  <HelpCircle size={14} />
                  <span>How does Netflix tab audio & cross-network sharing work?</span>
                </button>
                <button className="text-helper-btn" onClick={onOpenStatsModal}>
                  <Activity size={14} />
                  <span>Network: {connectionStats.networkQuality.toUpperCase()} ({connectionStats.rtt ? `${connectionStats.rtt}ms` : '<20ms'})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* WebRTC Video & Audio PiP */}
      {(localCamStream || remoteCamStream) && (
        <div className="webcam-pip-container">
          {remoteCamStream && (
            <div className="cam-pip-box remote-cam">
              <video ref={remoteCamRef} autoPlay playsInline className="pip-video" />
              <span className="pip-label">{peers[0]?.name || 'Friend'}</span>
            </div>
          )}
          {localCamStream && (
            <div className="cam-pip-box local-cam">
              <video ref={localCamRef} autoPlay playsInline muted className="pip-video" />
              <span className="pip-label">You</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
