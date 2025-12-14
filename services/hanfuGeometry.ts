import * as THREE from 'three';
import { GarmentParams, HanfuGeometryData } from '../types';

export const generateHanfuGeometry = (params: GarmentParams): HanfuGeometryData => {
    // Scaling: 1 unit = 10cm approx
    const scale = 0.1;
    const totalWidth = params.sleeveLength * scale;
    const totalHeight = params.bodyLength * scale;
    
    // Resolution - Higher resolution for smoother curves
    const wSeg = 120; 
    const hSeg = 80;
    
    const geo = new THREE.PlaneGeometry(totalWidth, totalHeight, wSeg, hSeg);
    
    const posAttribute = geo.attributes.position;
    const indexAttribute = geo.index;

    if (!indexAttribute) {
        throw new Error("Geometry generation failed");
    }

    // Parameters in World Units
    const sleeveRootWidth = 30 * scale; 
    const sleeveWidestWidth = params.sleeveWidth * scale;
    const cuffWidth = params.cuffWidth * scale;
    const bodyHalfWidth = (params.waistWidth * scale) / 2;
    const collarWidth = params.collarWidth * scale; // Horizontal collar width
    const collarBandSize = 1.0; // The visual width of the white strip

    // Y-Coordinates
    // Plane is centered at (0,0). Y+ is Back, Y- is Front.
    // Shoulder line is roughly at Y=0.
    
    // Helper: Pipa Sleeve Curve Function
    // Calculates the half-width (distance from shoulder line) at a given x
    const getSleeveHalfWidth = (x: number) => {
        const absX = Math.abs(x);
        // Normalized t from 0 (at body edge) to 1 (at cuff)
        const armLength = (totalWidth / 2) - bodyHalfWidth;
        if (armLength <= 0) return sleeveRootWidth;
        
        let t = (absX - bodyHalfWidth) / armLength;
        t = Math.max(0, Math.min(1, t));

        // Quadratic Bezier for "Pipa" shape
        // P0: Root, P1: Widest Point (at approx 1/3), P2: Cuff
        // Adjust control points to match the belly shape
        
        // Simple interpolation for now:
        // Use a sine curve to simulate the belly
        // 0 -> root, 0.4 -> widest, 1.0 -> cuff
        
        if (t < 0.5) {
             // Interp from Root to Widest
             const localT = t / 0.5;
             // Ease out
             return sleeveRootWidth + (sleeveWidestWidth - sleeveRootWidth) * Math.sin(localT * Math.PI / 2);
        } else {
             // Interp from Widest to Cuff
             const localT = (t - 0.5) / 0.5;
             // Ease in
             return sleeveWidestWidth - (sleeveWidestWidth - cuffWidth) * (1 - Math.cos(localT * Math.PI / 2));
        }
    };

    // 1. Define Vertices in Pattern & Identify Collar
    // We will build a new index list and also track collar faces
    const validIndices: number[] = [];
    const positions = posAttribute.array;
    
    // Group 0: Main Fabric, Group 1: White Collar
    // Since we can't easily set groups per triangle during generation in one pass without reordering,
    // we will store triangle indices in two buckets.
    const fabricTriangles: number[] = [];
    const collarTriangles: number[] = [];

    const isPointInPattern = (x: number, y: number): boolean => {
        // 1. Sleeve Check
        if (Math.abs(x) > bodyHalfWidth) {
            const limitY = getSleeveHalfWidth(x);
            // Y is centered. Sleeve top is flat at Y=0? 
            // Diagram shows shoulder line flat.
            // Back (y>0) and Front (y<0) are symmetric for sleeves usually.
            // "Fold" at y=0.
            return Math.abs(y) <= limitY;
        }

        // 2. Body Check
        // Back (y > 0) is simple rectangle
        if (y >= 0) {
            return true; // Inside bounding box
        }

        // Front (y < 0) - Asymmetric "Da Jin" (Lapel)
        // Diagram: Curve starts from Neck Center-Right, goes down to Right Underarm.
        // Let's implement the Right Side (x > 0) cutoff.
        // The Left Side (x < 0) is the full flap covering the chest.
        
        // Neck Hole Logic
        // Tear drop shape centered at (0,0).
        // Back collar depth is small. Front is deep.
        const neckWidth = collarWidth; 
        const neckDepth = 12 * scale; // Deep V
        
        // Simple V-neck check
        // If inside the V, it's a hole.
        // V shape: |x| < neckWidth * (y - neckDepth)/(-neckDepth) ?
        
        // Let's define the Lapel Curve on the Right Side (x > 0)
        // It cuts from (0, -neckDepth) to (bodyHalfWidth, -underarm)
        
        if (x > 0 && y < 0) {
            // "Xiao Jin" (Inner flap) or just the cutout for the "Da Jin" to overlapping?
            // The geometry we generate is the *visible* pattern.
            // The diagram shows the overlapping front panel (Da Jin) which is on the wearer's right (Map Left, X<0).
            // Wait, "Right Overlap" means Left Panel covers Right Panel.
            // Left Panel (x < 0) stays full.
            // Right Panel (x > 0) is the one underneath.
            // BUT, usually we draft the FULL visible shape.
            // If we are showing the pattern, we usually show the "Cross". 
            // The diagram specifically highlights the curve on the center.
            // Let's carve out the neck hole.
            
            // Elliptical Neck Hole
            const dx = x / (neckWidth / 2);
            const dy = (y - 2*scale) / (neckDepth); // Offset y slightly
            if (dx*dx + dy*dy < 1) return false; // Hole
            
            // If it's the "overlapping" diagram, the right side (x>0) usually curves in.
            // Let's add a subtle curve for the overlap edge on the positive X side.
            // Curve equation: x = f(y)
            // From (neckWidth/2, 0) to (bodyHalfWidth, -bodyLength/2) ? No, to side seam.
            
            // For simplicity and aesthetic matching the "Cross" diagram:
            // Just keep it rectangular but remove the neck hole.
        }
        
        // Left side (x < 0)
        if (x < 0 && y < 0) {
             // Neck hole mirror?
             const dx = x / (neckWidth / 2);
             const dy = (y - 2*scale) / (neckDepth);
             if (dx*dx + dy*dy < 1) return false;
        }

        return true;
    };

    const isCollar = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean => {
        // Check if triangle is close to the neck curve/edge
        // Neck boundary is roughly where the hole is.
        // We define a "Collar Zone" around the neck hole params.
        const neckWidth = collarWidth;
        const neckDepth = 12 * scale;
        
        const checkVert = (x: number, y: number) => {
            if (Math.abs(x) > bodyHalfWidth) return false;
            // Distance to center roughly
            // Approximate "distance to ellipse" is hard, use bounds.
            // Inner ellipse: (x/(w/2))^2 + (y/d)^2 = 1
            // Outer ellipse: (x/(w/2 + band))^2 + (y/(d+band))^2 = 1
            const band = collarBandSize;
            
            const dx = x / (neckWidth/2);
            const dy = (y - 2*scale) / neckDepth;
            const distSq = dx*dx + dy*dy;
            
            // If it's just outside the hole (distSq >= 1) but inside outer band
            // We need a more lenient check because the hole logic excluded inner points.
            // So we just check if it's inside the "Outer Boundary".
            
            const odx = x / (neckWidth/2 + band);
            const ody = (y - 2*scale) / (neckDepth + band);
            const distSqOuter = odx*odx + ody*ody;
            
            return distSqOuter < 1.2 && distSq >= 0.8; // Tolerance
        };
        
        return checkVert(ax, ay) || checkVert(bx, by) || checkVert(cx, cy);
    };

    // Filter Loop
    for (let i = 0; i < indexAttribute.count; i += 3) {
        const a = indexAttribute.getX(i);
        const b = indexAttribute.getX(i + 1);
        const c = indexAttribute.getX(i + 2);

        const ax = positions[a * 3], ay = positions[a * 3 + 1];
        const bx = positions[b * 3], by = positions[b * 3 + 1];
        const cx = positions[c * 3], cy = positions[c * 3 + 1];

        if (isPointInPattern(ax, ay) && isPointInPattern(bx, by) && isPointInPattern(cx, cy)) {
            // Classify Triangle
            if (isCollar(ax, ay, bx, by, cx, cy)) {
                collarTriangles.push(a, b, c);
            } else {
                fabricTriangles.push(a, b, c);
            }
        }
    }

    // Reconstruct Geometry with Groups
    const finalIndices = [...fabricTriangles, ...collarTriangles];
    geo.setIndex(finalIndices);
    
    // Clear previous groups and add new ones
    geo.clearGroups();
    geo.addGroup(0, fabricTriangles.length, 0); // Material 0: Body
    geo.addGroup(fabricTriangles.length, collarTriangles.length, 1); // Material 1: Collar

    // 2. Build Adjacency (Same as before)
    const neighborMap: number[][] = Array.from({ length: posAttribute.count }, () => []);
    const addNeighbor = (i: number, n: number) => {
        if (!neighborMap[i].includes(n)) neighborMap[i].push(n);
        if (!neighborMap[n].includes(i)) neighborMap[n].push(i);
    };
    for (let i = 0; i < finalIndices.length; i += 3) {
        const a = finalIndices[i];
        const b = finalIndices[i+1];
        const c = finalIndices[i+2];
        addNeighbor(a, b);
        addNeighbor(b, c);
        addNeighbor(c, a);
    }

    // 3. Base Positions & Pins
    const basePositions: THREE.Vector3[] = [];
    const pins: number[] = [];
    const topY = 0; // Shoulder line is 0 in our logic
    
    for (let i = 0; i < posAttribute.count; i++) {
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const z = positions[i * 3 + 2];
        basePositions.push(new THREE.Vector3(x, y, z));

        // Pin center back neck (keep garment from falling)
        // Near (0, neckDepth) roughly? Back is y>0.
        // Neck hole is centered. Back neck is usually small dip or straight.
        if (Math.abs(x) < 2 && Math.abs(y) < 2) {
            pins.push(i);
        }
    }

    geo.computeVertexNormals();

    return { geo, pins, neighbors: neighborMap, basePositions };
};