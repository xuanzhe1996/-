import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import HanfuModel from './HanfuModel';
import { GarmentParams, SimulationState } from '../types';

// Augment JSX namespace to include Three.js elements
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      fog: any;
      ambientLight: any;
      spotLight: any;
      pointLight: any;
    }
  }
}

interface SimulationStageProps {
  params: GarmentParams;
  simState: SimulationState;
}

const SimulationStage: React.FC<SimulationStageProps> = ({ params, simState }) => {
  return (
    <div className="w-full h-full bg-[#F5F2EB]">
      <Canvas shadows camera={{ position: [0, 2, 15], fov: 35 }}>
        <fog attach="fog" args={['#F5F2EB', 10, 40]} />
        
        {/* Lighting Setup for "Song Dynasty" Mood */}
        <ambientLight intensity={0.6} />
        <spotLight 
          position={[10, 10, 10]} 
          angle={0.15} 
          penumbra={1} 
          intensity={1} 
          castShadow 
          shadow-mapSize={[1024, 1024]} 
        />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#eef" />

        <HanfuModel params={params} simState={simState} />

        <ContactShadows resolution={1024} scale={50} blur={2} opacity={0.5} far={10} color="#4a4a4a" />
        
        <OrbitControls 
          enablePan={false} 
          minPolarAngle={Math.PI / 3} 
          maxPolarAngle={Math.PI / 1.8} 
          minDistance={8}
          maxDistance={25}
        />
        
        {/* Subtle environment reflection for realism without looking plastic */}
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};

export default SimulationStage;