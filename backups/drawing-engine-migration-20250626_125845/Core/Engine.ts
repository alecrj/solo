/**
 * Core Drawing Engine - Main Orchestrator
 * 
 * Enterprise-grade drawing engine following Google/Meta standards.
 * Consolidates and orchestrates all drawing subsystems for Procreate-level performance.
 * 
 * Key Features:
 * - 60-120fps rendering pipeline
 * - Sub-20ms input latency
 * - Tile-based canvas architecture
 * - Metal GPU acceleration
 * - Professional memory management
 * 
 * @fileoverview Main drawing engine orchestrator
 * @author Enterprise Drawing Team
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import { InputSystem } from '../Input';
import { RenderingPipeline } from '../Rendering';
import { MemoryManager } from '../Memory';
import { CanvasSystem } from '../Canvas';
import { PerformanceMonitor } from './Performance';

/**
 * Core engine configuration for optimal performance
 */
export interface EngineConfig {
  /** Target frame rate (60 or 120) */
  targetFPS: 60 | 120;
  /** Canvas dimensions */
  canvasSize: { width: number; height: number };
  /** Memory limits in MB */
  memoryLimits: {
    tileCacheSize: number;
    maxLayers: number;
    undoStackSize: number;
  };
  /** GPU acceleration settings */
  gpuAcceleration: {
    enabled: boolean;
    preferMetal: boolean;
    fallbackToSkia: boolean;
  };
  /** Input processing settings */
  inputSettings: {
    pressureSensitivity: number;
    palmRejection: boolean;
    predictiveInput: boolean;
  };
}

/**
 * Engine state for real-time monitoring
 */
export interface EngineState {
  isInitialized: boolean;
  isDrawing: boolean;
  currentFPS: number;
  inputLatency: number;
  memoryUsage: {
    tiles: number;
    brushCache: number;
    total: number;
  };
  activeLayer: string | null;
  canvasTransform: {
    scale: number;
    translation: { x: number; y: number };
    rotation: number;
  };
}

/**
 * Drawing operation context
 */
export interface DrawingContext {
  layerId: string;
  brushSettings: BrushSettings;
  transform: CanvasTransform;
  pressure: number;
  timestamp: number;
}

/**
 * Brush configuration for professional drawing
 */
export interface BrushSettings {
  size: number;
  opacity: number;
  hardness: number;
  spacing: number;
  texture?: string;
  blendMode: BlendMode;
  pressureDynamics: {
    size: boolean;
    opacity: boolean;
    flow: boolean;
  };
}

/**
 * Canvas transformation matrix
 */
export interface CanvasTransform {
  scale: number;
  translateX: number;
  translateY: number;
  rotation: number;
}

/**
 * Professional blend modes
 */
export enum BlendMode {
  Normal = 'normal',
  Multiply = 'multiply',
  Screen = 'screen',
  Overlay = 'overlay',
  SoftLight = 'soft-light',
  HardLight = 'hard-light',
  ColorDodge = 'color-dodge',
  ColorBurn = 'color-burn',
  Darken = 'darken',
  Lighten = 'lighten',
  Difference = 'difference',
  Exclusion = 'exclusion',
}

/**
 * Professional-grade Drawing Engine
 * 
 * Main orchestrator that coordinates all drawing subsystems to achieve
 * Procreate-level performance and professional features.
 */
export class DrawingEngine extends EventEmitter {
  private config: EngineConfig;
  private state: EngineState;
  
  // Core subsystems
  private inputSystem: InputSystem;
  private renderingPipeline: RenderingPipeline;
  private memoryManager: MemoryManager;
  private canvasSystem: CanvasSystem;
  private performanceMonitor: PerformanceMonitor;
  
  // Internal state
  private animationFrame: number | null = null;
  private lastFrameTime = 0;
  private isInitialized = false;

  constructor(config: EngineConfig) {
    super();
    this.config = config;
    this.initializeState();
    this.initializeSubsystems();
  }

  /**
   * Initialize engine state
   */
  private initializeState(): void {
    this.state = {
      isInitialized: false,
      isDrawing: false,
      currentFPS: 0,
      inputLatency: 0,
      memoryUsage: {
        tiles: 0,
        brushCache: 0,
        total: 0,
      },
      activeLayer: null,
      canvasTransform: {
        scale: 1.0,
        translation: { x: 0, y: 0 },
        rotation: 0,
      },
    };
  }

  /**
   * Initialize all drawing subsystems
   */
  private initializeSubsystems(): void {
    // Performance monitoring
    this.performanceMonitor = new PerformanceMonitor({
      targetFPS: this.config.targetFPS,
      memoryLimits: this.config.memoryLimits,
    });

    // Memory management
    this.memoryManager = new MemoryManager({
      tileCacheSize: this.config.memoryLimits.tileCacheSize,
      performanceMonitor: this.performanceMonitor,
    });

    // Canvas system
    this.canvasSystem = new CanvasSystem({
      size: this.config.canvasSize,
      memoryManager: this.memoryManager,
      maxLayers: this.config.memoryLimits.maxLayers,
    });

    // Rendering pipeline
    this.renderingPipeline = new RenderingPipeline({
      canvasSystem: this.canvasSystem,
      memoryManager: this.memoryManager,
      gpuAcceleration: this.config.gpuAcceleration,
      targetFPS: this.config.targetFPS,
    });

    // Input processing
    this.inputSystem = new InputSystem({
      canvasSystem: this.canvasSystem,
      renderingPipeline: this.renderingPipeline,
      settings: this.config.inputSettings,
    });

    this.setupEventListeners();
  }

  /**
   * Set up inter-subsystem event communication
   */
  private setupEventListeners(): void {
    // Input events
    this.inputSystem.on('strokeStart', this.handleStrokeStart.bind(this));
    this.inputSystem.on('strokeUpdate', this.handleStrokeUpdate.bind(this));
    this.inputSystem.on('strokeEnd', this.handleStrokeEnd.bind(this));

    // Canvas events
    this.canvasSystem.on('layerChange', this.handleLayerChange.bind(this));
    this.canvasSystem.on('transformUpdate', this.handleTransformUpdate.bind(this));

    // Performance events
    this.performanceMonitor.on('frameRate', this.handleFrameRateUpdate.bind(this));
    this.performanceMonitor.on('memoryWarning', this.handleMemoryWarning.bind(this));
  }

  /**
   * Initialize the drawing engine
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize subsystems in dependency order
      await this.memoryManager.initialize();
      await this.canvasSystem.initialize();
      await this.renderingPipeline.initialize();
      await this.inputSystem.initialize();
      
      // Start performance monitoring
      this.performanceMonitor.start();
      
      // Start render loop
      this.startRenderLoop();
      
      this.state.isInitialized = true;
      this.isInitialized = true;
      
      this.emit('initialized');
    } catch (error) {
      this.emit('error', new Error(`Engine initialization failed: ${error}`));
      throw error;
    }
  }

  /**
   * Start the high-performance render loop
   */
  private startRenderLoop(): void {
    const render = (timestamp: number) => {
      if (!this.isInitialized) return;

      const deltaTime = timestamp - this.lastFrameTime;
      this.lastFrameTime = timestamp;

      // Update performance metrics
      this.performanceMonitor.recordFrame(deltaTime);

      // Process any pending input
      this.inputSystem.processInput();

      // Render frame if needed
      if (this.renderingPipeline.needsRender()) {
        this.renderingPipeline.render();
      }

      // Update state
      this.updateEngineState();

      // Schedule next frame
      this.animationFrame = requestAnimationFrame(render);
    };

    this.animationFrame = requestAnimationFrame(render);
  }

  /**
   * Update engine state for monitoring
   */
  private updateEngineState(): void {
    this.state.currentFPS = this.performanceMonitor.getCurrentFPS();
    this.state.inputLatency = this.inputSystem.getLatency();
    this.state.memoryUsage = this.memoryManager.getUsageStats();
    this.state.canvasTransform = this.canvasSystem.getTransform();
  }

  /**
   * Handle stroke start event
   */
  private handleStrokeStart(context: DrawingContext): void {
    this.state.isDrawing = true;
    this.state.activeLayer = context.layerId;
    
    this.performanceMonitor.recordInputEvent('strokeStart', context.timestamp);
    this.emit('strokeStart', context);
  }

  /**
   * Handle stroke update event
   */
  private handleStrokeUpdate(context: DrawingContext): void {
    this.performanceMonitor.recordInputEvent('strokeUpdate', context.timestamp);
    this.emit('strokeUpdate', context);
  }

  /**
   * Handle stroke end event
   */
  private handleStrokeEnd(context: DrawingContext): void {
    this.state.isDrawing = false;
    
    this.performanceMonitor.recordInputEvent('strokeEnd', context.timestamp);
    this.emit('strokeEnd', context);
  }

  /**
   * Handle layer change event
   */
  private handleLayerChange(layerId: string): void {
    this.state.activeLayer = layerId;
    this.emit('layerChange', layerId);
  }

  /**
   * Handle transform update event
   */
  private handleTransformUpdate(transform: CanvasTransform): void {
    this.state.canvasTransform = transform;
    this.emit('transformUpdate', transform);
  }

  /**
   * Handle frame rate update
   */
  private handleFrameRateUpdate(fps: number): void {
    this.state.currentFPS = fps;
    
    // Emit warning if performance drops below target
    if (fps < this.config.targetFPS * 0.8) {
      this.emit('performanceWarning', { type: 'frameRate', value: fps });
    }
  }

  /**
   * Handle memory warning
   */
  private handleMemoryWarning(usage: any): void {
    this.emit('memoryWarning', usage);
  }

  /**
   * Get current engine state
   */
  public getState(): EngineState {
    return { ...this.state };
  }

  /**
   * Update engine configuration
   */
  public updateConfig(updates: Partial<EngineConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Propagate config changes to subsystems
    if (updates.targetFPS) {
      this.performanceMonitor.setTargetFPS(updates.targetFPS);
      this.renderingPipeline.setTargetFPS(updates.targetFPS);
    }
    
    if (updates.inputSettings) {
      this.inputSystem.updateSettings(updates.inputSettings);
    }
  }

  /**
   * Create a new layer
   */
  public createLayer(name: string): string {
    return this.canvasSystem.createLayer(name);
  }

  /**
   * Set active layer
   */
  public setActiveLayer(layerId: string): void {
    this.canvasSystem.setActiveLayer(layerId);
  }

  /**
   * Update brush settings
   */
  public setBrushSettings(settings: BrushSettings): void {
    this.renderingPipeline.setBrushSettings(settings);
  }

  /**
   * Set canvas transform
   */
  public setCanvasTransform(transform: CanvasTransform): void {
    this.canvasSystem.setTransform(transform);
  }

  /**
   * Export canvas as image data
   */
  public async exportImage(format: 'png' | 'jpg' | 'webp' = 'png'): Promise<ArrayBuffer> {
    return this.renderingPipeline.exportImage(format);
  }

  /**
   * Clean shutdown of the drawing engine
   */
  public async shutdown(): Promise<void> {
    // Stop render loop
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Shutdown subsystems
    this.performanceMonitor.stop();
    await this.inputSystem.shutdown();
    await this.renderingPipeline.shutdown();
    await this.canvasSystem.shutdown();
    await this.memoryManager.shutdown();

    this.isInitialized = false;
    this.state.isInitialized = false;

    this.emit('shutdown');
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics() {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * Get memory usage statistics
   */
  public getMemoryStats() {
    return this.memoryManager.getUsageStats();
  }
}

/**
 * Default configuration for professional drawing
 */
export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  targetFPS: 60,
  canvasSize: { width: 2048, height: 2048 },
  memoryLimits: {
    tileCacheSize: 512, // MB
    maxLayers: 100,
    undoStackSize: 50,
  },
  gpuAcceleration: {
    enabled: true,
    preferMetal: true,
    fallbackToSkia: true,
  },
  inputSettings: {
    pressureSensitivity: 1.0,
    palmRejection: true,
    predictiveInput: true,
  },
};

/**
 * Create and initialize a drawing engine with default settings
 */
export async function createDrawingEngine(
  config: Partial<EngineConfig> = {}
): Promise<DrawingEngine> {
  const fullConfig = { ...DEFAULT_ENGINE_CONFIG, ...config };
  const engine = new DrawingEngine(fullConfig);
  await engine.initialize();
  return engine;
}