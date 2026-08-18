import React, { useState, useEffect } from 'react';

interface TurnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TurnEntry = { urls: string; username?: string; credential?: string };

export const TurnModal: React.FC<TurnModalProps> = ({ isOpen, onClose }) => {
  const [list, setList] = useState<TurnEntry[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<TurnEntry>({ urls: '', username: '', credential: '' });
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // migrate legacy single entry if present
      const legacy = localStorage.getItem('cinesync_custom_turn');
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          if (parsed && parsed.urls) {
            localStorage.removeItem('cinesync_custom_turn');
            localStorage.setItem('cinesync_turns', JSON.stringify([parsed]));
          }
        } catch {}
      }

      const stored = localStorage.getItem('cinesync_turns');
      if (stored) {
        try {
          setList(JSON.parse(stored));
        } catch {
          setList([]);
        }
      } else {
        setList([]);
      }
      setStatus('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const persist = (next: TurnEntry[]) => {
    localStorage.setItem('cinesync_turns', JSON.stringify(next));
    setList(next);
    // apply immediately
    setTimeout(() => window.location.reload(), 300);
  };

  const handleAdd = () => {
    if (!form.urls.trim()) return setStatus('Please provide at least urls');
    const next = [...list, form];
    persist(next);
  };

  const handleEdit = (idx: number) => {
    setEditingIndex(idx);
    setForm(list[idx]);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    const next = [...list];
    next[editingIndex] = form;
    persist(next);
    setEditingIndex(null);
  };

  const handleRemove = (idx: number) => {
    const next = list.filter((_, i) => i !== idx);
    persist(next);
  };

  const testTurn = async (entry: TurnEntry) => {
    setStatus('Testing...');
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: entry.urls.split(',').map((u) => u.trim()), username: entry.username, credential: entry.credential }] as any });
      let sawCandidate = false;
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout waiting for ICE candidates')), 6000));
      pc.onicecandidate = (ev) => {
        const c = (ev.candidate && (ev.candidate as any).candidate) || '';
        if (c.includes('typ relay') || c.includes('typ srflx') || c.includes('typ host')) {
          sawCandidate = true;
        }
      };
      pc.createDataChannel('test');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await Promise.race([
        new Promise((res) => {
          const check = () => {
            if (sawCandidate) res(true);
            else setTimeout(check, 200);
          };
          check();
        }),
        timeout,
      ]);
      pc.close();
      setStatus('OK — ICE candidates gathered');
    } catch (e: any) {
      setStatus('Failed: ' + (e?.message || String(e)));
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card medium">
        <h3>Manage TURN / STUN Servers</h3>
        <p>You can add multiple TURN/STUN entries. They are stored locally only. Do not paste private keys into shared machines.</p>

        <div className="turn-list">
          {list.length === 0 && <div className="muted">No saved TURN servers</div>}
          {list.map((t, i) => (
            <div key={i} className="turn-row">
              <div className="turn-info">
                <div className="turn-urls">{t.urls}</div>
                <div className="turn-creds">{t.username ? `${t.username}${t.credential ? ' / •••' : ''}` : 'No auth'}</div>
              </div>
              <div className="turn-actions">
                <button className="btn-sm" onClick={() => testTurn(t)}>Test</button>
                <button className="btn-sm" onClick={() => handleEdit(i)}>Edit</button>
                <button className="btn-sm btn-danger" onClick={() => handleRemove(i)}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        <div className="turn-form">
          <h4>{editingIndex === null ? 'Add TURN / STUN' : 'Edit TURN / STUN'}</h4>
          <label>URLs (comma-separated)</label>
          <input value={form.urls} onChange={(e) => setForm({ ...form, urls: e.target.value })} />
          <label>Username (optional)</label>
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <label>Credential (optional)</label>
          <input value={form.credential} onChange={(e) => setForm({ ...form, credential: e.target.value })} />
          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose}>Close</button>
            {editingIndex === null ? (
              <button className="btn" onClick={handleAdd}>Add & Apply</button>
            ) : (
              <button className="btn" onClick={handleSaveEdit}>Save & Apply</button>
            )}
          </div>
          {status && <div className="modal-status">{status}</div>}
        </div>
      </div>
    </div>
  );
};
