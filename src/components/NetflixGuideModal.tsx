import React from 'react';
import { X, Volume2, Monitor, CheckCircle2, AlertCircle } from 'lucide-react';

interface NetflixGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartShare: () => void;
}

export const NetflixGuideModal: React.FC<NetflixGuideModalProps> = ({
  isOpen,
  onClose,
  onStartShare,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card guide-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-badge-red">Netflix Guide</span>
            <h2>How to Stream Netflix with Full Audio</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body guide-steps-list">
          <div className="guide-intro">
            <p>
              CineSync lets you broadcast your Netflix tab directly peer-to-peer with zero lag and high-definition stereo audio. Follow these 3 easy steps:
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Open Netflix in a Chrome / Edge Tab</h4>
              <p>Have your favorite movie or TV show paused and ready in a separate browser tab.</p>
            </div>
          </div>

          <div className="step-card highlight-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <div className="step-title-badge">
                <Volume2 size={16} className="text-accent" />
                <h4>Select "Chrome Tab" & Enable Tab Audio</h4>
              </div>
              <p>
                When the browser screen-share prompt appears, click the <strong>"Chrome Tab"</strong> (or "Browser Tab") section. Select your Netflix tab and ensure the checkbox <strong>"Also share tab audio"</strong> is checked at the bottom left!
              </p>
              <div className="tip-box">
                <CheckCircle2 size={15} />
                <span>Sharing via "Chrome Tab" ensures crisp stereo sound & buttery 60 FPS playback.</span>
              </div>
            </div>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Press Play & Relax</h4>
              <p>
                Your friend will immediately see and hear Netflix in real-time. You can chat, react with floating popcorn, and laugh together!
              </p>
            </div>
          </div>

          <div className="troubleshoot-box">
            <div className="troubleshoot-header">
              <AlertCircle size={16} className="text-warning" />
              <strong>Seeing a black screen on Netflix? (DRM Fix)</strong>
            </div>
            <p>
              If your browser blacks out the video due to GPU DRM protection, simply go to your browser <em>Settings &gt; System</em>, toggle <strong>"Use graphics acceleration when available"</strong> to <strong>OFF</strong>, restart your browser, and Netflix streaming will work flawlessly!
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Got it
          </button>
          <button
            className="btn-primary-netflix"
            onClick={() => {
              onClose();
              onStartShare();
            }}
          >
            <Monitor size={16} />
            <span>Share Netflix Tab Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
