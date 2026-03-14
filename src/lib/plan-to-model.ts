import type { PlanModel, WallSegment } from "@/lib/types";

const TARGET_SIZE = 128;
const WALL_HEIGHT = 2.8;
const WALL_THICKNESS = 0.18;
const MIN_RUN = 3;
const MERGE_TOLERANCE = 2;
const PIXEL_TO_WORLD = 0.25;

type TempSegment = {
  spanStart: number;
  spanEnd: number;
  orthoStart: number;
  orthoEnd: number;
  sumStart: number;
  sumEnd: number;
  count: number;
  lastOrtho: number;
};

type SegmentAxis = "horizontal" | "vertical";

type RawRun = {
  start: number;
  end: number;
};

export async function createPlanModelFromFile(file: File): Promise<PlanModel> {
  const imageUrl = URL.createObjectURL(file);
  const image = await loadImage(imageUrl);

  try {
    return createPlanModelFromImage(image, imageUrl, file.name);
  } catch (error) {
    URL.revokeObjectURL(imageUrl);
    throw error;
  }
}

function createPlanModelFromImage(image: HTMLImageElement, imageUrl: string, sourceLabel: string): PlanModel {
  const canvas = document.createElement("canvas");
  const scale = Math.min(TARGET_SIZE / image.width, TARGET_SIZE / image.height, 1);
  const width = Math.max(36, Math.round(image.width * scale));
  const height = Math.max(36, Math.round(image.height * scale));

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D indisponivel.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const { data } = ctx.getImageData(0, 0, width, height);
  const grayscale = new Uint8Array(width * height);
  const alpha = new Uint8Array(width * height);

  for (let index = 0; index < data.length; index += 4) {
    const pixel = index / 4;
    grayscale[pixel] = Math.round(data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114);
    alpha[pixel] = data[index + 3];
  }

  const threshold = computeOtsuThreshold(grayscale, alpha);
  let binary = new Uint8Array(width * height);
  let activeCount = 0;

  for (let pixel = 0; pixel < grayscale.length; pixel += 1) {
    const isWall = alpha[pixel] > 10 && grayscale[pixel] <= threshold;
    binary[pixel] = isWall ? 1 : 0;
    activeCount += isWall ? 1 : 0;
  }

  binary = closeBinary(binary, width, height);

  const horizontalSegments = buildMergedSegments(binary, width, height, "horizontal");
  const verticalSegments = buildMergedSegments(binary, width, height, "vertical");
  const walls = dedupeSegments([...horizontalSegments, ...verticalSegments]);

  if (walls.length === 0) {
    throw new Error("Nao foi possivel identificar paredes na imagem. Use uma planta com linhas escuras sobre fundo claro.");
  }

  return {
    imageUrl,
    sourceLabel,
    floorWidth: width * PIXEL_TO_WORLD,
    floorDepth: height * PIXEL_TO_WORLD,
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

function buildMergedSegments(binary: Uint8Array, width: number, height: number, axis: SegmentAxis): WallSegment[] {
  const primaryLimit = axis === "horizontal" ? height : width;
  const secondaryLimit = axis === "horizontal" ? width : height;
  const activeSegments: TempSegment[] = [];
  const finished: TempSegment[] = [];

  for (let primary = 0; primary < primaryLimit; primary += 1) {
    const runs = extractRuns(binary, width, height, axis, primary, secondaryLimit);
    const consumed = new Set<number>();
    const nextActive: TempSegment[] = [];

    for (const run of runs) {
      let bestIndex = -1;
      let bestScore = Number.POSITIVE_INFINITY;

      for (let index = 0; index < activeSegments.length; index += 1) {
        const candidate = activeSegments[index];
        if (candidate.lastOrtho !== primary - 1 || consumed.has(index)) {
          continue;
        }

        const score = Math.abs(candidate.spanStart - run.start) + Math.abs(candidate.spanEnd - run.end);
        if (
          Math.abs(candidate.spanStart - run.start) <= MERGE_TOLERANCE &&
          Math.abs(candidate.spanEnd - run.end) <= MERGE_TOLERANCE &&
          score < bestScore
        ) {
          bestIndex = index;
          bestScore = score;
        }
      }

      if (bestIndex >= 0) {
        const candidate = activeSegments[bestIndex];
        consumed.add(bestIndex);
        candidate.spanStart = Math.min(candidate.spanStart, run.start);
        candidate.spanEnd = Math.max(candidate.spanEnd, run.end);
        candidate.orthoEnd = primary + 1;
        candidate.sumStart += run.start;
        candidate.sumEnd += run.end;
        candidate.count += 1;
        candidate.lastOrtho = primary;
        nextActive.push(candidate);
      } else {
        nextActive.push({
          spanStart: run.start,
          spanEnd: run.end,
          orthoStart: primary,
          orthoEnd: primary + 1,
          sumStart: run.start,
          sumEnd: run.end,
          count: 1,
          lastOrtho: primary,
        });
      }
    }

    activeSegments.forEach((segment, index) => {
      if (!consumed.has(index)) {
        finished.push(segment);
      }
    });

    activeSegments.length = 0;
    activeSegments.push(...nextActive);
  }

  finished.push(...activeSegments);

  return finished
    .map((segment) => toWallSegment(segment, width, height, axis))
    .filter((segment): segment is WallSegment => Boolean(segment));
}

function extractRuns(
  binary: Uint8Array,
  width: number,
  height: number,
  axis: SegmentAxis,
  primary: number,
  secondaryLimit: number,
): RawRun[] {
  const runs: RawRun[] = [];
  let cursor = 0;

  while (cursor < secondaryLimit) {
    const pixel = axis === "horizontal" ? binary[primary * width + cursor] : binary[cursor * width + primary];

    if (!pixel) {
      cursor += 1;
      continue;
    }

    let end = cursor;
    while (end < secondaryLimit) {
      const nextPixel = axis === "horizontal" ? binary[primary * width + end] : binary[end * width + primary];
      if (!nextPixel) {
        break;
      }
      end += 1;
    }

    if (end - cursor >= MIN_RUN) {
      runs.push({ start: cursor, end });
    }

    cursor = end;
  }

  return runs;
}

function toWallSegment(segment: TempSegment, width: number, height: number, axis: SegmentAxis): WallSegment | null {
  const averageStart = segment.sumStart / segment.count;
  const averageEnd = segment.sumEnd / segment.count;
  const spanLength = averageEnd - averageStart;
  const orthoLength = segment.orthoEnd - segment.orthoStart;

  if (spanLength < MIN_RUN || orthoLength < 1) {
    return null;
  }

  if (axis === "horizontal") {
    return {
      centerX: ((averageStart + averageEnd) / 2 - width / 2) * PIXEL_TO_WORLD,
      centerZ: ((segment.orthoStart + segment.orthoEnd) / 2 - height / 2) * PIXEL_TO_WORLD,
      width: Math.max(spanLength * PIXEL_TO_WORLD, WALL_THICKNESS),
      depth: Math.max(orthoLength * PIXEL_TO_WORLD, WALL_THICKNESS),
      height: WALL_HEIGHT,
    };
  }

  return {
    centerX: ((segment.orthoStart + segment.orthoEnd) / 2 - width / 2) * PIXEL_TO_WORLD,
    centerZ: ((averageStart + averageEnd) / 2 - height / 2) * PIXEL_TO_WORLD,
    width: Math.max(orthoLength * PIXEL_TO_WORLD, WALL_THICKNESS),
    depth: Math.max(spanLength * PIXEL_TO_WORLD, WALL_THICKNESS),
    height: WALL_HEIGHT,
  };
}

function computeOtsuThreshold(grayscale: Uint8Array, alpha: Uint8Array) {
  const histogram = new Array<number>(256).fill(0);
  let total = 0;
  let weightedSum = 0;

  for (let index = 0; index < grayscale.length; index += 1) {
    if (alpha[index] <= 10) {
      continue;
    }

    const value = grayscale[index];
    histogram[value] += 1;
    total += 1;
    weightedSum += value;
  }

  let backgroundWeight = 0;
  let backgroundSum = 0;
  let maxVariance = -1;
  let threshold = 160;

  for (let index = 0; index < histogram.length; index += 1) {
    backgroundWeight += histogram[index];
    if (!backgroundWeight) {
      continue;
    }

    const foregroundWeight = total - backgroundWeight;
    if (!foregroundWeight) {
      break;
    }

    backgroundSum += index * histogram[index];
    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (weightedSum - backgroundSum) / foregroundWeight;
    const variance = backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = index;
    }
  }

  return Math.min(195, Math.max(120, threshold));
}

function closeBinary(binary: Uint8Array, width: number, height: number) {
  return erode(dilate(binary, width, height), width, height);
}

function dilate(binary: Uint8Array, width: number, height: number) {
  const next = new Uint8Array(binary.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let active = 0;
      for (let offsetY = -1; offsetY <= 1 && !active; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const nx = x + offsetX;
          const ny = y + offsetY;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue;
          }
          if (binary[ny * width + nx]) {
            active = 1;
            break;
          }
        }
      }
      next[y * width + x] = active;
    }
  }

  return next;
}

function erode(binary: Uint8Array, width: number, height: number) {
  const next = new Uint8Array(binary.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let active = 1;
      for (let offsetY = -1; offsetY <= 1 && active; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const nx = x + offsetX;
          const ny = y + offsetY;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height || !binary[ny * width + nx]) {
            active = 0;
            break;
          }
        }
      }
      next[y * width + x] = active;
    }
  }

  return next;
}

function dedupeSegments(segments: WallSegment[]) {
  return segments.filter((segment, index) => {
    return !segments.some((other, otherIndex) => {
      if (otherIndex === index) {
        return false;
      }

      const almostSameCenter = Math.abs(other.centerX - segment.centerX) < 0.18 && Math.abs(other.centerZ - segment.centerZ) < 0.18;
      const almostSameSize = Math.abs(other.width - segment.width) < 0.22 && Math.abs(other.depth - segment.depth) < 0.22;

      return almostSameCenter && almostSameSize && otherIndex < index;
    });
  });
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
