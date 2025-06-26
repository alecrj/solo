// src/hooks/useMetaFeatures.ts - Missing Hook Implementation
import { useState, useEffect, useCallback } from 'react';

interface MetaFeature {
  id: string;
  name: string;
  enabled: boolean;
  version: string;
  config?: Record<string, any>;
}

interface MetaFeaturesState {
  features: MetaFeature[];
  loading: boolean;
  error: string | null;
}

export function useMetaFeatures() {
  const [state, setState] = useState<MetaFeaturesState>({
    features: [],
    loading: true,
    error: null,
  });

  const initializeFeatures = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Mock meta features for now
      const defaultFeatures: MetaFeature[] = [
        {
          id: 'advanced_drawing',
          name: 'Advanced Drawing Engine',
          enabled: true,
          version: '1.0.0',
          config: {
            enableApplePencil: true,
            enable120fps: true,
            enablePredictiveStroke: true,
          },
        },
        {
          id: 'ai_assistance',
          name: 'AI Drawing Assistant',
          enabled: true,
          version: '1.0.0',
          config: {
            enableShapeCompletion: true,
            enableStyleSuggestions: true,
            enableColorPalettes: true,
          },
        },
        {
          id: 'social_features',
          name: 'Social Drawing Features',
          enabled: true,
          version: '1.0.0',
          config: {
            enableChallenges: true,
            enableCollaboration: true,
            enableSharing: true,
          },
        },
        {
          id: 'performance_optimization',
          name: 'Performance Optimization',
          enabled: true,
          version: '1.0.0',
          config: {
            enableGPUAcceleration: true,
            enableTileRendering: true,
            enableMemoryOptimization: true,
          },
        },
      ];

      setState({
        features: defaultFeatures,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load meta features',
      }));
    }
  }, []);

  const toggleFeature = useCallback((featureId: string) => {
    setState(prev => ({
      ...prev,
      features: prev.features.map(feature =>
        feature.id === featureId
          ? { ...feature, enabled: !feature.enabled }
          : feature
      ),
    }));
  }, []);

  const updateFeatureConfig = useCallback((featureId: string, config: Record<string, any>) => {
    setState(prev => ({
      ...prev,
      features: prev.features.map(feature =>
        feature.id === featureId
          ? { ...feature, config: { ...feature.config, ...config } }
          : feature
      ),
    }));
  }, []);

  const isFeatureEnabled = useCallback((featureId: string): boolean => {
    const feature = state.features.find(f => f.id === featureId);
    return feature?.enabled ?? false;
  }, [state.features]);

  const getFeatureConfig = useCallback((featureId: string): Record<string, any> | undefined => {
    const feature = state.features.find(f => f.id === featureId);
    return feature?.config;
  }, [state.features]);

  useEffect(() => {
    initializeFeatures();
  }, [initializeFeatures]);

  return {
    features: state.features,
    loading: state.loading,
    error: state.error,
    toggleFeature,
    updateFeatureConfig,
    isFeatureEnabled,
    getFeatureConfig,
    refresh: initializeFeatures,
  };
}

// src/hooks/index.ts - Hook Exports
export { useMetaFeatures } from './useMetaFeatures';

// Additional drawing-related hooks
export { useDrawingState } from './useDrawingState';
export { useApplePencil } from './useApplePencil';
export { usePerformanceMetrics } from './usePerformanceMetrics';

// src/hooks/useDrawingState.ts - Drawing State Hook
import { useState, useCallback, useRef } from 'react';
import { DrawingState, Stroke, Layer, DrawingTool, Color, Brush } from '../types';

const initialDrawingState: DrawingState = {
  currentTool: 'brush',
  currentColor: { hex: '#000000', rgb: { r: 0, g: 0, b: 0 }, hsb: { h: 0, s: 0, b: 0 }, alpha: 1 },
  currentBrush: null,
  brushSize: 10,
  opacity: 1,
  layers: [],
  activeLayerId: '',
  strokes: [],
  canvasWidth: 800,
  canvasHeight: 600,
  zoom: 1,
  pan: { x: 0, y: 0 },
  rotation: 0,
  gridVisible: false,
  gridSize: 20,
  referenceImage: null,
  referenceOpacity: 0.5,
  drawingMode: 'normal',
  history: [],
  historyIndex: -1,
  stats: {
    totalStrokes: 0,
    totalTime: 0,
    avgStrokeLength: 0,
    avgPressure: 0,
    avgSpeed: 0,
    longestStroke: 0,
    shortestStroke: 0,
    canvasUtilization: 0,
    colorCount: 0,
    brushCount: 0,
  },
  settings: {
    width: 800,
    height: 600,
    dpi: 300,
    colorSpace: 'sRGB',
    backgroundTransparent: false,
    backgroundColor: '#ffffff',
    enableDebugMode: false,
    enablePerformanceMetrics: false,
    maxUndoSteps: 50,
    autoSave: true,
    autoSaveInterval: 30000,
    smoothing: 0.5,
    predictiveStroke: true,
    snapToShapes: false,
    gridEnabled: false,
    gridSize: 20,
    symmetryEnabled: false,
    symmetryType: 'none',
    referenceEnabled: false,
    streamlineAmount: 0.3,
    quickShapeEnabled: true,
  },
  recentColors: [],
  customBrushes: [],
  savedPalettes: [],
};

export function useDrawingState() {
  const [state, setState] = useState<DrawingState>(initialDrawingState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const updateState = useCallback((updates: Partial<DrawingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const addStroke = useCallback((stroke: Stroke) => {
    setState(prev => ({
      ...prev,
      strokes: [...prev.strokes, stroke],
      stats: {
        ...prev.stats,
        totalStrokes: prev.stats.totalStrokes + 1,
      },
    }));
  }, []);

  const removeStroke = useCallback((strokeId: string) => {
    setState(prev => ({
      ...prev,
      strokes: prev.strokes.filter(s => s.id !== strokeId),
    }));
  }, []);

  const clearCanvas = useCallback(() => {
    setState(prev => ({
      ...prev,
      strokes: [],
      history: [],
      historyIndex: -1,
    }));
  }, []);

  const setTool = useCallback((tool: DrawingTool) => {
    setState(prev => ({ ...prev, currentTool: tool }));
  }, []);

  const setBrushSize = useCallback((size: number) => {
    setState(prev => ({ ...prev, brushSize: size }));
  }, []);

  const setColor = useCallback((color: Color) => {
    setState(prev => ({ ...prev, currentColor: color }));
  }, []);

  return {
    state,
    updateState,
    addStroke,
    removeStroke,
    clearCanvas,
    setTool,
    setBrushSize,
    setColor,
  };
}

// src/hooks/useApplePencil.ts - Apple Pencil Hook
import { useState, useEffect, useCallback } from 'react';
import { ApplePencilCapabilities, ApplePencilInput } from '../types';

export function useApplePencil() {
  const [capabilities, setCapabilities] = useState<ApplePencilCapabilities | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastInput, setLastInput] = useState<ApplePencilInput | null>(null);

  const detectApplePencil = useCallback(async () => {
    // Mock detection for now
    const mockCapabilities: ApplePencilCapabilities = {
      supportsPressure: true,
      supportsTilt: true,
      supportsAzimuth: true,
      supportsForce: true,
      maxPressure: 1,
      generation: 2,
      model: 'Apple Pencil (2nd generation)',
      isConnected: true,
      latency: 9,
      samplingRate: 240,
    };

    setCapabilities(mockCapabilities);
    setIsConnected(true);
  }, []);

  const processInput = useCallback((input: ApplePencilInput) => {
    setLastInput(input);
  }, []);

  useEffect(() => {
    detectApplePencil();
  }, [detectApplePencil]);

  return {
    capabilities,
    isConnected,
    lastInput,
    processInput,
  };
}

// src/hooks/usePerformanceMetrics.ts - Performance Hook
import { useState, useEffect, useCallback, useRef } from 'react';
import { PerformanceMetrics } from '../types';

export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    cpuUsage: 0,
    renderTime: 0,
    strokeLatency: 0,
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  const updateMetrics = useCallback((newMetrics: Partial<PerformanceMetrics>) => {
    setMetrics(prev => ({ ...prev, ...newMetrics }));
  }, []);

  const measureFrameRate = useCallback(() => {
    const now = performance.now();
    const deltaTime = now - lastTimeRef.current;
    
    if (deltaTime >= 1000) {
      const fps = (frameCountRef.current * 1000) / deltaTime;
      setMetrics(prev => ({
        ...prev,
        fps: Math.round(fps),
        frameTime: 1000 / fps,
      }));
      
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    } else {
      frameCountRef.current++;
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(measureFrameRate, 16); // ~60fps monitoring
    return () => clearInterval(interval);
  }, [measureFrameRate]);

  return {
    metrics,
    updateMetrics,
  };
}