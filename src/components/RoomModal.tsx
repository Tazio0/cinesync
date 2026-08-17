import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Link2, Share2, Smartphone } from 'lucide-react';

interface RoomModalProps {
  isOpen: boolean;
  roomId: string;
  onClose: () => void;
}

export const RoomModal: React.FC<RoomModalProps> = ({ isOpen, roomId, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const inviteUrl = `${window.location.origin}${window.location.pathname}#room=${roomId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my CineSync Watch Party!',
          text: `Hey! Let's watch together on CineSync. Join room: ${roomId}`,
          url: inviteUrl,
        });
      } catch {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card invite-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-badge-cyan">Invite Friend</span>
            <h2>Watch Together</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-desc">
            Send this invite link or show the QR code. Your friend can join right from their browser without installing anything!
          </p>

          <div className="qr-container">
            <div className="qr-box">
              <QRCodeSVG 
                value={inviteUrl} 
                size={180} 
                bgColor="#ffffff" 
                fgColor="#0B0D13" 
                level="M"
                includeMargin={true}
              />
            </div>
            <div className="qr-caption">
              <Smartphone size={14} />
              <span>Scan with phone or tablet camera to join instantly</span>
            </div>
          </div>

          <div className="invite-link-field">
            <div className="link-input-wrap">
              <Link2 size={16} className="link-icon" />
              <input 
                type="text" 
                readOnly 
                value={inviteUrl} 
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="link-input"
              />
            </div>
            <button className="copy-link-btn" onClick={copyToClipboard}>
              {copied ? (
                <>
                  <Check size={16} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>

          <div className="room-code-tag-box">
            <span>Room Code:</span>
            <strong className="room-code-display">{roomId}</strong>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          {'share' in navigator && (
            <button className="btn-primary" onClick={handleShareNative}>
              <Share2 size={16} />
              <span>Share via App</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
