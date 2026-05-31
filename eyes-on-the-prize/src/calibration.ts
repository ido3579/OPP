import { CALIBRATION_DURATION_MS } from './constants';

export interface CalibrationTick {
  progress: number; // 0-1
  done: boolean;
  baseline?: number;
}

export class Calibrator {
  private samples: number[] = [];
  private startMs: number | null = null;
  private active = false;

  get isActive(): boolean { return this.active; }

  begin(nowMs: number): void {
    this.samples = [];
    this.startMs = nowMs;
    this.active  = true;
  }

  tick(smoothedDelta: number | null, nowMs: number): CalibrationTick {
    if (!this.active || this.startMs === null) return { progress: 0, done: false };
    if (smoothedDelta !== null) this.samples.push(smoothedDelta);

    const elapsed  = nowMs - this.startMs;
    const progress = Math.min(elapsed / CALIBRATION_DURATION_MS, 1);

    if (elapsed >= CALIBRATION_DURATION_MS) {
      this.active = false;
      const baseline = this.samples.length
        ? this.samples.reduce((a, b) => a + b, 0) / this.samples.length
        : 0;
      return { progress: 1, done: true, baseline };
    }

    return { progress, done: false };
  }

  abort(): void {
    this.active  = false;
    this.startMs = null;
    this.samples = [];
  }
}
