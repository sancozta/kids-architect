"use client";

import { Hand, LoaderCircle, Webcam } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { GestureFrame } from "@/lib/types";

type GestureTrackerProps = {
  onGesture: (frame: GestureFrame) => void;
};

type Landmark = { x: number; y: number; z?: number };

type HandsResults = {
  multiHandLandmarks?: Landmark[][];
  multiHandedness?: Array<{ label: "Left" | "Right"; score: number } | Array<{ label: "Left" | "Right"; score: number }>>;
};

type HandsInstance = {
  close: () => void;
  onResults: (callback: (results: HandsResults) => void) => void;
  send: (payload: { image: HTMLVideoElement }) => Promise<void>;
  setOptions: (options: Record<string, unknown>) => void;
};

type DetectedHand = {
  landmarks: Landmark[];
  side: "left" | "right";
  score: number;
};

const EMPTY_GESTURE: GestureFrame = {
  handDetected: false,
  detectedHands: 0,
  primaryHand: null,
  secondaryHand: null,
  gestureActive: false,
  pinchDistance: 0,
  rotationDeltaX: 0,
  rotationDeltaY: 0,
  rotationDeltaZ: 0,
  zoomDelta: 0,
};

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];

export function GestureTracker({ onGesture }: GestureTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const smoothedRef = useRef({
    rotationDeltaX: 0,
    rotationDeltaY: 0,
    rotationDeltaZ: 0,
    zoomDelta: 0,
  });
  const previousRef = useRef<{
    x: number;
    y: number;
    pinch: number;
    active: boolean;
    palmSize: number;
    roll: number;
  } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("Solicitando acesso a camera...");
  const [gestureState, setGestureState] = useState<"no-hand" | "tracking" | "pinch">("no-hand");
  const [handSummary, setHandSummary] = useState("Nenhuma mao detectada");

  useEffect(() => {
    let isMounted = true;
    let stream: MediaStream | null = null;
    let frameId = 0;
    let hands: HandsInstance | null = null;
    let isSendingFrame = false;
    let latestResults: HandsResults | null = null;

    async function boot() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 960, height: 540, facingMode: "user" },
          audio: false,
        });

        if (!videoRef.current) {
          return;
        }

        videoRef.current.srcObject = stream;
        await waitForVideoReady(videoRef.current);
        await videoRef.current.play();

        hands = await loadHands();
        if (!isMounted || !hands) {
          hands?.close();
          return;
        }

        hands.onResults((results) => {
          latestResults = results;
        });

        setStatus("ready");
        setMessage("Camera ativa. Use pinch com mais folga, gire a palma para rotacao completa e aproxime ou afaste a mao para zoom.");

        const loop = async () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;

          if (!video || !canvas || !hands) {
            return;
          }

          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !isSendingFrame) {
            isSendingFrame = true;
            try {
              await hands.send({ image: video });
            } finally {
              isSendingFrame = false;
            }
          }

          const detectedHands = normalizeHands(latestResults);
          const primaryHand = detectedHands.find((hand) => hand.side === "right") ?? detectedHands[0] ?? null;
          const secondaryHand = detectedHands.find((hand) => hand !== primaryHand) ?? null;
          const landmarks = primaryHand?.landmarks ?? null;

          if (!landmarks) {
            previousRef.current = null;
            smoothedRef.current.rotationDeltaX = 0;
            smoothedRef.current.rotationDeltaY = 0;
            smoothedRef.current.rotationDeltaZ = 0;
            smoothedRef.current.zoomDelta = 0;
            setGestureState("no-hand");
            setHandSummary("Nenhuma mao detectada");
            drawOverlay(canvas, video, []);
            onGesture(EMPTY_GESTURE);
            frameId = requestAnimationFrame(loop);
            return;
          }

          const indexTip = landmarks[8];
          const thumbTip = landmarks[4];
          const pinchDistance = distance(indexTip, thumbTip);
          const palmWidth = Math.max(distance(landmarks[5], landmarks[17]), 0.001);
          const pinchRatio = pinchDistance / palmWidth;
          const palmSize = computePalmSize(landmarks);
          const roll = computeHandRoll(landmarks);
          const previous = previousRef.current;
          const active = previous?.active ? pinchRatio < 1.1 : pinchRatio < 0.72;
          const rollDelta = previous ? normalizeAngle(roll - previous.roll) : 0;
          const handZoomDelta = previous ? (palmSize - previous.palmSize) * 4.2 : 0;
          const pinchZoomDelta = previous && active && previous.active ? (previous.pinch - pinchDistance) * 3.2 : 0;

          const rawRotationX = previous && active && previous.active ? previous.x - indexTip.x : 0;
          const rawRotationY = previous && active && previous.active ? indexTip.y - previous.y : 0;
          const rawRotationZ = Math.abs(rollDelta) > 0.01 ? rollDelta : 0;
          const rawZoom = clamp(handZoomDelta + pinchZoomDelta, -0.12, 0.12);

          smoothedRef.current.rotationDeltaX = smoothValue(
            smoothedRef.current.rotationDeltaX,
            applyDeadzone(rawRotationX, 0.0035),
            0.2,
          );
          smoothedRef.current.rotationDeltaY = smoothValue(
            smoothedRef.current.rotationDeltaY,
            applyDeadzone(rawRotationY, 0.0035),
            0.2,
          );
          smoothedRef.current.rotationDeltaZ = smoothValue(
            smoothedRef.current.rotationDeltaZ,
            applyDeadzone(rawRotationZ, 0.018),
            0.18,
          );
          smoothedRef.current.zoomDelta = smoothValue(
            smoothedRef.current.zoomDelta,
            applyDeadzone(rawZoom, 0.008),
            0.16,
          );

          const frame: GestureFrame = {
            handDetected: true,
            detectedHands: detectedHands.length,
            primaryHand: primaryHand.side,
            secondaryHand: secondaryHand?.side ?? null,
            gestureActive: active,
            pinchDistance,
            rotationDeltaX: smoothedRef.current.rotationDeltaX,
            rotationDeltaY: smoothedRef.current.rotationDeltaY,
            rotationDeltaZ: smoothedRef.current.rotationDeltaZ,
            zoomDelta: smoothedRef.current.zoomDelta,
          };

          previousRef.current = {
            x: indexTip.x,
            y: indexTip.y,
            pinch: pinchDistance,
            active,
            palmSize,
            roll,
          };

          setGestureState(active ? "pinch" : "tracking");
          setHandSummary(buildHandSummary(primaryHand.side, secondaryHand?.side ?? null, active));
          drawOverlay(canvas, video, detectedHands, primaryHand.side, active);
          onGesture(frame);
          frameId = requestAnimationFrame(loop);
        };

        loop();
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Nao foi possivel acessar a camera ou inicializar o tracker.");
      }
    }

    boot();

    return () => {
      isMounted = false;
      cancelAnimationFrame(frameId);
      onGesture(EMPTY_GESTURE);
      hands?.close();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onGesture]);

  return (
    <div className="glass-panel rounded-[2rem] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Hand Tracking</p>
          <h2 className="text-xl">Controle por movimentos dos dedos</h2>
        </div>
        {status === "loading" ? <LoaderCircle className="size-5 animate-spin text-[var(--accent)]" /> : <Webcam className="size-5 text-[var(--accent)]" />}
      </div>

      <div className="relative overflow-hidden rounded-[1.25rem] bg-[#1e2a33]">
        <video ref={videoRef} className="aspect-video w-full -scale-x-100 object-cover opacity-90" playsInline muted />
        <canvas ref={canvasRef} width={960} height={540} className="absolute inset-0 h-full w-full" />
        <div className="absolute left-3 top-3 rounded-full bg-black/45 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white">
          {gestureState === "pinch" ? "Pinch ativo" : gestureState === "tracking" ? "Mao detectada" : "Aguardando mao"}
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-black/45 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-white">
          {handSummary}
        </div>
      </div>

      <div className="mt-3 flex items-start gap-3 rounded-[1rem] bg-white/55 p-3 text-sm text-[var(--muted)]">
        <Hand className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
        <p>{message}</p>
      </div>
    </div>
  );
}

async function loadHands(): Promise<HandsInstance> {
  await loadScriptOnce("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js", "mediapipe-hands");

  if (!window.Hands) {
    throw new Error("MediaPipe Hands nao foi disponibilizado no navegador.");
  }

  const hands = new window.Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  }) as HandsInstance;

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    selfieMode: true,
    minDetectionConfidence: 0.3,
    minTrackingConfidence: 0.3,
  });

  return hands;
}

function drawOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  detectedHands: DetectedHand[],
  primarySide: "left" | "right" | null = null,
  pinchActive = false,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  canvas.width = video.videoWidth || 960;
  canvas.height = video.videoHeight || 540;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (detectedHands.length === 0) {
    return;
  }

  for (const hand of detectedHands) {
    const points = hand.landmarks.map((point) => ({
      x: point.x * canvas.width,
      y: point.y * canvas.height,
    }));

    const thumbTip = points[4];
    const indexTip = points[8];
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const isPrimary = hand.side === primarySide;
    const baseColor = hand.side === "left" ? "#5bb8ff" : "#f4b06d";
    const activeColor = pinchActive && isPrimary ? "#80ffb7" : baseColor;

    ctx.strokeStyle = hand.side === "left" ? "rgba(91, 184, 255, 0.24)" : "rgba(255, 243, 217, 0.22)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    roundRect(ctx, minX - 14, minY - 14, maxX - minX + 28, maxY - minY + 28, 18);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = "12px sans-serif";
    const handLabel = hand.side === "left" ? "MAO ESQUERDA" : "MAO DIREITA";
    const labelPaddingX = 16;
    const labelWidth = Math.max(96, ctx.measureText(handLabel).width + labelPaddingX * 2 + 10);
    ctx.fillStyle = "rgba(18, 28, 37, 0.78)";
    roundRect(ctx, minX - 4, minY - 40, labelWidth, 24, 12);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(handLabel, minX - 4 + labelPaddingX, minY - 24);

    ctx.strokeStyle = activeColor;
    ctx.lineWidth = isPrimary && pinchActive ? 4 : 2.5;

    for (const [startIndex, endIndex] of HAND_CONNECTIONS) {
      const start = points[startIndex];
      const end = points[endIndex];
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

    ctx.strokeStyle = isPrimary && pinchActive ? "#bfffd5" : "#fff4dd";
    ctx.lineWidth = isPrimary && pinchActive ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(thumbTip.x, thumbTip.y);
    ctx.lineTo(indexTip.x, indexTip.y);
    ctx.stroke();

    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      const isThumbTip = index === 4;
      const isIndexTip = index === 8;

      ctx.fillStyle = isThumbTip || isIndexTip ? activeColor : hand.side === "left" ? "#9ad7ff" : "#ffd7ab";
      ctx.beginPath();
      ctx.arc(point.x, point.y, isThumbTip || isIndexTip ? 7 : 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function distance(a: Landmark, b: Landmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function computePalmSize(landmarks: Landmark[]) {
  const xs = landmarks.map((point) => point.x);
  const ys = landmarks.map((point) => point.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  return Math.max(width, height);
}

function computeHandRoll(landmarks: Landmark[]) {
  const indexBase = landmarks[5];
  const pinkyBase = landmarks[17];
  return Math.atan2(pinkyBase.y - indexBase.y, pinkyBase.x - indexBase.x);
}

function normalizeAngle(angle: number) {
  let next = angle;
  while (next > Math.PI) {
    next -= Math.PI * 2;
  }
  while (next < -Math.PI) {
    next += Math.PI * 2;
  }
  return next;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function applyDeadzone(value: number, threshold: number) {
  return Math.abs(value) < threshold ? 0 : value;
}

function smoothValue(previous: number, next: number, factor: number) {
  return previous + (next - previous) * factor;
}

function normalizeHands(results: HandsResults | null): DetectedHand[] {
  const landmarksList = results?.multiHandLandmarks ?? [];
  const handednessList = results?.multiHandedness ?? [];

  return landmarksList.slice(0, 2).map((landmarks, index) => {
    const handednessEntry = handednessList[index];
    const handedness = Array.isArray(handednessEntry) ? handednessEntry[0] : handednessEntry;

    return {
      landmarks,
      side: handedness?.label === "Left" ? "left" : "right",
      score: handedness?.score ?? 0,
    };
  });
}

function buildHandSummary(primary: "left" | "right", secondary: "left" | "right" | null, active: boolean) {
  const hands = secondary ? `${labelForHand(primary)} + ${labelForHand(secondary)}` : labelForHand(primary);
  return active ? `${hands} / controle` : hands;
}

function labelForHand(side: "left" | "right") {
  return side === "left" ? "esquerda" : "direita";
}

function waitForVideoReady(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const onLoaded = () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      resolve();
    };

    video.addEventListener("loadedmetadata", onLoaded);
  });
}

function loadScriptOnce(src: string, id: string) {
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing) {
    if (existing.dataset.loaded === "true") {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Falha ao carregar script: ${src}`)), { once: true });
    });
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Falha ao carregar script: ${src}`));
    document.head.appendChild(script);
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
