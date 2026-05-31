import type { AnalysisResult } from './analyzer';
import { CAL_ARC_LEN, SUSTAINED_MS } from './constants';

export interface UI {
  video:           HTMLVideoElement;
  canvas:          HTMLCanvasElement;
  alertOverlay:    HTMLElement;
  loadingScreen:   HTMLElement;
  loadingMsg:      HTMLElement;
  statusIcon:      HTMLElement;
  statusText:      HTMLElement;
  progressBar:     HTMLElement;
  calibrateBtn:    HTMLButtonElement;
  toggleDebugBtn:  HTMLButtonElement;
  calOverlay:      HTMLElement;
  calArc:          SVGCircleElement;
  debugPanel:      HTMLElement;
  dbLeft:          HTMLElement;
  dbRight:         HTMLElement;
  dbDelta:         HTMLElement;
  dbCorrected:     HTMLElement;
  dbBaseline:      HTMLElement;
  dbTimer:         HTMLElement;
  dbFps:           HTMLElement;
  sensitivitySlider: HTMLInputElement;
  sensitivityValue:  HTMLElement;
}

export function queryUI(): UI {
  const q = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;
  return {
    video:            q<HTMLVideoElement>('#video'),
    canvas:           q<HTMLCanvasElement>('#canvas'),
    alertOverlay:     q('#alert-overlay'),
    loadingScreen:    q('#loading-screen'),
    loadingMsg:       q('#loading-msg'),
    statusIcon:       q('#status-icon'),
    statusText:       q('#status-text'),
    progressBar:      q('#progress-bar'),
    calibrateBtn:     q<HTMLButtonElement>('#calibrate-btn'),
    toggleDebugBtn:   q<HTMLButtonElement>('#toggle-debug-btn'),
    calOverlay:       q('#calibration-overlay'),
    calArc:           q<SVGCircleElement>('#cal-arc'),
    debugPanel:       q('#debug-panel'),
    dbLeft:           q('#db-left'),
    dbRight:          q('#db-right'),
    dbDelta:          q('#db-delta'),
    dbCorrected:      q('#db-corrected'),
    dbBaseline:       q('#db-baseline'),
    dbTimer:          q('#db-timer'),
    dbFps:            q('#db-fps'),
    sensitivitySlider: q<HTMLInputElement>('#sensitivity'),
    sensitivityValue:  q('#sensitivity-value'),
  };
}

export function hideLoading(ui: UI): void {
  ui.loadingScreen.classList.add('hidden');
}

export function setLoadingMsg(ui: UI, msg: string): void {
  ui.loadingMsg.textContent = msg;
}

export function setStatus(ui: UI, state: 'starting' | 'ready' | 'no-face' | 'alert' | 'calibrating'): void {
  const labels: Record<typeof state, string> = {
    starting:    'Starting…',
    ready:       'Monitoring',
    'no-face':   'No face detected',
    alert:       'Eye deviation!',
    calibrating: 'Auto-calibrating…',
  };
  ui.statusText.textContent = labels[state];
  ui.statusIcon.className = state === 'starting' ? '' : state;
}

export function updateDebug(ui: UI, r: AnalysisResult, baseline: number | null, fps: number): void {
  ui.dbLeft.textContent      = r.leftRatio?.toFixed(3)      ?? '—';
  ui.dbRight.textContent     = r.rightRatio?.toFixed(3)     ?? '—';
  ui.dbDelta.textContent     = r.rawDelta?.toFixed(3)       ?? '—';
  ui.dbCorrected.textContent = r.correctedDelta?.toFixed(3) ?? '—';
  ui.dbBaseline.textContent  = baseline?.toFixed(3)         ?? 'not set';
  ui.dbTimer.textContent     = r.deviationMs > 0
    ? `${(r.deviationMs / 1000).toFixed(1)}s`
    : '—';
  ui.dbFps.textContent = fps.toFixed(0);
}

export function updateProgress(ui: UI, deviationMs: number): void {
  const pct = Math.min(deviationMs / SUSTAINED_MS, 1) * 100;
  ui.progressBar.style.width = `${pct}%`;
}

export function updateCalibrationArc(ui: UI, progress: number): void {
  ui.calArc.style.strokeDashoffset = String(CAL_ARC_LEN * (1 - progress));
}

export function toggleDebugPanel(ui: UI): boolean {
  const hidden = !ui.debugPanel.hidden;
  ui.debugPanel.hidden = hidden;
  ui.toggleDebugBtn.classList.toggle('active', !hidden);
  return !hidden;
}

// Draw debug landmarks onto the overlay canvas
export function drawDebugLandmarks(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  result: import('./tracker').FaceLandmarkerResult,
  correctedDelta: number | null,
  threshold: number,
): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!result.faceLandmarks?.length) return;
  const lm = result.faceLandmarks[0];

  const W = canvas.width;
  const H = canvas.height;
  const px = (idx: number) => lm[idx].x * W;
  const py = (idx: number) => lm[idx].y * H;

  const deviating = correctedDelta !== null && Math.abs(correctedDelta) > threshold;

  // Eye corner lines
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = deviating ? 'rgba(255,23,68,0.6)' : 'rgba(0,229,255,0.45)';

  // Left eye connector
  ctx.beginPath();
  ctx.moveTo(px(33),  py(33));
  ctx.lineTo(px(133), py(133));
  ctx.stroke();

  // Right eye connector
  ctx.beginPath();
  ctx.moveTo(px(263), py(263));
  ctx.lineTo(px(362), py(362));
  ctx.stroke();

  // Corner dots
  const corners = [33, 133, 263, 362];
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (const i of corners) {
    ctx.beginPath();
    ctx.arc(px(i), py(i), 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Iris dots
  const irisColor = deviating ? '#ff1744' : '#00e5ff';
  ctx.fillStyle = irisColor;
  ctx.shadowColor = irisColor;
  ctx.shadowBlur = 6;
  for (const i of [468, 473]) {
    ctx.beginPath();
    ctx.arc(px(i), py(i), 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}
