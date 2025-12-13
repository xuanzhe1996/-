import React from 'react';
import { GarmentParams, SimulationState } from '../types';
import { COLORS } from '../constants';

interface ControlsProps {
  params: GarmentParams;
  setParams: (p: GarmentParams) => void;
  simState: SimulationState;
  setSimState: (s: SimulationState) => void;
}

const Slider: React.FC<{ 
  label: string; 
  value: number; 
  min: number; 
  max: number; 
  onChange: (val: number) => void 
}> = ({ label, value, min, max, onChange }) => (
  <div className="flex flex-col mb-4 group">
    <div className="flex justify-between items-baseline mb-1">
      <span className="text-sm font-serif text-gray-700 tracking-widest">{label}</span>
      <span className="text-xs font-mono text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">{value}</span>
    </div>
    <div className="relative h-4 flex items-center">
        <input 
          type="range" 
          min={min} 
          max={max} 
          value={value} 
          onChange={(e) => onChange(Number(e.target.value))}
          className="z-10 relative"
        />
        {/* Custom Track Line */}
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gray-300 transform -translate-y-1/2" />
    </div>
  </div>
);

const Controls: React.FC<ControlsProps> = ({ params, setParams, simState, setSimState }) => {
  const updateParam = (key: keyof GarmentParams, val: number) => {
    setParams({ ...params, [key]: val });
  };

  return (
    <div className="w-full px-6 py-4 pb-12 bg-[#F9F7F2] border-t border-gray-200">
      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
        {/* Column 1: Dimensions */}
        <div>
           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">尺寸 (Dimensions)</h3>
           <Slider label="通袖长" value={params.sleeveLength} min={100} max={220} onChange={(v) => updateParam('sleeveLength', v)} />
           <Slider label="袖宽" value={params.sleeveWidth} min={30} max={80} onChange={(v) => updateParam('sleeveWidth', v)} />
           <Slider label="衣长" value={params.bodyLength} min={80} max={150} onChange={(v) => updateParam('bodyLength', v)} />
        </div>

        {/* Column 2: Physics */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">气韵 (Atmosphere)</h3>
          <Slider label="风力" value={simState.windSpeed} min={0} max={20} onChange={(v) => setSimState({...simState, windSpeed: v})} />
          <div className="flex items-center justify-between mt-4">
             <span className="text-sm font-serif text-gray-700">物理模拟</span>
             <button 
                onClick={() => setSimState({...simState, isPaused: !simState.isPaused})}
                className="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center hover:bg-[#C44032] hover:border-[#C44032] hover:text-white transition-colors"
             >
                {simState.isPaused ? '▶' : '||'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;