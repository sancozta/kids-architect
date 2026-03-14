"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { GestureFrame, PlanModel } from "@/lib/types";

type ViewerProps = {
  planModel: PlanModel;
  gestureRef: React.MutableRefObject<GestureFrame>;
  gesturesLocked?: boolean;
  onExpand?: () => void;
};

export function ThreeHouseViewer({ planModel, gestureRef, gesturesLocked = false, onExpand }: ViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

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
    scene.fog = new THREE.Fog("#f7f2ea", 16, 42);

    const initialSize = getViewportSize();
    const camera = new THREE.PerspectiveCamera(45, initialSize.width / initialSize.height, 0.1, 100);
    const sceneRadius = Math.max(planModel.floorWidth, planModel.floorDepth) * 0.65;
    const cameraDistance = Math.max(sceneRadius * 1.35, 18);
    camera.position.set(cameraDistance, cameraDistance * 0.82, cameraDistance);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(initialSize.width, initialSize.height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = Math.max(sceneRadius * 0.45, 8);
    controls.maxDistance = Math.max(sceneRadius * 2.8, 34);
    controls.minPolarAngle = 0.45;
    controls.maxPolarAngle = Math.PI / 2.08;
    controls.target.set(0, Math.max(planModel.wallHeight * 0.35, 1.2), 0);
    controls.update();

    const ambientLight = new THREE.AmbientLight("#fff6e8", 1.1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight("#ffffff", 2.2);
    directionalLight.position.set(sceneRadius * 0.8, sceneRadius, sceneRadius * 0.65);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);

    const world = buildWorld(planModel);
    scene.add(world);

    let frameId = 0;
    const spherical = new THREE.Spherical();

    const animate = () => {
      const gesture = gestureRef.current;

      if (!gesturesLocked && gesture.gestureActive) {
        const offset = camera.position.clone().sub(controls.target);
        spherical.setFromVector3(offset);
        spherical.theta += gesture.rotationDeltaX * 0.11;
        spherical.phi += gesture.rotationDeltaY * 0.09;
        spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
        offset.setFromSpherical(spherical);
        camera.position.copy(controls.target.clone().add(offset));
      }

      if (!gesturesLocked && Math.abs(gesture.rotationDeltaZ) > 0.001) {
        world.rotation.y += gesture.rotationDeltaZ * 0.8;
      }

      if (!gesturesLocked && gesture.zoomDelta > 0.002) {
        const offset = camera.position.clone().sub(controls.target).multiplyScalar(Math.max(0.97, 1 - gesture.zoomDelta * 0.22));
        camera.position.copy(controls.target.clone().add(offset));
      } else if (!gesturesLocked && gesture.zoomDelta < -0.002) {
        const offset = camera.position.clone().sub(controls.target).multiplyScalar(Math.min(1.03, 1 + Math.abs(gesture.zoomDelta) * 0.22));
        camera.position.copy(controls.target.clone().add(offset));
      }

      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      if (!mount) {
        return;
      }

      const nextSize = getViewportSize();
      camera.aspect = nextSize.width / nextSize.height;
      camera.updateProjectionMatrix();
      renderer.setSize(nextSize.width, nextSize.height);
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
      controls.dispose();
      world.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }

        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => material.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [gesturesLocked, planModel, gestureRef]);

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

function buildWorld(planModel: PlanModel) {
  const group = new THREE.Group();
  group.position.set(0, -0.4, 0);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(38, 38),
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

  const roofHint = new THREE.Mesh(
    new THREE.BoxGeometry(planModel.floorWidth, 0.06, planModel.floorDepth),
    new THREE.MeshStandardMaterial({ color: "#f7efe7", transparent: true, opacity: 0.45 }),
  );
  roofHint.position.set(0, planModel.wallHeight + 0.12, 0);
  group.add(roofHint);

  const grid = new THREE.GridHelper(32, 32, "#c06a35", "#d8cab4");
  grid.position.set(0, 0.06, 0);
  group.add(grid);

  return group;
}
