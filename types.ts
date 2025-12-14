import * as THREE from 'three';
import React from 'react';

export interface Point2D {
  x: number;
  y: number;
  id: string;
}

export type GarmentType = 'JiaoLing' | 'YuanLing' | 'XieJin';

export interface GarmentParams {
  type: GarmentType;
  sleeveLength: number;
  sleeveWidth: number;
  collarWidth: number;
  bodyLength: number;
  waistWidth: number;
  cuffWidth: number;
}

export interface SimulationState {
  windSpeed: number;
  windDirection: [number, number, number];
  gravity: number;
  isPaused: boolean;
}

export interface Fold {
  id: number;
  axis: THREE.Vector3;
  origin: THREE.Vector3;
  indices: Set<number>;
  angle: number; // Current angle
  targetAngle: number; // Target angle (usually PI)
  inverted: boolean;
}

export type InteractionMode = 'VIEW' | 'DRAG_FOLD' | 'DRAW_FOLD';

export interface HanfuGeometryData {
    geo: THREE.BufferGeometry;
    pins: number[];
    neighbors: number[][];
    basePositions: THREE.Vector3[];
}

// Augment global JSX namespace for React Three Fiber intrinsic elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      group: any;
      // line: any; // Removed to avoid conflict with SVG line
      lineSegments: any;
      bufferGeometry: any;
      wireframeGeometry: any;
      ringGeometry: any;
      meshBasicMaterial: any;
      meshStandardMaterial: any;
      meshPhysicalMaterial: any;
      lineBasicMaterial: any;
      ambientLight: any;
      pointLight: any;
      spotLight: any;
      fog: any;
      primitive: any;
    }
  }
}

// Augment module 'react' for newer React versions using module resolution
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      group: any;
      // line: any; // Removed to avoid conflict with SVG line
      lineSegments: any;
      bufferGeometry: any;
      wireframeGeometry: any;
      ringGeometry: any;
      meshBasicMaterial: any;
      meshStandardMaterial: any;
      meshPhysicalMaterial: any;
      lineBasicMaterial: any;
      ambientLight: any;
      pointLight: any;
      spotLight: any;
      fog: any;
      primitive: any;
    }
  }
}
