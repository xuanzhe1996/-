import React, { useState } from 'react';
import DraftingTable from './components/DraftingTable';
import SimulationStage from './components/SimulationStage';
import Controls from './components/Controls';
import { GarmentParams, SimulationState, Fold, InteractionMode } from './types';
import { INITIAL_PARAMS } from './constants';

const App: React.FC = () => {
  const [params, setParams] = useState<GarmentParams>(INITIAL_PARAMS);
  const [simState, setSimState] = useState<SimulationState>({
    windSpeed: 2,
    windDirection: [1, 0, 0.5],
    gravity: -5, // Reduced gravity for floating effect
    isPaused: false,
  });
  
  // New State for Folding
  const [folds, setFolds] = useState<Fold[]>([]);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('DRAG_FOLD');

  return (
    <div className="flex h-screen w-screen overflow-hidden text-[#2B2B2B]">
      
      {/* Left Panel: The Atelier (30%) */}
      <div className="w-[30%] h-full flex flex-col border-r border-[#E5E0D8] bg-[#F9F7F2] shadow-xl z-10">
        
        {/* Top: Interactive Drafting Table */}
        <div className="relative border-b border-[#E5E0D8] flex-grow">
          <DraftingTable 
            params={params} 
            setParams={setParams} 
            folds={folds}
            setFolds={setFolds}
            mode={interactionMode}
            // @ts-ignore
            setMode={setInteractionMode}
          />
        </div>

        {/* Bottom: Minimalist Controls */}
        <div className="h-auto flex-shrink-0 bg-[#F9F7F2]">
          <Controls 
            params={params} 
            setParams={setParams} 
            simState={simState}
            setSimState={setSimState}
          />
        </div>
      </div>

      {/* Right Panel: The Stage (70%) */}
      <div className="w-[70%] h-full relative">
        <SimulationStage params={params} simState={simState} folds={folds} />
        
        {/* Floating Overlay */}
        <div className="absolute top-8 right-8 text-right pointer-events-none mix-blend-multiply opacity-60">
           <h1 className="text-4xl font-serif font-bold text-[#C44032] mb-2 tracking-widest">宋风 · 演武</h1>
           <p className="text-sm font-serif text-gray-600">Simultaneous Folding Engine</p>
        </div>
      </div>
    </div>
  );
};

export default App;