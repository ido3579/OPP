export class FeedbackManager {
  private alertOverlay: HTMLElement;
  private alertLabel: HTMLElement;
  private audioCtx: AudioContext | null = null;

  constructor(alertOverlay: HTMLElement) {
    this.alertOverlay = alertOverlay;

    this.alertLabel = document.createElement('div');
    this.alertLabel.id = 'alert-label';
    this.alertLabel.textContent = '⚠ FIX YOUR GAZE';
    this.alertOverlay.appendChild(this.alertLabel);
  }

  // Must be called from a user-gesture handler so AudioContext is allowed to start
  initAudio(): void {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
  }

  // Resume AudioContext if the browser suspended it (e.g. after tab switch)
  resumeAudio(): void {
    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  trigger(): void {
    this.beep();
    this.haptic();
    this.visualAlert();
  }

  private beep(): void {
    const ctx = this.audioCtx;
    if (!ctx) return;

    // Two short ascending tones — unmistakable as a notification
    const schedule = [
      { freq: 880,  start: 0,    dur: 0.08 },
      { freq: 1320, start: 0.12, dur: 0.08 },
    ];

    for (const { freq, start, dur } of schedule) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.value = freq;

      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.35, t0 + 0.01);       // fast attack
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);  // smooth decay

      osc.start(t0);
      osc.stop(t0 + dur);
    }
  }

  private haptic(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 100, 300, 100, 300]);
    }
  }

  private visualAlert(): void {
    this.alertOverlay.classList.remove('active');
    void this.alertOverlay.offsetWidth;
    this.alertOverlay.classList.add('active');
    setTimeout(() => this.alertOverlay.classList.remove('active'), 1300);
  }
}
