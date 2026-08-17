// Web Audio API pure synthesizer for zero-latency, lightweight UI sounds
class SoundFX {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('cinesync_sound_muted', muted ? 'true' : 'false');
    } catch {
      // ignore
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public constructor() {
    try {
      const saved = localStorage.getItem('cinesync_sound_muted');
      if (saved === 'true') {
        this.isMuted = true;
      }
    } catch {
      // ignore
    }
  }

  // Soft marimba message notification chime
  public playMessageSound() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.25);
    } catch {
      // Audio context might be restricted before first user interaction
    }
  }

  // Gentle pop sound for floating reactions
  public playReactionSound() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const pitch = 400 + Math.random() * 250;
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.8, now + 0.08);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // ignore
    }
  }

  // Warm welcoming chime when friend connects
  public playJoinSound() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const startTime = now + index * 0.07;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.07, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch {
      // ignore
    }
  }

  // Play/Pause sync click sound
  public playSyncClick() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // ignore
    }
  }

  // Synchronized countdown beeps (3.. 2.. 1.. GO!)
  public playCountdownBeep(isFinal: boolean = false) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      if (isFinal) {
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.25);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      } else {
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      }

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + (isFinal ? 0.4 : 0.15));
    } catch {
      // ignore
    }
  }
}

export const soundFX = new SoundFX();
