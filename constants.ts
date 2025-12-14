import { GarmentParams } from './types';

export const COLORS = {
  bg: '#F9F7F2',       // Antique Rice Paper
  ink: '#2B2B2B',      // Deep Ink
  cinnabar: '#1a4c3b', // Deep Green (resembling the reference image)
  silkWhite: '#F7F7F7', // White collar
  grid: '#E5E0D8',     // Faint grid
};

export const INITIAL_PARAMS: GarmentParams = {
  type: 'JiaoLing',
  sleeveLength: 170, // cm (Tong Xiu Chang)
  sleeveWidth: 45,   // cm (Widest part)
  collarWidth: 8.5,  // cm
  bodyLength: 120,   // cm (Front 60 + Back 60)
  waistWidth: 60,    // cm (Bust 96 / 2 + ease approx)
  cuffWidth: 26,     // cm
};

// Physics Constants
export const CLOTH_RES = 20; // Increased resolution for smoother curves
export const TIMESTEP = 18 / 1000;
export const ITERATIONS = 3;
export const DRAG = 0.98;