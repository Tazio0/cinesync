import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { type DataConnection, type MediaConnection } from 'peerjs';
import type { 
  User, 
  ChatMessage, 
  ReactionItem, 
  SyncMediaState, 
  PeerSignalData, 
  ConnectionStats,
  TurnServerConfig
} from '../types';
import { soundFX } from '../utils/soundEffects';
import { getDeviceType, isScreenShareSupported } from '../utils/deviceInfo';

interface UsePeerRoomProps {
  userName: string;
  initialRoomId?: string;
  isHostMode?: boolean;
}

const AVATAR_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', 
  '#06B6D4', '#6366F1', '#EC4899', '#8B5CF6'
];

const MAX_ROOM_SLOTS = 8;

// Comprehensive STUN & TURN servers for guaranteed cross-network traversal
// (Home Wi-Fi, Mobile 4G/5G/LTE, Hotspots, Strict NATs, Campus/Office firewalls)
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  // Fast Public STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'stun:stun.nextcloud.com:443' },
  { urls: 'stun:turn.matrix.org:3478' },
  
  // Public High-Performance TURN Relays (OpenRelay / Metered)
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:80?transport=tcp',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: [
      'turns:openrelay.metered.ca:443?transport=tcp',
      'turns:openrelay.metered.ca:5349',
      'turns:openrelay.metered.ca:5349?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export function usePeerRoom({ userName, initialRoomId, isHostMode = true }: UsePeerRoomProps) {
  const [roomId, setRoomId] = useState<string>(initialRoomId || '');
  const [isHost, setIsHost] = useState<boolean>(isHostMode);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [peerId, setPeerId] = useState<string>('');
  const [hostPeerId, setHostPeerId] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to start');

  // Device & Profile
  const [currentUser, setCurrentUser] = useState<User>({
    id: '',
    name: userName,
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    isHost: isHostMode,
    isAudioOn: false,
    isVideoOn: false,
    isScreenSharing: false,
    deviceType: getDeviceType(),
    networkType: 'unknown',
    ping: 0,
  });
  const [peers, setPeers] = useState<User[]>([]);

  // Messages & Reactions
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<ReactionItem[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Media Streams
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [remoteScreenStream, setRemoteScreenStream] = useState<MediaStream | null>(null);
  const [localCamStream, setLocalCamStream] = useState<MediaStream | null>(null);
  const [remoteCamStream, setRemoteCamStream] = useState<MediaStream | null>(null);

  // Sync Media State
  const [syncState, setSyncState] = useState<SyncMediaState>({
    type: 'idle',
    url: '',
    title: '',
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    lastUpdatedBy: '',
    streamerId: '',
    streamerName: '',
    hasAudio: false,
    timestamp: Date.now(),
  });

  // Dual Sync Countdown
  const [countdown, setCountdown] = useState<{ active: boolean; count: number; initiator: string }>({
    active: false,
    count: 0,
    initiator: '',
  });

  // Diagnostics & WebRTC stats
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    iceState: 'new',
    connectionState: 'new',
    candidateType: 'unknown',
    protocol: 'unknown',
    rtt: 0,
    fps: 0,
    resolution: '0x0',
    bytesReceived: 0,
    bytesSent: 0,
    isRelayed: false,
    networkQuality: 'good',
  });

  // Internal references
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const knownPeersRef = useRef<Set<string>>(new Set());
  const screenCallsRef = useRef<Map<string, MediaConnection>>(new Map());
  const camCallsRef = useRef<Map<string, MediaConnection>>(new Map());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectRetryRef = useRef<Map<string, number>>(new Map());
  const relayModeRef = useRef<boolean>(false);
  
  const currentSlotRef = useRef<number>(1);
  const cleanRoomIdRef = useRef<string>('');
  const isHostRef = useRef<boolean>(isHost);
  const currentUserRef = useRef<User>(currentUser);
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const localCamStreamRef = useRef<MediaStream | null>(null);
  const syncStateRef = useRef<SyncMediaState>(syncState);

  useEffect(() => {
    isHostRef.current = isHost;
    currentUserRef.current = currentUser;
    localScreenStreamRef.current = localScreenStream;
    localCamStreamRef.current = localCamStream;
    syncStateRef.current = syncState;
  }, [isHost, currentUser, localScreenStream, localCamStream, syncState]);

  // Load custom TURN servers from localStorage or Vite env if configured
  const getActiveIceServers = useCallback((): RTCIceServer[] => {
    try {
      // 1) Vercel / Vite environment variable (VITE_ICE_SERVERS) can provide JSON array or single object
      const envVar = (import.meta as any).env?.VITE_ICE_SERVERS;
      if (envVar) {
        try {
          const parsed = JSON.parse(envVar);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed as RTCIceServer[];
          if (typeof parsed === 'object' && parsed !== null && parsed.urls) return [parsed as RTCIceServer, ...DEFAULT_ICE_SERVERS];
        } catch (e) {
          // If not JSON, allow comma-separated URLs string
          const urls = String(envVar).split(',').map((u) => u.trim()).filter(Boolean);
          if (urls.length) return [{ urls }, ...DEFAULT_ICE_SERVERS] as RTCIceServer[];
        }
      }

      // 2) localStorage override (user-pasted TURN JSON in UI - new format supports multiple entries)
      const turnsListStr = localStorage.getItem('cinesync_turns');
      if (turnsListStr) {
        try {
          const turnsList: TurnServerConfig[] = JSON.parse(turnsListStr);
          if (Array.isArray(turnsList) && turnsList.length > 0) {
            const parsed = turnsList.map((t) => ({
              urls: t.urls.split(',').map((u) => u.trim()),
              ...(t.username ? { username: t.username } : {}),
              ...(t.credential ? { credential: t.credential } : {}),
            } as RTCIceServer));
            return [...parsed, ...DEFAULT_ICE_SERVERS];
          }
        } catch (e) {
          // fallthrough to legacy key
        }
      }

      // legacy single-entry support
      const customTurnStr = localStorage.getItem('cinesync_custom_turn');
      if (customTurnStr) {
        const customTurn: TurnServerConfig = JSON.parse(customTurnStr);
        if (customTurn.urls) {
          const customEntry: RTCIceServer = {
            urls: customTurn.urls.split(',').map((u) => u.trim()),
            ...(customTurn.username ? { username: customTurn.username } : {}),
            ...(customTurn.credential ? { credential: customTurn.credential } : {}),
          };
          return [customEntry, ...DEFAULT_ICE_SERVERS];
        }
      }
    } catch (err) {
      console.warn('Error parsing ICE servers from env/localStorage:', err);
    }
    return DEFAULT_ICE_SERVERS;
  }, []);

  // Optimize WebRTC sender bitrate & framerate for high quality video streams
  const optimizeMediaSender = (pc: RTCPeerConnection) => {
    try {
      const senders = pc.getSenders ? pc.getSenders() : [];
      senders.forEach((sender) => {
        if (sender.track?.kind === 'video') {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = 4_500_000; // 4.5 Mbps
          params.degradationPreference = 'maintain-framerate';
          sender.setParameters(params).catch(() => {});
        }
      });
    } catch (e) {
      console.warn('Could not optimize sender bitrate:', e);
    }
  };

  // Broadcast data payload to all open connections
  const broadcast = useCallback((data: PeerSignalData) => {
    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(data);
        } catch (err) {
          console.warn('Error broadcasting to peer:', conn.peer, err);
        }
      }
    });
  }, []);

  // Call peer with local active stream (screen or cam)
  const callPeerWithActiveStreams = useCallback((targetPeerId: string) => {
    if (!peerRef.current) return;

    // Call with screen stream if active
    if (localScreenStreamRef.current) {
      console.log(`[P2P] Calling ${targetPeerId} with active screen stream`);
      const screenCall = peerRef.current.call(targetPeerId, localScreenStreamRef.current, {
        metadata: { type: 'screen', senderName: currentUserRef.current.name },
      });
      if (screenCall) {
        screenCall.on('iceStateChanged', (state) => {
          console.log(`[ICE] screen call to ${targetPeerId}: ${state}`);
          if (state === 'failed') screenCall.peerConnection?.restartIce?.();
        });
        if (screenCall.peerConnection) {
          optimizeMediaSender(screenCall.peerConnection);
        }
        screenCallsRef.current.set(targetPeerId, screenCall);
      }
    }

    // Call with webcam stream if active
    if (localCamStreamRef.current) {
      console.log(`[P2P] Calling ${targetPeerId} with active camera stream`);
      const camCall = peerRef.current.call(targetPeerId, localCamStreamRef.current, {
        metadata: { type: 'camera', senderName: currentUserRef.current.name },
      });
      if (camCall) {
        camCall.on('iceStateChanged', (state) => {
          console.log(`[ICE] cam call to ${targetPeerId}: ${state}`);
          if (state === 'failed') camCall.peerConnection?.restartIce?.();
        });
        camCallsRef.current.set(targetPeerId, camCall);
      }
    }
  }, []);

  // Trigger floating reaction
  const sendReaction = useCallback((emoji: string) => {
    const newReaction: ReactionItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      emoji,
      senderName: currentUserRef.current.name,
      x: 15 + Math.random() * 70,
      scale: 0.9 + Math.random() * 0.4,
      rotation: (Math.random() - 0.5) * 30,
    };

    setReactions((prev) => [...prev.slice(-25), newReaction]);
    soundFX.playReactionSound();
    broadcast({ type: 'reaction', emoji, senderName: currentUserRef.current.name });
  }, [broadcast]);

  // Send chat message
  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentUserRef.current.id,
      senderName: currentUserRef.current.name,
      avatarColor: currentUserRef.current.avatarColor,
      text: text.trim(),
      timestamp: Date.now(),
      type: 'text',
      isHost: currentUserRef.current.isHost,
    };

    setMessages((prev) => [...prev, msg]);
    soundFX.playMessageSound();
    broadcast({ type: 'chat', message: msg });
  }, [broadcast]);

  // Send typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    broadcast({
      type: 'typing',
      isTyping,
      userId: currentUserRef.current.id,
      userName: currentUserRef.current.name,
    });
  }, [broadcast]);

  // Sync Action Handler (Play, Pause, Seek, Change Source)
  const sendSyncAction = useCallback((action: 'play' | 'pause' | 'seek' | 'change_source', updatedState: Partial<SyncMediaState>) => {
    const newState: SyncMediaState = {
      ...syncStateRef.current,
      ...updatedState,
      lastUpdatedBy: currentUserRef.current.name,
      timestamp: Date.now(),
    };

    setSyncState(newState);
    soundFX.playSyncClick();
    broadcast({
      type: 'sync_action',
      action,
      state: updatedState,
      senderName: currentUserRef.current.name,
    });
  }, [broadcast]);

  // Dual Sync Countdown Trigger
  const startDualCountdown = useCallback(() => {
    let current = 3;
    setCountdown({ active: true, count: current, initiator: currentUserRef.current.name });
    soundFX.playCountdownBeep(false);
    broadcast({ type: 'dual_countdown', active: true, count: current, initiator: currentUserRef.current.name });

    const interval = setInterval(() => {
      current -= 1;
      if (current >= 0) {
        setCountdown({ active: true, count: current, initiator: currentUserRef.current.name });
        soundFX.playCountdownBeep(current === 0);
        broadcast({ type: 'dual_countdown', active: true, count: current, initiator: currentUserRef.current.name });
      } else {
        clearInterval(interval);
        setCountdown({ active: false, count: 0, initiator: '' });
        broadcast({ type: 'dual_countdown', active: false, count: 0, initiator: '' });
      }
    }, 1000);
  }, [broadcast]);

  // Handle incoming data channel messages
  const handleDataReceived = useCallback((data: PeerSignalData, conn: DataConnection) => {
    switch (data.type) {
      case 'ping':
        try {
          conn.send({ type: 'pong', originTimestamp: data.timestamp });
        } catch {
          // ignore
        }
        break;

      case 'pong': {
        const rtt = Math.max(1, Date.now() - data.originTimestamp);
        setPeers((prev) =>
          prev.map((p) => (p.id === conn.peer ? { ...p, ping: rtt } : p))
        );
        break;
      }

      case 'chat':
        setMessages((prev) => [...prev, data.message]);
        soundFX.playMessageSound();
        break;

      case 'reaction': {
        const newReaction: ReactionItem = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          emoji: data.emoji,
          senderName: data.senderName,
          x: 15 + Math.random() * 70,
          scale: 0.9 + Math.random() * 0.4,
          rotation: (Math.random() - 0.5) * 30,
        };
        setReactions((prev) => [...prev.slice(-25), newReaction]);
        soundFX.playReactionSound();
        break;
      }

      case 'typing':
        setTypingUsers((prev) => {
          if (data.isTyping && !prev.includes(data.userName)) {
            return [...prev, data.userName];
          }
          if (!data.isTyping) {
            return prev.filter((name) => name !== data.userName);
          }
          return prev;
        });
        break;

      case 'user_joined': {
        const incomingUser = data.user;
        const isNewPeer = !knownPeersRef.current.has(incomingUser.id);
        knownPeersRef.current.add(incomingUser.id);

        setPeers((prev) => {
          const index = prev.findIndex((p) => p.id === incomingUser.id);
          if (index >= 0) {
            const copy = [...prev];
            copy[index] = { ...copy[index], ...incomingUser };
            return copy;
          }
          return [...prev, incomingUser];
        });

        setIsConnected(true);
        setConnectionStatus('connected');
        setStatusMessage('Connected with friend');

        if (isNewPeer) {
          soundFX.playJoinSound();
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-join-${incomingUser.id}`,
              senderId: 'system',
              senderName: 'System',
              avatarColor: '#10B981',
              text: `${incomingUser.name} joined the watch party! 🍿`,
              timestamp: Date.now(),
              type: 'system',
            },
          ]);
        }

        // Only reply if this wasn't an acknowledge response to avoid ping-pong loops
        if (!data.isResponse) {
          try {
            conn.send({
              type: 'user_joined',
              user: currentUserRef.current,
              isResponse: true,
            });

            conn.send({
              type: 'sync_response',
              fullState: syncStateRef.current,
            });
          } catch (err) {
            console.warn('Error replying with user_joined handshake:', err);
          }

          setTimeout(() => {
            callPeerWithActiveStreams(conn.peer);
          }, 350);
        }
        break;
      }

      case 'user_update':
        setPeers((prev) =>
          prev.map((p) => (p.id === data.user.id ? { ...p, ...data.user } : p))
        );
        break;

      case 'request_stream':
        callPeerWithActiveStreams(conn.peer);
        break;

      case 'sync_action':
        setSyncState((prev) => ({
          ...prev,
          ...data.state,
          lastUpdatedBy: data.senderName,
          timestamp: Date.now(),
        }));
        soundFX.playSyncClick();
        break;

      case 'sync_request':
        try {
          conn.send({
            type: 'sync_response',
            fullState: syncStateRef.current,
          });
        } catch {
          // ignore
        }
        if (localScreenStreamRef.current || localCamStreamRef.current) {
          setTimeout(() => {
            callPeerWithActiveStreams(conn.peer);
          }, 350);
        }
        break;

      case 'sync_response':
        setSyncState(data.fullState);
        break;

      case 'dual_countdown':
        setCountdown({
          active: data.active,
          count: data.count,
          initiator: data.initiator,
        });
        if (data.active) {
          soundFX.playCountdownBeep(data.count === 0);
        }
        break;

      case 'stream_status':
        setSyncState((prev) => ({
          ...prev,
          type: data.streamType,
          title: data.title,
          streamerId: data.streamerId,
          streamerName: data.streamerName,
          hasAudio: data.hasAudio,
          isPlaying: data.isLive,
        }));
        if (data.isLive && data.streamerId !== currentUserRef.current.id) {
          try {
            conn.send({ type: 'request_stream', requestedBy: currentUserRef.current.id });
          } catch {
            // ignore
          }
        }
        break;

      case 'stop_media':
        if (localScreenStreamRef.current) {
          localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
          setLocalScreenStream(null);
          localScreenStreamRef.current = null;
        }
        screenCallsRef.current.forEach((c) => c.close());
        screenCallsRef.current.clear();
        setCurrentUser((prev) => ({ ...prev, isScreenSharing: false }));

        setSyncState({
          type: 'idle',
          url: '',
          title: '',
          isPlaying: false,
          currentTime: 0,
          duration: 0,
          playbackRate: 1,
          lastUpdatedBy: data.stoppedBy || '',
          streamerId: '',
          streamerName: '',
          hasAudio: false,
          timestamp: Date.now(),
        });

        if (data.stoppedBy) {
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-stop`,
              senderId: 'system',
              senderName: 'System',
              avatarColor: '#F59E0B',
              text: `${data.stoppedBy} stopped the stream.`,
              timestamp: Date.now(),
              type: 'system',
            },
          ]);
        }
        break;

      case 'kick':
        if (data.targetId === currentUserRef.current.id) {
          if (localScreenStreamRef.current) {
            localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
          }
          if (localCamStreamRef.current) {
            localCamStreamRef.current.getTracks().forEach((t) => t.stop());
          }
          if (peerRef.current) {
            peerRef.current.destroy();
          }
          setIsConnected(false);
          setConnectionStatus('error');
          setStatusMessage('You were removed from the watch party by the host.');
        }
        break;
    }
  }, [callPeerWithActiveStreams]);

  // Query WebRTC connection statistics (bitrate, fps, rtt, relay vs direct)
  const updateWebRTCStats = useCallback(() => {
    connectionsRef.current.forEach((conn) => {
      const pc = conn.peerConnection;
      if (!pc) return;

      pc.getStats().then((report) => {
        let isRelay = false;
        let candidateType = 'unknown';
        let protocol = 'unknown';
        let currentRtt = 0;
        let fps = 0;
        let resolution = '0x0';
        let bytesRecv = 0;
        let bytesSent = 0;

        report.forEach((stat) => {
          if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
            if (stat.currentRoundTripTime) {
              currentRtt = Math.round(stat.currentRoundTripTime * 1000);
            }
          }
          if (stat.type === 'local-candidate') {
            candidateType = stat.candidateType || candidateType;
            protocol = stat.protocol || protocol;
            if (stat.candidateType === 'relay') {
              isRelay = true;
            }
          }
          if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
            fps = stat.framesPerSecond || fps;
            if (stat.frameWidth && stat.frameHeight) {
              resolution = `${stat.frameWidth}x${stat.frameHeight}`;
            }
            bytesRecv = stat.bytesReceived || bytesRecv;
          }
          if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
            fps = stat.framesPerSecond || fps;
            if (stat.frameWidth && stat.frameHeight) {
              resolution = `${stat.frameWidth}x${stat.frameHeight}`;
            }
            bytesSent = stat.bytesSent || bytesSent;
          }
        });

        setConnectionStats((prev) => ({
          ...prev,
          iceState: pc.iceConnectionState,
          connectionState: pc.connectionState,
          candidateType,
          protocol,
          rtt: currentRtt || prev.rtt,
          fps: fps || prev.fps,
          resolution: resolution !== '0x0' ? resolution : prev.resolution,
          bytesReceived: bytesRecv || prev.bytesReceived,
          bytesSent: bytesSent || prev.bytesSent,
          isRelayed: isRelay,
          networkQuality:
            currentRtt > 250
              ? 'poor'
              : currentRtt > 120
              ? 'fair'
              : currentRtt > 50
              ? 'good'
              : 'excellent',
        }));
      }).catch(() => {});
    });
  }, []);

  // Setup PeerJS Data Connection
  const setupDataConnection = useCallback((conn: DataConnection) => {
    connectionsRef.current.set(conn.peer, conn);

    const handleOpen = () => {
      console.log(`[P2P] Data connection opened with: ${conn.peer}`);
      setIsConnected(true);
      setConnectionStatus('connected');
      setStatusMessage('Connected with friend');

      // Send initial join payload
      try {
        conn.send({
          type: 'user_joined',
          user: currentUserRef.current,
          isResponse: false,
        });

        // Request sync state
        conn.send({
          type: 'sync_request',
          requestedBy: currentUserRef.current.id,
        });
      } catch (err) {
        console.warn('Error sending initial payload on open:', err);
      }

      // If we are sharing screen, call this peer
      setTimeout(() => {
        callPeerWithActiveStreams(conn.peer);
      }, 400);
    };

    if (conn.open) {
      handleOpen();
    } else {
      conn.on('open', handleOpen);
    }

    conn.on('data', (data) => {
      handleDataReceived(data as PeerSignalData, conn);
    });

    conn.on('close', () => {
      console.log(`[P2P] Connection closed with ${conn.peer}`);
      connectionsRef.current.delete(conn.peer);
      knownPeersRef.current.delete(conn.peer);
      screenCallsRef.current.delete(conn.peer);
      camCallsRef.current.delete(conn.peer);
      setPeers((prev) => prev.filter((p) => p.id !== conn.peer));
      if (connectionsRef.current.size === 0) {
        setIsConnected(false);
        setStatusMessage('Waiting for friend to connect...');
      }
    });

    conn.on('error', (err) => {
      console.warn('Data connection error:', err);
    });

    conn.on('iceStateChanged', (state) => {
      console.log(`[ICE] Connection with ${conn.peer}: ${state}`);
      if (state === 'failed' || state === 'disconnected') {
        conn.peerConnection?.restartIce?.();
      } else if (state === 'connected' || state === 'completed') {
        setStatusMessage('Connected with friend');
      }
    });
  }, [callPeerWithActiveStreams, handleDataReceived]);

  // Connect to a specific slot ID in the room
  const connectToSlot = useCallback((slotId: string) => {
    if (!peerRef.current || peerRef.current.destroyed || peerRef.current.id === slotId) return;
    if (connectionsRef.current.has(slotId)) {
      const existing = connectionsRef.current.get(slotId);
      if (existing && existing.open) return;
    }

    console.log(`[Mesh] Attempting connection to room slot: ${slotId}`);
    const conn = peerRef.current.connect(slotId, {
      reliable: true,
      metadata: { name: currentUserRef.current.name, device: getDeviceType() },
    });
    setupDataConnection(conn);

    // On connection close/error, attempt a small number of retries with exponential backoff
    const scheduleRetryForSlot = () => {
      const prev = connectRetryRef.current.get(slotId) || 0;
      if (prev >= 3) {
        // After several retries, switch to RELAY-only mode and recreate the peer
        console.warn(`[P2P Mesh] Slot ${slotId} failed ${prev} times, enabling relay-only mode`);
        connectRetryRef.current.delete(slotId);
        relayModeRef.current = true;
        try {
          // Recreate peer on current slot in relay mode to force TURN relays
          createPeerOnSlot(cleanRoomIdRef.current || roomId, currentSlotRef.current || 1, isHostRef.current);
        } catch (e) {
          console.warn('Failed to recreate peer in relay mode:', e);
        }
        return;
      }
      connectRetryRef.current.set(slotId, prev + 1);
      const delay = Math.min(8, Math.pow(2, prev)) * 1000; // 1s,2s,4s
      setTimeout(() => {
        connectToSlot(slotId);
      }, delay);
    };

    conn.on('close', () => {
      scheduleRetryForSlot();
    });
    conn.on('error', () => {
      scheduleRetryForSlot();
    });
  }, [setupDataConnection]);

  // Scan all other room slots to establish full mesh
  const scanRoomSlots = useCallback((roomIdToScan: string, mySlotIndex: number) => {
    for (let slot = 1; slot <= MAX_ROOM_SLOTS; slot++) {
      if (slot !== mySlotIndex) {
        const targetSlotId = `cinesync_${roomIdToScan}_${slot}`;
        connectToSlot(targetSlotId);
      }
    }
  }, [connectToSlot]);

  // Stop Screen Sharing
  const stopScreenShare = useCallback(() => {
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
      setLocalScreenStream(null);
      localScreenStreamRef.current = null;
    }
    screenCallsRef.current.forEach((call) => call.close());
    screenCallsRef.current.clear();

    setCurrentUser((prev) => ({ ...prev, isScreenSharing: false }));

    setSyncState((prev) => ({
      ...prev,
      type: 'idle',
      title: '',
      isPlaying: false,
      streamerId: '',
      streamerName: '',
    }));

    broadcast({
      type: 'stream_status',
      streamType: 'idle',
      isLive: false,
      streamerId: '',
      streamerName: '',
      title: '',
    });
  }, [broadcast]);

  // Start Screen Sharing with resilient Progressive Fallback
  const startScreenShare = useCallback(async (options?: { frameRate?: number; audio?: boolean }) => {
    if (!isScreenShareSupported()) {
      return { 
        success: false, 
        error: 'Screen sharing is not supported on this browser. Use Desktop or Mobile Camera Stream!' 
      };
    }

    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          frameRate: { ideal: options?.frameRate || 60, max: 60 },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: options?.audio !== false ? {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } : false,
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 60 } },
          audio: true,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
          });
        } catch (finalErr) {
          console.warn('Screen share cancelled or rejected:', finalErr);
          return { success: false, error: (finalErr as Error).message || 'Screen share cancelled' };
        }
      }
    }

    if (!stream) {
      return { success: false, error: 'Could not obtain media stream' };
    }

    setLocalScreenStream(stream);
    localScreenStreamRef.current = stream;

    const hasAudioTrack = stream.getAudioTracks().length > 0;

    const newSyncState: SyncMediaState = {
      ...syncStateRef.current,
      type: 'screen',
      title: 'Live Screen / Netflix Stream',
      isPlaying: true,
      streamerId: currentUserRef.current.id,
      streamerName: currentUserRef.current.name,
      hasAudio: hasAudioTrack,
      timestamp: Date.now(),
    };
    setSyncState(newSyncState);
    setCurrentUser((prev) => ({ ...prev, isScreenSharing: true }));

    broadcast({
      type: 'stream_status',
      streamType: 'screen',
      isLive: true,
      streamerId: currentUserRef.current.id,
      streamerName: currentUserRef.current.name,
      title: 'Live Screen Stream',
      hasAudio: hasAudioTrack,
    });

    // Call all connected peers
    connectionsRef.current.forEach((_, targetPeerId) => {
      if (peerRef.current) {
        const call = peerRef.current.call(targetPeerId, stream, {
          metadata: { type: 'screen', senderName: currentUserRef.current.name },
        });
        if (call) {
          call.on('iceStateChanged', (state) => {
            if (state === 'failed') call.peerConnection?.restartIce?.();
          });
          if (call.peerConnection) {
            optimizeMediaSender(call.peerConnection);
          }
          screenCallsRef.current.set(targetPeerId, call);
        }
      }
    });

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.onended = () => {
        stopScreenShare();
      };
    }

    return { success: true, hasAudio: hasAudioTrack };
  }, [broadcast, stopScreenShare]);

  // Start Local Video File Stream over WebRTC
  const startLocalFileStream = useCallback((stream: MediaStream, title: string) => {
    setLocalScreenStream(stream);
    localScreenStreamRef.current = stream;

    const hasAudioTrack = stream.getAudioTracks().length > 0;

    const newSyncState: SyncMediaState = {
      ...syncStateRef.current,
      type: 'screen',
      title: title || 'Local Video Stream',
      isPlaying: true,
      streamerId: currentUserRef.current.id,
      streamerName: currentUserRef.current.name,
      hasAudio: hasAudioTrack,
      timestamp: Date.now(),
    };
    setSyncState(newSyncState);
    setCurrentUser((prev) => ({ ...prev, isScreenSharing: true }));

    broadcast({
      type: 'stream_status',
      streamType: 'screen',
      isLive: true,
      streamerId: currentUserRef.current.id,
      streamerName: currentUserRef.current.name,
      title: title || 'Local Video Stream',
      hasAudio: hasAudioTrack,
    });

    connectionsRef.current.forEach((_, targetPeerId) => {
      if (peerRef.current) {
        const call = peerRef.current.call(targetPeerId, stream, {
          metadata: { type: 'screen', senderName: currentUserRef.current.name },
        });
        if (call) {
          call.on('iceStateChanged', (state) => {
            if (state === 'failed') call.peerConnection?.restartIce?.();
          });
          if (call.peerConnection) {
            optimizeMediaSender(call.peerConnection);
          }
          screenCallsRef.current.set(targetPeerId, call);
        }
      }
    });

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.onended = () => {
        stopScreenShare();
      };
    }
  }, [broadcast, stopScreenShare]);

  // Stop any active media / stream in the room and return to Cinema stage
  const stopCurrentMedia = useCallback(() => {
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
      setLocalScreenStream(null);
      localScreenStreamRef.current = null;
    }
    screenCallsRef.current.forEach((call) => call.close());
    screenCallsRef.current.clear();

    setCurrentUser((prev) => ({ ...prev, isScreenSharing: false }));

    const idleState: SyncMediaState = {
      type: 'idle',
      url: '',
      title: '',
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      playbackRate: 1,
      lastUpdatedBy: currentUserRef.current.name,
      streamerId: '',
      streamerName: '',
      hasAudio: false,
      timestamp: Date.now(),
    };

    setSyncState(idleState);

    broadcast({
      type: 'stop_media',
      stoppedBy: currentUserRef.current.name,
    });

    broadcast({
      type: 'stream_status',
      streamType: 'idle',
      isLive: false,
      streamerId: '',
      streamerName: '',
      title: '',
    });

    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-stop`,
        senderId: 'system',
        senderName: 'System',
        avatarColor: '#F59E0B',
        text: `${currentUserRef.current.name} stopped the stream.`,
        timestamp: Date.now(),
        type: 'system',
      },
    ]);
  }, [broadcast]);

  // Kick / remove a participant from the room (Host only)
  const kickPeer = useCallback((targetPeerId: string) => {
    const targetUser = peers.find((p) => p.id === targetPeerId);
    const targetName = targetUser?.name || 'User';

    const conn = connectionsRef.current.get(targetPeerId);
    if (conn && conn.open) {
      try {
        conn.send({
          type: 'kick',
          targetId: targetPeerId,
          reason: 'Removed by host',
        });
      } catch {}
      setTimeout(() => {
        conn.close();
      }, 200);
    }

    const screenCall = screenCallsRef.current.get(targetPeerId);
    if (screenCall) screenCall.close();
    screenCallsRef.current.delete(targetPeerId);

    const camCall = camCallsRef.current.get(targetPeerId);
    if (camCall) camCall.close();
    camCallsRef.current.delete(targetPeerId);

    connectionsRef.current.delete(targetPeerId);
    knownPeersRef.current.delete(targetPeerId);
    setPeers((prev) => prev.filter((p) => p.id !== targetPeerId));

    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-kick-${targetPeerId}`,
        senderId: 'system',
        senderName: 'System',
        avatarColor: '#EF4444',
        text: `${targetName} was removed from the room by the host.`,
        timestamp: Date.now(),
        type: 'system',
      },
    ]);
  }, [peers]);

  // Start Camera Stream as Main Stage
  const startCameraMainStream = useCallback(async (facingMode: 'user' | 'environment' = 'environment') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setLocalScreenStream(stream);
      localScreenStreamRef.current = stream;

      const newSyncState: SyncMediaState = {
        ...syncStateRef.current,
        type: 'screen',
        title: `${currentUserRef.current.name}'s Mobile Live Stream`,
        isPlaying: true,
        streamerId: currentUserRef.current.id,
        streamerName: currentUserRef.current.name,
        hasAudio: true,
        timestamp: Date.now(),
      };
      setSyncState(newSyncState);

      broadcast({
        type: 'stream_status',
        streamType: 'screen',
        isLive: true,
        streamerId: currentUserRef.current.id,
        streamerName: currentUserRef.current.name,
        title: `${currentUserRef.current.name}'s Mobile Live Stream`,
        hasAudio: true,
      });

      connectionsRef.current.forEach((_, targetPeerId) => {
        if (peerRef.current) {
          const call = peerRef.current.call(targetPeerId, stream, {
            metadata: { type: 'screen', senderName: currentUserRef.current.name },
          });
          if (call) {
            screenCallsRef.current.set(targetPeerId, call);
          }
        }
      });

      return { success: true };
    } catch (err) {
      console.warn('Camera stream error:', err);
      return { success: false, error: (err as Error).message };
    }
  }, [broadcast]);

  // Toggle Camera / Webcam PiP
  const toggleCamera = useCallback(async () => {
    if (localCamStreamRef.current) {
      localCamStreamRef.current.getTracks().forEach((t) => t.stop());
      setLocalCamStream(null);
      localCamStreamRef.current = null;
      setCurrentUser((prev) => ({ ...prev, isVideoOn: false, isAudioOn: false }));
      broadcast({
        type: 'user_update',
        user: { id: currentUserRef.current.id, isVideoOn: false, isAudioOn: false },
      });
      camCallsRef.current.forEach((c) => c.close());
      camCallsRef.current.clear();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: true,
      });
      setLocalCamStream(stream);
      localCamStreamRef.current = stream;
      setCurrentUser((prev) => ({ ...prev, isVideoOn: true, isAudioOn: true }));
      broadcast({
        type: 'user_update',
        user: { id: currentUserRef.current.id, isVideoOn: true, isAudioOn: true },
      });

      connectionsRef.current.forEach((_, targetPeerId) => {
        if (peerRef.current) {
          const call = peerRef.current.call(targetPeerId, stream, {
            metadata: { type: 'camera', senderName: currentUserRef.current.name },
          });
          if (call) {
            camCallsRef.current.set(targetPeerId, call);
          }
        }
      });
    } catch (err) {
      console.warn('Camera / mic permission denied:', err);
    }
  }, [broadcast]);

  // Try to create peer on a specific slot index
  const createPeerOnSlot = useCallback((cleanRoomId: string, slotIndex: number, asHost: boolean) => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    currentSlotRef.current = slotIndex;
    const mySlotId = `cinesync_${cleanRoomId}_${slotIndex}`;
    console.log(`[P2P Mesh] Registering peer on slot ${slotIndex}: ${mySlotId}`);

    const isSlotHost = slotIndex === 1 || asHost;
    setIsHost(isSlotHost);
    isHostRef.current = isSlotHost;

    setCurrentUser((prev) => ({ 
      ...prev, 
      id: mySlotId, 
      isHost: isSlotHost,
      deviceType: getDeviceType(),
    }));

    let activeIce = getActiveIceServers();

    // If relay mode is enabled (we've detected repeated failures), prefer TURN-only servers
    if (relayModeRef.current) {
      const turnOnly = activeIce.filter((s) => {
        const urls = Array.isArray(s.urls) ? s.urls.join(',') : String(s.urls || '');
        return urls.includes('turn:') || urls.includes('turns:');
      });
      if (turnOnly.length > 0) activeIce = turnOnly;
    }

    const peerOptions: any = {
      debug: 1,
      config: {
        iceServers: activeIce,
        iceCandidatePoolSize: 10,
        sdpSemantics: 'unified-plan',
      },
    };

    // Allow configuring PeerJS signaling host via Vite env (VITE_PEERJS_HOST, VITE_PEERJS_PORT, VITE_PEERJS_SECURE, VITE_PEERJS_PATH)
    const envHost = (import.meta as any).env?.VITE_PEERJS_HOST;
    if (envHost) {
      peerOptions.host = envHost;
      const envPort = (import.meta as any).env?.VITE_PEERJS_PORT;
      if (envPort) peerOptions.port = Number(envPort);
      const envPath = (import.meta as any).env?.VITE_PEERJS_PATH;
      if (envPath) peerOptions.path = envPath;
      const envSecure = (import.meta as any).env?.VITE_PEERJS_SECURE;
      if (typeof envSecure !== 'undefined') peerOptions.secure = String(envSecure) === 'true';
    } else {
      // Default fallback to public PeerJS signaling cloud
      peerOptions.host = '0.peerjs.com';
      peerOptions.port = 443;
      peerOptions.path = '/';
      peerOptions.secure = true;
    }

    // Honor local Force Relay toggle from UI
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('cinesync_force_relay')) {
        peerOptions.config.iceTransportPolicy = 'relay';
        relayModeRef.current = true;
      }
    } catch {}

    if (relayModeRef.current) {
      // force ICE to use relay candidates only
      peerOptions.config.iceTransportPolicy = 'relay';
    }

    if (relayModeRef.current) {
      // force ICE to use relay candidates only
      peerOptions.config.iceTransportPolicy = 'relay';
    }

    let peer: Peer;
    try {
      peer = new Peer(mySlotId, peerOptions);
    } catch (e) {
      // Fallback: try without explicit signaling host (use library defaults)
      console.warn('[P2P Mesh] Peer constructor with explicit host failed, retrying without host', e);
      peer = new Peer(mySlotId, { debug: 1, config: peerOptions.config });
    }

    peer.on('open', (id) => {
      console.log(`[P2P Mesh] Peer successfully opened on slot ${slotIndex} with ID: ${id}`);
      setPeerId(id);
      setHostPeerId(`cinesync_${cleanRoomId}_1`);
      setConnectionStatus('connected');
      setStatusMessage(isSlotHost ? 'Watch Room Ready. Share invite link!' : 'Connecting to friends in room...');

      // Scan all other room slots immediately to establish full mesh
      setTimeout(() => {
        scanRoomSlots(cleanRoomId, slotIndex);
      }, 200);

      // Periodically scan room slots every 3 seconds to auto-connect to anyone who joins
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = setInterval(() => {
        scanRoomSlots(cleanRoomId, slotIndex);
      }, 3000);

      // Heartbeat ping interval keeps NAT bindings alive
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = setInterval(() => {
        connectionsRef.current.forEach((c) => {
          if (c.open) {
            try {
              c.send({ type: 'ping', timestamp: Date.now() });
            } catch {
              // ignore
            }
          }
        });
      }, 2500);

      // WebRTC stats interval
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = setInterval(() => {
        updateWebRTCStats();
      }, 2500);
    });

    peer.on('connection', (conn) => {
      console.log(`[P2P Mesh] Incoming data connection from slot: ${conn.peer}`);
      setupDataConnection(conn);
    });

    peer.on('disconnected', () => {
      console.warn('[P2P Mesh] Signaling disconnected. Reconnecting...');
      setTimeout(() => {
        if (peerRef.current === peer && !peer.destroyed) {
          peer.reconnect();
        }
      }, 1500);
    });

    peer.on('call', (call) => {
      const type = call.metadata?.type || 'screen';
      console.log(`[P2P Mesh] Incoming ${type} call from ${call.peer}`);
      call.answer();

      call.on('stream', (remoteStream) => {
        console.log(`[P2P Mesh] Received remote ${type} stream:`, remoteStream.id);
        if (type === 'camera') {
          setRemoteCamStream(remoteStream);
        } else {
          setRemoteScreenStream(remoteStream);
          setSyncState((prev) => ({
            ...prev,
            type: 'screen',
            title: call.metadata?.senderName ? `${call.metadata.senderName}'s Screen Stream` : "Friend's Screen Stream",
            isPlaying: true,
          }));
        }
      });

      call.on('close', () => {
        if (type === 'camera') {
          setRemoteCamStream(null);
        } else {
          setRemoteScreenStream(null);
        }
      });

      call.on('iceStateChanged', (state) => {
        console.log(`[ICE] Incoming ${type} call: ${state}`);
        if (state === 'failed' || state === 'disconnected') {
          call.peerConnection?.restartIce?.();
        }
      });
    });

    peer.on('error', (err) => {
      console.warn(`[P2P Mesh] Peer error on slot ${slotIndex}:`, err.type);
      if (err.type === 'unavailable-id') {
        // Slot is already occupied by another device or old socket. Advance to next slot!
        if (slotIndex < MAX_ROOM_SLOTS) {
          console.log(`[P2P Mesh] Slot ${slotIndex} taken, advancing to slot ${slotIndex + 1}...`);
          setTimeout(() => {
            createPeerOnSlot(cleanRoomId, slotIndex + 1, false);
          }, 200);
        } else {
          setConnectionStatus('error');
          setStatusMessage('Room is currently full (maximum participants reached).');
        }
      } else if (err.type === 'peer-unavailable') {
        // Normal during slot scanning when a slot isn't occupied yet
      } else {
        setStatusMessage(`Notice: ${err.type}`);
      }
    });

    peerRef.current = peer;
  }, [getActiveIceServers, scanRoomSlots, setupDataConnection, updateWebRTCStats]);

  // Initialize Room (Host or Guest)
  const initRoom = useCallback((targetRoomId: string, asHost: boolean) => {
    const cleanRoomId = targetRoomId
      .trim()
      .toLowerCase()
      .replace(/^cinesync[_-]/, '')
      .replace(/[^a-z0-9-]/g, '');

    if (!cleanRoomId) return;

    cleanRoomIdRef.current = cleanRoomId;
    setRoomId(cleanRoomId);
    setConnectionStatus('connecting');
    setStatusMessage('Connecting to watch room mesh...');

    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);

    // If host mode, start at slot 1; if guest mode, start at slot 2 (or 1 if available)
    const initialSlot = asHost ? 1 : 2;
    createPeerOnSlot(cleanRoomId, initialSlot, asHost);
  }, [createPeerOnSlot]);

  // Reconnection helper
  const reconnect = useCallback(() => {
    if (cleanRoomIdRef.current) {
      initRoom(cleanRoomIdRef.current, isHostRef.current);
    }
  }, [initRoom]);

  // Handle browser online/offline auto-recovery
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network back online. Checking connection...');
      if (peerRef.current && peerRef.current.disconnected) {
        peerRef.current.reconnect();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => {
    const typingTimer = typingTimeoutRef;
    const scanTimer = scanIntervalRef;
    const heartbeat = heartbeatIntervalRef;
    const stats = statsIntervalRef;
    const screenStream = localScreenStreamRef;
    const camStream = localCamStreamRef;
    const peerInstance = peerRef;

    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (scanTimer.current) clearInterval(scanTimer.current);
      if (heartbeat.current) clearInterval(heartbeat.current);
      if (stats.current) clearInterval(stats.current);
      if (screenStream.current) screenStream.current.getTracks().forEach((t) => t.stop());
      if (camStream.current) camStream.current.getTracks().forEach((t) => t.stop());
      if (peerInstance.current) peerInstance.current.destroy();
    };
  }, []);

  return {
    roomId,
    isHost,
    isConnected,
    peerId,
    hostPeerId,
    connectionStatus,
    statusMessage,
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
  };
}
