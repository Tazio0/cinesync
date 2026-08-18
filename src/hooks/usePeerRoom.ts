import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { type DataConnection, type MediaConnection } from 'peerjs';
import type { User, ChatMessage, ReactionItem, SyncMediaState, PeerSignalData } from '../types';
import { soundFX } from '../utils/soundEffects';

interface UsePeerRoomProps {
  userName: string;
  initialRoomId?: string;
  isHostMode?: boolean;
}

const AVATAR_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', 
  '#06B6D4', '#6366F1', '#EC4899', '#8B5CF6'
];

// ICE servers used for every WebRTC connection this peer makes (chat/data
// channel + screen share + camera calls).
//
// STUN-only (what this used to be) only lets two browsers connect directly
// when at least one side's NAT allows hole-punching. It works fine for
// quick same-network tests, then silently hangs on "Connecting..." the
// moment one person is on a different network - mobile data, campus/office
// wifi, most double-NAT home routers, etc. That's the exact bug being
// fixed here: it needs a TURN relay as a fallback path so the connection
// still succeeds by routing through a relay server when a direct route
// isn't possible.
//
// The TURN entries below are the free, public OpenRelay service
// (openrelayproject) - shared and bandwidth-limited, but zero setup, which
// matches this app's "no backend, pure P2P" design. For heavier/more
// reliable use, swap these for your own TURN credentials - a free personal
// key from https://www.metered.ca/tools/openrelay/, Twilio Network
// Traversal Service, Cloudflare Calls, or a self-hosted coturn box.
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

// How long to wait for the initial host<->guest connection to fully open
// (ICE + DTLS handshake complete) before giving up and telling the user
// what's wrong, instead of spinning on "Connecting..." forever.
const CONNECT_TIMEOUT_MS = 20000;

export function usePeerRoom({ userName, initialRoomId, isHostMode = true }: UsePeerRoomProps) {
  const [roomId, setRoomId] = useState<string>(initialRoomId || '');
  const [isHost, setIsHost] = useState<boolean>(isHostMode);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [peerId, setPeerId] = useState<string>('');
  const [hostPeerId, setHostPeerId] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to start');

  // Users
  const [currentUser, setCurrentUser] = useState<User>({
    id: '',
    name: userName,
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    isHost: isHostMode,
    isAudioOn: false,
    isVideoOn: false,
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

  // Sync Media State (for synced video player)
  const [syncState, setSyncState] = useState<SyncMediaState>({
    type: 'idle',
    url: '',
    title: '',
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    lastUpdatedBy: '',
    timestamp: Date.now(),
  });

  // Dual Sync Countdown
  const [countdown, setCountdown] = useState<{ active: boolean; count: number; initiator: string }>({
    active: false,
    count: 0,
    initiator: '',
  });

  // Internal references
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const screenCallsRef = useRef<Map<string, MediaConnection>>(new Map());
  const camCallsRef = useRef<Map<string, MediaConnection>>(new Map());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHostRef = useRef<boolean>(isHost);
  const currentUserRef = useRef<User>(currentUser);

  useEffect(() => {
    isHostRef.current = isHost;
    currentUserRef.current = currentUser;
  }, [isHost, currentUser]);

  // Broadcast data payload to all connected peers
  const broadcast = useCallback((data: PeerSignalData) => {
    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        conn.send(data);
      }
    });
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

  // Sync Action Handler
  const sendSyncAction = useCallback((action: 'play' | 'pause' | 'seek' | 'change_source', updatedState: Partial<SyncMediaState>) => {
    const newState: SyncMediaState = {
      ...syncState,
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
  }, [broadcast, syncState]);

  // Dual Sync Countdown Trigger
  const startDualCountdown = useCallback(() => {
    let current = 3;
    setCountdown({ active: true, count: current, initiator: currentUserRef.current.name });
    soundFX.playCountdownBeep(false);
    broadcast({ type: 'dual_countdown', active: true, count: current, initiator: currentUserRef.current.name });

    const interval = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdown({ active: true, count: current, initiator: currentUserRef.current.name });
        soundFX.playCountdownBeep(false);
        broadcast({ type: 'dual_countdown', active: true, count: current, initiator: currentUserRef.current.name });
      } else if (current === 0) {
        setCountdown({ active: true, count: 0, initiator: currentUserRef.current.name });
        soundFX.playCountdownBeep(true);
        broadcast({ type: 'dual_countdown', active: true, count: 0, initiator: currentUserRef.current.name });
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setCountdown({ active: false, count: 0, initiator: '' });
          broadcast({ type: 'dual_countdown', active: false, count: 0, initiator: '' });
        }, 1200);
      }
    }, 1000);
  }, [broadcast]);

  // Handle incoming data payload
  const handleDataReceived = useCallback((data: PeerSignalData, conn: DataConnection) => {
    switch (data.type) {
      case 'chat':
        setMessages((prev) => [...prev, data.message]);
        soundFX.playMessageSound();
        break;

      case 'reaction':
        setReactions((prev) => [
          ...prev.slice(-25),
          {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            emoji: data.emoji,
            senderName: data.senderName,
            x: 15 + Math.random() * 70,
            scale: 0.9 + Math.random() * 0.4,
            rotation: (Math.random() - 0.5) * 30,
          },
        ]);
        soundFX.playReactionSound();
        break;

      case 'typing':
        if (data.isTyping) {
          setTypingUsers((prev) => Array.from(new Set([...prev, data.userName])));
        } else {
          setTypingUsers((prev) => prev.filter((name) => name !== data.userName));
        }
        break;

      case 'user_joined':
        setPeers((prev) => {
          const exists = prev.some((p) => p.id === data.user.id);
          if (!exists) {
            soundFX.playJoinSound();
            return [...prev, data.user];
          }
          return prev;
        });

        // Add system message
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-join`,
            senderId: 'system',
            senderName: 'System',
            avatarColor: '#10B981',
            text: `${data.user.name} joined the watch party! 🍿`,
            timestamp: Date.now(),
            type: 'system',
          },
        ]);

        // If host, reply with current user info and sync state
        if (isHostRef.current) {
          conn.send({
            type: 'user_joined',
            user: currentUserRef.current,
          });
          conn.send({
            type: 'sync_response',
            fullState: syncState,
          });
        }
        break;

      case 'user_update':
        setPeers((prev) =>
          prev.map((p) => (p.id === data.user.id ? { ...p, ...data.user } : p))
        );
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
        if (isHostRef.current) {
          conn.send({
            type: 'sync_response',
            fullState: syncState,
          });
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
        }));
        break;
    }
  }, [syncState]);

  // Setup connection handlers
  const setupDataConnection = useCallback((conn: DataConnection) => {
    conn.on('open', () => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      connectionsRef.current.set(conn.peer, conn);
      setIsConnected(true);
      setConnectionStatus('connected');
      setStatusMessage('Connected with friend');

      // Send local user profile
      conn.send({
        type: 'user_joined',
        user: currentUserRef.current,
      });

      // If guest, request current sync state
      if (!isHostRef.current) {
        conn.send({
          type: 'sync_request',
          requestedBy: currentUserRef.current.id,
        });
      }
    });

    conn.on('data', (data) => {
      handleDataReceived(data as PeerSignalData, conn);
    });

    conn.on('close', () => {
      connectionsRef.current.delete(conn.peer);
      setPeers((prev) => prev.filter((p) => p.id !== conn.peer));
      if (connectionsRef.current.size === 0) {
        if (!isHostRef.current) {
          setIsConnected(false);
          setConnectionStatus('idle');
          setStatusMessage('Host disconnected');
        } else {
          setStatusMessage('Waiting for friend to join');
        }
      }
    });

    conn.on('error', (err) => {
      console.error('Data connection error:', err);
    });

    // Track the underlying WebRTC ICE negotiation. This is what actually
    // fails silently across networks without a TURN relay - now that one
    // is configured this mostly just self-heals, but we still surface it
    // and attempt an ICE restart so a mid-call network blip (wifi to
    // mobile data, router hiccup, etc.) doesn't kill the session.
    conn.on('iceStateChanged', (state) => {
      console.log(`[ICE] connection to ${conn.peer}: ${state}`);
      if (state === 'failed') {
        conn.peerConnection?.restartIce?.();
        setStatusMessage('Connection trouble, trying to recover...');
      } else if (state === 'connected' || state === 'completed') {
        if (connectionsRef.current.has(conn.peer)) {
          setStatusMessage('Connected with friend');
        }
      }
    });
  }, [handleDataReceived]);

  // Start Screen Sharing
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          frameRate: { ideal: 60, max: 60 },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      setLocalScreenStream(stream);
      setSyncState((prev) => ({
        ...prev,
        type: 'screen',
        title: 'Live Netflix / Screen Stream',
        isPlaying: true,
      }));

      broadcast({
        type: 'stream_status',
        streamType: 'screen',
        isLive: true,
        title: 'Live Screen Stream',
      });

      connectionsRef.current.forEach((_, targetPeerId) => {
        if (peerRef.current) {
          const call = peerRef.current.call(targetPeerId, stream, {
            metadata: { type: 'screen' },
          });
          call.on('iceStateChanged', (state) => {
            console.log(`[ICE] screen share to ${targetPeerId}: ${state}`);
            if (state === 'failed') call.peerConnection?.restartIce?.();
          });
          screenCallsRef.current.set(targetPeerId, call);
        }
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          stopScreenShare();
        };
      }

      return true;
    } catch (err) {
      console.warn('Screen share cancelled or failed:', err);
      return false;
    }
  }, [broadcast]);

  // Stop Screen Sharing
  const stopScreenShare = useCallback(() => {
    if (localScreenStream) {
      localScreenStream.getTracks().forEach((t) => t.stop());
      setLocalScreenStream(null);
    }
    screenCallsRef.current.forEach((call) => call.close());
    screenCallsRef.current.clear();

    setSyncState((prev) => ({
      ...prev,
      type: 'idle',
      title: '',
      isPlaying: false,
    }));

    broadcast({
      type: 'stream_status',
      streamType: 'idle',
      isLive: false,
      title: '',
    });
  }, [localScreenStream, broadcast]);

  // Toggle Camera / Webcam
  const toggleCamera = useCallback(async () => {
    if (localCamStream) {
      localCamStream.getTracks().forEach((t) => t.stop());
      setLocalCamStream(null);
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
      setCurrentUser((prev) => ({ ...prev, isVideoOn: true, isAudioOn: true }));
      broadcast({
        type: 'user_update',
        user: { id: currentUserRef.current.id, isVideoOn: true, isAudioOn: true },
      });

      connectionsRef.current.forEach((_, targetPeerId) => {
        if (peerRef.current) {
          const call = peerRef.current.call(targetPeerId, stream, {
            metadata: { type: 'camera' },
          });
          call.on('iceStateChanged', (state) => {
            console.log(`[ICE] camera call to ${targetPeerId}: ${state}`);
            if (state === 'failed') call.peerConnection?.restartIce?.();
          });
          camCallsRef.current.set(targetPeerId, call);
        }
      });
    } catch (err) {
      console.warn('Camera / mic permission denied:', err);
    }
  }, [localCamStream, broadcast]);

  // Initialize Room (Host or Guest)
  const initRoom = useCallback((targetRoomId: string, asHost: boolean) => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }

    setRoomId(targetRoomId);
    setIsHost(asHost);
    setConnectionStatus('connecting');
    setStatusMessage(asHost ? 'Generating room link...' : 'Connecting to friend...');

    const myId = asHost 
      ? `cinesync-${targetRoomId}`
      : `guest-${Math.random().toString(36).substring(2, 9)}`;

    setCurrentUser((prev) => ({ ...prev, id: myId, isHost: asHost }));

    const peer = new Peer(myId, {
      debug: 1,
      config: {
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 10,
      },
    });

    peer.on('open', (id) => {
      setPeerId(id);
      if (asHost) {
        setHostPeerId(id);
        setConnectionStatus('connected');
        setStatusMessage('Room ready. Share link with friend!');
      } else {
        const targetHostId = `cinesync-${targetRoomId}`;
        setHostPeerId(targetHostId);
        const conn = peer.connect(targetHostId, {
          reliable: true,
          metadata: { name: userName },
        });
        setupDataConnection(conn);

        // Watchdog: if we never reach "open" - meaning even the TURN relay
        // path couldn't get through (very rare, e.g. a network that blocks
        // all outbound UDP/TCP relay traffic) - stop spinning forever and
        // tell the user plainly instead of leaving them stuck on
        // "Connecting...".
        connectTimeoutRef.current = setTimeout(() => {
          if (!connectionsRef.current.has(targetHostId)) {
            setConnectionStatus('error');
            setStatusMessage(
              "Couldn't reach the host. Make sure they still have the room open in their browser, then try again - or try switching one side to a different network (e.g. a phone hotspot)."
            );
          }
        }, CONNECT_TIMEOUT_MS);
      }
    });

    peer.on('connection', (conn) => {
      setupDataConnection(conn);
    });

    // The signalling (broker) connection can drop briefly on flaky
    // networks without affecting already-established P2P connections.
    // Reconnect it automatically instead of leaving the peer stranded.
    peer.on('disconnected', () => {
      console.warn('Lost connection to signalling server, attempting to reconnect...');
      setTimeout(() => {
        if (peerRef.current === peer && !peer.destroyed) {
          peer.reconnect();
        }
      }, 1000);
    });

    peer.on('call', (call) => {
      const type = call.metadata?.type || 'screen';
      call.answer();

      call.on('stream', (remoteStream) => {
        if (type === 'camera') {
          setRemoteCamStream(remoteStream);
        } else {
          setRemoteScreenStream(remoteStream);
          setSyncState((prev) => ({
            ...prev,
            type: 'screen',
            title: "Friend's Netflix / Screen Stream",
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
        console.log(`[ICE] incoming ${type} call from ${call.peer}: ${state}`);
        if (state === 'failed') call.peerConnection?.restartIce?.();
      });
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      if (err.type === 'peer-unavailable') {
        setStatusMessage('Room not found. Check the code and try again.');
        setConnectionStatus('error');
      } else if (err.type === 'unavailable-id') {
        setStatusMessage('Room code already active.');
        setConnectionStatus('error');
      } else {
        setStatusMessage(`Connection issue: ${err.type}`);
      }
    });

    peerRef.current = peer;
  }, [setupDataConnection, userName]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      if (localScreenStream) localScreenStream.getTracks().forEach((t) => t.stop());
      if (localCamStream) localCamStream.getTracks().forEach((t) => t.stop());
      if (peerRef.current) peerRef.current.destroy();
    };
  }, [localScreenStream, localCamStream]);

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
    localScreenStream,
    remoteScreenStream,
    localCamStream,
    remoteCamStream,
    initRoom,
    sendMessage,
    sendReaction,
    sendTyping,
    sendSyncAction,
    startDualCountdown,
    startScreenShare,
    stopScreenShare,
    toggleCamera,
    setSyncState,
  };
}
