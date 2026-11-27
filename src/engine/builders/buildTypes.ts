import * as THREE from 'three';

export interface BuildingCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
  tag?: string;
}

export interface CircleCollider {
  x: number;
  z: number;
  radius: number;
  tag?: string;
}

export interface MetroEscalatorZone {
  x1: number;
  z1: number;
  y1: number;
  x2: number;
  z2: number;
  y2: number;
  halfWidth: number;
  kioskX: number;
  kioskZ: number;
  kioskHalfX: number;
  kioskHalfZ: number;
  landMinX: number;
  landMaxX: number;
  landMinZ: number;
  landMaxZ: number;
  landY: number;
}

export interface MetroStationInteriorZone {
  concourseMinX: number;
  concourseMaxX: number;
  concourseMinZ: number;
  concourseMaxZ: number;
  concourseY: number;
  platMinX: number;
  platMaxX: number;
  platMinZ: number;
  platMaxZ: number;
  platY: number;
  inX1: number;
  inZ1: number;
  inY1: number;
  inX2: number;
  inZ2: number;
  inY2: number;
  inHalfW: number;
}

export interface SceneBuilderContext {
  scene: THREE.Scene;
  sharedBox: (
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number
  ) => THREE.Mesh;
  boxCache: (w: number, h: number, d: number) => THREE.BufferGeometry;
  cylCache: (rt: number, rb: number, h: number, seg?: number) => THREE.BufferGeometry;
  buildingColliders: BuildingCollider[];
  circleColliders: CircleCollider[];
  streetLampStdMats: THREE.MeshStandardMaterial[];
  streetLampBasicMats: THREE.MeshBasicMaterial[];
}
