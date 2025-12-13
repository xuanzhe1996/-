import * as THREE from 'three';
import { DRAG, TIMESTEP } from '../constants';

// A lightweight custom physics solver for specific mesh vertices
export class ClothPhysics {
  positions: Float32Array;
  prevPositions: Float32Array;
  originalPositions: Float32Array;
  constraints: number[]; // [p1_index, p2_index, rest_distance]
  pins: number[]; // Indices of vertices that shouldn't move
  
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
    // Assuming a structured grid for simplicity, or just neighbor edges
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

  update(wind: THREE.Vector3, gravity: number) {
    const count = this.positions.length / 3;

    // 1. Integration
    for (let i = 0; i < count; i++) {
      if (this.pins.includes(i)) continue;

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
      // Noise/Turbulence for wind can be added here
      const windFactor = Math.sin(Date.now() * 0.005 + y * 0.1) * 0.5 + 0.5;

      this.positions[idx] = x + vx + (wind.x * windFactor) * TIMESTEP * TIMESTEP;
      this.positions[idx + 1] = y + vy + (gravity) * TIMESTEP * TIMESTEP;
      this.positions[idx + 2] = z + vz + (wind.z * windFactor) * TIMESTEP * TIMESTEP;
    }

    // 2. Constraints Relaxation
    // Running multiple iterations makes it stiffer
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < this.constraints.length; i += 3) {
        const p1 = this.constraints[i];
        const p2 = this.constraints[i + 1];
        const rest = this.constraints[i + 2];

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
        if (currDist === 0) continue; // prevent div by zero

        const diff = (currDist - rest) / currDist;
        
        // Inverse mass weighting (assuming equal mass)
        const w1 = this.pins.includes(p1) ? 0 : 0.5;
        const w2 = this.pins.includes(p2) ? 0 : 0.5;

        if (w1 + w2 === 0) continue;

        const translateX = dx * diff * w1;
        const translateY = dy * diff * w1;
        const translateZ = dz * diff * w1;

        if (!this.pins.includes(p1)) {
          this.positions[idx1] += translateX;
          this.positions[idx1 + 1] += translateY;
          this.positions[idx1 + 2] += translateZ;
        }

        if (!this.pins.includes(p2)) {
          this.positions[idx2] -= dx * diff * w2;
          this.positions[idx2 + 1] -= dy * diff * w2;
          this.positions[idx2 + 2] -= dz * diff * w2;
        }
      }
      
      // Floor constraint (simple)
      for(let i=0; i<count; i++) {
          if (this.positions[i*3 + 1] < -20) {
              this.positions[i*3 + 1] = -20;
          }
      }
    }
  }
}