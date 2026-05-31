// MediaPipe Face Landmarker — 478-point model landmark indices
export const LM = {
  // Iris centres
  LEFT_IRIS:  468,
  RIGHT_IRIS: 473,
  // Eye corners (inner = nasal/nose side, outer = temporal/ear side)
  LEFT_INNER:  133,
  LEFT_OUTER:   33,
  RIGHT_INNER: 362,
  RIGHT_OUTER: 263,
  // Vertical eye landmarks for blink detection
  LEFT_EYE_TOP:    159,
  LEFT_EYE_BOTTOM: 145,
  RIGHT_EYE_TOP:   386,
  RIGHT_EYE_BOTTOM:374,
  // Face height reference
  FACE_TOP:    10,
  FACE_BOTTOM: 152,
} as const;

// Detection
export const EMA_ALPHA            = 0.25;   // smoothing (lower = heavier)
export const BASE_THRESHOLD       = 0.07;   // iris-ratio delta to flag (unscaled)
export const SUSTAINED_MS         = 1200;   // ms before alert fires
export const FEEDBACK_COOLDOWN_MS = 3000;   // ms before alert can fire again
export const BLINK_EYE_RATIO      = 0.018;  // eye-height / face-height below = blink

// Calibration
export const CALIBRATION_DURATION_MS = 3000;

// MediaPipe — pin wasm to the installed package version
export const MEDIAPIPE_VERSION   = '0.10.14';
export const WASM_URL            = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
export const MODEL_URL           = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// SVG arc circumference for calibration ring (2π × r=44)
export const CAL_ARC_LEN = 276.46;

// Sensitivity slider maps 1-10 → multiplier on BASE_THRESHOLD (higher = less sensitive)
export function thresholdFromSensitivity(v: number): number {
  // slider 1 (most sensitive) → threshold × 0.4
  // slider 5 (default)        → threshold × 1.0
  // slider 10 (least)         → threshold × 2.0
  return BASE_THRESHOLD * (0.4 + (v - 1) * (1.6 / 9));
}
