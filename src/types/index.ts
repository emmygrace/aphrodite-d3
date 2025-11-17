import type { Selection } from 'd3-selection';

export type SignIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export type HouseIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export type PlanetIndex = number;

export interface SignData {
  sign: SignIndex;
  degree: number;
}

export interface HouseData {
  house: HouseIndex;
  cuspDegree: number;
}

export interface PlanetData {
  planet: PlanetIndex;
  sign: SignIndex;
  degree: number;
  house?: HouseIndex;
}

export interface AspectData {
  planet1: PlanetIndex;
  planet2: PlanetIndex;
  aspect: string;
  orb: number;
}

export interface RenderData {
  signs?: SignData[];
  houses?: HouseData[];
  planets?: PlanetData[];
  aspects?: AspectData[];
}

export interface Indexes {
  signs?: SignIndex[];
  houses?: HouseIndex[];
  planets?: PlanetIndex[];
}

// Re-export VisualConfig and GlyphConfig from aphrodite-shared
export type { VisualConfig, GlyphConfig } from '@gaia-tools/aphrodite-shared/configs';

// Re-export orientation types
export type {
  ViewFrame,
  LockRule,
  OrientationPreset,
  OrientationProgram,
  OrientationRule,
  OrientationRuntimeState,
  ChartSnapshot,
} from '@gaia-tools/aphrodite-shared/orientation';

// Export chart data type (matches ChartSnapshot but defined here for core)
export type { ChartDataForOrientation } from '../utils/viewFrame.js';

export interface ChartOptions {
  centerX: number;
  centerY: number;
  /**
   * @deprecated Use viewFrame instead. This is kept for backward compatibility.
   * If viewFrame is provided, rotationOffset is ignored.
   */
  rotationOffset?: number;
  /**
   * ViewFrame for orientation. If provided, overrides rotationOffset.
   */
  viewFrame?: ViewFrame;
  /**
   * Lock rules for animation. Only used if viewFrame is provided.
   */
  locks?: LockRule[];
  visualConfig?: VisualConfig;
  glyphConfig?: GlyphConfig;
  layerId?: string;
}

export type RingType = 'signs' | 'houses' | 'planets' | 'aspects' | 'outer';

export type D3Selection = Selection<SVGGElement, unknown, null, undefined>;

