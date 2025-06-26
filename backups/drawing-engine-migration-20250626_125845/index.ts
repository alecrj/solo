/**
 * Enterprise Drawing Engine - Complete API Export
 * 
 * Google/Meta-level drawing engine with professional-grade architecture.
 * Consolidates all modules into a clean, enterprise API.
 * 
 * Key Features:
 * - 60-120fps rendering pipeline
 * - Sub-20ms input latency
 * - Tile-based canvas architecture (Procreate-level)
 * - Metal GPU acceleration
 * - Professional layer system (100+ layers)
 * - Advanced memory management
 * - Apple Pencil integration
 * 
 * @fileoverview Main API export for drawing engine
 * @author Enterprise Drawing Team
 * @version 2.0.0
 */

// ===== CORE MODULE EXPORTS =====

/**
 * Core Drawing Engine
 */
export {
  DrawingEngine,
  DEFAULT_ENGINE_CONFIG,
  createDrawingEngine,
  type EngineConfig,
  type EngineState,
  type DrawingContext,
  type BrushSettings,
  type CanvasTransform,
  BlendMode,
} from './Core/Engine';

export {
  PerformanceMonitor,
  DEFAULT_PERFORMANCE_CONFIG,
  type PerformanceConfig,
  type PerformanceMetrics,
} from './Core/Performance';

// ===== INPUT MODULE EXPORTS =====

/**
 * Input Processing System
 */
export {
  InputSystem,
  DEFAULT_INPUT_CONFIG,
  type InputConfig,
  type TouchPoint,
  type StrokeData,
  type GestureData,
} from './Input/index';

// ===== RENDERING MODULE EXPORTS =====

/**
 * Rendering Pipeline
 */
export {
  RenderingPipeline,
  DEFAULT_RENDERING_CONFIG,
  type RenderingConfig,
  type BrushStamp,
  type StrokePath,
  type RenderTarget,
} from './Rendering/index';

// ===== MEMORY MODULE EXPORTS =====

/**
 * Memory Management System
 */
export {
  MemoryManager,
  TileSystem,
  DEFAULT_MEMORY_CONFIG,
  type MemoryConfig,
  type Tile,
  type MemoryStats,
} from './Memory/index';

// ===== CANVAS MODULE EXPORTS =====

/**
 * Canvas System
 */
export {
  CanvasSystem,
  LayerSystem,
  DrawingCanvas,
  DEFAULT_CANVAS_CONFIG,
  type CanvasConfig,
  type Layer,
  type DrawingCanvasProps,
} from './Canvas/index';

// ===== ENTERPRISE DRAWING ENGINE CLASS =====

/**
 * Enterprise Drawing Engine Factory
 * 
 * Main factory class for creating and managing the complete drawing engine.
 * Provides a simplified API for enterprise integration.
 */
export class EnterpriseDrawingEngine {
  private engine: DrawingEngine | null = null;
  private isInitialized = false;

  /**
   * Create and initialize the complete drawing engine
   */
  public static async create(config?: Partial<EngineConfig>): Promise<EnterpriseDrawingEngine> {
    const instance = new EnterpriseDrawingEngine();
    await instance.initialize(config);
    return instance;
  }

  /**
   * Initialize the drawing engine
   */
  public async initialize(config?: Partial<EngineConfig>): Promise<void> {
    if (this.isInitialized) {
      throw new Error('Engine already initialized');
    }

    try {
      this.engine = await createDrawingEngine(config);
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Engine initialization failed: ${error}`);
    }
  }

  /**
   * Get the core drawing engine
   */
  public getEngine(): DrawingEngine {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }
    return this.engine;
  }

  /**
   * Get engine subsystems
   */
  public getSubsystems() {
    const engine = this.getEngine();
    return {
      input: (engine as any).inputSystem,
      rendering: (engine as any).renderingPipeline,
      memory: (engine as any).memoryManager,
      canvas: (engine as any).canvasSystem,
      performance: (engine as any).performanceMonitor,
    };
  }

  /**
   * Create a new layer
   */
  public createLayer(name: string): string {
    return this.getEngine().createLayer(name);
  }

  /**
   * Set active layer
   */
  public setActiveLayer(layerId: string): void {
    this.getEngine().setActiveLayer(layerId);
  }

  /**
   * Update brush settings
   */
  public setBrushSettings(settings: BrushSettings): void {
    this.getEngine().setBrushSettings(settings);
  }

  /**
   * Set canvas transform
   */
  public setCanvasTransform(transform: CanvasTransform): void {
    this.getEngine().setCanvasTransform(transform);
  }

  /**
   * Export canvas as image
   */
  public async exportImage(format: 'png' | 'jpg' | 'webp' = 'png'): Promise<ArrayBuffer> {
    return this.getEngine().exportImage(format);
  }

  /**
   * Get engine state
   */
  public getState(): EngineState {
    return this.getEngine().getState();
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): any {
    return this.getEngine().getPerformanceMetrics();
  }

  /**
   * Get memory statistics
   */
  public getMemoryStats(): any {
    return this.getEngine().getMemoryStats();
  }

  /**
   * Update engine configuration
   */
  public updateConfig(updates: Partial<EngineConfig>): void {
    this.getEngine().updateConfig(updates);
  }

  /**
   * Shutdown the drawing engine
   */
  public async shutdown(): Promise<void> {
    if (this.engine) {
      await this.engine.shutdown();
      this.engine = null;
    }
    this.isInitialized = false;
  }

  /**
   * Check if engine is initialized
   */
  public get initialized(): boolean {
    return this.isInitialized;
  }
}

// ===== MODULE INDEX EXPORTS =====

/**
 * Core Module Index
 */
export * from './Core/index';

/**
 * Input Module Index  
 */
export * from './Input/index';

/**
 * Rendering Module Index
 */
export * from './Rendering/index';

/**
 * Memory Module Index
 */
export * from './Memory/index';

/**
 * Canvas Module Index
 */
export * from './Canvas/index';

// ===== UTILITY FUNCTIONS =====

/**
 * Create a complete drawing setup for React applications
 */
export async function createReactDrawingSetup(config?: {
  canvas?: Partial<CanvasConfig>;
  engine?: Partial<EngineConfig>;
}): Promise<{
  engine: EnterpriseDrawingEngine;
  CanvasComponent: React.FC<DrawingCanvasProps>;
  hooks: {
    useDrawingEngine: () => EnterpriseDrawingEngine;
    useLayerSystem: () => LayerSystem;
    usePerformanceMetrics: () => any;
  };
}> {
  const engine = await EnterpriseDrawingEngine.create(config?.engine);
  
  return {
    engine,
    CanvasComponent: DrawingCanvas,
    hooks: {
      useDrawingEngine: () => engine,
      useLayerSystem: () => engine.getSubsystems().canvas.getLayerSystem(),
      usePerformanceMetrics: () => engine.getPerformanceMetrics(),
    },
  };
}

/**
 * Create a basic drawing engine for simple use cases
 */
export async function createBasicDrawingEngine(): Promise<EnterpriseDrawingEngine> {
  return EnterpriseDrawingEngine.create({
    targetFPS: 60,
    canvasSize: { width: 1024, height: 1024 },
    memoryLimits: {
      tileCacheSize: 256,
      maxLayers: 50,
      undoStackSize: 25,
    },
    gpuAcceleration: {
      enabled: true,
      preferMetal: true,
      fallbackToSkia: true,
    },
  });
}

/**
 * Create a professional drawing engine for advanced use cases
 */
export async function createProfessionalDrawingEngine(): Promise<EnterpriseDrawingEngine> {
  return EnterpriseDrawingEngine.create({
    targetFPS: 120,
    canvasSize: { width: 4096, height: 4096 },
    memoryLimits: {
      tileCacheSize: 1024,
      maxLayers: 200,
      undoStackSize: 100,
    },
    gpuAcceleration: {
      enabled: true,
      preferMetal: true,
      fallbackToSkia: true,
    },
    inputSettings: {
      pressureSensitivity: 1.2,
      palmRejection: true,
      predictiveInput: true,
    },
  });
}

// ===== VERSION AND METADATA =====

/**
 * Drawing engine version and metadata
 */
export const VERSION = '2.0.0';
export const BUILD_DATE = new Date().toISOString();
export const FEATURES = [
  '60-120fps rendering',
  'Sub-20ms input latency',
  'Tile-based canvas',
  'Metal GPU acceleration', 
  'Professional layers',
  'Advanced memory management',
  'Apple Pencil support',
  'React integration',
] as const;

/**
 * Engine capabilities detection
 */
export function detectEngineCapabilities(): {
  metalSupport: boolean;
  applePencilSupport: boolean;
  touchSupport: boolean;
  webglSupport: boolean;
  performanceLevel: 'low' | 'medium' | 'high';
} {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  
  return {
    metalSupport: typeof (window as any).MetalKit !== 'undefined',
    applePencilSupport: 'ontouchstart' in window && typeof (TouchEvent as any) !== 'undefined',
    touchSupport: 'ontouchstart' in window,
    webglSupport: !!gl,
    performanceLevel: navigator.hardwareConcurrency >= 8 ? 'high' : 
                     navigator.hardwareConcurrency >= 4 ? 'medium' : 'low',
  };
}

/**
 * Recommended configuration based on device capabilities
 */
export function getRecommendedConfig(): EngineConfig {
  const capabilities = detectEngineCapabilities();
  
  if (capabilities.performanceLevel === 'high') {
    return {
      targetFPS: capabilities.metalSupport ? 120 : 60,
      canvasSize: { width: 4096, height: 4096 },
      memoryLimits: {
        tileCacheSize: 1024,
        maxLayers: 200,
        undoStackSize: 100,
      },
      gpuAcceleration: {
        enabled: true,
        preferMetal: capabilities.metalSupport,
        fallbackToSkia: true,
      },
      inputSettings: {
        pressureSensitivity: 1.0,
        palmRejection: capabilities.applePencilSupport,
        predictiveInput: true,
      },
    };
  } else if (capabilities.performanceLevel === 'medium') {
    return {
      targetFPS: 60,
      canvasSize: { width: 2048, height: 2048 },
      memoryLimits: {
        tileCacheSize: 512,
        maxLayers: 100,
        undoStackSize: 50,
      },
      gpuAcceleration: {
        enabled: capabilities.webglSupport,
        preferMetal: false,
        fallbackToSkia: true,
      },
      inputSettings: {
        pressureSensitivity: 1.0,
        palmRejection: capabilities.touchSupport,
        predictiveInput: false,
      },
    };
  } else {
    return {
      targetFPS: 60,
      canvasSize: { width: 1024, height: 1024 },
      memoryLimits: {
        tileCacheSize: 256,
        maxLayers: 50,
        undoStackSize: 25,
      },
      gpuAcceleration: {
        enabled: false,
        preferMetal: false,
        fallbackToSkia: true,
      },
      inputSettings: {
        pressureSensitivity: 1.0,
        palmRejection: false,
        predictiveInput: false,
      },
    };
  }
}

// ===== DEFAULT EXPORT =====

/**
 * Default export for convenience
 */
export default EnterpriseDrawingEngine;