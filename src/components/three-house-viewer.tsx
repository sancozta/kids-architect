"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { ArchitecturalFeatures, GestureFrame, PlanModel, SceneObject } from "@/lib/types";

type ViewerProps = {
  planModel: PlanModel;
  gestureRef: React.MutableRefObject<GestureFrame>;
  gesturesLocked?: boolean;
  onExpand?: () => void;
  sceneObjects?: SceneObject[];
  selectedSceneObjectId?: string | null;
  architecturalFeatures?: ArchitecturalFeatures;
  onSelectSceneObject?: (id: string | null) => void;
  onUpdateSceneObject?: (id: string, patch: Partial<SceneObject>) => void;
  snapEnabled?: boolean;
};

type ViewerRuntime = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  contentGroup: THREE.Group;
  planGroup: THREE.Group;
  objectGroup: THREE.Group;
  meshMap: Map<string, THREE.Group>;
  directionalLight: THREE.DirectionalLight;
  sceneRadius: number;
};

export function ThreeHouseViewer({
  planModel,
  gestureRef,
  gesturesLocked = false,
  onExpand,
  sceneObjects = [],
  selectedSceneObjectId = null,
  architecturalFeatures = {
    roofEnabled: false,
    windowsEnabled: false,
    doorsEnabled: false,
    gardenEnabled: false,
  },
  onSelectSceneObject,
  onUpdateSceneObject,
  snapEnabled = true,
}: ViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<ViewerRuntime | null>(null);
  const gestureLockRef = useRef(gesturesLocked);
  const sceneObjectsRef = useRef(sceneObjects);
  const selectedIdRef = useRef(selectedSceneObjectId);
  const onSelectRef = useRef(onSelectSceneObject);
  const onUpdateRef = useRef(onUpdateSceneObject);
  const dragRef = useRef<{ id: string; offset: THREE.Vector3 } | null>(null);

  useEffect(() => {
    gestureLockRef.current = gesturesLocked;
  }, [gesturesLocked]);

  useEffect(() => {
    sceneObjectsRef.current = sceneObjects;
  }, [sceneObjects]);

  useEffect(() => {
    selectedIdRef.current = selectedSceneObjectId;
  }, [selectedSceneObjectId]);

  useEffect(() => {
    onSelectRef.current = onSelectSceneObject;
  }, [onSelectSceneObject]);

  useEffect(() => {
    onUpdateRef.current = onUpdateSceneObject;
  }, [onUpdateSceneObject]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const getViewportSize = () => ({
      width: Math.max(mount.clientWidth, 640),
      height: Math.max(mount.clientHeight, 360),
    });

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f7f2ea");
    scene.fog = new THREE.Fog("#f7f2ea", 18, 46);

    const initialSize = getViewportSize();
    const camera = new THREE.PerspectiveCamera(45, initialSize.width / initialSize.height, 0.1, 120);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(initialSize.width, initialSize.height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minPolarAngle = 0.45;
    controls.maxPolarAngle = Math.PI / 2.08;

    const ambientLight = new THREE.AmbientLight("#fff6e8", 1.1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight("#ffffff", 2.2);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 80;
    scene.add(directionalLight);

    const contentGroup = new THREE.Group();
    contentGroup.position.set(0, -0.4, 0);
    scene.add(contentGroup);

    const planGroup = new THREE.Group();
    const objectGroup = new THREE.Group();
    contentGroup.add(planGroup);
    contentGroup.add(objectGroup);

    runtimeRef.current = {
      scene,
      camera,
      renderer,
      controls,
      contentGroup,
      planGroup,
      objectGroup,
      meshMap: new Map(),
      directionalLight,
      sceneRadius: 18,
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const dragPoint = new THREE.Vector3();

    const setPointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const findSceneObjectId = (object: THREE.Object3D | null) => {
      let current: THREE.Object3D | null = object;
      while (current) {
        const sceneObjectId = current.userData.sceneObjectId as string | undefined;
        if (sceneObjectId) {
          return sceneObjectId;
        }
        current = current.parent;
      }

      return null;
    };

    const handlePointerDown = (event: PointerEvent) => {
      const runtime = runtimeRef.current;
      if (!runtime) {
        return;
      }

      setPointer(event);
      raycaster.setFromCamera(pointer, runtime.camera);
      const intersections = raycaster.intersectObjects(runtime.objectGroup.children, true);
      const targetId = findSceneObjectId(intersections[0]?.object ?? null);

      if (!targetId) {
        onSelectRef.current?.(null);
        return;
      }

      onSelectRef.current?.(targetId);
      const selected = sceneObjectsRef.current.find((item) => item.id === targetId);
      if (!selected) {
        return;
      }

      if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
        dragRef.current = {
          id: targetId,
          offset: new THREE.Vector3(dragPoint.x - selected.position.x, 0, dragPoint.z - selected.position.z),
        };
        runtime.controls.enabled = false;
        runtime.renderer.domElement.style.cursor = "grabbing";
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const runtime = runtimeRef.current;
      if (!runtime) {
        return;
      }

      setPointer(event);
      raycaster.setFromCamera(pointer, runtime.camera);

      if (dragRef.current && raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
        onUpdateRef.current?.(dragRef.current.id, {
          position: {
            x: snapEnabled ? snapToStep(dragPoint.x - dragRef.current.offset.x, 0.5) : dragPoint.x - dragRef.current.offset.x,
            y: 0,
            z: snapEnabled ? snapToStep(dragPoint.z - dragRef.current.offset.z, 0.5) : dragPoint.z - dragRef.current.offset.z,
          },
        });
        return;
      }

      const intersections = raycaster.intersectObjects(runtime.objectGroup.children, true);
      runtime.renderer.domElement.style.cursor = intersections.length ? "grab" : "default";
    };

    const handlePointerUp = () => {
      const runtime = runtimeRef.current;
      if (!runtime) {
        return;
      }

      dragRef.current = null;
      runtime.controls.enabled = true;
      runtime.renderer.domElement.style.cursor = "default";
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    let frameId = 0;
    const spherical = new THREE.Spherical();

    const animate = () => {
      const runtime = runtimeRef.current;
      if (!runtime) {
        return;
      }

      const gesture = gestureRef.current;

      if (!gestureLockRef.current && gesture.gestureActive && !dragRef.current) {
        const offset = runtime.camera.position.clone().sub(runtime.controls.target);
        spherical.setFromVector3(offset);
        spherical.theta += gesture.rotationDeltaX * 0.11;
        spherical.phi += gesture.rotationDeltaY * 0.09;
        spherical.phi = THREE.MathUtils.clamp(spherical.phi, runtime.controls.minPolarAngle, runtime.controls.maxPolarAngle);
        offset.setFromSpherical(spherical);
        runtime.camera.position.copy(runtime.controls.target.clone().add(offset));
      }

      if (!gestureLockRef.current && Math.abs(gesture.rotationDeltaZ) > 0.001) {
        runtime.contentGroup.rotation.y += gesture.rotationDeltaZ * 0.8;
      }

      if (!gestureLockRef.current && gesture.zoomDelta > 0.002) {
        const offset = runtime.camera.position.clone().sub(runtime.controls.target).multiplyScalar(Math.max(0.97, 1 - gesture.zoomDelta * 0.22));
        runtime.camera.position.copy(runtime.controls.target.clone().add(offset));
      } else if (!gestureLockRef.current && gesture.zoomDelta < -0.002) {
        const offset = runtime.camera.position.clone().sub(runtime.controls.target).multiplyScalar(Math.min(1.03, 1 + Math.abs(gesture.zoomDelta) * 0.22));
        runtime.camera.position.copy(runtime.controls.target.clone().add(offset));
      }

      runtime.controls.update();
      runtime.renderer.render(runtime.scene, runtime.camera);
      frameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      const runtime = runtimeRef.current;
      if (!runtime || !mount) {
        return;
      }

      const nextSize = getViewportSize();
      runtime.camera.aspect = nextSize.width / nextSize.height;
      runtime.camera.updateProjectionMatrix();
      runtime.renderer.setSize(nextSize.width, nextSize.height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mount);
    window.addEventListener("resize", handleResize);
    handleResize();
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      controls.dispose();
      disposeGroup(contentGroup);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      runtimeRef.current = null;
    };
  }, [gestureRef, snapEnabled]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    replaceGroupChildren(runtime.planGroup, buildWorld(planModel, architecturalFeatures));
    fitCamera(runtime, planModel);
    runtime.renderer.render(runtime.scene, runtime.camera);
  }, [architecturalFeatures, planModel]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    syncSceneObjects(runtime, sceneObjects, selectedSceneObjectId);
    runtime.renderer.render(runtime.scene, runtime.camera);
  }, [sceneObjects, selectedSceneObjectId]);

  return (
    <div className="relative h-full min-h-[360px] overflow-hidden rounded-[5px]">
      <div ref={mountRef} className="glass-panel h-full overflow-hidden rounded-[5px]" />
      <div className="pointer-events-none absolute bottom-3 right-3 flex items-end gap-2">
        <div className="rounded-[5px] border border-white/10 bg-[rgba(11,16,22,0.76)] px-3 py-2 text-white backdrop-blur-sm">
          <div className="grid gap-1 text-[10px] uppercase tracking-[0.16em] text-white/72">
            <div className="flex items-center justify-between gap-3">
              <span>Orbita</span>
              <span className="text-xs text-white">↔</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Giro</span>
              <span className="text-xs text-white">↻</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Zoom</span>
              <span className="text-xs text-white">+ -</span>
            </div>
          </div>
        </div>
        {onExpand ? (
          <button
            type="button"
            onClick={onExpand}
            className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center self-end rounded-[5px] border border-white/10 bg-[rgba(11,16,22,0.82)] text-[var(--foreground)] transition hover:border-[var(--accent)]/35 hover:text-[var(--accent)]"
            aria-label="Expandir maquete 3D"
            title="Expandir maquete 3D"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
              <path d="M9 4H4v5" />
              <path d="M4 4l6 6" />
              <path d="M15 4h5v5" />
              <path d="M20 4l-6 6" />
              <path d="M4 15v5h5" />
              <path d="M4 20l6-6" />
              <path d="M20 15v5h-5" />
              <path d="M20 20l-6-6" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function fitCamera(runtime: ViewerRuntime, planModel: PlanModel) {
  runtime.sceneRadius = Math.max(planModel.floorWidth, planModel.floorDepth) * 0.65;
  const cameraDistance = Math.max(runtime.sceneRadius * 1.35, 18);

  runtime.camera.position.set(cameraDistance, cameraDistance * 0.82, cameraDistance);
  runtime.controls.target.set(0, Math.max(planModel.wallHeight * 0.35, 1.2), 0);
  runtime.controls.minDistance = Math.max(runtime.sceneRadius * 0.45, 8);
  runtime.controls.maxDistance = Math.max(runtime.sceneRadius * 2.8, 34);
  runtime.controls.update();
  runtime.directionalLight.position.set(runtime.sceneRadius * 0.8, runtime.sceneRadius, runtime.sceneRadius * 0.65);
}

function syncSceneObjects(runtime: ViewerRuntime, sceneObjects: SceneObject[], selectedSceneObjectId: string | null) {
  const remainingIds = new Set(sceneObjects.map((item) => item.id));

  for (const [id, mesh] of runtime.meshMap.entries()) {
    if (!remainingIds.has(id)) {
      runtime.objectGroup.remove(mesh);
      disposeGroup(mesh);
      runtime.meshMap.delete(id);
    }
  }

  for (const sceneObject of sceneObjects) {
    let mesh = runtime.meshMap.get(sceneObject.id);
    if (!mesh) {
      mesh = buildSceneObjectMesh(sceneObject);
      runtime.objectGroup.add(mesh);
      runtime.meshMap.set(sceneObject.id, mesh);
    }

    mesh.position.set(sceneObject.position.x, sceneObject.position.y, sceneObject.position.z);
    mesh.rotation.y = sceneObject.rotationY;
    mesh.scale.setScalar(sceneObject.scale);
    applySelectionState(mesh, sceneObject.id === selectedSceneObjectId);
  }
}

function applySelectionState(group: THREE.Group, selected: boolean) {
  const gizmo = group.userData.selectionGizmo as THREE.Group | undefined;
  if (gizmo) {
    gizmo.visible = selected;
  }

  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!("material" in mesh) || !mesh.material) {
      return;
    }

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const emissiveMaterial = material as THREE.MeshStandardMaterial;
      if ("emissive" in emissiveMaterial) {
        emissiveMaterial.emissive.set(selected ? "#7c4a27" : "#000000");
        emissiveMaterial.emissiveIntensity = selected ? 0.32 : 0;
      }
    }
  });
}

function buildWorld(planModel: PlanModel, features: ArchitecturalFeatures) {
  const group = new THREE.Group();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 44),
    new THREE.MeshStandardMaterial({ color: "#e6ddd0" }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(planModel.floorWidth, 0.08, planModel.floorDepth),
    new THREE.MeshStandardMaterial({ color: "#f0c48a", roughness: 0.8 }),
  );
  floor.position.set(0, 0.02, 0);
  floor.receiveShadow = true;
  group.add(floor);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: "#d9b08c",
    roughness: 0.72,
    metalness: 0.05,
  });

  for (const wall of planModel.walls) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(wall.width, wall.height, wall.depth), wallMaterial.clone());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(wall.centerX, wall.height / 2, wall.centerZ);
    group.add(mesh);
  }

  if (features.roofEnabled) {
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(planModel.floorWidth + 0.8, 0.18, planModel.floorDepth + 0.8),
      new THREE.MeshStandardMaterial({ color: "#f6efe8", roughness: 0.78 }),
    );
    roof.position.set(0, planModel.wallHeight + 0.35, 0);
    roof.castShadow = true;
    group.add(roof);

    const roofAccent = new THREE.Mesh(
      new THREE.BoxGeometry(planModel.floorWidth * 0.46, 0.12, planModel.floorDepth * 0.22),
      new THREE.MeshStandardMaterial({ color: "#e8dfd6", roughness: 0.68 }),
    );
    roofAccent.position.set(-planModel.floorWidth * 0.08, planModel.wallHeight + 0.5, -planModel.floorDepth * 0.02);
    roofAccent.castShadow = true;
    group.add(roofAccent);
  }

  if (features.doorsEnabled) {
    const doorMaterial = new THREE.MeshStandardMaterial({ color: "#8a6141", roughness: 0.62 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.3, 0.08), doorMaterial);
    door.position.set(0.6, 1.15, planModel.floorDepth / 2 - 0.08);
    door.castShadow = true;
    group.add(door);
  }

  if (features.windowsEnabled) {
    const windowMaterial = new THREE.MeshStandardMaterial({ color: "#dce7f0", metalness: 0.25, roughness: 0.18 });
    const placements = [
      [-planModel.floorWidth * 0.26, 1.5, planModel.floorDepth / 2 - 0.07],
      [planModel.floorWidth * 0.18, 1.5, planModel.floorDepth / 2 - 0.07],
      [-planModel.floorWidth / 2 + 0.07, 1.45, 0],
      [planModel.floorWidth / 2 - 0.07, 1.45, 0],
    ];

    placements.forEach(([x, y, z], index) => {
      const geometry = index < 2 ? new THREE.BoxGeometry(2, 1.15, 0.06) : new THREE.BoxGeometry(0.06, 1, 1.5);
      const mesh = new THREE.Mesh(geometry, windowMaterial.clone());
      mesh.position.set(x, y, z);
      if (index >= 2) {
        mesh.rotation.y = Math.PI / 2;
      }
      group.add(mesh);
    });
  }

  if (features.gardenEnabled) {
    const soil = new THREE.Mesh(
      new THREE.BoxGeometry(planModel.floorWidth * 0.36, 0.1, 2),
      new THREE.MeshStandardMaterial({ color: "#a57c55", roughness: 0.86 }),
    );
    soil.position.set(0, 0.06, planModel.floorDepth * 0.58);
    group.add(soil);

    for (let index = 0; index < 4; index += 1) {
      const bush = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 18, 18),
        new THREE.MeshStandardMaterial({ color: index % 2 === 0 ? "#4f8d55" : "#5f954e", roughness: 0.9 }),
      );
      bush.position.set(-planModel.floorWidth * 0.12 + index * 2.1, 0.5, planModel.floorDepth * 0.58);
      bush.castShadow = true;
      group.add(bush);
    }
  }

  const grid = new THREE.GridHelper(40, 40, "#c06a35", "#d8cab4");
  grid.position.set(0, 0.06, 0);
  group.add(grid);

  return group;
}

function buildSceneObjectMesh(sceneObject: SceneObject) {
  const group = new THREE.Group();
  group.userData.sceneObjectId = sceneObject.id;

  const baseMaterial = new THREE.MeshStandardMaterial({
    color: sceneObject.color,
    roughness: 0.72,
    metalness: 0.08,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: sceneObject.accentColor ?? "#ffffff",
    roughness: 0.58,
    metalness: 0.12,
  });

  if (sceneObject.kind === "sofa") {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(sceneObject.size.x, 0.45, sceneObject.size.z), baseMaterial.clone());
    seat.position.y = 0.32;
    seat.castShadow = true;
    group.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(sceneObject.size.x, 0.85, 0.22), baseMaterial.clone());
    back.position.set(0, 0.74, -sceneObject.size.z / 2 + 0.12);
    back.castShadow = true;
    group.add(back);

    const armLeft = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, sceneObject.size.z), baseMaterial.clone());
    armLeft.position.set(-sceneObject.size.x / 2 + 0.12, 0.45, 0);
    armLeft.castShadow = true;
    group.add(armLeft);

    const armRight = armLeft.clone();
    armRight.position.x *= -1;
    group.add(armRight);
  }

  if (sceneObject.kind === "tv") {
    const screen = new THREE.Mesh(new THREE.BoxGeometry(sceneObject.size.x, sceneObject.size.y, sceneObject.size.z), baseMaterial.clone());
    screen.position.y = 1.1;
    screen.castShadow = true;
    group.add(screen);

    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.18), accentMaterial.clone());
    stand.position.y = 0.4;
    group.add(stand);

    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 0.5), accentMaterial.clone());
    rack.position.y = 0.1;
    rack.castShadow = true;
    group.add(rack);
  }

  if (sceneObject.kind === "table-set") {
    const top = new THREE.Mesh(new THREE.BoxGeometry(sceneObject.size.x, 0.18, sceneObject.size.z), baseMaterial.clone());
    top.position.y = 0.86;
    top.castShadow = true;
    group.add(top);

    const legPositions = [
      [-sceneObject.size.x / 2 + 0.18, 0.4, -sceneObject.size.z / 2 + 0.18],
      [sceneObject.size.x / 2 - 0.18, 0.4, -sceneObject.size.z / 2 + 0.18],
      [-sceneObject.size.x / 2 + 0.18, 0.4, sceneObject.size.z / 2 - 0.18],
      [sceneObject.size.x / 2 - 0.18, 0.4, sceneObject.size.z / 2 - 0.18],
    ] as const;

    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), accentMaterial.clone());
      leg.position.set(x, y, z);
      leg.castShadow = true;
      group.add(leg);
    });

    const chairOffsets = [
      [0, 0.45, -sceneObject.size.z / 2 - 0.48],
      [0, 0.45, sceneObject.size.z / 2 + 0.48],
      [-sceneObject.size.x / 2 - 0.48, 0.45, 0],
      [sceneObject.size.x / 2 + 0.48, 0.45, 0],
    ] as const;

    chairOffsets.forEach(([x, y, z], index) => {
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), accentMaterial.clone());
      chair.position.set(x, y, z);
      chair.rotation.y = index >= 2 ? Math.PI / 2 : 0;
      chair.castShadow = true;
      group.add(chair);
    });
  }

  if (sceneObject.kind === "chair") {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), baseMaterial.clone());
    seat.position.y = 0.48;
    seat.castShadow = true;
    group.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.12), baseMaterial.clone());
    back.position.set(0, 0.78, -0.21);
    back.castShadow = true;
    group.add(back);
  }

  if (sceneObject.kind === "bed") {
    const base = new THREE.Mesh(new THREE.BoxGeometry(sceneObject.size.x, 0.32, sceneObject.size.z), accentMaterial.clone());
    base.position.y = 0.22;
    base.castShadow = true;
    group.add(base);

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(sceneObject.size.x - 0.12, 0.24, sceneObject.size.z - 0.12), baseMaterial.clone());
    mattress.position.y = 0.5;
    mattress.castShadow = true;
    group.add(mattress);

    const headboard = new THREE.Mesh(new THREE.BoxGeometry(sceneObject.size.x, 0.82, 0.12), accentMaterial.clone());
    headboard.position.set(0, 0.7, -sceneObject.size.z / 2 + 0.05);
    headboard.castShadow = true;
    group.add(headboard);
  }

  if (sceneObject.kind === "tree") {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.1, 12), accentMaterial.clone());
    trunk.position.y = 0.55;
    trunk.castShadow = true;
    group.add(trunk);

    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.9, 18, 18), baseMaterial.clone());
    crown.position.y = 1.8;
    crown.castShadow = true;
    group.add(crown);
  }

  if (sceneObject.kind === "garden") {
    const soil = new THREE.Mesh(new THREE.BoxGeometry(sceneObject.size.x, sceneObject.size.y, sceneObject.size.z), accentMaterial.clone());
    soil.position.y = 0.08;
    group.add(soil);

    for (let index = 0; index < 3; index += 1) {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), baseMaterial.clone());
      bush.position.set(-0.65 + index * 0.65, 0.38, 0);
      bush.castShadow = true;
      group.add(bush);
    }
  }

  if (sceneObject.kind === "car") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(sceneObject.size.x, 0.72, sceneObject.size.z), baseMaterial.clone());
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(sceneObject.size.x * 0.52, 0.58, sceneObject.size.z * 0.82), accentMaterial.clone());
    cabin.position.set(0.2, 0.95, 0);
    cabin.castShadow = true;
    group.add(cabin);

    const wheelMaterial = new THREE.MeshStandardMaterial({ color: "#1b212a", roughness: 0.88 });
    const wheelPositions = [
      [-sceneObject.size.x / 2 + 0.55, 0.22, -sceneObject.size.z / 2 + 0.22],
      [sceneObject.size.x / 2 - 0.55, 0.22, -sceneObject.size.z / 2 + 0.22],
      [-sceneObject.size.x / 2 + 0.55, 0.22, sceneObject.size.z / 2 - 0.22],
      [sceneObject.size.x / 2 - 0.55, 0.22, sceneObject.size.z / 2 - 0.22],
    ] as const;

    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 18), wheelMaterial.clone());
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      group.add(wheel);
    });
  }

  if (sceneObject.kind === "decor") {
    const box = new THREE.Mesh(new THREE.BoxGeometry(sceneObject.size.x, sceneObject.size.y, sceneObject.size.z), baseMaterial.clone());
    box.position.y = sceneObject.size.y / 2;
    box.castShadow = true;
    group.add(box);
  }

  group.traverse((object) => {
    object.userData.sceneObjectId = sceneObject.id;
  });

  const selectionGizmo = createSelectionGizmo(sceneObject.size);
  selectionGizmo.visible = false;
  group.userData.selectionGizmo = selectionGizmo;
  group.add(selectionGizmo);

  return group;
}

function replaceGroupChildren(target: THREE.Group, nextGroup: THREE.Group) {
  while (target.children.length) {
    const child = target.children.pop();
    if (child) {
      disposeGroup(child);
    }
  }

  nextGroup.children.forEach((child) => target.add(child));
}

function disposeGroup(object: THREE.Object3D) {
  object.traverse((entry) => {
    const mesh = entry as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material) => material.dispose());
    } else if (mesh.material) {
      mesh.material.dispose();
    }
  });
}

function snapToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function createSelectionGizmo(size: SceneObject["size"]) {
  const group = new THREE.Group();
  const radiusX = Math.max(size.x / 2 + 0.22, 0.45);
  const radiusZ = Math.max(size.z / 2 + 0.22, 0.45);
  const color = "#df7534";

  const corners = [
    new THREE.Vector3(-radiusX, 0.03, -radiusZ),
    new THREE.Vector3(radiusX, 0.03, -radiusZ),
    new THREE.Vector3(radiusX, 0.03, radiusZ),
    new THREE.Vector3(-radiusX, 0.03, radiusZ),
  ];
  const ringGeometry = new THREE.BufferGeometry().setFromPoints([...corners, corners[0]]);
  const ring = new THREE.Line(
    ringGeometry,
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
    }),
  );
  group.add(ring);

  const xAxis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-radiusX - 0.2, 0.04, 0), new THREE.Vector3(radiusX + 0.2, 0.04, 0)]),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.72 }),
  );
  group.add(xAxis);

  const zAxis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.04, -radiusZ - 0.2), new THREE.Vector3(0, 0.04, radiusZ + 0.2)]),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.72 }),
  );
  group.add(zAxis);

  const handleMaterial = new THREE.MeshBasicMaterial({ color });
  const handles = [
    new THREE.Vector3(radiusX + 0.22, 0.05, 0),
    new THREE.Vector3(-radiusX - 0.22, 0.05, 0),
    new THREE.Vector3(0, 0.05, radiusZ + 0.22),
    new THREE.Vector3(0, 0.05, -radiusZ - 0.22),
  ];

  handles.forEach((position) => {
    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), handleMaterial.clone());
    handle.position.copy(position);
    group.add(handle);
  });

  return group;
}
