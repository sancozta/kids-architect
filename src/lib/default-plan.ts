import type { PlanModel } from "@/lib/types";

export const DEFAULT_PLAN_MODEL: PlanModel = {
  imageUrl: null,
  floorWidth: 36,
  floorDepth: 25,
  wallHeight: 2.8,
  wallThickness: 0.24,
  metrics: {
    width: 36,
    height: 25,
    wallCount: 23,
    coverage: 0.22,
  },
  walls: [
    { centerX: 0, centerZ: -12.38, width: 35.6, depth: 0.24, height: 2.8 },
    { centerX: 0, centerZ: 12.38, width: 35.6, depth: 0.24, height: 2.8 },
    { centerX: -17.88, centerZ: 0, width: 0.24, depth: 24.76, height: 2.8 },
    { centerX: 17.88, centerZ: 0, width: 0.24, depth: 24.76, height: 2.8 },

    { centerX: 0, centerZ: 0.65, width: 35.2, depth: 0.24, height: 2.8 },
    { centerX: -2.3, centerZ: 6.6, width: 0.24, depth: 11.6, height: 2.8 },
    { centerX: 6.2, centerZ: -5.7, width: 0.24, depth: 13.1, height: 2.8 },
    { centerX: 11.9, centerZ: 6.6, width: 0.24, depth: 11.6, height: 2.8 },

    { centerX: 11.7, centerZ: -7.4, width: 12.2, depth: 0.24, height: 2.8 },
    { centerX: 8.45, centerZ: -3.2, width: 5.5, depth: 0.24, height: 2.8 },
    { centerX: 3.05, centerZ: -3.2, width: 5.8, depth: 0.24, height: 2.8 },
    { centerX: 2.55, centerZ: 3.5, width: 0.24, depth: 5.4, height: 2.8 },
    { centerX: 7.8, centerZ: 3.7, width: 0.24, depth: 5.0, height: 2.8 },
    { centerX: 4.95, centerZ: 5.95, width: 5.9, depth: 0.24, height: 2.8 },

    { centerX: -10.2, centerZ: -6.9, width: 12.6, depth: 0.24, height: 2.8 },
    { centerX: -7.4, centerZ: -9.25, width: 0.24, depth: 5.6, height: 2.8 },
    { centerX: -1.4, centerZ: -8.55, width: 0.24, depth: 4.3, height: 2.8 },
    { centerX: -4.35, centerZ: -4.95, width: 5.7, depth: 0.24, height: 2.8 },

    { centerX: -0.4, centerZ: 6.45, width: 4.0, depth: 0.24, height: 2.8 },
    { centerX: 4.2, centerZ: 9.15, width: 0.24, depth: 6.3, height: 2.8 },
    { centerX: 8.2, centerZ: 9.15, width: 0.24, depth: 6.3, height: 2.8 },
    { centerX: 11.05, centerZ: 9.15, width: 5.5, depth: 0.24, height: 2.8 },

    { centerX: 15.2, centerZ: -1.6, width: 0.24, depth: 2.4, height: 2.8 }
  ],
};
