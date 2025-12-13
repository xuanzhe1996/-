import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GarmentParams, SimulationState } from '../types';
import { ClothPhysics } from '../services/physicsEngine';
import { COLORS } from '../constants';

// Augment JSX namespace to include Three.js elements
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      bufferGeometry: any;
      meshStandardMaterial: any;
      torusGeometry: any;
    }
  }
}

interface HanfuModelProps {
  params: GarmentParams;
  simState: SimulationState;
}

const HanfuModel: React.FC<HanfuModelProps> = ({ params, simState }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const physicsRef = useRef<ClothPhysics | null>(null);

  // Procedurally generate geometry based on params
  const geometry = useMemo(() => {
    // Scaling down params to World Units (approx 10cm = 1 unit)
    const scale = 0.1;
    const totalWidth = params.sleeveLength * scale;
    const totalHeight = params.bodyLength * scale;
    
    // Increase resolution for better cloth simulation
    const wSeg = 50; 
    const hSeg = 40;
    
    // Base geometry centered at origin
    // Create a plane that encompasses the entire possible bounding box
    const geo = new THREE.PlaneGeometry(totalWidth, totalHeight, wSeg, hSeg);
    
    const posAttribute = geo.attributes.position;
    const indexAttribute = geo.index;

    if (!indexAttribute) return { geo, pins: [] };

    // 2. Topology Cutting
    const newIndices: number[] = [];
    const positions = posAttribute.array;
    
    // Calculate dimensions
    const sleeveHeightWorld = params.sleeveWidth * scale;
    const waistWidthWorld = params.waistWidth * scale;
    
    // Coordinate system: Center is (0,0). Top is +totalHeight/2.
    const topY = totalHeight / 2;
    // Sleeve bottom edge Y
    const sleeveBottomY = topY - sleeveHeightWorld;
    const bodyHalfWidth = waistWidthWorld / 2;

    // Helper to check if a vertex is inside the Hanfu Pattern (T-Shape)
    const isVertexInPattern = (idx: number) => {
        const x = positions[idx * 3];
        const y = positions[idx * 3 + 1];

        // 1. Sleeve Band: Anything above the armpit line
        if (y > sleeveBottomY) return true;

        // 2. Body Strip: Anything within the waist width
        if (Math.abs(x) < bodyHalfWidth) return true;

        // Otherwise, it's in the empty corner (cut it)
        return false;
    };

    // Rebuild index buffer
    for (let i = 0; i < indexAttribute.count; i += 3) {
        const a = indexAttribute.getX(i);
        const b = indexAttribute.getX(i + 1);
        const c = indexAttribute.getX(i + 2);

        // Strict inclusion: Triangle exists only if ALL vertices are in pattern
        // This creates a clean cut
        if (isVertexInPattern(a) && isVertexInPattern(b) && isVertexInPattern(c)) {
            newIndices.push(a, b, c);
        }
    }

    geo.setIndex(newIndices);

    // 3. Vertex Sculpting (Initial Pose)
    const pins: number[] = [];
    const count = posAttribute.count;

    for (let i = 0; i < count; i++) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];

        // Check again to skip logic for cut vertices (optimization, though they aren't rendered)
        // But we must move them anyway to avoid bounds issues in physics or just keep them clean
        
        const inBodyStrip = Math.abs(x) < bodyHalfWidth;
        
        // Wrap the body into a cylindrical shape to simulate the robe
        if (inBodyStrip) {
            // Map x [-bodyHalfWidth, bodyHalfWidth] to angle
            // Front overlap: We need to wrap almost 360 degrees or at least 270 for a closed robe
            // A simple approach: Semi-circle back + Front flaps
            
            // Normalize x to -1...1 within the strip
            const normX = x / bodyHalfWidth; 
            
            // Angle: 0 is back. PI is front.
            // Let's make it -PI/2 to PI/2 (180 deg) for the back, plus some for front
            const angle = normX * Math.PI; 
            
            const radius = bodyHalfWidth * 0.8; // Cylinder radius derived from waist
            
            // New position on cylinder
            const nx = Math.sin(angle) * radius;
            const nz = Math.cos(angle) * radius; // Z depth
            
            positions[i * 3] = nx;
            positions[i * 3 + 2] = nz;
            
            // Bias the "Front" layers to avoid z-fighting if they overlap
            // Here we just make a simple curve. 
            // To make it look like "Right over Left" (You Ren), we could spiral the radius slightly?
            // Simplified: Just curve it.
        } else {
            // Sleeves
            // Keep them mostly flat but curve them forward slightly to look natural
            const distFromBody = Math.abs(x) - bodyHalfWidth;
            
            // Droop (Gravity)
            positions[i * 3 + 1] = y - (distFromBody * 0.1); 
            
            // Curve forward (Z)
            positions[i * 3 + 2] = 2.0 - Math.cos(distFromBody * 0.2) * 2.0;
        }

        // Pinning: Pin the neck/shoulder line
        // We pin vertices that are at the very top AND within a certain width (neck)
        // Or pin the entire shoulder line to act as a hanger
        if (y > topY - 0.5) {
             pins.push(i);
        }
    }

    geo.computeVertexNormals();
    return { geo, pins };
  }, [params]);

  // Initialize Physics
  useEffect(() => {
    if (!meshRef.current) return;
    
    // Dispose old geometry
    if (meshRef.current.geometry) {
        meshRef.current.geometry.dispose();
    }

    meshRef.current.geometry = geometry.geo;
    physicsRef.current = new ClothPhysics(geometry.geo, geometry.pins);
    
  }, [geometry]);

  // Animation Loop
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

  return (
    <group position={[0, 4, 0]}>
        {/* Main Robe */}
        <mesh ref={meshRef} castShadow receiveShadow>
            <bufferGeometry /> 
            <meshStandardMaterial 
                color={COLORS.cinnabar}
                roughness={0.9} 
                metalness={0.1}
                side={THREE.DoubleSide}
                flatShading={false}
                bumpScale={0.02}
            />
        </mesh>

        {/* Visual Neck Collar */}
        <mesh position={[0, 4.5, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.0, 0.15, 8, 20, Math.PI * 1.2]} />
            <meshStandardMaterial color={COLORS.silkWhite} />
        </mesh>
    </group>
  );
};

export default HanfuModel;