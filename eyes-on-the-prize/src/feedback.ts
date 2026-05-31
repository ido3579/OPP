export class FeedbackManager {
  private alertOverlay: HTMLElement;

  constructor(alertOverlay: HTMLElement) {
    this.alertOverlay = alertOverlay;
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
    // Force reflow so re-adding the class re-triggers the animation
    void this.alertOverlay.offsetWidth;
    this.alertOverlay.classList.add('active');

    // Remove class after animation finishes (3 × 0.4s)
    setTimeout(() => this.alertOverlay.classList.remove('active'), 1400);
  }
}
