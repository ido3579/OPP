import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';
import { WASM_URL, MODEL_URL } from './constants';

export type { FaceLandmarkerResult };

export class FaceTracker {
  private landmarker: FaceLandmarker | null = null;
  private lastTimestamp = -1;

  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    this.landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
  }

  detect(video: HTMLVideoElement, timestampMs: number): FaceLandmarkerResult | null {
    if (!this.landmarker) return null;
    // MediaPipe requires strictly increasing timestamps
    if (timestampMs <= this.lastTimestamp) return null;
    this.lastTimestamp = timestampMs;
    return this.landmarker.detectForVideo(video, timestampMs);
  }

  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }
}
