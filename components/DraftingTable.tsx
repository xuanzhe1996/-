import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { Text, Grid } from '@react-three/drei';
import { GarmentParams, Fold, HanfuGeometryData, InteractionMode } from '../types';
import { COLORS } from '../constants';
import { generateHanfuGeometry } from '../services/hanfuGeometry';
import { OrigamiSolver } from '../services/origamiSolver';

interface DraftingTableProps {
  params: GarmentParams;
  setParams: (p: GarmentParams) => void;
  folds: Fold[];
  setFolds: (f: Fold[]) => void;
  mode: InteractionMode;
  setMode: (m: InteractionMode) => void;
}

// Internal Component to handle the Scene logic
const DraftingScene: React.FC<DraftingTableProps & { geometryData: HanfuGeometryData }> = ({ 
  params, folds, setFolds, mode, geometryData 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, raycaster, gl } = useThree();
  
  // Interaction State
  const [startPoint, setStartPoint] = useState<{vIdx: number, pos: THREE.Vector3} | null>(null);
  const [hoverPos, setHoverPos] = useState<THREE.Vector3 | null>(null);

  // Geometry Setup
  useEffect(() => {
    if (meshRef.current) {
        meshRef.current.geometry.dispose();
        meshRef.current.geometry = geometryData.geo;
    }
  }, [geometryData]);

  // Animation / Update Loop
  useEffect(() => {
     if (meshRef.current && geometryData.basePositions.length > 0) {
         OrigamiSolver.applyFolds(
             geometryData.basePositions, 
             folds, 
             meshRef.current.geometry.attributes.position as THREE.BufferAttribute
         );
         meshRef.current.geometry.computeVertexNormals();
     }
  }, [folds, geometryData]);


  // --- Interactions ---

  const getIntersect = (e: ThreeEvent<PointerEvent>) => {
      // Find nearest vertex
      if (!meshRef.current) return null;
      const inter = e.intersections.find(i => i.object === meshRef.current);
      if (!inter) return null;

      // Find closest vertex index
      const localP = meshRef.current.worldToLocal(inter.point.clone());
      const pos = meshRef.current.geometry.attributes.position;
      let minD = Infinity; 
      let idx = -1;
      
      // Optimization: Check only if close (brute force fine for <5k verts)
      for(let i=0; i<pos.count; i++){
          const dx = pos.getX(i) - localP.x;
          const dy = pos.getY(i) - localP.y;
          const d = dx*dx + dy*dy;
          if(d < minD) { minD = d; idx = i; }
      }
      
      return { vIdx: idx, point: inter.point, localPoint: new THREE.Vector3(pos.getX(idx), pos.getY(idx), pos.getZ(idx)) };
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
      if (mode === 'VIEW') return;
      e.stopPropagation();
      const hit = getIntersect(e);
      if (hit) {
          // Store raw Base Position for stability, not current folded position
          const basePos = geometryData.basePositions[hit.vIdx];
          setStartPoint({ vIdx: hit.vIdx, pos: basePos });
      }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
      const hit = getIntersect(e);
      if (hit) setHoverPos(hit.point);
      else setHoverPos(null);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
      if (!startPoint) return;
      const hit = getIntersect(e);
      
      if (hit && hit.vIdx !== startPoint.vIdx) {
          const endBasePos = geometryData.basePositions[hit.vIdx];
          
          if (mode === 'DRAW_FOLD') {
              // Create Fold from Line (Start -> End)
              const axis = new THREE.Vector3().subVectors(endBasePos, startPoint.pos).normalize();
              const origin = startPoint.pos.clone().add(endBasePos).multiplyScalar(0.5);
              
              // Seed strategy: Pick a point far from axis
              // Simple hack: Pick start point + some offset perpendicular
              const perp = new THREE.Vector3(-axis.y, axis.x, 0);
              // Find a vertex that is clearly on one side
              // We'll iterate to find best seed
              let seedIdx = -1;
              let maxDist = -Infinity;
              
              const cutNormal = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0,0,1));
              
              for(let i=0; i<geometryData.basePositions.length; i++) {
                   const v = geometryData.basePositions[i];
                   const d = (v.x - origin.x)*cutNormal.x + (v.y - origin.y)*cutNormal.y;
                   if (Math.abs(d) > maxDist) { maxDist = Math.abs(d); seedIdx = i; }
              }

              if (seedIdx !== -1) {
                  const indices = OrigamiSolver.computeFoldIndices(geometryData.basePositions, geometryData.neighbors, origin, axis, seedIdx);
                  if (indices.size > 0) {
                      const newFold: Fold = {
                          id: Date.now(),
                          axis,
                          origin,
                          indices,
                          angle: Math.PI, // 180 degrees default
                          targetAngle: Math.PI,
                          inverted: false
                      };
                      setFolds([...folds, newFold]);
                  }
              }
          }
          else if (mode === 'DRAG_FOLD') {
              // Calculate fold line that maps Start Point to Hit Point (Perpendicular Bisector)
              const p1 = startPoint.pos;
              const p2 = endBasePos;
              const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
              
              const seg = new THREE.Vector3().subVectors(p2, p1);
              const axis = new THREE.Vector3(-seg.y, seg.x, 0).normalize();
              
              const indices = OrigamiSolver.computeFoldIndices(geometryData.basePositions, geometryData.neighbors, mid, axis, startPoint.vIdx);
              
              if (indices.size > 0) {
                  const newFold: Fold = {
                      id: Date.now(),
                      axis,
                      origin: mid,
                      indices,
                      angle: Math.PI,
                      targetAngle: Math.PI,
                      inverted: false
                  };
                  setFolds([...folds, newFold]);
              }
          }
      }
      setStartPoint(null);
  };

  return (
    <>
      <mesh 
        ref={meshRef} 
        onPointerDown={handlePointerDown} 
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <bufferGeometry />
        <meshBasicMaterial color="#EAE5D9" side={THREE.DoubleSide} wireframe={false} polygonOffset polygonOffsetFactor={1} />
        {/* Outline */}
        <lineSegments>
            <wireframeGeometry args={[geometryData.geo]} />
            <lineBasicMaterial color={COLORS.ink} opacity={0.2} transparent />
        </lineSegments>
      </mesh>
      
      {/* Edges Visual Enhancement */}
      <mesh scale={[1.001, 1.001, 1.001]}>
           <bufferGeometry attach="geometry" {...geometryData.geo} />
           <meshBasicMaterial color={COLORS.ink} wireframe transparent opacity={0.1} />
      </mesh>

      {/* Interaction Visuals */}
      {hoverPos && mode !== 'VIEW' && (
          <mesh position={hoverPos}>
              <ringGeometry args={[0.3, 0.5, 32]} />
              <meshBasicMaterial color={mode === 'DRAW_FOLD' ? COLORS.cinnabar : '#3498db'} />
          </mesh>
      )}
      
      {startPoint && hoverPos && mode === 'DRAW_FOLD' && (
          <lineSegments>
              <bufferGeometry onUpdate={(self: THREE.BufferGeometry) => self.setFromPoints([startPoint.pos, hoverPos])} />
              <lineBasicMaterial color={COLORS.cinnabar} linewidth={2} />
          </lineSegments>
      )}

      <Grid args={[100, 100]} cellColor={COLORS.grid} sectionColor={COLORS.grid} fadeDistance={50} />
    </>
  );
};


// Main Component
const DraftingTable: React.FC<DraftingTableProps> = (props) => {
    // Generate geometry once based on params
    const geometryData = useMemo(() => generateHanfuGeometry(props.params), [props.params]);
    
    return (
        <div className="w-full h-full flex flex-col bg-[#F9F7F2]">
             {/* Header Bar: Title and Actions */}
             <div className="flex-shrink-0 h-14 border-b border-[#E5E0D8] px-4 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                 <h2 className="text-lg font-bold text-gray-800 font-serif">制版与折叠</h2>
                 <div className="flex gap-2">
                     <button 
                        onClick={() => props.setFolds(props.folds.slice(0, -1))}
                        className="px-3 py-1.5 rounded bg-white border border-gray-300 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                     >
                        撤销
                     </button>
                     <button 
                        onClick={() => props.setFolds([])}
                        className="px-3 py-1.5 rounded bg-white border border-gray-300 text-xs text-red-600 hover:border-red-300 transition-colors"
                     >
                        重置
                     </button>
                 </div>
             </div>

             {/* Canvas Area */}
             <div className="flex-grow relative overflow-hidden">
                <Canvas orthographic camera={{ zoom: 15, position: [0, 0, 50] }}>
                    <ambientLight intensity={0.8} />
                    <pointLight position={[10, 10, 10]} />
                    <DraftingScene {...props} geometryData={geometryData} />
                </Canvas>
             </div>

             {/* Footer Bar: Tools */}
             <div className="flex-shrink-0 h-12 border-t border-[#E5E0D8] bg-white/80 flex items-center justify-center gap-6">
                 <button 
                    onClick={() => props.setMode('VIEW')} 
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all text-sm ${props.mode === 'VIEW' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-800'}`}
                 >
                     <span>👁</span> 浏览
                 </button>
                 <button 
                    onClick={() => props.setMode('DRAG_FOLD')} 
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all text-sm ${props.mode === 'DRAG_FOLD' ? 'bg-red-50 text-red-600 font-bold' : 'text-gray-500 hover:text-gray-800'}`}
                 >
                     <span>🤏</span> 拖拽折叠
                 </button>
                 <button 
                    onClick={() => props.setMode('DRAW_FOLD')} 
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all text-sm ${props.mode === 'DRAW_FOLD' ? 'bg-red-50 text-red-600 font-bold' : 'text-gray-500 hover:text-gray-800'}`}
                 >
                     <span>🖊</span> 画线折叠
                 </button>
             </div>
        </div>
    );
};

export default DraftingTable;