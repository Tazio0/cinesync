import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize, RotateCcw, RotateCw, Sparkles, Square } from 'lucide-react';
import type { SyncMediaState } from '../types';

interface YouTubeSyncPlayerProps {
  url: string;
  syncState: SyncMediaState;
  isHost: boolean;
  onSyncAction: (action: 'play' | 'pause' | 'seek' | 'change_source', state: Partial<SyncMediaState>) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onStopMedia?: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const extractYouTubeVideoId = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  
  if (trimmed.includes('watch?v=') || trimmed.includes('watch?')) {
    const match = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return match[1];
  }
  
  if (trimmed.includes('youtu.be/')) {
    const match = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return match[1];
  }
  
  if (trimmed.includes('/embed/')) {
    const match = trimmed.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return match[1];
  }
  
  if (trimmed.includes('/shorts/')) {
    const match = trimmed.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return match[1];
  }

  if (trimmed.includes('/live/')) {
    const match = trimmed.match(/\/live\/([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return match[1];
  }

  return trimmed;
};

export const YouTubeSyncPlayer: React.FC<YouTubeSyncPlayerProps> = ({
  url,
  syncState,
  onSyncAction,
  isFullscreen,
  onToggleFullscreen,
  onStopMedia,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerWrapperRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const playerIdRef = useRef<string>(`yt-player-${Math.random().toString(36).substring(2, 9)}`);
  
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(syncState.isPlaying);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [videoTitle, setVideoTitle] = useState<string>('YouTube Video');

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInternalUpdateRef = useRef<boolean>(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentVideoIdRef = useRef<string>('');

  const videoId = extractYouTubeVideoId(url);

  const initPlayer = useCallback(() => {
    if (!videoId) return;

    // Ensure target DOM container exists
    let playerElement = document.getElementById(playerIdRef.current);
    if (!playerElement && playerWrapperRef.current) {
      playerElement = document.createElement('div');
      playerElement.id = playerIdRef.current;
      playerElement.className = 'youtube-iframe-target';
      playerWrapperRef.current.appendChild(playerElement);
    }

    if (!playerElement || !window.YT || !window.YT.Player) return;

    currentVideoIdRef.current = videoId;

    playerRef.current = new window.YT.Player(playerIdRef.current, {
      videoId,
      playerVars: {
        autoplay: syncState.isPlaying ? 1 : 0,
        controls: 0,
        disablekb: 0,
        enablejsapi: 1,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (event: any) => {
          setIsPlayerReady(true);
          const dur = event.target.getDuration();
          setDuration(dur || 0);
          
          try {
            const data = event.target.getVideoData();
            if (data && data.title) {
              setVideoTitle(data.title);
            }
          } catch {
            // ignore
          }

          if (syncState.currentTime > 0) {
            event.target.seekTo(syncState.currentTime, true);
          }

          if (syncState.isPlaying) {
            event.target.playVideo();
            setIsPlaying(true);
          } else {
            event.target.pauseVideo();
            setIsPlaying(false);
          }
        },
        onStateChange: (event: any) => {
          if (isInternalUpdateRef.current) return;

          const state = event.data;
          if (state === 1) { // PLAYING
            setIsPlaying(true);
            const curr = event.target.getCurrentTime();
            setCurrentTime(curr);
            onSyncAction('play', {
              isPlaying: true,
              currentTime: curr,
              duration: event.target.getDuration() || 0,
            });
          } else if (state === 2) { // PAUSED
            setIsPlaying(false);
            const curr = event.target.getCurrentTime();
            setCurrentTime(curr);
            onSyncAction('pause', {
              isPlaying: false,
              currentTime: curr,
            });
          } else if (state === 0) { // ENDED
            setIsPlaying(false);
            onSyncAction('pause', {
              isPlaying: false,
              currentTime: 0,
            });
          }
        },
      },
    });
  }, [videoId, onSyncAction, syncState.currentTime, syncState.isPlaying]);

  // Load YouTube IFrame API script
  useEffect(() => {
    if (!videoId) return;

    if (playerRef.current && isPlayerReady && currentVideoIdRef.current !== videoId) {
      currentVideoIdRef.current = videoId;
      try {
        if (typeof playerRef.current.loadVideoById === 'function') {
          playerRef.current.loadVideoById({
            videoId,
            startSeconds: syncState.currentTime || 0,
          });
          return;
        }
      } catch {
        // fallback to re-init
      }
    }

    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevReady) prevReady();
      initPlayer();
    };

    if (!document.getElementById('youtube-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, [videoId, isPlayerReady, initPlayer, syncState.currentTime]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Poll current time & duration regularly
  useEffect(() => {
    pollIntervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function' && isPlayerReady) {
        try {
          const curr = playerRef.current.getCurrentTime();
          const dur = playerRef.current.getDuration();
          if (!isNaN(curr)) setCurrentTime(curr);
          if (!isNaN(dur) && dur > 0) setDuration(dur);
        } catch {
          // ignore
        }
      }
    }, 500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isPlayerReady]);

  // Synchronize with remote peers
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;

    isInternalUpdateRef.current = true;
    try {
      if (typeof playerRef.current.getPlayerState === 'function') {
        const playerState = playerRef.current.getPlayerState();
        const currentSeconds = playerRef.current.getCurrentTime() || 0;

        // Sync Play/Pause
        if (syncState.isPlaying && playerState !== 1) {
          playerRef.current.playVideo();
          setIsPlaying(true);
        } else if (!syncState.isPlaying && playerState === 1) {
          playerRef.current.pauseVideo();
          setIsPlaying(false);
        }

        // Sync Time Seek Drift (> 1.5s difference)
        if (
          syncState.currentTime !== undefined &&
          Math.abs(currentSeconds - syncState.currentTime) > 1.5
        ) {
          playerRef.current.seekTo(syncState.currentTime, true);
          setCurrentTime(syncState.currentTime);
        }
      }
    } catch (err) {
      console.warn('YouTube sync error:', err);
    } finally {
      setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 300);
    }
  }, [syncState, isPlayerReady]);

  // Controls auto-hide
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  const togglePlay = () => {
    if (!playerRef.current || !isPlayerReady) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
      onSyncAction('pause', { isPlaying: false, currentTime: playerRef.current.getCurrentTime() || 0 });
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
      onSyncAction('play', { isPlaying: true, currentTime: playerRef.current.getCurrentTime() || 0 });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (playerRef.current && isPlayerReady) {
      playerRef.current.seekTo(newTime, true);
      setCurrentTime(newTime);
      onSyncAction('seek', { currentTime: newTime, isPlaying });
    }
  };

  const handleSkip = (seconds: number) => {
    if (playerRef.current && isPlayerReady) {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      playerRef.current.seekTo(newTime, true);
      setCurrentTime(newTime);
      onSyncAction('seek', { currentTime: newTime, isPlaying });
    }
  };

  const toggleMute = () => {
    if (!playerRef.current || !isPlayerReady) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    if (playerRef.current && isPlayerReady) {
      playerRef.current.setVolume(val);
      if (val === 0) {
        playerRef.current.mute();
        setIsMuted(true);
      } else if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      ref={containerRef}
      className="youtube-player-view"
      onMouseMove={handleMouseMove}
    >
      {/* YouTube Embedded Player */}
      <div ref={playerWrapperRef} className="youtube-embed-wrapper">
        <div id={playerIdRef.current} className="youtube-iframe-target" />
      </div>

      {/* Sync Badge */}
      <div className="youtube-sync-header-pill">
        <Sparkles size={13} />
        <span>YouTube Real-Time Sync Active</span>
      </div>

      {/* Big Center Play Overlay when Paused */}
      {!isPlaying && (
        <div className="center-play-button-overlay" onClick={togglePlay}>
          <div className="play-circle-glow">
            <Play size={44} fill="currentColor" />
          </div>
        </div>
      )}

      {/* Synchronized Custom Controls Bar */}
      <div className={`video-controls-bar ${showControls ? 'visible' : 'hidden'}`}>
        <div className="progress-bar-container">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="timeline-slider"
          />
          <div
            className="progress-filled"
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />
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
              <button className="control-btn" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted || volume === 0 ? <VolumeX size={19} /> : <Volume2 size={19} />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
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
            <span className="video-sync-title">{videoTitle}</span>
            {onStopMedia && (
              <button
                className="control-btn stop-stream-btn-compact"
                onClick={onStopMedia}
                title="Stop Video & Return to Stage"
              >
                <Square size={14} fill="currentColor" />
                <span className="btn-label">Stop</span>
              </button>
            )}
            <button
              className="control-btn"
              onClick={onToggleFullscreen}
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
