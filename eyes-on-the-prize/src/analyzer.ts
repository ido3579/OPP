import { EMA } from './smoother';
import {
  LM,
  EMA_ALPHA,
  SUSTAINED_MS,
  FEEDBACK_COOLDOWN_MS,
  BLINK_EYE_RATIO,
} from './constants';
import type { FaceLandmarkerResult } from './tracker';

export interface AnalysisResult {
  leftRatio:      number | null;
  rightRatio:     number | null;
  rawDelta:       number | null;
  smoothedDelta:  number | null;
  correctedDelta: number | null;
  deviationMs:    number;
  alert:          boolean;
  faceVisible:    boolean;
}

type Landmark = { x: number; y: number; z: number };

export class Analyzer {
  private emaLeft  = new EMA(EMA_ALPHA);
  private emaRight = new EMA(EMA_ALPHA);
  private emaDelta = new EMA(EMA_ALPHA);

  private _baseline: number | null = null;
  private deviationStart: number | null = null;
  private lastAlertMs = -Infinity;

  private _threshold = 0.07;

  get baseline():  number | null { return this._baseline; }
  get threshold(): number        { return this._threshold; }
  set threshold(v: number)       { this._threshold = v; }

  setBaseline(v: number): void {
    this._baseline = v;
    this.deviationStart = null;
  }

  reset(): void {
    this.emaLeft.reset();
    this.emaRight.reset();
    this.emaDelta.reset();
    this.deviationStart = null;
  }

  analyze(result: FaceLandmarkerResult, nowMs: number): AnalysisResult {
    const empty: AnalysisResult = {
      leftRatio: null, rightRatio: null,
      rawDelta: null, smoothedDelta: null, correctedDelta: null,
      deviationMs: 0, alert: false, faceVisible: false,
    };

    if (!result.faceLandmarks?.length) return empty;
    const lm = result.faceLandmarks[0] as Landmark[];

    if (!this.eyesOpen(lm)) return { ...empty, faceVisible: true };

    // --- Iris ratio: normalised nose-to-ear position in [0, 1] ---
    //
    // Left eye (anatomical left, right side of unmirrored image):
    //   inner corner 133 < outer corner 33 in x → ratio = (iris - inner)/(outer - inner)
    //
    // Right eye (anatomical right, left side of unmirrored image):
    //   inner corner 362 > outer corner 263 in x → flip to keep same nose-to-ear direction
    //   ratio = (inner - iris)/(inner - outer)
    //
    // With this convention, BOTH ratios increase together during version (gaze shift),
    // so their difference (delta) is invariant to conjugate eye movement and only
    // changes when one eye deviates independently.
    const leftRatio  = (lm[LM.LEFT_IRIS].x  - lm[LM.LEFT_INNER].x)
                     / (lm[LM.LEFT_OUTER].x  - lm[LM.LEFT_INNER].x);

    const rightRatio = (lm[LM.RIGHT_INNER].x - lm[LM.RIGHT_IRIS].x)
                     / (lm[LM.RIGHT_INNER].x  - lm[LM.RIGHT_OUTER].x);

    const smoothLeft  = this.emaLeft.update(leftRatio);
    const smoothRight = this.emaRight.update(rightRatio);
    const rawDelta    = smoothLeft - smoothRight;
    const smoothedDelta = this.emaDelta.update(rawDelta);

    const correctedDelta = this._baseline !== null
      ? smoothedDelta - this._baseline
      : null;

    let deviationMs = 0;
    let alert = false;

    if (correctedDelta !== null) {
      if (Math.abs(correctedDelta) > this._threshold) {
        this.deviationStart ??= nowMs;
        deviationMs = nowMs - this.deviationStart;

        const cooldownOk = nowMs - this.lastAlertMs > FEEDBACK_COOLDOWN_MS;
        if (deviationMs >= SUSTAINED_MS && cooldownOk) {
          alert = true;
          this.lastAlertMs = nowMs;
          this.deviationStart = null;
        }
      } else {
        this.deviationStart = null;
      }
    }

    return {
      leftRatio, rightRatio, rawDelta,
      smoothedDelta, correctedDelta, deviationMs,
      alert, faceVisible: true,
    };
  }

  private eyesOpen(lm: Landmark[]): boolean {
    const faceH = Math.abs(lm[LM.FACE_BOTTOM].y - lm[LM.FACE_TOP].y);
    if (faceH < 0.01) return false;
    const leftH  = Math.abs(lm[LM.LEFT_EYE_TOP].y  - lm[LM.LEFT_EYE_BOTTOM].y);
    const rightH = Math.abs(lm[LM.RIGHT_EYE_TOP].y - lm[LM.RIGHT_EYE_BOTTOM].y);
    return (leftH / faceH > BLINK_EYE_RATIO) && (rightH / faceH > BLINK_EYE_RATIO);
  }
}
