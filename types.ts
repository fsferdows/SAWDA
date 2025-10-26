import type { Blob } from '@google/genai';

export type DesignType = '2D Flat' | '3D Relief' | 'Mixed';
export type Material = 'Wood' | 'Metal' | 'Plastic' | 'MDF';
export type OutputFormat = 'JD' | 'STL' | 'DXF' | 'SVG';

export interface DesignOptions {
  designType: DesignType;
  material: Material;
  width: number;
  height: number;
  depth: number;
  outputFormat: OutputFormat;
  prompt: string;
  outlineThickness: number;
  depthLayers: number;
}

export interface TranscriptEntry {
  author: 'user' | 'model';
  text: string;
}

export enum ConnectionState {
  IDLE,
  CONNECTING,
  CONNECTED,
  CLOSED,
  ERROR,
}