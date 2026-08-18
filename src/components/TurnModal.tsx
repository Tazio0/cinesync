import React, { useState, useEffect } from 'react';

interface TurnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TurnModal: React.FC<TurnModalProps> = ({ isOpen, onClose }) => {
  const [text, setText] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const existing = localStorage.getItem('cinesync_custom_turn') || '';
      setText(existing);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      if (!text.trim()) {
        localStorage.removeItem('cinesync_custom_turn');
        onClose();
        return;
      }
      const parsed = JSON.parse(text);
      if (!parsed.urls) throw new Error('Missing "urls" field');
      localStorage.setItem('cinesync_custom_turn', JSON.stringify(parsed));
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  const handleClear = () => {
    localStorage.removeItem('cinesync_custom_turn');
    setText('');
    setError('');
    window.location.reload();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card small">
        <h3>Configure TURN / STUN</h3>
        <p>Paste a JSON object describing your TURN/STUN server. Example:</p>
        <pre className="example">{'{"urls":"turn:turn.example:3478","username":"user","credential":"pass"}'}</pre>
        <textarea
          className="modal-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
        />
        {error && <div className="modal-error">{error}</div>}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={handleSave}>Save & Apply</button>
          <button className="btn-danger" onClick={handleClear}>Clear</button>
        </div>
      </div>
    </div>
  );
};
