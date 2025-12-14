import * as THREE from 'three';
import { DRAG, TIMESTEP } from '../constants';

// A lightweight custom physics solver for specific mesh vertices
export class ClothPhysics {
  positions: Float32Array;
  prevPositions: Float32Array;
  originalPositions: Float32Array;
  constraints: number[]; // [p1_index, p2_index, rest_distance]
  pins: number[]; // Indices of vertices that shouldn't move
  
  // Interaction State
  interactionParticleIndex: number | null = null;
  interactionPosition: THREE.Vector3 = new THREE.Vector3();

  constructor(geo: THREE.BufferGeometry, pinIndices: number[]) {
    const posAttribute = geo.attributes.position;
    this.positions = posAttribute.array as Float32Array;
    this.prevPositions = new Float32Array(this.positions);
    this.originalPositions = new Float32Array(this.positions);
    this.pins = pinIndices;
    this.constraints = [];

    this.generateConstraints(geo);
  }

  generateConstraints(geo: THREE.BufferGeometry) {
    // Simple grid connectivity constraints based on geometry index
    const index = geo.index;
    if (!index) return;
    
    const indices = index.array;
    
    // Create constraints from edges
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i];
      const b = indices[i + 1];
      const c = indices[i + 2];

      this.addConstraint(a, b);
      this.addConstraint(b, c);
      this.addConstraint(c, a);
    }
  }

  addConstraint(p1: number, p2: number) {
    const v1 = new THREE.Vector3(this.positions[p1 * 3], this.positions[p1 * 3 + 1], this.positions[p1 * 3 + 2]);
    const v2 = new THREE.Vector3(this.positions[p2 * 3], this.positions[p2 * 3 + 1], this.positions[p2 * 3 + 2]);
    const dist = v1.distanceTo(v2);
    this.constraints.push(p1, p2, dist);
  }

  // --- Interaction Methods ---
  startInteraction(index: number) {
    this.interactionParticleIndex = index;
    // Sync interaction pos to current
    this.interactionPosition.set(
      this.positions[index*3],
      this.positions[index*3+1],
      this.positions[index*3+2]
    );
  }

  updateInteraction(pos: THREE.Vector3) {
    this.interactionPosition.copy(pos);
  }

  endInteraction() {
    this.interactionParticleIndex = null;
  }
  // ---------------------------

  update(wind: THREE.Vector3, gravity: number) {
    const count = this.positions.length / 3;

    // 1. Integration
    for (let i = 0; i < count; i++) {
      if (this.pins.includes(i)) continue;

      // Interaction Override: If this is the interacted particle, move it directly
      if (this.interactionParticleIndex === i) {
          this.positions[i*3] = this.interactionPosition.x;
          this.positions[i*3+1] = this.interactionPosition.y;
          this.positions[i*3+2] = this.interactionPosition.z;
          // Reset velocity effectively by setting prev = current
          this.prevPositions[i*3] = this.positions[i*3];
          this.prevPositions[i*3+1] = this.positions[i*3+1];
          this.prevPositions[i*3+2] = this.positions[i*3+2];
          continue;
      }

      const idx = i * 3;
      
      // Current pos
      const x = this.positions[idx];
      const y = this.positions[idx + 1];
      const z = this.positions[idx + 2];

      // Old pos
      const ox = this.prevPositions[idx];
      const oy = this.prevPositions[idx + 1];
      const oz = this.prevPositions[idx + 2];

      // Velocity approximation
      const vx = (x - ox) * DRAG;
      const vy = (y - oy) * DRAG;
      const vz = (z - oz) * DRAG;

      // Update old to current
      this.prevPositions[idx] = x;
      this.prevPositions[idx + 1] = y;
      this.prevPositions[idx + 2] = z;

      // Apply forces
      const windFactor = Math.sin(Date.now() * 0.005 + y * 0.1) * 0.5 + 0.5;

      // Standard Gravity (-Y direction)
      this.positions[idx] = x + vx + (wind.x * windFactor) * TIMESTEP * TIMESTEP;
      this.positions[idx + 1] = y + vy + (gravity) * TIMESTEP * TIMESTEP;
      this.positions[idx + 2] = z + vz + (wind.z * windFactor) * TIMESTEP * TIMESTEP;
    }

    // 2. Constraints Relaxation
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < this.constraints.length; i += 3) {
        const p1 = this.constraints[i];
        const p2 = this.constraints[i + 1];
        const rest = this.constraints[i + 2];

        // If a particle is being interacted with, treat it as having infinite mass (like a pin)
        const isP1Pinned = this.pins.includes(p1) || this.interactionParticleIndex === p1;
        const isP2Pinned = this.pins.includes(p2) || this.interactionParticleIndex === p2;

        const idx1 = p1 * 3;
        const idx2 = p2 * 3;

        const x1 = this.positions[idx1];
        const y1 = this.positions[idx1 + 1];
        const z1 = this.positions[idx1 + 2];

        const x2 = this.positions[idx2];
        const y2 = this.positions[idx2 + 1];
        const z2 = this.positions[idx2 + 2];

        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;

        const currDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (currDist === 0) continue; 

        const diff = (currDist - rest) / currDist;
        
        const w1 = isP1Pinned ? 0 : 0.5;
        const w2 = isP2Pinned ? 0 : 0.5;

        if (w1 + w2 === 0) continue;

        const translateX = dx * diff * w1;
        const translateY = dy * diff * w1;
        const translateZ = dz * diff * w1;

        if (!isP1Pinned) {
          this.positions[idx1] += translateX;
          this.positions[idx1 + 1] += translateY;
          this.positions[idx1 + 2] += translateZ;
        }

        if (!isP2Pinned) {
          this.positions[idx2] -= dx * diff * w2;
          this.positions[idx2 + 1] -= dy * diff * w2;
          this.positions[idx2 + 2] -= dz * diff * w2;
        }
      }
      
      // Floor constraint at Y=0 (The Table Surface)
      for(let i=0; i<count; i++) {
          if (this.positions[i*3 + 1] < 0) {
              this.positions[i*3 + 1] = 0; // Hard stop at table
              
              // Simple Friction: If hitting floor, reduce horizontal motion
              // Current pos has just been set to 0 height.
              // We also dampen the previous position to simulate friction dragging against the table
              const friction = 0.9;
              const ox = this.prevPositions[i*3];
              const oz = this.prevPositions[i*3+2];
              
              const cx = this.positions[i*3];
              const cz = this.positions[i*3+2];
              
              // Apply friction to the velocity implicit in (current - prev)
              this.prevPositions[i*3] = cx - (cx - ox) * friction;
              this.prevPositions[i*3+2] = cz - (cz - oz) * friction;
          }
      }
    }
  }
}