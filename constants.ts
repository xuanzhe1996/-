import { GarmentParams } from './types';

export const COLORS = {
  bg: '#F9F7F2',       // Antique Rice Paper
  ink: '#2B2B2B',      // Deep Ink
  cinnabar: '#C44032', // Cinnabar Red
  silkWhite: '#F0F0F0', // White collar
  grid: '#E5E0D8',     // Faint grid
};

export const INITIAL_PARAMS: GarmentParams = {
  type: 'JiaoLing',
  sleeveLength: 160, // cm
  sleeveWidth: 45,   // cm
  collarWidth: 18,   // cm
  bodyLength: 120,   // cm
  waistWidth: 50,    // cm
  cuffWidth: 25,     // cm
};

// Physics Constants
export const CLOTH_RES = 15; // Resolution of the grid
export const TIMESTEP = 18 / 1000;
export const ITERATIONS = 3;
export const DRAG = 0.98;