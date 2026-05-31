import './styles.css';
import { startCamera } from './camera';
import { FaceTracker }  from './tracker';
import { Analyzer }     from './analyzer';
import { Calibrator }   from './calibration';
import { FeedbackManager } from './feedback';
import { thresholdFromSensitivity } from './constants';
import {
  queryUI, hideLoading, setLoadingMsg, setStatus,
  updateDebug, updateProgress, updateCalibrationArc,
  toggleDebugPanel, drawDebugLandmarks,
} from './ui';

// ── State ───────────────────────────────────────────────
let debugMode = false;
let ctx: CanvasRenderingContext2D | null = null;

// FPS tracking
let frameCount = 0;
let lastFpsTime = performance.now();
let fps = 0;

// ── Bootstrap ───────────────────────────────────────────
async function main() {
  const ui      = queryUI();
  const tracker = new FaceTracker();
  const analyzer = new Analyzer();
  const calibrator = new Calibrator();
  const feedback = new FeedbackManager(ui.alertOverlay);

  // Initial threshold from slider default (value=5)
  analyzer.threshold = thresholdFromSensitivity(Number(ui.sensitivitySlider.value));

  // ── Camera ─────────────────────────────────────────────
  setLoadingMsg(ui, 'Requesting camera…');
  try {
    await startCamera(ui.video);
  } catch (err) {
    setLoadingMsg(ui, `Camera error: ${(err as Error).message}`);
    return;
  }

  // ── MediaPipe ──────────────────────────────────────────
  setLoadingMsg(ui, 'Loading face model…');
  try {
    await tracker.init();
  } catch (err) {
    setLoadingMsg(ui, `Model load failed: ${(err as Error).message}`);
    return;
  }

  // ── Canvas setup ───────────────────────────────────────
  const canvas = ui.canvas;
  ctx = canvas.getContext('2d');
  function resizeCanvas() {
    canvas.width  = ui.video.videoWidth  || window.innerWidth;
    canvas.height = ui.video.videoHeight || window.innerHeight;
  }
  resizeCanvas();
  ui.video.addEventListener('resize', resizeCanvas);
  window.addEventListener('resize', resizeCanvas);

  // ── UI ready ───────────────────────────────────────────
  hideLoading(ui);
  setStatus(ui, 'ready');
  ui.calibrateBtn.disabled = false;

  // ── Button handlers ────────────────────────────────────
  ui.calibrateBtn.addEventListener('click', () => {
    if (calibrator.isActive) {
      calibrator.abort();
      ui.calOverlay.hidden = true;
      ui.calibrateBtn.textContent = 'Calibrate';
      return;
    }
    analyzer.reset();
    calibrator.begin(performance.now());
    ui.calOverlay.hidden = false;
    ui.calibrateBtn.textContent = 'Cancel';
  });

  ui.toggleDebugBtn.addEventListener('click', () => {
    debugMode = toggleDebugPanel(ui);
    if (!debugMode && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  ui.sensitivitySlider.addEventListener('input', () => {
    const v = Number(ui.sensitivitySlider.value);
    ui.sensitivityValue.textContent = String(v);
    analyzer.threshold = thresholdFromSensitivity(v);
  });

  // ── Render loop ────────────────────────────────────────
  function loop(timestamp: number) {
    requestAnimationFrame(loop);

    // FPS counter (update every 30 frames)
    frameCount++;
    if (frameCount % 30 === 0) {
      const now = performance.now();
      fps = 30000 / (now - lastFpsTime);
      lastFpsTime = now;
    }

    const result = tracker.detect(ui.video, timestamp);
    if (!result) return;

    const analysis = analyzer.analyze(result, timestamp);

    // Calibration tick
    if (calibrator.isActive) {
      const tick = calibrator.tick(analysis.smoothedDelta, timestamp);
      updateCalibrationArc(ui, tick.progress);
      if (tick.done && tick.baseline !== undefined) {
        analyzer.setBaseline(tick.baseline);
        ui.calOverlay.hidden = true;
        ui.calibrateBtn.textContent = 'Re-calibrate';
      }
    }

    // Status
    if (!analysis.faceVisible) {
      setStatus(ui, 'no-face');
    } else if (analysis.alert) {
      setStatus(ui, 'alert');
      feedback.trigger();
    } else {
      setStatus(ui, 'ready');
    }

    // Progress bar
    updateProgress(ui, analysis.deviationMs);

    // Debug panel & landmarks
    if (debugMode) {
      updateDebug(ui, analysis, analyzer.baseline, fps);
      if (ctx) {
        drawDebugLandmarks(
          ctx, canvas, result,
          analysis.correctedDelta,
          analyzer.threshold,
        );
      }
    }
  }

  requestAnimationFrame(loop);
}

main().catch(err => console.error('Fatal:', err));
