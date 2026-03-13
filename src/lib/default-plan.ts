import type { PlanModel } from "@/lib/types";

export const DEFAULT_PLAN_MODEL: PlanModel = {
  imageUrl: null,
  floorWidth: 14,
  floorDepth: 10,
  wallHeight: 2.8,
  wallThickness: 0.22,
  metrics: {
    width: 14,
    height: 10,
    wallCount: 12,
    coverage: 0.18,
  },
  walls: [
    { centerX: 0, centerZ: -4.89, width: 13.8, depth: 0.22, height: 2.8 },
    { centerX: 0, centerZ: 4.89, width: 13.8, depth: 0.22, height: 2.8 },
    { centerX: -6.89, centerZ: 0, width: 0.22, depth: 9.8, height: 2.8 },
    { centerX: 6.89, centerZ: 0, width: 0.22, depth: 9.8, height: 2.8 },
    { centerX: -2.6, centerZ: 0.8, width: 0.22, depth: 8, height: 2.8 },
    { centerX: 2.1, centerZ: -0.8, width: 0.22, depth: 6.4, height: 2.8 },
    { centerX: -1.3, centerZ: -1.9, width: 5.6, depth: 0.22, height: 2.8 },
    { centerX: 3.4, centerZ: 1.9, width: 6.8, depth: 0.22, height: 2.8 },
    { centerX: -4.55, centerZ: 2.6, width: 4.5, depth: 0.22, height: 2.8 },
    { centerX: 4.3, centerZ: -3.05, width: 4.9, depth: 0.22, height: 2.8 },
    { centerX: -5.3, centerZ: -1.2, width: 0.22, depth: 3.6, height: 2.8 },
    { centerX: 0.8, centerZ: 3.4, width: 0.22, depth: 2.8, height: 2.8 }
  ],
};
