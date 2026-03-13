"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { GestureFrame, PlanModel } from "@/lib/types";

type ViewerProps = {
  planModel: PlanModel;
  gestureRef: React.MutableRefObject<GestureFrame>;
};

export function ThreeHouseViewer({ planModel, gestureRef }: ViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f7f2ea");
    scene.fog = new THREE.Fog("#f7f2ea", 16, 42);

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(8, 8, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 5;
    controls.maxDistance = 26;
    controls.minPolarAngle = 0.45;
    controls.maxPolarAngle = Math.PI / 2.08;
    controls.target.set(0, 1.2, 0);
    controls.update();

    const ambientLight = new THREE.AmbientLight("#fff6e8", 1.1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight("#ffffff", 2.2);
    directionalLight.position.set(10, 14, 8);
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

      if (gesture.gestureActive) {
        const offset = camera.position.clone().sub(controls.target);
        spherical.setFromVector3(offset);
        spherical.theta += gesture.rotationDeltaX * 0.11;
        spherical.phi += gesture.rotationDeltaY * 0.09;
        spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
        offset.setFromSpherical(spherical);
        camera.position.copy(controls.target.clone().add(offset));
      }

      if (Math.abs(gesture.rotationDeltaZ) > 0.001) {
        world.rotation.y += gesture.rotationDeltaZ * 0.8;
      }

      if (gesture.zoomDelta > 0.002) {
        const offset = camera.position.clone().sub(controls.target).multiplyScalar(Math.max(0.97, 1 - gesture.zoomDelta * 0.22));
        camera.position.copy(controls.target.clone().add(offset));
      } else if (gesture.zoomDelta < -0.002) {
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

      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener("resize", handleResize);
    animate();

    return () => {
      cancelAnimationFrame(frameId);
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
  }, [planModel, gestureRef]);

  return <div ref={mountRef} className="glass-panel h-[520px] overflow-hidden rounded-[2rem]" />;
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
