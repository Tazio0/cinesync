import { useState, useEffect, useRef } from 'react';
import { usePeerRoom } from './hooks/usePeerRoom';
import { Header } from './components/Header';
import { VideoStage } from './components/VideoStage';
import { ChatSidebar } from './components/ChatSidebar';
import { Lobby } from './components/Lobby';
import { RoomModal } from './components/RoomModal';
import { NetflixGuideModal } from './components/NetflixGuideModal';
import { MediaSelectModal } from './components/MediaSelectModal';
import { ConnectionStatsModal } from './components/ConnectionStatsModal';
import type { SampleMedia } from './types';

export function App() {
  // Read room from URL hash or query params (e.g. #room=cosmic-party-123 or ?room=xyz)
  const getInitialRoomId = (): string => {
    try {
      let raw = '';
      const hash = window.location.hash;
      if (hash.startsWith('#room=')) {
        raw = hash.replace('#room=', '').trim();
      } else {
        const params = new URLSearchParams(window.location.search);
        const qRoom = params.get('room');
        if (qRoom) raw = qRoom.trim();
      }
      return raw.toLowerCase().replace(/^cinesync[_-]/, '').replace(/[^a-z0-9-]/g, '');
    } catch {
      // ignore
    }
    return '';
  };

  const [activeRoomId, setActiveRoomId] = useState<string>(getInitialRoomId());
  const [userName, setUserName] = useState<string>('Movie Lover 🍿');
  const [isInRoom, setIsInRoom] = useState<boolean>(false);
  const [isHostMode, setIsHostMode] = useState<boolean>(true);

  // UI Modals & Display Modes
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [ambientGlow, setAmbientGlow] = useState<boolean>(true);

  const [isInviteOpen, setIsInviteOpen] = useState<boolean>(false);
  const [isNetflixGuideOpen, setIsNetflixGuideOpen] = useState<boolean>(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState<boolean>(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState<boolean>(false);

  // P2P Room Hook
  const {
    roomId,
    isHost,
    currentUser,
    peers,
    messages,
    reactions,
    typingUsers,
    syncState,
    countdown,
    connectionStats,
    localScreenStream,
    remoteScreenStream,
    localCamStream,
    remoteCamStream,
    initRoom,
    reconnect,
    sendMessage,
    sendReaction,
    sendTyping,
    sendSyncAction,
    startDualCountdown,
    startScreenShare,
    stopScreenShare,
    stopCurrentMedia,
    startLocalFileStream,
    startCameraMainStream,
    toggleCamera,
    kickPeer,
  } = usePeerRoom({
    userName,
    initialRoomId: activeRoomId,
    isHostMode,
  });

  // Track unread messages when sidebar is collapsed
  const prevMessagesLength = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const latest = messages[messages.length - 1];
      if (isChatCollapsed && latest.senderId !== currentUser.id) {
        setUnreadCount((c) => c + 1);
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, isChatCollapsed, currentUser.id]);

  // Handle joining room from lobby
  const handleJoinFromLobby = (newRoomId: string, name: string, asHost: boolean) => {
    setUserName(name);
    setActiveRoomId(newRoomId);
    setIsHostMode(asHost);
    setIsInRoom(true);

    // Update URL hash smoothly for sharing
    window.location.hash = `#room=${newRoomId}`;

    initRoom(newRoomId, asHost);
  };

  // Media selection handlers
  const handleSelectScreenShare = async () => {
    await startScreenShare();
  };

  const handleSelectCameraStream = async () => {
    await startCameraMainStream('environment');
  };

  const handleSelectVideoUrl = (url: string, title: string) => {
    sendSyncAction('change_source', {
      type: 'video',
      url,
      title,
      isPlaying: true,
      currentTime: 0,
    });
  };

  const handleSelectYouTube = (url: string) => {
    sendSyncAction('change_source', {
      type: 'youtube',
      url,
      title: 'YouTube Watch Party',
      isPlaying: true,
      currentTime: 0,
    });
  };

  const handleSelectLocalFile = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    
    // Create an audio/video stream from local file so remote peers can watch without downloading
    const video = document.createElement('video');
    video.src = objectUrl;
    video.playsInline = true;
    video.muted = true;
    
    video.onloadedmetadata = () => {
      try {
        const stream = (video as any).captureStream ? (video as any).captureStream() : (video as any).mozCaptureStream ? (video as any).mozCaptureStream() : null;
        if (stream) {
          video.play().then(() => {
            startLocalFileStream(stream, file.name);
          }).catch(() => {
            sendSyncAction('change_source', {
              type: 'local',
              url: objectUrl,
              title: file.name,
              isPlaying: true,
              currentTime: 0,
            });
          });
          return;
        }
      } catch (e) {
        console.warn('captureStream not available:', e);
      }

      sendSyncAction('change_source', {
        type: 'local',
        url: objectUrl,
        title: file.name,
        isPlaying: true,
        currentTime: 0,
      });
    };
  };

  const handleSelectSampleMovie = (movie: SampleMedia) => {
    sendSyncAction('change_source', {
      type: movie.type,
      url: movie.url,
      title: movie.title,
      isPlaying: true,
      currentTime: 0,
    });
  };

  const handleSelectDualSync = () => {
    sendSyncAction('change_source', {
      type: 'dual_sync',
      url: '',
      title: 'Dual Netflix Sync',
      isPlaying: false,
      currentTime: 0,
    });
  };

  // Keyboard shortcut listener (e.g. 'T' for theater mode, 'C' for chat toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 't' || e.key === 'T') {
        setIsTheaterMode((prev) => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        setIsChatCollapsed((prev) => !prev);
      } else if (e.key === 'g' || e.key === 'G') {
        setAmbientGlow((prev) => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // If not yet in room, show the Lobby
  if (!isInRoom) {
    return (
      <Lobby
        initialRoomId={activeRoomId}
        onJoinRoom={handleJoinFromLobby}
      />
    );
  }

  return (
    <div
      className={`cinesync-app-container ${
        isTheaterMode ? 'theater-mode' : ''
      } ${isChatCollapsed ? 'chat-collapsed' : ''}`}
    >
      {/* Top Navigation Bar */}
      <Header
        roomId={roomId || activeRoomId}
        isHost={isHost}
        peerCount={peers.length}
        streamType={syncState.type}
        streamTitle={syncState.title}
        connectionStats={connectionStats}
        isTheaterMode={isTheaterMode}
        onToggleTheater={() => setIsTheaterMode((prev) => !prev)}
        onOpenInvite={() => setIsInviteOpen(true)}
        onOpenMediaModal={() => setIsMediaModalOpen(true)}
        onOpenNetflixGuide={() => setIsNetflixGuideOpen(true)}
        onOpenStatsModal={() => setIsStatsModalOpen(true)}
        ambientGlow={ambientGlow}
        onToggleGlow={() => setAmbientGlow((prev) => !prev)}
        peers={peers}
        currentUser={currentUser}
        onStopMedia={stopCurrentMedia}
        onKickPeer={kickPeer}
      />

      {/* Main Layout Area */}
      <main className="main-content-layout">
        {/* Cinema Video Center Stage */}
        <section className="stage-section">
          <VideoStage
            streamType={syncState.type}
            syncState={syncState}
            connectionStats={connectionStats}
            localScreenStream={localScreenStream}
            remoteScreenStream={remoteScreenStream}
            localCamStream={localCamStream}
            remoteCamStream={remoteCamStream}
            countdown={countdown}
            reactions={reactions}
            ambientGlow={ambientGlow}
            isHost={isHost}
            currentUser={currentUser}
            peers={peers}
            onStartScreenShare={handleSelectScreenShare}
            onStopScreenShare={stopScreenShare}
            onStopMedia={stopCurrentMedia}
            onStartCameraMainStream={handleSelectCameraStream}
            onOpenMediaModal={() => setIsMediaModalOpen(true)}
            onOpenNetflixGuide={() => setIsNetflixGuideOpen(true)}
            onOpenStatsModal={() => setIsStatsModalOpen(true)}
            onStartDualCountdown={startDualCountdown}
            onSyncAction={sendSyncAction}
          />
        </section>

        {/* Real-time Live Chat & Reactions Sidebar */}
        <ChatSidebar
          messages={messages}
          currentUser={currentUser}
          peers={peers}
          typingUsers={typingUsers}
          isCollapsed={isChatCollapsed}
          onToggleCollapse={() => setIsChatCollapsed((prev) => !prev)}
          onSendMessage={sendMessage}
          onSendReaction={sendReaction}
          onSendTyping={sendTyping}
          unreadCount={unreadCount}
          onResetUnread={() => setUnreadCount(0)}
          onToggleCamera={toggleCamera}
        />
      </main>

      {/* Modals */}
      <RoomModal
        isOpen={isInviteOpen}
        roomId={roomId || activeRoomId}
        onClose={() => setIsInviteOpen(false)}
      />

      <NetflixGuideModal
        isOpen={isNetflixGuideOpen}
        onClose={() => setIsNetflixGuideOpen(false)}
        onStartShare={handleSelectScreenShare}
      />

      <MediaSelectModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelectScreenShare={handleSelectScreenShare}
        onSelectCameraStream={handleSelectCameraStream}
        onSelectVideoUrl={handleSelectVideoUrl}
        onSelectYouTube={handleSelectYouTube}
        onSelectLocalFile={handleSelectLocalFile}
        onSelectDualSync={handleSelectDualSync}
        onSelectSampleMovie={handleSelectSampleMovie}
      />

      <ConnectionStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        stats={connectionStats}
        onReconnect={reconnect}
      />
    </div>
  );
}

export default App;
