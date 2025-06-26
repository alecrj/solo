export interface ExtendedPoint extends Point {
    altitude?: number;
    azimuth?: number;
    force?: number;
  }
  
  export interface ExtendedStroke extends Stroke {
    tool?: string;
    layerId?: string;
  }
  
  export interface BrushDynamics {
    pressureCurve: number[];
    sizeDynamics: boolean;
    opacityDynamics: boolean;
    flowDynamics: boolean;
    colorDynamics: boolean;
    angleDynamics: boolean;
    roundnessDynamics: boolean;
  }
  
  export interface ExtendedBrush extends Brush {
    dynamics?: BrushDynamics;
  }
  
  export interface PerformanceMetrics {
    fps: number;
    frameTime: number;
    memoryUsage: number;
    cpuUsage: number;
    renderTime: number;
    strokeLatency: number;
    frameRate?: number; // For compatibility
  }
  
  export interface CanvasPerformance {
    frameTime: number;
    memoryPressure: number;
    now: () => number;
  }
  
  // Missing blend modes
  export type ExtendedBlendMode = BlendMode | 'difference' | 'clear';
  
  // Error categories that are missing
  export type AdditionalErrorCategory = 
    | 'DRAWING_ENGINE_ERROR'
    | 'CANVAS_ERROR'
    | 'BRUSH_ERROR'
    | 'APPLE_PENCIL_ERROR';
  
  export type AllErrorCategories = ErrorCategory | AdditionalErrorCategory;