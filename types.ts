export interface Point2D {
  x: number;
  y: number;
  id: string;
}

export type GarmentType = 'JiaoLing' | 'YuanLing' | 'XieJin';

export interface GarmentParams {
  type: GarmentType; // New field
  sleeveLength: number; // 通袖长
  sleeveWidth: number;  // 袖宽
  collarWidth: number;  // 领宽
  bodyLength: number;   // 衣长
  waistWidth: number;   // 腰宽
  cuffWidth: number;    // 袖口宽
}

export interface SimulationState {
  windSpeed: number;
  windDirection: [number, number, number];
  gravity: number;
  isPaused: boolean;
}

export enum TabType {
  DRAFTING = 'DRAFTING',
  SIMULATION = 'SIMULATION'
}