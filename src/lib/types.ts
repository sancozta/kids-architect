export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

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
  sourceLabel: string;
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

export type ScenePlacement = "indoor" | "outdoor" | "architectural";

export type AssetRenderableKind =
  | "sofa"
  | "tv"
  | "table-set"
  | "tree"
  | "car"
  | "bed"
  | "chair"
  | "decor"
  | "roof"
  | "door"
  | "window"
  | "garden";

export type AssetPrototype = {
  kind: AssetRenderableKind;
  placement: ScenePlacement;
  size: Vec3;
  color: string;
  accentColor?: string;
  defaultScale?: number;
};

export type AssetLibraryItem = {
  id: string;
  label: string;
  category: string;
  source: string;
  license: string;
  url: string;
  prototype: AssetPrototype;
};

export type AssetLibraryCategory = {
  id: string;
  label: string;
  description: string;
  items: AssetLibraryItem[];
};

export type SceneObject = {
  id: string;
  assetId: string;
  label: string;
  category: string;
  kind: AssetRenderableKind;
  placement: ScenePlacement;
  position: Vec3;
  rotationY: number;
  scale: number;
  size: Vec3;
  color: string;
  accentColor?: string;
  source: string;
};

export type ArchitecturalFeatures = {
  roofEnabled: boolean;
  windowsEnabled: boolean;
  doorsEnabled: boolean;
  gardenEnabled: boolean;
};

export type ConsoleLogEntry = {
  id: string;
  message: string;
};

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

export type ReportSnapshot = {
  id: string;
  label: string;
  dataUrl: string;
};
