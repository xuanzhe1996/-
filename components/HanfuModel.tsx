import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GarmentParams, SimulationState, Fold } from '../types';
import { ClothPhysics } from '../services/physicsEngine';
import { generateHanfuGeometry } from '../services/hanfuGeometry';
import { OrigamiSolver } from '../services/origamiSolver';
import { COLORS } from '../constants';

interface HanfuModelProps {
  params: GarmentParams;
  simState: SimulationState;
  folds: Fold[]; // Received from parent
}

// Procedurally generate a fabric grain texture
const useFabricTexture = () => {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Base color matches the green/cinnabar but for bump map we use grayscale
    // Base neutral grey for bump map
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    // 1. Fine Noise
    for (let i = 0; i < 80000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const v = Math.random() * 20 - 10; 
        const c = 128 + v; 
        ctx.fillStyle = `rgb(${c},${c},${c})`;
        ctx.fillRect(x, y, 1.5, 1.5);
    }
    
    // 2. Weave Pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for(let i=0; i<size; i+=2) {
        if (Math.random() > 0.3) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(size, i);
          ctx.stroke();
        }
    }
    for(let i=0; i<size; i+=2) {
        if (Math.random() > 0.3) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, size);
          ctx.stroke();
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6); 
    return tex;
  }, []);
};

const HanfuModel: React.FC<HanfuModelProps> = ({ params, simState, folds }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const physicsRef = useRef<ClothPhysics | null>(null);
  const fabricTexture = useFabricTexture();
  
  // 1. Generate Base Geometry (Shared Logic)
  const geometryData = useMemo(() => generateHanfuGeometry(params), [params]);

  useEffect(() => {
    if (!meshRef.current) return;

    if (meshRef.current.geometry) meshRef.current.geometry.dispose();

    const geo = geometryData.geo.clone();
    
    // Apply Folds to set "Rest Pose"
    const currentPos = new Float32Array(geometryData.basePositions.length * 3);
    const tempPositions = geometryData.basePositions.map(v => v.clone());
    
    // Fake buffer attribute for OrigamiSolver
    const mockAttr = {
        setXYZ: (i:number, x:number, y:number, z:number) => {
            tempPositions[i].set(x,y,z);
        },
        needsUpdate: false
    };
    OrigamiSolver.applyFolds(tempPositions, folds, mockAttr as any);

    // Coordinate Mapping
    // Drafting (X,Y) -> World (X, -Z, Y)
    // Drafting Y+ is Back, Y- is Front. 
    // In World: Z- is Back (Away), Z+ is Front (Towards camera).
    // So map Drafting Y -> -World Z.
    
    for(let i=0; i<tempPositions.length; i++) {
        const v = tempPositions[i];
        currentPos[i*3] = v.x;
        currentPos[i*3+1] = v.z + 0.1; // Height
        currentPos[i*3+2] = -v.y;      // Depth
    }

    geo.setAttribute('position', new THREE.BufferAttribute(currentPos, 3));
    geo.computeVertexNormals();
    
    // UV Mapping
    const uvs = new Float32Array(geometryData.basePositions.length * 2);
    for(let i=0; i<geometryData.basePositions.length; i++) {
        const u = (geometryData.basePositions[i].x / 30) + 0.5; 
        const v = (geometryData.basePositions[i].y / 30) + 0.5;
        uvs[i*2] = u;
        uvs[i*2+1] = v;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    meshRef.current.geometry = geo;
    physicsRef.current = new ClothPhysics(geo, geometryData.pins);

  }, [geometryData, folds, params.bodyLength]); 

  useFrame((state, delta) => {
    if (!physicsRef.current || !meshRef.current || simState.isPaused) return;

    const windVec = new THREE.Vector3(
      simState.windDirection[0] * simState.windSpeed,
      simState.windDirection[1] * simState.windSpeed,
      simState.windDirection[2] * simState.windSpeed
    );

    physicsRef.current.update(windVec, simState.gravity);
    
    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
  });

  // Material Definition
  // 0: Main Body (Green Silk)
  // 1: Collar (White Cotton/Silk)
  
  const mainMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
        color: COLORS.cinnabar, // Deep Green/Red defined in constants
        roughness: 0.65,
        metalness: 0.1,
        sheen: 1.0,
        sheenRoughness: 0.5,
        sheenColor: new THREE.Color('#FFD7D7'),
        bumpMap: fabricTexture || undefined,
        bumpScale: 0.015,
        side: THREE.DoubleSide
  }), [fabricTexture]);

  const collarMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
        color: COLORS.silkWhite,
        roughness: 0.4,
        metalness: 0.0,
        sheen: 0.2,
        side: THREE.DoubleSide
  }), []);

  return (
    <group position={[0, 0, 0]}> 
        <mesh 
            ref={meshRef} 
            castShadow 
            receiveShadow
            // @ts-ignore
            material={[mainMaterial, collarMaterial]}
        >
            <bufferGeometry /> 
        </mesh>
    </group>
  );
};

export default HanfuModel;