import { ASSET_LIBRARY } from "@/lib/asset-library";
import type { ArchitecturalFeatures, AssetLibraryItem, PlanModel, SceneObject, Vec3 } from "@/lib/types";

export function findAssetById(assetId: string): AssetLibraryItem | null {
  for (const category of ASSET_LIBRARY) {
    const item = category.items.find((entry) => entry.id === assetId);
    if (item) {
      return item;
    }
  }

  return null;
}

export function createSceneObjectFromAsset(asset: AssetLibraryItem, count: number, planModel: PlanModel): SceneObject {
  const row = Math.floor(count / 3);
  const col = count % 3;
  const baseX = -planModel.floorWidth * 0.18 + col * 3.6;
  const baseZ = planModel.floorDepth * 0.18 - row * 3.4;
  const outdoorOffset = planModel.floorDepth * 0.42;

  const position: Vec3 =
    asset.prototype.placement === "outdoor"
      ? { x: -planModel.floorWidth * 0.32 + col * 4.6, y: 0, z: outdoorOffset - row * 4.4 }
      : { x: baseX, y: 0, z: baseZ };

  return {
    id: `${asset.id}-${Date.now()}-${count}`,
    assetId: asset.id,
    label: asset.label,
    category: asset.category,
    kind: asset.prototype.kind,
    placement: asset.prototype.placement,
    position,
    rotationY: 0,
    scale: asset.prototype.defaultScale ?? 1,
    size: asset.prototype.size,
    color: asset.prototype.color,
    accentColor: asset.prototype.accentColor,
    source: asset.source,
  };
}

export function clampSceneObjectPosition(position: Vec3, planModel: PlanModel, placement: SceneObject["placement"]): Vec3 {
  const margin = placement === "outdoor" ? 2.6 : 1.2;
  const x = clamp(position.x, -planModel.floorWidth / 2 + margin, planModel.floorWidth / 2 - margin);
  const zLimit = placement === "outdoor" ? planModel.floorDepth * 0.8 : planModel.floorDepth / 2 - margin;
  const zMin = placement === "outdoor" ? planModel.floorDepth * 0.15 : -planModel.floorDepth / 2 + margin;
  const z = clamp(position.z, zMin, zLimit);

  return { x, y: 0, z };
}

export function duplicateSceneObject(object: SceneObject, planModel: PlanModel): SceneObject {
  return {
    ...object,
    id: `${object.assetId}-${Date.now()}-copy`,
    position: clampSceneObjectPosition(
      {
        x: object.position.x + 1.2,
        y: 0,
        z: object.position.z + 1.2,
      },
      planModel,
      object.placement,
    ),
  };
}

export function summarizeProject(planModel: PlanModel, sceneObjects: SceneObject[], features: ArchitecturalFeatures) {
  return {
    objectCount: sceneObjects.length,
    indoorCount: sceneObjects.filter((item) => item.placement === "indoor").length,
    outdoorCount: sceneObjects.filter((item) => item.placement === "outdoor").length,
    architecturalCount: Number(features.roofEnabled) + Number(features.windowsEnabled) + Number(features.doorsEnabled) + Number(features.gardenEnabled),
    footprint: `${planModel.floorWidth.toFixed(1)}m x ${planModel.floorDepth.toFixed(1)}m`,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
