import * as THREE from 'three';
import { Fold } from '../types';

export class OrigamiSolver {
    
    // Core function to determine which vertices move based on a fold plane
    static computeFoldIndices(
        basePositions: THREE.Vector3[],
        neighbors: number[][],
        origin: THREE.Vector3,
        axis: THREE.Vector3,
        seedIdx: number
    ): Set<number> {
        // Calculate cut plane normal (perp to axis on the paper plane Z)
        // Assuming paper is roughly in XY plane mostly
        const cutNormal = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 0, 1)).normalize();
        
        const getSide = (idx: number) => {
            const v = basePositions[idx];
            // Project vector from origin to vertex onto cut normal
            // (v - origin) dot cutNormal
            const val = (v.x - origin.x) * cutNormal.x + (v.y - origin.y) * cutNormal.y;
            // Epsilon for numerical stability
            if (val > 0.001) return 1;
            if (val < -0.001) return -1;
            return 0;
        };

        const seedSide = getSide(seedIdx);
        const indices = new Set<number>();
        
        if (seedSide === 0) return indices; // Seed is on the line

        // BFS
        const queue = [seedIdx];
        indices.add(seedIdx);
        const visited = new Set<number>();
        visited.add(seedIdx);

        while (queue.length > 0) {
            const curr = queue.pop()!;
            
            const ns = neighbors[curr];
            if (!ns) continue;

            for (const n of ns) {
                if (!visited.has(n)) {
                    const side = getSide(n);
                    // Spread if on same side or exactly on line (dragging along)
                    // Logic: Vertices on the line (0) act as hinges, they don't block the flood fill usually
                    // But technically, the fold moves strictly one side.
                    // Vertices ON the fold axis (side 0) should generally NOT move if we are rotating AROUND axis.
                    // But for selection, we stop at 0.
                    
                    if (side === seedSide) {
                        visited.add(n);
                        indices.add(n);
                        queue.push(n);
                    } else if (side === 0) {
                        // It's the hinge. We don't add it to "moving set" usually, 
                        // or we add it but it rotates 0 distance? 
                        // Standard origami: points on axis don't move position relative to axis, but they are the pivot.
                        // We mark them visited to stop propagation but don't add to selection?
                        // Actually, let's stop propagation at the other side.
                        visited.add(n);
                    }
                }
            }
        }

        return indices;
    }

    // Apply geometric transforms based on fold stack
    static applyFolds(
        basePositions: THREE.Vector3[], 
        folds: Fold[],
        targetAttribute: THREE.BufferAttribute
    ) {
        const tempV = new THREE.Vector3();

        for (let i = 0; i < basePositions.length; i++) {
            tempV.copy(basePositions[i]);

            for (const fold of folds) {
                if (fold.indices.has(i)) {
                    // Rotate point around axis at origin
                    // 1. Translate to origin
                    tempV.sub(fold.origin);
                    // 2. Rotate
                    tempV.applyAxisAngle(fold.axis, fold.angle);
                    // 3. Translate back
                    tempV.add(fold.origin);
                    
                    // Add slight Z offset to prevent z-fighting
                    // Each fold adds a layer of "paper thickness"
                    tempV.z += 0.05; 
                }
            }

            targetAttribute.setXYZ(i, tempV.x, tempV.y, tempV.z);
        }
        targetAttribute.needsUpdate = true;
    }
}