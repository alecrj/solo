/**
 * Performance Monitor - Enterprise-Grade Performance Tracking
 * 
 * Real-time performance monitoring system for the drawing engine.
 * Tracks FPS, input latency, memory usage, and GPU performance.
 * 
 * Key Features:
 * - Real-time FPS monitoring (60/120Hz)
 * - Input latency tracking (<16ms target)
 * - Memory usage analytics
 * - GPU performance metrics
 * - Automatic optimization suggestions
 * 
 * @fileoverview Performance monitoring and optimization
 * @author Enterprise Drawing Team
 * @version 2.0.0
 */

import { EventEmitter } from 'events';

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  /** Target frame rate */
  targetFPS: 60 | 120;
  /** Memory limits */
  memoryLimits: {
    tileCacheSize: number;
    maxLayers: number;
    undoStackSize: number;
  };
  /** Monitoring intervals */
  intervals: {
    fpsUpdate: number;
    memoryCheck: number;
    gpuMetrics: number;
  };
  /** Warning thresholds */
  thresholds: {
    lowFPS: number;
    highMemory: number;
    highLatency: number;
  };
}

/**
 * Performance metrics data structure
 */
export interface PerformanceMetrics {
  // Frame rate metrics
  fps: {
    current: number;
    average: number;
    min: number;
    max: number;
    frameTime: number;
  };
  
  // Input latency metrics
  input: {
    latency: number;
    averageLatency: number;
    maxLatency: number;
    inputEvents: number;
  };
  
  // Memory usage metrics
  memory: {
    totalUsage: number;
    tileCache: number;
    brushCache: number;
    layerData: number;
    available: number;
  };
  
  // GPU performance metrics
  gpu: {
    utilization: number;
    memoryUsage: number;
    drawCalls: number;
    triangles: number;
  };
  
  // System metrics
  system: {
    cpuUsage: number;
    batteryImpact: 'low' | 'medium' | 'high';
    thermalState: 'nominal' | 'fair' | 'serious' | 'critical';
  };
}

/**
 * Input event tracking
 */
interface InputEvent {
  type: 'strokeStart' | 'strokeUpdate' | 'strokeEnd';
  timestamp: number;
  processedTimestamp: number;
  latency: number;
}

/**
 * Frame timing data
 */
interface FrameData {
  timestamp: number;
  deltaTime: number;
  fps: number;
}

/**
 * Memory usage snapshot
 */
interface MemorySnapshot {
  timestamp: number;
  totalUsage: number;
  breakdown: {
    tiles: number;
    brushes: number;
    layers: number;
    other: number;
  };
}

/**
 * Professional Performance Monitor
 * 
 * Provides real-time performance tracking and optimization guidance
 * for maintaining Procreate-level drawing performance.
 */
export class PerformanceMonitor extends EventEmitter {
  private config: PerformanceConfig;
  private isRunning = false;
  
  // Frame rate tracking
  private frames: FrameData[] = [];
  private frameCount = 0;
  private lastFrameTime = 0;
  private fpsBuffer: number[] = [];
  private readonly FPS_BUFFER_SIZE = 60;
  
  // Input latency tracking
  private inputEvents: InputEvent[] = [];
  private readonly INPUT_BUFFER_SIZE = 100;
  
  // Memory tracking
  private memorySnapshots: MemorySnapshot[] = [];
  private readonly MEMORY_BUFFER_SIZE = 50;
  
  // Performance intervals
  private fpsInterval: number | null = null;
  private memoryInterval: number | null = null;
  private gpuInterval: number | null = null;
  
  // Current metrics
  private currentMetrics: PerformanceMetrics;

  constructor(config: Partial<PerformanceConfig> = {}) {
    super();
    this.config = this.mergeWithDefaults(config);
    this.initializeMetrics();
  }

  /**
   * Merge user config with sensible defaults
   */
  private mergeWithDefaults(config: Partial<PerformanceConfig>): PerformanceConfig {
    return {
      targetFPS: 60,
      memoryLimits: {
        tileCacheSize: 512,
        maxLayers: 100,
        undoStackSize: 50,
      },
      intervals: {
        fpsUpdate: 1000, // 1 second
        memoryCheck: 2000, // 2 seconds
        gpuMetrics: 500, // 0.5 seconds
      },
      thresholds: {
        lowFPS: 0.8, // 80% of target FPS
        highMemory: 0.9, // 90% of memory limit
        highLatency: 16, // 16ms input latency
      },
      ...config,
    };
  }

  /**
   * Initialize performance metrics structure
   */
  private initializeMetrics(): void {
    this.currentMetrics = {
      fps: {
        current: 0,
        average: 0,
        min: 0,
        max: 0,
        frameTime: 0,
      },
      input: {
        latency: 0,
        averageLatency: 0,
        maxLatency: 0,
        inputEvents: 0,
      },
      memory: {
        totalUsage: 0,
        tileCache: 0,
        brushCache: 0,
        layerData: 0,
        available: 0,
      },
      gpu: {
        utilization: 0,
        memoryUsage: 0,
        drawCalls: 0,
        triangles: 0,
      },
      system: {
        cpuUsage: 0,
        batteryImpact: 'low',
        thermalState: 'nominal',
      },
    };
  }

  /**
   * Start performance monitoring
   */
  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    
    // Start monitoring intervals
    this.startFPSMonitoring();
    this.startMemoryMonitoring();
    this.startGPUMonitoring();
    
    this.emit('started');
  }

  /**
   * Stop performance monitoring
   */
  public stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // Clear intervals
    if (this.fpsInterval) clearInterval(this.fpsInterval);
    if (this.memoryInterval) clearInterval(this.memoryInterval);
    if (this.gpuInterval) clearInterval(this.gpuInterval);
    
    this.emit('stopped');
  }

  /**
   * Record a frame for FPS calculation
   */
  public recordFrame(deltaTime: number): void {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const fps = 1000 / deltaTime;
    
    // Add to FPS buffer
    this.fpsBuffer.push(fps);
    if (this.fpsBuffer.length > this.FPS_BUFFER_SIZE) {
      this.fpsBuffer.shift();
    }
    
    // Update frame data
    const frameData: FrameData = {
      timestamp: currentTime,
      deltaTime,
      fps,
    };
    
    this.frames.push(frameData);
    if (this.frames.length > this.FPS_BUFFER_SIZE) {
      this.frames.shift();
    }
    
    // Update current metrics
    this.updateFPSMetrics();
    
    this.frameCount++;
  }

  /**
   * Record an input event for latency tracking
   */
  public recordInputEvent(type: InputEvent['type'], timestamp: number): void {
    if (!this.isRunning) return;
    
    const processedTimestamp = performance.now();
    const latency = processedTimestamp - timestamp;
    
    const inputEvent: InputEvent = {
      type,
      timestamp,
      processedTimestamp,
      latency,
    };
    
    this.inputEvents.push(inputEvent);
    if (this.inputEvents.length > this.INPUT_BUFFER_SIZE) {
      this.inputEvents.shift();
    }
    
    // Update input metrics
    this.updateInputMetrics();
    
    // Check for high latency warning
    if (latency > this.config.thresholds.highLatency) {
      this.emit('highLatency', { latency, threshold: this.config.thresholds.highLatency });
    }
  }

  /**
   * Record memory usage snapshot
   */
  public recordMemoryUsage(usage: {
    tiles: number;
    brushes: number;
    layers: number;
    other: number;
  }): void {
    if (!this.isRunning) return;
    
    const totalUsage = usage.tiles + usage.brushes + usage.layers + usage.other;
    
    const snapshot: MemorySnapshot = {
      timestamp: performance.now(),
      totalUsage,
      breakdown: usage,
    };
    
    this.memorySnapshots.push(snapshot);
    if (this.memorySnapshots.length > this.MEMORY_BUFFER_SIZE) {
      this.memorySnapshots.shift();
    }
    
    // Update memory metrics
    this.updateMemoryMetrics();
    
    // Check memory thresholds
    const memoryLimit = this.config.memoryLimits.tileCacheSize * 1024 * 1024; // Convert MB to bytes
    const memoryUsagePercent = totalUsage / memoryLimit;
    
    if (memoryUsagePercent > this.config.thresholds.highMemory) {
      this.emit('memoryWarning', {
        usage: totalUsage,
        limit: memoryLimit,
        percentage: memoryUsagePercent,
      });
    }
  }

  /**
   * Update FPS metrics
   */
  private updateFPSMetrics(): void {
    if (this.fpsBuffer.length === 0) return;
    
    const current = this.fpsBuffer[this.fpsBuffer.length - 1];
    const average = this.fpsBuffer.reduce((sum, fps) => sum + fps, 0) / this.fpsBuffer.length;
    const min = Math.min(...this.fpsBuffer);
    const max = Math.max(...this.fpsBuffer);
    const frameTime = 1000 / current;
    
    this.currentMetrics.fps = {
      current,
      average,
      min,
      max,
      frameTime,
    };
  }

  /**
   * Update input latency metrics
   */
  private updateInputMetrics(): void {
    if (this.inputEvents.length === 0) return;
    
    const latencies = this.inputEvents.map(event => event.latency);
    const latency = latencies[latencies.length - 1];
    const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    
    this.currentMetrics.input = {
      latency,
      averageLatency,
      maxLatency,
      inputEvents: this.inputEvents.length,
    };
  }

  /**
   * Update memory usage metrics
   */
  private updateMemoryMetrics(): void {
    if (this.memorySnapshots.length === 0) return;
    
    const latest = this.memorySnapshots[this.memorySnapshots.length - 1];
    const memoryLimit = this.config.memoryLimits.tileCacheSize * 1024 * 1024;
    
    this.currentMetrics.memory = {
      totalUsage: latest.totalUsage,
      tileCache: latest.breakdown.tiles,
      brushCache: latest.breakdown.brushes,
      layerData: latest.breakdown.layers,
      available: memoryLimit - latest.totalUsage,
    };
  }

  /**
   * Start FPS monitoring interval
   */
  private startFPSMonitoring(): void {
    this.fpsInterval = window.setInterval(() => {
      const targetFPS = this.config.targetFPS;
      const currentFPS = this.currentMetrics.fps.current;
      
      this.emit('frameRate', currentFPS);
      
      // Check for low FPS warning
      if (currentFPS < targetFPS * this.config.thresholds.lowFPS) {
        this.emit('lowFrameRate', {
          current: currentFPS,
          target: targetFPS,
          threshold: targetFPS * this.config.thresholds.lowFPS,
        });
      }
    }, this.config.intervals.fpsUpdate);
  }

  /**
   * Start memory monitoring interval
   */
  private startMemoryMonitoring(): void {
    this.memoryInterval = window.setInterval(() => {
      // Check for memory leaks
      if (this.memorySnapshots.length >= 2) {
        const recent = this.memorySnapshots.slice(-5);
        const growth = recent[recent.length - 1].totalUsage - recent[0].totalUsage;
        const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp;
        const growthRate = growth / timeSpan; // bytes per ms
        
        // Emit warning if memory is growing too fast
        if (growthRate > 1024) { // More than 1KB per ms
          this.emit('memoryLeak', {
            growthRate,
            recentGrowth: growth,
            timeSpan,
          });
        }
      }
    }, this.config.intervals.memoryCheck);
  }

  /**
   * Start GPU monitoring interval
   */
  private startGPUMonitoring(): void {
    this.gpuInterval = window.setInterval(() => {
      // GPU metrics would be platform-specific
      // This is a placeholder for actual GPU monitoring
      this.updateGPUMetrics();
    }, this.config.intervals.gpuMetrics);
  }

  /**
   * Update GPU performance metrics (platform-specific)
   */
  private updateGPUMetrics(): void {
    // Placeholder for actual GPU monitoring
    // In a real implementation, this would interface with:
    // - Metal Performance Shaders on iOS
    // - WebGL debug extensions
    // - Platform-specific GPU APIs
    
    this.currentMetrics.gpu = {
      utilization: 0, // Would be measured
      memoryUsage: 0, // Would be measured
      drawCalls: 0, // Would be counted
      triangles: 0, // Would be counted
    };
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.currentMetrics };
  }

  /**
   * Get current FPS
   */
  public getCurrentFPS(): number {
    return this.currentMetrics.fps.current;
  }

  /**
   * Get average FPS over time window
   */
  public getAverageFPS(): number {
    return this.currentMetrics.fps.average;
  }

  /**
   * Get current input latency
   */
  public getCurrentLatency(): number {
    return this.currentMetrics.input.latency;
  }

  /**
   * Set new target FPS
   */
  public setTargetFPS(fps: 60 | 120): void {
    this.config.targetFPS = fps;
    this.emit('targetFPSChanged', fps);
  }

  /**
   * Generate performance report
   */
  public generateReport(): {
    summary: string;
    details: PerformanceMetrics;
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const targetFPS = this.config.targetFPS;
    
    let summary = 'Performance: ';
    const recommendations: string[] = [];
    
    // FPS analysis
    if (metrics.fps.average >= targetFPS * 0.95) {
      summary += 'Excellent';
    } else if (metrics.fps.average >= targetFPS * 0.8) {
      summary += 'Good';
      recommendations.push('Consider optimizing brush complexity for better performance');
    } else {
      summary += 'Needs Optimization';
      recommendations.push('Reduce canvas size or layer count');
      recommendations.push('Disable advanced brush effects');
      recommendations.push('Clear tile cache more frequently');
    }
    
    // Memory analysis
    const memoryUsagePercent = metrics.memory.totalUsage / (this.config.memoryLimits.tileCacheSize * 1024 * 1024);
    if (memoryUsagePercent > 0.8) {
      recommendations.push('Memory usage is high - consider reducing undo history');
    }
    
    // Input latency analysis
    if (metrics.input.averageLatency > 16) {
      recommendations.push('Input latency is high - disable predictive input if enabled');
    }
    
    return {
      summary,
      details: metrics,
      recommendations,
    };
  }

  /**
   * Reset all performance tracking data
   */
  public reset(): void {
    this.frames = [];
    this.inputEvents = [];
    this.memorySnapshots = [];
    this.fpsBuffer = [];
    this.frameCount = 0;
    this.initializeMetrics();
    
    this.emit('reset');
  }
}

/**
 * Default performance configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  targetFPS: 60,
  memoryLimits: {
    tileCacheSize: 512,
    maxLayers: 100,
    undoStackSize: 50,
  },
  intervals: {
    fpsUpdate: 1000,
    memoryCheck: 2000,
    gpuMetrics: 500,
  },
  thresholds: {
    lowFPS: 0.8,
    highMemory: 0.9,
    highLatency: 16,
  },
};