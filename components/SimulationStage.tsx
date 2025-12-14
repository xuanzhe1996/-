import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import HanfuModel from './HanfuModel';
import { GarmentParams, SimulationState, Fold } from '../types';

interface SimulationStageProps {
  params: GarmentParams;
  simState: SimulationState;
  folds: Fold[];
}

const SimulationStage: React.FC<SimulationStageProps> = ({ params, simState, folds }) => {
  return (
    <div className="w-full h-full bg-[#F5F2EB]">
      {/* Camera positioned to look down at the table at 45 degrees */}
      <Canvas shadows camera={{ position: [0, 40, 40], fov: 35 }}>
        <fog attach="fog" args={['#F5F2EB', 50, 150]} />
        
        <ambientLight intensity={0.7} />
        <spotLight 
          position={[10, 50, 20]} 
          angle={0.3} 
          penumbra={1} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={[1024, 1024]} 
        />
        <pointLight position={[-10, 10, 10]} intensity={0.5} color="#eef" />

        <HanfuModel params={params} simState={simState} folds={folds} />

        {/* Shadow plane at Y=0 (Table Surface) */}
        <ContactShadows position={[0, 0.01, 0]} resolution={1024} scale={100} blur={2} opacity={0.4} far={10} color="#4a4a4a" />
        
        <OrbitControls 
          target={[0, 0, 0]} 
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2 - 0.1} /* Don't allow going below table */
          minDistance={10}
          maxDistance={100}
          enablePan={true}
        />
        
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};

export default SimulationStage;