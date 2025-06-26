/**
 * Canvas System - Professional Layer Management & React Component
 * 
 * Enterprise-grade canvas system with professional layer management,
 * advanced blending modes, and optimized React component integration.
 * 
 * Key Features:
 * - Professional layer system (100+ layers)
 * - Advanced blend modes and compositing
 * - Layer groups and clipping masks
 * - Canvas transformations (zoom, pan, rotate)
 * - React component with touch/gesture support
 * - Tile-based rendering integration
 * 
 * @fileoverview Canvas management and layer system
 * @author Enterprise Drawing Team
 * @version 2.0.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EventEmitter } from 'events';
import { BlendMode, CanvasTransform } from '../Core/Engine';

/**
 * Canvas system configuration
 */
export interface CanvasConfig {
  /** Canvas dimensions */
  size: { width: number; height: number };
  /** Maximum number of layers */
  maxLayers: number;
  /** Default layer settings */
  defaultLayer: {
    blendMode: BlendMode;
    opacity: number;
    visible: boolean;
  };
  /** Canvas background */
  background: {
    color: { r: number; g: number; b: number; a: number };
    transparent: boolean;
  };
  /** Transform limits */
  transformLimits: {
    minScale: number;
    maxScale: number;
    enableRotation: boolean;
  };
}

/**
 * Layer data structure
 */
export interface Layer {
  /** Layer identifier */
  id: string;
  /** Layer name */
  name: string;
  /** Layer type */
  type: 'raster' | 'vector' | 'group' | 'adjustment';
  /** Visibility */
  visible: boolean;
  /** Opacity (0.0 - 1.0) */
  opacity: number;
  /** Blend mode */
  blendMode: BlendMode;
  /** Layer bounds */
  bounds: { x: number; y: number; width: number; height: number };
  /** Z-index for ordering */
  zIndex: number;
  /** Parent layer (for groups) */
  parentId: string | null;
  /** Child layers (for groups) */
  childIds: string[];
  /** Clipping mask */
  clippingMask: boolean;
  /** Lock properties */
  locked: {
    position: boolean;
    pixels: boolean;
    transparency: boolean;
  };
  /** Layer data */
  data: LayerData;
  /** Transform matrix */
  transform: CanvasTransform;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  modifiedAt: number;
}

/**
 * Layer data types
 */
interface LayerData {
  /** Raster data (pixel-based) */
  raster?: {
    tileIds: string[];
    resolution: { width: number; height: number };
  };
  /** Vector data (path-based) */
  vector?: {
    paths: any[];
    styles: any[];
  };
  /** Group data */
  group?: {
    expanded: boolean;
    blendMode: BlendMode;
  };
  /** Adjustment layer data */
  adjustment?: {
    type: 'curves' | 'levels' | 'colorBalance' | 'hue';
    parameters: any;
  };
}

/**
 * Layer operation for undo/redo
 */
interface LayerOperation {
  type: 'create' | 'delete' | 'modify' | 'reorder' | 'group' | 'ungroup';
  layerId: string;
  data: any;
  timestamp: number;
  inverse?: LayerOperation;
}

/**
 * Canvas viewport state
 */
interface ViewportState {
  transform: CanvasTransform;
  visibleRegion: { x: number; y: number; width: number; height: number };
  devicePixelRatio: number;
}

/**
 * Professional Layer System
 * 
 * Manages layers with professional features like groups,
 * clipping masks, and advanced blending.
 */
export class LayerSystem extends EventEmitter {
  private config: CanvasConfig;
  private layers: Map<string, Layer> = new Map();
  private layerOrder: string[] = [];
  private activeLayerId: string | null = null;
  private selectedLayerIds: Set<string> = new Set();
  
  // Layer operations for undo/redo
  private operationHistory: LayerOperation[] = [];
  private operationIndex = -1;
  private readonly MAX_HISTORY = 50;
  
  // External systems
  private memoryManager: any;

  constructor(config: { size: any; memoryManager: any; maxLayers: number }) {
    super();
    
    this.config = {
      size: config.size,
      maxLayers: config.maxLayers,
      defaultLayer: {
        blendMode: BlendMode.Normal,
        opacity: 1.0,
        visible: true,
      },
      background: {
        color: { r: 1, g: 1, b: 1, a: 1 },
        transparent: false,
      },
      transformLimits: {
        minScale: 0.1,
        maxScale: 100.0,
        enableRotation: true,
      },
    };
    
    this.memoryManager = config.memoryManager;
  }

  /**
   * Initialize layer system
   */
  public initialize(): void {
    // Create default background layer
    this.createLayer('Background', 'raster');
    this.emit('initialized');
  }

  /**
   * Create a new layer
   */
  public createLayer(name: string, type: Layer['type'] = 'raster', parentId?: string): string {
    if (this.layers.size >= this.config.maxLayers) {
      throw new Error(`Maximum layer limit (${this.config.maxLayers}) reached`);
    }

    const layerId = `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    const layer: Layer = {
      id: layerId,
      name: this.generateUniqueLayerName(name),
      type,
      visible: this.config.defaultLayer.visible,
      opacity: this.config.defaultLayer.opacity,
      blendMode: this.config.defaultLayer.blendMode,
      bounds: { x: 0, y: 0, width: this.config.size.width, height: this.config.size.height },
      zIndex: this.layerOrder.length,
      parentId: parentId || null,
      childIds: [],
      clippingMask: false,
      locked: {
        position: false,
        pixels: false,
        transparency: false,
      },
      data: this.createLayerData(type),
      transform: {
        scale: 1.0,
        translateX: 0,
        translateY: 0,
        rotation: 0,
      },
      createdAt: now,
      modifiedAt: now,
    };

    // Add to parent if specified
    if (parentId) {
      const parent = this.layers.get(parentId);
      if (parent && parent.type === 'group') {
        parent.childIds.push(layerId);
        parent.modifiedAt = now;
      }
    }

    this.layers.set(layerId, layer);
    this.layerOrder.push(layerId);
    
    // Record operation for undo/redo
    this.recordOperation({
      type: 'create',
      layerId,
      data: { ...layer },
      timestamp: now,
    });

    this.emit('layerCreated', { layer });
    return layerId;
  }

  /**
   * Create layer data based on type
   */
  private createLayerData(type: Layer['type']): LayerData {
    switch (type) {
      case 'raster':
        return {
          raster: {
            tileIds: [],
            resolution: { ...this.config.size },
          },
        };
      case 'vector':
        return {
          vector: {
            paths: [],
            styles: [],
          },
        };
      case 'group':
        return {
          group: {
            expanded: true,
            blendMode: BlendMode.Normal,
          },
        };
      case 'adjustment':
        return {
          adjustment: {
            type: 'curves',
            parameters: {},
          },
        };
      default:
        return {};
    }
  }

  /**
   * Delete layer
   */
  public deleteLayer(layerId: string): boolean {
    const layer = this.layers.get(layerId);
    if (!layer) return false;

    // Can't delete the last layer
    if (this.layers.size <= 1) {
      this.emit('error', new Error('Cannot delete the last layer'));
      return false;
    }

    // Remove from parent if it has one
    if (layer.parentId) {
      const parent = this.layers.get(layer.parentId);
      if (parent) {
        const index = parent.childIds.indexOf(layerId);
        if (index > -1) {
          parent.childIds.splice(index, 1);
          parent.modifiedAt = Date.now();
        }
      }
    }

    // Delete child layers if this is a group
    if (layer.type === 'group') {
      for (const childId of layer.childIds) {
        this.deleteLayer(childId);
      }
    }

    // Clean up memory for raster layers
    if (layer.data.raster) {
      for (const tileId of layer.data.raster.tileIds) {
        // Would clean up tiles from memory manager
      }
    }

    this.layers.delete(layerId);
    const orderIndex = this.layerOrder.indexOf(layerId);
    if (orderIndex > -1) {
      this.layerOrder.splice(orderIndex, 1);
    }

    // Update active layer if deleted
    if (this.activeLayerId === layerId) {
      this.activeLayerId = this.layerOrder[Math.max(0, orderIndex - 1)] || null;
    }

    // Remove from selection
    this.selectedLayerIds.delete(layerId);

    // Record operation for undo/redo
    this.recordOperation({
      type: 'delete',
      layerId,
      data: { ...layer },
      timestamp: Date.now(),
    });

    this.emit('layerDeleted', { layerId });
    return true;
  }

  /**
   * Duplicate layer
   */
  public duplicateLayer(layerId: string): string | null {
    const originalLayer = this.layers.get(layerId);
    if (!originalLayer) return null;

    const newLayerId = this.createLayer(`${originalLayer.name} Copy`, originalLayer.type, originalLayer.parentId);
    const newLayer = this.layers.get(newLayerId)!;

    // Copy properties
    newLayer.opacity = originalLayer.opacity;
    newLayer.blendMode = originalLayer.blendMode;
    newLayer.visible = originalLayer.visible;
    newLayer.bounds = { ...originalLayer.bounds };
    newLayer.transform = { ...originalLayer.transform };
    newLayer.locked = { ...originalLayer.locked };

    // Copy layer data
    if (originalLayer.data.raster && newLayer.data.raster) {
      // Would duplicate tile data
      newLayer.data.raster.tileIds = [...originalLayer.data.raster.tileIds];
    }

    if (originalLayer.data.vector && newLayer.data.vector) {
      newLayer.data.vector.paths = [...originalLayer.data.vector.paths];
      newLayer.data.vector.styles = [...originalLayer.data.vector.styles];
    }

    this.emit('layerDuplicated', { originalLayerId: layerId, newLayerId });
    return newLayerId;
  }

  /**
   * Create layer group
   */
  public createGroup(layerIds: string[], name: string = 'Group'): string {
    const groupId = this.createLayer(name, 'group');
    const group = this.layers.get(groupId)!;

    // Move layers into group
    for (const layerId of layerIds) {
      const layer = this.layers.get(layerId);
      if (layer) {
        layer.parentId = groupId;
        group.childIds.push(layerId);
      }
    }

    this.emit('groupCreated', { groupId, layerIds });
    return groupId;
  }

  /**
   * Ungroup layers
   */
  public ungroupLayers(groupId: string): string[] {
    const group = this.layers.get(groupId);
    if (!group || group.type !== 'group') return [];

    const childIds = [...group.childIds];

    // Move children out of group
    for (const childId of childIds) {
      const child = this.layers.get(childId);
      if (child) {
        child.parentId = group.parentId;
      }
    }

    // Delete the group
    this.deleteLayer(groupId);

    this.emit('layersUngrouped', { groupId, childIds });
    return childIds;
  }

  /**
   * Reorder layers
   */
  public reorderLayer(layerId: string, newIndex: number): boolean {
    const currentIndex = this.layerOrder.indexOf(layerId);
    if (currentIndex === -1 || newIndex < 0 || newIndex >= this.layerOrder.length) {
      return false;
    }

    // Remove from current position
    this.layerOrder.splice(currentIndex, 1);
    
    // Insert at new position
    this.layerOrder.splice(newIndex, 0, layerId);

    // Update z-indices
    this.layerOrder.forEach((id, index) => {
      const layer = this.layers.get(id);
      if (layer) {
        layer.zIndex = index;
      }
    });

    this.recordOperation({
      type: 'reorder',
      layerId,
      data: { fromIndex: currentIndex, toIndex: newIndex },
      timestamp: Date.now(),
    });

    this.emit('layerReordered', { layerId, fromIndex: currentIndex, toIndex: newIndex });
    return true;
  }

  /**
   * Update layer properties
   */
  public updateLayer(layerId: string, updates: Partial<Omit<Layer, 'id' | 'createdAt'>>): boolean {
    const layer = this.layers.get(layerId);
    if (!layer) return false;

    const previousState = { ...layer };
    
    // Apply updates
    Object.assign(layer, updates, {
      modifiedAt: Date.now(),
    });

    this.recordOperation({
      type: 'modify',
      layerId,
      data: { previous: previousState, current: { ...layer } },
      timestamp: Date.now(),
    });

    this.emit('layerUpdated', { layerId, updates });
    return true;
  }

  /**
   * Set active layer
   */
  public setActiveLayer(layerId: string): boolean {
    const layer = this.layers.get(layerId);
    if (!layer) return false;

    const previousId = this.activeLayerId;
    this.activeLayerId = layerId;

    this.emit('activeLayerChanged', { previousId, currentId: layerId });
    return true;
  }

  /**
   * Get active layer
   */
  public getActiveLayer(): Layer | null {
    return this.activeLayerId ? this.layers.get(this.activeLayerId) || null : null;
  }

  /**
   * Get active layer ID
   */
  public getActiveLayerId(): string | null {
    return this.activeLayerId;
  }

  /**
   * Select layers
   */
  public selectLayers(layerIds: string[], addToSelection = false): void {
    if (!addToSelection) {
      this.selectedLayerIds.clear();
    }

    for (const layerId of layerIds) {
      if (this.layers.has(layerId)) {
        this.selectedLayerIds.add(layerId);
      }
    }

    this.emit('layerSelectionChanged', { selectedLayerIds: Array.from(this.selectedLayerIds) });
  }

  /**
   * Get selected layers
   */
  public getSelectedLayers(): Layer[] {
    return Array.from(this.selectedLayerIds)
      .map(id => this.layers.get(id))
      .filter(layer => layer !== undefined) as Layer[];
  }

  /**
   * Get all layers
   */
  public getAllLayers(): Layer[] {
    return Array.from(this.layers.values());
  }

  /**
   * Get layers in render order
   */
  public getLayersInRenderOrder(): Layer[] {
    return this.layerOrder
      .map(id => this.layers.get(id))
      .filter(layer => layer !== undefined) as Layer[];
  }

  /**
   * Get layer hierarchy
   */
  public getLayerHierarchy(): any[] {
    const hierarchy: any[] = [];
    const processed = new Set<string>();

    const buildHierarchy = (parentId: string | null): any[] => {
      const children: any[] = [];
      
      for (const layer of this.layers.values()) {
        if (layer.parentId === parentId && !processed.has(layer.id)) {
          processed.add(layer.id);
          
          const item = {
            ...layer,
            children: layer.type === 'group' ? buildHierarchy(layer.id) : [],
          };
          
          children.push(item);
        }
      }
      
      return children.sort((a, b) => a.zIndex - b.zIndex);
    };

    return buildHierarchy(null);
  }

  /**
   * Generate unique layer name
   */
  private generateUniqueLayerName(baseName: string): string {
    const existingNames = new Set(Array.from(this.layers.values()).map(layer => layer.name));
    
    if (!existingNames.has(baseName)) {
      return baseName;
    }

    let counter = 1;
    let uniqueName = `${baseName} ${counter}`;
    
    while (existingNames.has(uniqueName)) {
      counter++;
      uniqueName = `${baseName} ${counter}`;
    }

    return uniqueName;
  }

  /**
   * Record operation for undo/redo
   */
  private recordOperation(operation: LayerOperation): void {
    // Remove any operations after current index
    if (this.operationIndex < this.operationHistory.length - 1) {
      this.operationHistory = this.operationHistory.slice(0, this.operationIndex + 1);
    }

    // Add new operation
    this.operationHistory.push(operation);
    this.operationIndex++;

    // Limit history size
    if (this.operationHistory.length > this.MAX_HISTORY) {
      this.operationHistory.shift();
      this.operationIndex--;
    }
  }

  /**
   * Undo last operation
   */
  public undo(): boolean {
    if (this.operationIndex < 0) return false;

    const operation = this.operationHistory[this.operationIndex];
    this.executeUndoOperation(operation);
    this.operationIndex--;

    this.emit('operationUndone', { operation });
    return true;
  }

  /**
   * Redo last undone operation
   */
  public redo(): boolean {
    if (this.operationIndex >= this.operationHistory.length - 1) return false;

    this.operationIndex++;
    const operation = this.operationHistory[this.operationIndex];
    this.executeRedoOperation(operation);

    this.emit('operationRedone', { operation });
    return true;
  }

  /**
   * Execute undo operation
   */
  private executeUndoOperation(operation: LayerOperation): void {
    switch (operation.type) {
      case 'create':
        this.layers.delete(operation.layerId);
        const orderIndex = this.layerOrder.indexOf(operation.layerId);
        if (orderIndex > -1) {
          this.layerOrder.splice(orderIndex, 1);
        }
        break;
      case 'delete':
        this.layers.set(operation.layerId, operation.data);
        this.layerOrder.push(operation.layerId);
        break;
      case 'modify':
        this.layers.set(operation.layerId, operation.data.previous);
        break;
      case 'reorder':
        const { fromIndex, toIndex } = operation.data;
        this.layerOrder.splice(toIndex, 1);
        this.layerOrder.splice(fromIndex, 0, operation.layerId);
        break;
    }
  }

  /**
   * Execute redo operation
   */
  private executeRedoOperation(operation: LayerOperation): void {
    switch (operation.type) {
      case 'create':
        this.layers.set(operation.layerId, operation.data);
        this.layerOrder.push(operation.layerId);
        break;
      case 'delete':
        this.layers.delete(operation.layerId);
        const orderIndex = this.layerOrder.indexOf(operation.layerId);
        if (orderIndex > -1) {
          this.layerOrder.splice(orderIndex, 1);
        }
        break;
      case 'modify':
        this.layers.set(operation.layerId, operation.data.current);
        break;
      case 'reorder':
        const { fromIndex, toIndex } = operation.data;
        this.layerOrder.splice(fromIndex, 1);
        this.layerOrder.splice(toIndex, 0, operation.layerId);
        break;
    }
  }

  /**
   * Get layer statistics
   */
  public getStats(): {
    totalLayers: number;
    visibleLayers: number;
    rasterLayers: number;
    vectorLayers: number;
    groupLayers: number;
    memoryUsage: number;
  } {
    let visibleLayers = 0;
    let rasterLayers = 0;
    let vectorLayers = 0;
    let groupLayers = 0;
    let memoryUsage = 0;

    for (const layer of this.layers.values()) {
      if (layer.visible) visibleLayers++;
      
      switch (layer.type) {
        case 'raster':
          rasterLayers++;
          break;
        case 'vector':
          vectorLayers++;
          break;
        case 'group':
          groupLayers++;
          break;
      }
      
      // Calculate approximate memory usage
      const layerSize = layer.bounds.width * layer.bounds.height * 4; // RGBA
      memoryUsage += layerSize;
    }

    return {
      totalLayers: this.layers.size,
      visibleLayers,
      rasterLayers,
      vectorLayers,
      groupLayers,
      memoryUsage,
    };
  }

  /**
   * Clear all layers
   */
  public clear(): void {
    this.layers.clear();
    this.layerOrder = [];
    this.activeLayerId = null;
    this.selectedLayerIds.clear();
    this.operationHistory = [];
    this.operationIndex = -1;

    this.emit('cleared');
  }

  /**
   * Shutdown layer system
   */
  public shutdown(): void {
    this.clear();
    this.emit('shutdown');
  }
}

/**
 * Canvas System - Main coordination class
 * 
 * Coordinates layer system, canvas transformations,
 * and viewport management.
 */
export class CanvasSystem extends EventEmitter {
  private config: CanvasConfig;
  private layerSystem: LayerSystem;
  private memoryManager: any;
  
  // Canvas state
  private canvasTransform: CanvasTransform = {
    scale: 1.0,
    translateX: 0,
    translateY: 0,
    rotation: 0,
  };
  
  private viewport: ViewportState = {
    transform: { ...this.canvasTransform },
    visibleRegion: { x: 0, y: 0, width: 0, height: 0 },
    devicePixelRatio: 1,
  };

  constructor(config: { size: any; memoryManager: any; maxLayers: number }) {
    super();
    
    this.config = {
      size: config.size,
      maxLayers: config.maxLayers,
      defaultLayer: {
        blendMode: BlendMode.Normal,
        opacity: 1.0,
        visible: true,
      },
      background: {
        color: { r: 1, g: 1, b: 1, a: 1 },
        transparent: false,
      },
      transformLimits: {
        minScale: 0.1,
        maxScale: 100.0,
        enableRotation: true,
      },
    };
    
    this.memoryManager = config.memoryManager;
    this.layerSystem = new LayerSystem(config);
    
    this.setupEventListeners();
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    this.layerSystem.on('layerCreated', (data) => {
      this.emit('layerChange', data.layer.id);
    });
    
    this.layerSystem.on('layerDeleted', (data) => {
      this.emit('layerChange', data.layerId);
    });
    
    this.layerSystem.on('activeLayerChanged', (data) => {
      this.emit('layerChange', data.currentId);
    });
  }

  /**
   * Initialize canvas system
   */
  public async initialize(): Promise<void> {
    this.layerSystem.initialize();
    this.memoryManager.initializeCanvas(this.config.size.width, this.config.size.height);
    
    this.viewport.visibleRegion = {
      x: 0,
      y: 0,
      width: this.config.size.width,
      height: this.config.size.height,
    };
    
    this.emit('initialized');
  }

  /**
   * Create new layer
   */
  public createLayer(name: string): string {
    return this.layerSystem.createLayer(name);
  }

  /**
   * Set active layer
   */
  public setActiveLayer(layerId: string): void {
    this.layerSystem.setActiveLayer(layerId);
  }

  /**
   * Get active layer ID
   */
  public getActiveLayerId(): string | null {
    return this.layerSystem.getActiveLayerId();
  }

  /**
   * Get layer system
   */
  public getLayerSystem(): LayerSystem {
    return this.layerSystem;
  }

  /**
   * Set canvas transform
   */
  public setTransform(transform: CanvasTransform): void {
    // Apply transform limits
    const clampedTransform = {
      scale: Math.max(
        this.config.transformLimits.minScale,
        Math.min(this.config.transformLimits.maxScale, transform.scale)
      ),
      translateX: transform.translateX,
      translateY: transform.translateY,
      rotation: this.config.transformLimits.enableRotation ? transform.rotation : 0,
    };

    this.canvasTransform = clampedTransform;
    this.viewport.transform = { ...clampedTransform };
    
    this.updateVisibleRegion();
    this.emit('transformUpdate', clampedTransform);
  }

  /**
   * Get canvas transform
   */
  public getTransform(): CanvasTransform {
    return { ...this.canvasTransform };
  }

  /**
   * Get canvas size
   */
  public getSize(): { width: number; height: number } {
    return { ...this.config.size };
  }

  /**
   * Update visible region based on current transform
   */
  private updateVisibleRegion(): void {
    const { scale, translateX, translateY } = this.canvasTransform;
    
    // Calculate visible region in canvas coordinates
    const viewWidth = this.viewport.visibleRegion.width / scale;
    const viewHeight = this.viewport.visibleRegion.height / scale;
    
    this.viewport.visibleRegion = {
      x: -translateX / scale,
      y: -translateY / scale,
      width: viewWidth,
      height: viewHeight,
    };
  }

  /**
   * Get visible region
   */
  public getVisibleRegion(): { x: number; y: number; width: number; height: number } {
    return { ...this.viewport.visibleRegion };
  }

  /**
   * Convert screen coordinates to canvas coordinates
   */
  public screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    const { scale, translateX, translateY, rotation } = this.canvasTransform;
    
    // Apply inverse transform
    const x = (screenX - translateX) / scale;
    const y = (screenY - translateY) / scale;
    
    if (rotation !== 0) {
      // Apply inverse rotation
      const cos = Math.cos(-rotation);
      const sin = Math.sin(-rotation);
      
      return {
        x: x * cos - y * sin,
        y: x * sin + y * cos,
      };
    }
    
    return { x, y };
  }

  /**
   * Convert canvas coordinates to screen coordinates
   */
  public canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    const { scale, translateX, translateY, rotation } = this.canvasTransform;
    
    let x = canvasX;
    let y = canvasY;
    
    if (rotation !== 0) {
      // Apply rotation
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      
      x = canvasX * cos - canvasY * sin;
      y = canvasX * sin + canvasY * cos;
    }
    
    return {
      x: x * scale + translateX,
      y: y * scale + translateY,
    };
  }

  /**
   * Shutdown canvas system
   */
  public async shutdown(): Promise<void> {
    this.layerSystem.shutdown();
    this.emit('shutdown');
  }
}

/**
 * Professional Drawing Canvas React Component
 * 
 * High-performance React component with touch/gesture support
 * and integration with the drawing engine.
 */
export interface DrawingCanvasProps {
  /** Canvas dimensions */
  width: number;
  height: number;
  /** Drawing engine instance */
  engine?: any;
  /** Event handlers */
  onStrokeStart?: (event: any) => void;
  onStrokeUpdate?: (event: any) => void;
  onStrokeEnd?: (event: any) => void;
  onTransformChange?: (transform: CanvasTransform) => void;
  /** Style overrides */
  style?: React.CSSProperties;
  /** Additional class names */
  className?: string;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  width,
  height,
  engine,
  onStrokeStart,
  onStrokeUpdate,
  onStrokeEnd,
  onTransformChange,
  style,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [transform, setTransform] = useState<CanvasTransform>({
    scale: 1,
    translateX: 0,
    translateY: 0,
    rotation: 0,
  });

  // Touch handling state
  const touchStartRef = useRef<{ x: number; y: number; timestamp: number } | null>(null);
  const lastTouchRef = useRef<TouchList | null>(null);

  /**
   * Initialize canvas
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set up high-DPI rendering
    const devicePixelRatio = window.devicePixelRatio || 1;
    const displayWidth = width;
    const displayHeight = height;

    canvas.width = displayWidth * devicePixelRatio;
    canvas.height = displayHeight * devicePixelRatio;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    context.scale(devicePixelRatio, devicePixelRatio);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    // Initialize with engine if available
    if (engine) {
      engine.attachCanvas(canvas);
    }
  }, [width, height, engine]);

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    touchStartRef.current = { x, y, timestamp: performance.now() };
    setIsDrawing(true);

    if (onStrokeStart) {
      onStrokeStart({
        x,
        y,
        pressure: (touch as any).force || 0.5,
        timestamp: performance.now(),
      });
    }

    // Pass to engine if available
    if (engine && engine.inputSystem) {
      engine.inputSystem.handleTouchStart(event.touches, event.nativeEvent);
    }
  }, [onStrokeStart, engine]);

  /**
   * Handle touch move
   */
  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    
    if (!isDrawing || !touchStartRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (onStrokeUpdate) {
      onStrokeUpdate({
        x,
        y,
        pressure: (touch as any).force || 0.5,
        timestamp: performance.now(),
      });
    }

    // Pass to engine if available
    if (engine && engine.inputSystem) {
      engine.inputSystem.handleTouchMove(event.touches, event.nativeEvent);
    }

    lastTouchRef.current = event.touches;
  }, [isDrawing, onStrokeUpdate, engine]);

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    
    if (!isDrawing || !touchStartRef.current) return;

    setIsDrawing(false);

    if (onStrokeEnd) {
      onStrokeEnd({
        duration: performance.now() - touchStartRef.current.timestamp,
        timestamp: performance.now(),
      });
    }

    // Pass to engine if available
    if (engine && engine.inputSystem) {
      engine.inputSystem.handleTouchEnd(event.changedTouches, event.nativeEvent);
    }

    touchStartRef.current = null;
    lastTouchRef.current = null;
  }, [isDrawing, onStrokeEnd, engine]);

  /**
   * Handle mouse events (for desktop)
   */
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setIsDrawing(true);

    if (onStrokeStart) {
      onStrokeStart({
        x,
        y,
        pressure: 0.5,
        timestamp: performance.now(),
      });
    }
  }, [onStrokeStart]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (onStrokeUpdate) {
      onStrokeUpdate({
        x,
        y,
        pressure: 0.5,
        timestamp: performance.now(),
      });
    }
  }, [isDrawing, onStrokeUpdate]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;

    setIsDrawing(false);

    if (onStrokeEnd) {
      onStrokeEnd({
        timestamp: performance.now(),
      });
    }
  }, [isDrawing, onStrokeEnd]);

  /**
   * Handle wheel for zoom
   */
  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(10, transform.scale * scaleFactor));

    // Calculate new translation to zoom towards mouse position
    const newTransform = {
      ...transform,
      scale: newScale,
      translateX: mouseX - (mouseX - transform.translateX) * (newScale / transform.scale),
      translateY: mouseY - (mouseY - transform.translateY) * (newScale / transform.scale),
    };

    setTransform(newTransform);

    if (onTransformChange) {
      onTransformChange(newTransform);
    }

    // Update engine transform
    if (engine && engine.canvasSystem) {
      engine.canvasSystem.setTransform(newTransform);
    }
  }, [transform, onTransformChange, engine]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        overflow: 'hidden',
        position: 'relative',
        touchAction: 'none',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          cursor: isDrawing ? 'none' : 'crosshair',
          userSelect: 'none',
        }}
      />
    </div>
  );
};

/**
 * Default canvas configuration
 */
export const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
  size: { width: 2048, height: 2048 },
  maxLayers: 100,
  defaultLayer: {
    blendMode: BlendMode.Normal,
    opacity: 1.0,
    visible: true,
  },
  background: {
    color: { r: 1, g: 1, b: 1, a: 1 },
    transparent: false,
  },
  transformLimits: {
    minScale: 0.1,
    maxScale: 100.0,
    enableRotation: true,
  },
};