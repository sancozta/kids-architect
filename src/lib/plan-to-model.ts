import type { PlanModel, WallSegment } from "@/lib/types";

const TARGET_SIZE = 72;
const WALL_HEIGHT = 2.8;
const WALL_THICKNESS = 0.18;
const MIN_RUN = 2;

export async function createPlanModelFromFile(file: File): Promise<PlanModel> {
  const imageUrl = URL.createObjectURL(file);
  const image = await loadImage(imageUrl);

  try {
    return createPlanModelFromImage(image, imageUrl);
  } catch (error) {
    URL.revokeObjectURL(imageUrl);
    throw error;
  }
}

function createPlanModelFromImage(image: HTMLImageElement, imageUrl: string): PlanModel {
  const canvas = document.createElement("canvas");
  const scale = Math.min(TARGET_SIZE / image.width, TARGET_SIZE / image.height, 1);
  const width = Math.max(24, Math.round(image.width * scale));
  const height = Math.max(24, Math.round(image.height * scale));

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D indisponivel.");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const { data } = ctx.getImageData(0, 0, width, height);
  const binary = new Uint8Array(width * height);
  let activeCount = 0;

  for (let index = 0; index < data.length; index += 4) {
    const pixel = index / 4;
    const grayscale = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const alpha = data[index + 3];
    const isWall = alpha > 10 && grayscale < 180;
    binary[pixel] = isWall ? 1 : 0;
    activeCount += isWall ? 1 : 0;
  }

  const walls = buildHorizontalRuns(binary, width, height);

  if (walls.length === 0) {
    throw new Error("Nao foi possivel identificar paredes na imagem. Use uma planta com linhas escuras sobre fundo claro.");
  }

  return {
    imageUrl,
    floorWidth: width / 4,
    floorDepth: height / 4,
    wallHeight: WALL_HEIGHT,
    wallThickness: WALL_THICKNESS,
    walls,
    metrics: {
      width,
      height,
      wallCount: walls.length,
      coverage: Number((activeCount / (width * height)).toFixed(3)),
    },
  };
}

function buildHorizontalRuns(binary: Uint8Array, width: number, height: number): WallSegment[] {
  const segments: WallSegment[] = [];

  for (let y = 0; y < height; y += 1) {
    let x = 0;
    while (x < width) {
      const position = y * width + x;
      if (!binary[position]) {
        x += 1;
        continue;
      }

      let end = x;
      while (end < width && binary[y * width + end]) {
        end += 1;
      }

      const run = end - x;
      if (run >= MIN_RUN) {
        segments.push(toSegment(x, end, y, width, height));
      }

      x = end;
    }
  }

  return segments;
}

function toSegment(start: number, end: number, y: number, width: number, height: number): WallSegment {
  const depth = WALL_THICKNESS;
  const scale = 0.25;
  const segmentWidth = Math.max((end - start) * scale, WALL_THICKNESS);
  const centerX = ((start + end) / 2 - width / 2) * scale;
  const centerZ = (y - height / 2) * scale;

  return {
    centerX,
    centerZ,
    width: segmentWidth,
    depth,
    height: WALL_HEIGHT,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Falha ao carregar a imagem da planta."));
    image.src = src;
  });
}
