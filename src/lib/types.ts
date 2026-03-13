export type WallSegment = {
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  height: number;
};

export type PlanMetrics = {
  width: number;
  height: number;
  wallCount: number;
  coverage: number;
};

export type PlanModel = {
  imageUrl: string | null;
  floorWidth: number;
  floorDepth: number;
  wallHeight: number;
  wallThickness: number;
  walls: WallSegment[];
  metrics: PlanMetrics;
};

export type GestureFrame = {
  handDetected: boolean;
  detectedHands: number;
  primaryHand: "left" | "right" | null;
  secondaryHand: "left" | "right" | null;
  gestureActive: boolean;
  pinchDistance: number;
  rotationDeltaX: number;
  rotationDeltaY: number;
  rotationDeltaZ: number;
  zoomDelta: number;
};
