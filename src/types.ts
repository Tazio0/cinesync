export type StreamType = 'screen' | 'video' | 'youtube' | 'local' | 'dual_sync' | 'idle';

export interface User {
  id: string;
  name: string;
  avatarColor: string;
  isHost: boolean;
  isAudioOn?: boolean;
  isVideoOn?: boolean;
  isSpeaking?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  avatarColor: string;
  text: string;
  timestamp: number;
  type: 'text' | 'system' | 'sync';
  isHost?: boolean;
}

export interface ReactionItem {
  id: string;
  emoji: string;
  senderName: string;
  x: number; // percentage across container 10-90
  scale: number;
  rotation: number;
}

export interface SyncMediaState {
  type: StreamType;
  url: string;
  title: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  lastUpdatedBy: string;
  timestamp: number;
}

export interface SampleMedia {
  id: string;
  title: string;
  description: string;
  url: string;
  type: StreamType;
  thumbnail: string;
  duration: string;
}

export type PeerSignalData = 
  | { type: 'chat'; message: ChatMessage }
  | { type: 'reaction'; emoji: string; senderName: string }
  | { type: 'sync_action'; action: 'play' | 'pause' | 'seek' | 'change_source'; state: Partial<SyncMediaState>; senderName: string }
  | { type: 'sync_request'; requestedBy: string }
  | { type: 'sync_response'; fullState: SyncMediaState }
  | { type: 'typing'; isTyping: boolean; userId: string; userName: string }
  | { type: 'user_joined'; user: User }
  | { type: 'user_update'; user: Partial<User> & { id: string } }
  | { type: 'dual_countdown'; count: number; active: boolean; initiator: string }
  | { type: 'stream_status'; streamType: StreamType; isLive: boolean; title: string };
