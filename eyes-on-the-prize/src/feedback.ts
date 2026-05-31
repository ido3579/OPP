export class FeedbackManager {
  private alertOverlay: HTMLElement;
  private alertLabel: HTMLElement;

  constructor(alertOverlay: HTMLElement) {
    this.alertOverlay = alertOverlay;

    // Create a centred label inside the overlay
    this.alertLabel = document.createElement('div');
    this.alertLabel.id = 'alert-label';
    this.alertLabel.textContent = '⚠ FIX YOUR GAZE';
    this.alertOverlay.appendChild(this.alertLabel);
  }

  trigger(): void {
    this.haptic();
    this.visualAlert();
  }

  private haptic(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 100, 300, 100, 300]);
    }
  }

  private visualAlert(): void {
    this.alertOverlay.classList.remove('active');
    void this.alertOverlay.offsetWidth; // force reflow to restart animation
    this.alertOverlay.classList.add('active');
    setTimeout(() => this.alertOverlay.classList.remove('active'), 1300);
  }
}
