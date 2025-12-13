import React, { useRef, useState } from 'react';
import { GarmentParams, GarmentType } from '../types';
import { COLORS } from '../constants';

interface DraftingTableProps {
  params: GarmentParams;
  setParams: (p: GarmentParams) => void;
}

const DraftingTable: React.FC<DraftingTableProps> = ({ params, setParams }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeDrag, setActiveDrag] = useState<string | null>(null);

  // Visualization Scale configuration
  const scale = 2.5; 
  const centerX = 250;
  const startY = 80;

  // Calculate collar points
  const collarHalfW = (params.collarWidth || 18) / 2 * scale;

  // Derive visual coordinates from params
  const points = {
    // Shoulders
    shoulderLeft: { x: centerX - params.sleeveLength / 2 * scale, y: startY, id: 'shoulderLeft' },
    shoulderRight: { x: centerX + params.sleeveLength / 2 * scale, y: startY, id: 'shoulderRight' },
    
    // Neck (Fixed Y, varying X based on collar width)
    neckLeft: { x: centerX - collarHalfW, y: startY, id: 'neckLeft' },
    neckRight: { x: centerX + collarHalfW, y: startY, id: 'neckRight' },
    
    // Hem
    hemLeft: { x: centerX - params.waistWidth / 2 * scale * 1.2, y: startY + params.bodyLength * scale, id: 'hemLeft' },
    hemRight: { x: centerX + params.waistWidth / 2 * scale * 1.2, y: startY + params.bodyLength * scale, id: 'hemRight' },
    
    // Underarms
    underarmLeft: { x: centerX - params.waistWidth / 2 * scale, y: startY + params.sleeveWidth * scale, id: 'underarmLeft' },
    underarmRight: { x: centerX + params.waistWidth / 2 * scale, y: startY + params.sleeveWidth * scale, id: 'underarmRight' },
  };

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveDrag(id);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setActiveDrag(null);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDrag || !svgRef.current) return;
    
    const clientX = e.clientX;
    const clientY = e.clientY;

    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return;
    
    const svgX = (clientX - CTM.e) / CTM.a;
    const svgY = (clientY - CTM.f) / CTM.d;

    const newParams = { ...params };
    
    // Interaction Logic
    if (activeDrag === 'shoulderLeft' || activeDrag === 'shoulderRight') {
        const dist = Math.abs(svgX - centerX);
        newParams.sleeveLength = Math.max(100, Math.min(220, (dist * 2) / scale));
    } else if (activeDrag === 'hemLeft' || activeDrag === 'hemRight') {
        const dist = Math.abs(svgX - centerX);
        newParams.waistWidth = Math.max(30, Math.min(80, (dist * 2) / (scale * 1.2)));
        
        const len = svgY - startY;
        newParams.bodyLength = Math.max(80, Math.min(180, len / scale));
    } else if (activeDrag === 'underarmLeft' || activeDrag === 'underarmRight') {
        const dist = Math.abs(svgX - centerX);
        newParams.waistWidth = Math.max(30, Math.min(80, (dist * 2) / scale));

        const depth = svgY - startY;
        newParams.sleeveWidth = Math.max(20, Math.min(80, depth / scale));
    } else if (activeDrag === 'neckLeft' || activeDrag === 'neckRight') {
        const dist = Math.abs(svgX - centerX);
        newParams.collarWidth = Math.max(10, Math.min(30, (dist * 2) / scale));
    }

    setParams(newParams);
  };

  // --- Path Generation Logic ---

  // 1. Silhouette (Common)
  // Determine Neck Shape based on Type
  let neckPathPart = `L ${points.neckLeft.x} ${points.neckLeft.y} Q ${centerX} ${points.neckLeft.y + 10} ${points.neckRight.x} ${points.neckRight.y}`; // Default JiaoLing
  
  if (params.type === 'YuanLing') {
      // Deep curve for round collar
      neckPathPart = `L ${points.neckLeft.x} ${points.neckLeft.y} C ${points.neckLeft.x} ${points.neckLeft.y + 40}, ${points.neckRight.x} ${points.neckRight.y + 40}, ${points.neckRight.x} ${points.neckRight.y}`;
  } else if (params.type === 'XieJin') {
      // Standing collar - Draw a small rectangle up then across
      neckPathPart = `L ${points.neckLeft.x} ${points.neckLeft.y - 15} L ${points.neckLeft.x} ${points.neckLeft.y} L ${points.neckRight.x} ${points.neckRight.y} L ${points.neckRight.x} ${points.neckRight.y - 15}`;
  }

  const silhouettePath = `
    M ${points.shoulderLeft.x} ${points.shoulderLeft.y}
    ${neckPathPart}
    L ${points.shoulderRight.x} ${points.shoulderRight.y}
    L ${points.shoulderRight.x} ${points.shoulderRight.y + params.sleeveWidth * scale}
    Q ${points.underarmRight.x + 20} ${points.underarmRight.y + 20} ${points.underarmRight.x} ${points.underarmRight.y}
    L ${points.hemRight.x} ${points.hemRight.y}
    L ${points.hemLeft.x} ${points.hemLeft.y}
    L ${points.underarmLeft.x} ${points.underarmLeft.y}
    Q ${points.underarmLeft.x - 20} ${points.underarmLeft.y + 20} ${points.shoulderLeft.x} ${points.shoulderLeft.y + params.sleeveWidth * scale}
    Z
  `;

  // 2. Lapel Paths (Specific)
  let outerLapelPath = '';
  let innerLapelPath = '';
  
  if (params.type === 'JiaoLing') {
      // Right Ren (You Ren): Left Panel (Viewer Right) covers Right Panel (Viewer Left)
      // Visually: Line goes from Viewer Right (Neck) -> Viewer Left (Armpit)
      outerLapelPath = `
        M ${points.neckRight.x} ${points.neckRight.y + 5} 
        Q ${centerX} ${points.underarmLeft.y - 40} ${points.underarmLeft.x + 5} ${points.underarmLeft.y + 10}
      `;
      innerLapelPath = `
        M ${points.neckLeft.x} ${points.neckLeft.y + 5}
        Q ${centerX} ${points.underarmRight.y - 40} ${points.underarmRight.x - 5} ${points.underarmRight.y + 10}
      `;
  } else if (params.type === 'YuanLing') {
      // Side closure style (Right side / Viewer Left)
      // Visual line from neck right curve down to armpit left
      outerLapelPath = `
        M ${points.neckRight.x - 10} ${points.neckRight.y + 35} 
        Q ${points.neckRight.x} ${points.neckRight.y + 50} ${points.neckRight.x + 20} ${points.shoulderRight.y + 40}
        L ${points.underarmLeft.x + 10} ${points.underarmLeft.y - 10}
      `;
  } else if (params.type === 'XieJin') {
      // Slanted: Center Neck -> Right Armpit (Viewer Left)
      outerLapelPath = `
        M ${centerX} ${startY}
        L ${centerX} ${startY + 20}
        L ${points.underarmLeft.x + 20} ${points.underarmLeft.y - 10}
      `;
  }

  // --- Type Switcher UI ---
  const typeOptions: {id: GarmentType, label: string}[] = [
      { id: 'JiaoLing', label: '交领' },
      { id: 'YuanLing', label: '圆领' },
      { id: 'XieJin', label: '斜襟' },
  ];

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#F9F7F2]">
      
      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-20"
           style={{
             backgroundImage: `linear-gradient(${COLORS.grid} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.grid} 1px, transparent 1px)`,
             backgroundSize: '20px 20px'
           }} 
      />

      {/* Title / Watermark & Switcher */}
      <div className="absolute top-6 left-6 flex flex-col gap-4 z-20">
        <h2 className="text-2xl font-bold tracking-widest text-[#2B2B2B] opacity-80 select-none" style={{writingMode: 'vertical-rl'}}>
          制版台
        </h2>
      </div>

      <div className="absolute top-6 right-6 z-20 flex flex-col gap-2">
         {typeOptions.map((opt) => (
             <button
                key={opt.id}
                onClick={() => setParams({...params, type: opt.id})}
                className={`px-3 py-1 text-xs font-serif border transition-all ${
                    params.type === opt.id 
                    ? 'border-[#C44032] text-[#C44032] bg-[#C44032]/5' 
                    : 'border-transparent text-gray-500 hover:border-gray-300'
                }`}
             >
                 {opt.label}
             </button>
         ))}
      </div>

      <svg 
        ref={svgRef}
        className="w-full h-full touch-none"
        viewBox="0 0 500 800"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Shadow/Guideline */}
        <path d={silhouettePath} stroke="none" fill="#EAE5D9" />

        {/* Construction Lines */}
        <line x1={centerX} y1={0} x2={centerX} y2={800} stroke={COLORS.grid} strokeDasharray="4 4" />
        
        {/* Inner Lapel (Dashed) */}
        {innerLapelPath && (
            <path 
            d={innerLapelPath}
            stroke={COLORS.ink}
            strokeWidth="1"
            fill="none"
            strokeDasharray="4 4"
            opacity="0.6"
            />
        )}

        {/* Main Outline - Ink Style */}
        <path 
          d={silhouettePath} 
          stroke={COLORS.ink} 
          strokeWidth="2.5" 
          fill="none" 
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Outer Lapel (Solid) */}
        {outerLapelPath && (
            <>
                <path 
                d={outerLapelPath}
                stroke="white"
                strokeWidth="6"
                fill="none"
                strokeLinecap="square"
                className="mix-blend-overlay"
                />
                <path 
                d={outerLapelPath}
                stroke={COLORS.ink}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                />
            </>
        )}

        {/* Collar Highlight */}
        {params.type === 'JiaoLing' && (
             <path 
             d={`M ${points.neckLeft.x} ${points.neckLeft.y} Q ${centerX} ${points.neckLeft.y + 10} ${points.neckRight.x} ${points.neckRight.y}`}
             stroke={COLORS.ink}
             strokeWidth="2"
             fill="none"
           />
        )}

        {/* Measurements / Annotations */}
        <text x={points.shoulderLeft.x} y={points.shoulderLeft.y - 15} className="text-[8px] fill-gray-500 font-serif">通袖 {Math.round(params.sleeveLength)}</text>
        <text x={points.hemLeft.x} y={points.hemLeft.y + 20} className="text-[8px] fill-gray-500 font-serif">衣长 {Math.round(params.bodyLength)}</text>
        <text x={centerX + 5} y={points.neckRight.y - 5} className="text-[6px] fill-gray-400 font-serif">领宽 {Math.round(params.collarWidth)}</text>

        {/* Interactive Anchors */}
        {[
            points.shoulderLeft, points.shoulderRight, 
            points.hemLeft, points.hemRight,
            points.underarmLeft, points.underarmRight,
            points.neckLeft, points.neckRight
        ].map((p, i) => (
          <circle 
            key={p.id} 
            cx={p.x} 
            cy={p.y} 
            r={activeDrag === p.id ? 8 : 5} 
            fill={COLORS.cinnabar}
            stroke="white"
            strokeWidth="1"
            className="cursor-pointer transition-all duration-150 hover:r-7"
            onPointerDown={(e) => handlePointerDown(p.id, e)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{ cursor: 'pointer', touchAction: 'none' }}
          />
        ))}
      </svg>
      
      {/* Minimalist Legend */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500 font-serif space-y-1 text-right select-none pointer-events-none">
        <p>• 拖拽红点调整版型</p>
        <p>• 虚线为里襟结构</p>
      </div>
    </div>
  );
};

export default DraftingTable;