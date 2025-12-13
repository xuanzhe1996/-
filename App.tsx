import React, { useState } from 'react';
import DraftingTable from './components/DraftingTable';
import SimulationStage from './components/SimulationStage';
import Controls from './components/Controls';
import { GarmentParams, SimulationState } from './types';
import { INITIAL_PARAMS } from './constants';

const App: React.FC = () => {
  const [params, setParams] = useState<GarmentParams>(INITIAL_PARAMS);
  const [simState, setSimState] = useState<SimulationState>({
    windSpeed: 2,
    windDirection: [1, 0, 0.5],
    gravity: -9.8,
    isPaused: false,
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden text-[#2B2B2B]">
      
      {/* Left Panel: The Atelier (30%) */}
      {/* Changed to overflow-y-auto to allow scrolling if screen height is small */}
      <div className="w-[30%] h-full flex flex-col border-r border-[#E5E0D8] bg-[#F9F7F2] shadow-xl z-10 overflow-y-auto custom-scrollbar">
        
        {/* Top: Drafting Table (Visual) */}
        {/* Added min-h to prevent squashing on small screens */}
        <div className="relative border-b border-[#E5E0D8] min-h-[500px] flex-shrink-0">
          <DraftingTable params={params} setParams={setParams} />
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
        <SimulationStage params={params} simState={simState} />
        
        {/* Floating Overlay for Aesthetic Title (Optional) */}
        <div className="absolute top-8 right-8 text-right pointer-events-none mix-blend-multiply opacity-60">
           <h1 className="text-4xl font-serif font-bold text-[#C44032] mb-2 tracking-widest">宋风 · 演武</h1>
           <p className="text-sm font-serif text-gray-600">Physical Simulation Engine</p>
        </div>
      </div>
      
      <style>{`
        /* Custom scrollbar for Webkit */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #F9F7F2; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #D1CDC5; 
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #C44032; 
        }
      `}</style>
    </div>
  );
};

export default App;