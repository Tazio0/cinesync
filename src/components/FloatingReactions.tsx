import React from 'react';
import type { ReactionItem } from '../types';

interface FloatingReactionsProps {
  reactions: ReactionItem[];
  onRemove?: (id: string) => void;
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({ reactions }) => {
  return (
    <div className="reactions-container" aria-hidden="true">
      {reactions.map((reaction) => (
        <ReactionBubble key={reaction.id} reaction={reaction} />
      ))}
    </div>
  );
};

const ReactionBubble: React.FC<{ reaction: ReactionItem }> = ({ reaction }) => {
  return (
    <div
      className="reaction-bubble"
      style={{
        left: `${reaction.x}%`,
        transform: `scale(${reaction.scale}) rotate(${reaction.rotation}deg)`,
      }}
    >
      <span className="reaction-emoji">{reaction.emoji}</span>
      <span className="reaction-sender">{reaction.senderName}</span>
    </div>
  );
};
