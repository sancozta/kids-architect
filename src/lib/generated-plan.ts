import type { PlanModel, WallSegment } from "@/lib/types";

type PlanPromptFeatures = {
  bedrooms: number;
  bathrooms: number;
  garage: boolean;
  varanda: boolean;
  suite: boolean;
  office: boolean;
};

export function isPlanGenerationRequest(message: string) {
  const normalized = normalize(message);
  return (
    normalized.includes("criar planta") ||
    normalized.includes("gerar planta") ||
    normalized.includes("planta 2d") ||
    normalized.includes("desenhar planta") ||
    normalized.includes("gerar uma planta")
  );
}

export function createGeneratedPlanModelFromPrompt(prompt: string): PlanModel {
  const features = extractFeatures(prompt);
  const floorWidth = 24 + features.bedrooms * 3.8 + (features.garage ? 5.4 : 0) + (features.office ? 2.8 : 0);
  const floorDepth = 18 + features.bedrooms * 1.9 + (features.varanda ? 2.4 : 0);
  const wallHeight = 2.8;
  const wallThickness = 0.22;

  const halfW = floorWidth / 2;
  const halfD = floorDepth / 2;
  const walls: WallSegment[] = [
    wall(0, -halfD, floorWidth, wallThickness, wallHeight),
    wall(0, halfD, floorWidth, wallThickness, wallHeight),
    wall(-halfW, 0, wallThickness, floorDepth, wallHeight),
    wall(halfW, 0, wallThickness, floorDepth, wallHeight),
  ];

  const corridorZ = features.varanda ? 1.8 : 0.8;
  walls.push(wall(0, corridorZ, floorWidth * 0.94, wallThickness, wallHeight));

  if (features.garage) {
    const garageWidth = 5.6;
    walls.push(wall(-halfW + garageWidth, 0, wallThickness, floorDepth * 0.78, wallHeight));
  }

  const serviceBandX = features.garage ? -halfW + 7.2 : -halfW + 5.1;
  walls.push(wall(serviceBandX, -halfD * 0.16, wallThickness, floorDepth * 0.54, wallHeight));

  const topBandZ = -halfD * 0.32;
  walls.push(wall(halfW * 0.05, topBandZ, floorWidth * 0.56, wallThickness, wallHeight));

  const bedroomAreaStartX = 1.2;
  const roomDepth = floorDepth * 0.34;
  const roomStartZ = halfD * 0.02;
  const roomWidth = Math.max(3.4, (halfW - bedroomAreaStartX - 1.1) / Math.max(features.bedrooms, 1));

  for (let index = 0; index < features.bedrooms; index += 1) {
    if (index < features.bedrooms - 1) {
      const partitionX = bedroomAreaStartX + roomWidth * (index + 1);
      walls.push(wall(partitionX, roomStartZ + roomDepth / 2, wallThickness, roomDepth, wallHeight));
    }
  }

  const bathWidth = Math.max(2.0, 1.8 + features.bathrooms * 0.4);
  const bathZoneX = features.garage ? -1.2 : -0.3;
  walls.push(wall(bathZoneX, -1.2, bathWidth, wallThickness, wallHeight));
  walls.push(wall(bathZoneX - bathWidth / 2, 0.2, wallThickness, 3.1, wallHeight));
  walls.push(wall(bathZoneX + bathWidth / 2, 0.2, wallThickness, 3.1, wallHeight));

  if (features.suite) {
    walls.push(wall(halfW * 0.22, -halfD * 0.58, wallThickness, floorDepth * 0.28, wallHeight));
  }

  if (features.office) {
    walls.push(wall(halfW * 0.48, -halfD * 0.12, wallThickness, floorDepth * 0.38, wallHeight));
  }

  if (features.varanda) {
    walls.push(wall(halfW * 0.18, halfD - 2.4, floorWidth * 0.44, wallThickness, wallHeight));
  }

  const sourceLabel = buildSourceLabel(features);
  const imageUrl = buildPlanSvgDataUrl({
    floorWidth,
    floorDepth,
    walls,
    features,
  });

  return {
    imageUrl,
    sourceLabel,
    floorWidth,
    floorDepth,
    wallHeight,
    wallThickness,
    walls,
    metrics: {
      width: Math.round(floorWidth * 4),
      height: Math.round(floorDepth * 4),
      wallCount: walls.length,
      coverage: Number(Math.min(0.48, walls.length / 100).toFixed(3)),
    },
  };
}

function extractFeatures(prompt: string): PlanPromptFeatures {
  const normalized = normalize(prompt);
  const bedrooms = extractCount(normalized, /(\\d+)\s+quartos?/, 2);
  const bathrooms = extractCount(normalized, /(\\d+)\s+banheiros?/, normalized.includes("banheiro") ? 2 : 1);

  return {
    bedrooms: clamp(bedrooms, 1, 5),
    bathrooms: clamp(bathrooms, 1, 4),
    garage: normalized.includes("garagem"),
    varanda: normalized.includes("varanda"),
    suite: normalized.includes("suite"),
    office: normalized.includes("escritorio") || normalized.includes("home office"),
  };
}

function buildSourceLabel(features: PlanPromptFeatures) {
  const labels = [`${features.bedrooms} quarto(s)`, `${features.bathrooms} banheiro(s)`];
  if (features.garage) labels.push("garagem");
  if (features.varanda) labels.push("varanda");
  if (features.suite) labels.push("suite");
  if (features.office) labels.push("escritorio");
  return `Planta gerada via chat: ${labels.join(", ")}`;
}

function buildPlanSvgDataUrl({
  floorWidth,
  floorDepth,
  walls,
  features,
}: {
  floorWidth: number;
  floorDepth: number;
  walls: WallSegment[];
  features: PlanPromptFeatures;
}) {
  const width = 900;
  const height = Math.round((floorDepth / floorWidth) * width);
  const scaleX = width / floorWidth;
  const scaleZ = height / floorDepth;

  const wallRects = walls
    .map((wallSegment) => {
      const x = (wallSegment.centerX - wallSegment.width / 2 + floorWidth / 2) * scaleX;
      const y = (wallSegment.centerZ - wallSegment.depth / 2 + floorDepth / 2) * scaleZ;
      const w = wallSegment.width * scaleX;
      const h = wallSegment.depth * scaleZ;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#101418" rx="1" ry="1" />`;
    })
    .join("");

  const labels: string[] = [
    svgLabel("Sala / Cozinha", width * 0.18, height * 0.2),
    svgLabel("Circulacao", width * 0.48, height * 0.54),
  ];

  labels.push(svgLabel("Dormitorios", width * 0.72, height * 0.7));
  if (features.garage) labels.push(svgLabel("Garagem", width * 0.12, height * 0.7));
  if (features.varanda) labels.push(svgLabel("Varanda", width * 0.55, height * 0.88));
  if (features.suite) labels.push(svgLabel("Suite", width * 0.62, height * 0.18));
  if (features.office) labels.push(svgLabel("Escritorio", width * 0.83, height * 0.32));

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <g stroke="#d6d6d6" stroke-width="1">
        ${Array.from({ length: 18 }, (_, index) => `<line x1="${(index / 18) * width}" y1="0" x2="${(index / 18) * width}" y2="${height}" />`).join("")}
        ${Array.from({ length: 14 }, (_, index) => `<line x1="0" y1="${(index / 14) * height}" x2="${width}" y2="${(index / 14) * height}" />`).join("")}
      </g>
      ${wallRects}
      <g font-family="Avenir Next, Segoe UI, sans-serif" font-size="18" fill="#333333">
        ${labels.join("")}
      </g>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function svgLabel(text: string, x: number, y: number) {
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}">${text}</text>`;
}

function wall(centerX: number, centerZ: number, width: number, depth: number, height: number): WallSegment {
  return { centerX, centerZ, width, depth, height };
}

function extractCount(message: string, pattern: RegExp, fallback: number) {
  const match = message.match(pattern);
  if (!match) {
    return fallback;
  }

  return Number.parseInt(match[1] ?? String(fallback), 10) || fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
