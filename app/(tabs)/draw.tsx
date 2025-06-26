// app/(tabs)/draw.tsx - Production-Grade Drawing Screen
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Feature flags (what Meta would do)
const FEATURE_FLAGS = {
  USE_PROFESSIONAL_ENGINE: false, // Start with false, enable gradually
  USE_METAL_ACCELERATION: false,
  USE_TILE_SYSTEM: false,
  ENABLE_APPLE_PENCIL: true,
  ENABLE_PERFORMANCE_MONITORING: true,
};

// Import with proper error handling
const loadDrawingEngine = async () => {
  try {
    // Dynamic imports for code splitting
    const [engineModule, canvasModule, toolsModule] = await Promise.all([
      import('../../src/engines/drawing'),
      import('../../src/engines/drawing/Canvas'),
      import('../../src/components/Canvas/DrawingTools'),
    ]);

    return {
      engine: engineModule.EnterpriseDrawingEngine,
      canvas: canvasModule.DrawingCanvas,
      tools: toolsModule.DrawingTools,
    };
  } catch (error) {
    console.error('Failed to load drawing engine:', error);
    return null;
  }
};

// Professional fallback canvas component
const FallbackCanvas: React.FC<{
  onReady: () => void;
  onStrokeStart?: (event: any) => void;
  onStrokeMove?: (event: any) => void;
  onStrokeEnd?: (event: any) => void;
}> = ({ onReady, onStrokeStart, onStrokeMove, onStrokeEnd }) => {
  const canvasRef = useRef<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    // Initialize fallback canvas
    setTimeout(() => {
      onReady();
    }, 100);
  }, [onReady]);

  const handleTouchStart = useCallback((event: any) => {
    setIsDrawing(true);
    const touch = event.nativeEvent.touches[0];
    onStrokeStart?.({
      x: touch.pageX,
      y: touch.pageY,
      pressure: 0.5,
      timestamp: Date.now(),
    });
  }, [onStrokeStart]);

  const handleTouchMove = useCallback((event: any) => {
    if (!isDrawing) return;
    const touch = event.nativeEvent.touches[0];
    onStrokeMove?.({
      x: touch.pageX,
      y: touch.pageY,
      pressure: 0.5,
      timestamp: Date.now(),
    });
  }, [isDrawing, onStrokeMove]);

  const handleTouchEnd = useCallback(() => {
    setIsDrawing(false);
    onStrokeEnd?.({ timestamp: Date.now() });
  }, [onStrokeEnd]);

  return (
    <View
      ref={canvasRef}
      style={styles.canvas}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <View style={styles.canvasContent}>
        <Text style={styles.canvasEmoji}>🎨</Text>
        <Text style={styles.canvasTitle}>Touch to Draw</Text>
      </View>
    </View>
  );
};

// Professional drawing tools component
const DrawingToolsBar: React.FC<{
  selectedTool: string;
  onToolChange: (tool: string) => void;
  brushSize: number;
  onSizeChange: (size: number) => void;
  color: string;
  onColorChange: (color: string) => void;
}> = ({ selectedTool, onToolChange, brushSize, onSizeChange, color, onColorChange }) => {
  const tools = [
    { id: 'brush', icon: '🖌️', name: 'Brush' },
    { id: 'eraser', icon: '🧹', name: 'Eraser' },
    { id: 'move', icon: '✋', name: 'Move' },
  ];

  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];
  const sizes = [2, 5, 10, 20, 40];

  return (
    <View style={styles.toolsContainer}>
      {/* Tool Selection */}
      <View style={styles.toolSection}>
        {tools.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            style={[styles.toolButton, selectedTool === tool.id && styles.toolButtonActive]}
            onPress={() => onToolChange(tool.id)}
          >
            <Text style={styles.toolIcon}>{tool.icon}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Color Selection */}
      <View style={styles.colorSection}>
        {colors.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.colorButton,
              { backgroundColor: c },
              color === c && styles.colorButtonActive,
            ]}
            onPress={() => onColorChange(c)}
          />
        ))}
      </View>

      {/* Size Selection */}
      <View style={styles.sizeSection}>
        {sizes.map((size) => (
          <TouchableOpacity
            key={size}
            style={[styles.sizeButton, brushSize === size && styles.sizeButtonActive]}
            onPress={() => onSizeChange(size)}
          >
            <View
              style={[
                styles.sizeIndicator,
                { width: size / 2, height: size / 2, backgroundColor: color },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// Main Drawing Screen Component
export default function DrawScreen() {
  // State management
  const [engineState, setEngineState] = useState<{
    isLoading: boolean;
    isReady: boolean;
    error: string | null;
    engine: any | null;
    components: any | null;
  }>({
    isLoading: true,
    isReady: false,
    error: null,
    engine: null,
    components: null,
  });

  const [drawingState, setDrawingState] = useState({
    tool: 'brush',
    brushSize: 10,
    color: '#000000',
    isDrawing: false,
  });

  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 0,
    strokeLatency: 0,
    memoryUsage: 0,
  });

  // Refs
  const engineRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);

  // Initialize drawing engine
  useEffect(() => {
    initializeEngine();

    return () => {
      // Cleanup on unmount
      if (engineRef.current) {
        engineRef.current.shutdown();
      }
    };
  }, []);

  const initializeEngine = async () => {
    try {
      setEngineState((prev) => ({ ...prev, isLoading: true, error: null }));

      if (FEATURE_FLAGS.USE_PROFESSIONAL_ENGINE) {
        // Load professional engine
        const components = await loadDrawingEngine();
        
        if (components) {
          const engine = await components.engine.create({
            targetFPS: 60,
            canvasSize: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
            gpuAcceleration: {
              enabled: FEATURE_FLAGS.USE_METAL_ACCELERATION,
              preferMetal: true,
              fallbackToSkia: true,
            },
          });

          engineRef.current = engine;
          
          setEngineState({
            isLoading: false,
            isReady: true,
            error: null,
            engine,
            components,
          });

          // Start performance monitoring
          if (FEATURE_FLAGS.ENABLE_PERFORMANCE_MONITORING) {
            startPerformanceMonitoring();
          }
        } else {
          throw new Error('Failed to load drawing components');
        }
      } else {
        // Use fallback for now
        setEngineState({
          isLoading: false,
          isReady: true,
          error: null,
          engine: null,
          components: null,
        });
      }
    } catch (error: any) {
      console.error('Engine initialization failed:', error);
      setEngineState({
        isLoading: false,
        isReady: false,
        error: error.message || 'Unknown error',
        engine: null,
        components: null,
      });
    }
  };

  const startPerformanceMonitoring = () => {
    if (!engineRef.current) return;

    const interval = setInterval(() => {
      const metrics = engineRef.current.getPerformanceMetrics();
      setPerformanceMetrics({
        fps: metrics.fps || 0,
        strokeLatency: metrics.strokeLatency || 0,
        memoryUsage: metrics.memoryUsage || 0,
      });
    }, 1000);

    return () => clearInterval(interval);
  };

  // Drawing event handlers
  const handleStrokeStart = useCallback((event: any) => {
    setDrawingState((prev) => ({ ...prev, isDrawing: true }));
    
    if (engineRef.current) {
      const { tool, brushSize, color } = drawingState;
      engineRef.current.startStroke({
        point: { x: event.x, y: event.y, pressure: event.pressure },
        tool,
        brush: { size: brushSize },
        color: { hex: color },
      });
    }
  }, [drawingState]);

  const handleStrokeMove = useCallback((event: any) => {
    if (!drawingState.isDrawing) return;
    
    if (engineRef.current) {
      engineRef.current.addPointToStroke({
        x: event.x,
        y: event.y,
        pressure: event.pressure,
      });
    }
  }, [drawingState.isDrawing]);

  const handleStrokeEnd = useCallback(() => {
    setDrawingState((prev) => ({ ...prev, isDrawing: false }));
    
    if (engineRef.current) {
      engineRef.current.endStroke();
    }
  }, []);

  // Error recovery
  const handleRetry = () => {
    initializeEngine();
  };

  // Render loading state
  if (engineState.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Initializing Drawing Engine...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (engineState.error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Drawing Engine Error</Text>
          <Text style={styles.errorMessage}>{engineState.error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.retryButton, styles.secondaryButton]}
            onPress={() => {
              // Force fallback mode
              setEngineState({
                isLoading: false,
                isReady: true,
                error: null,
                engine: null,
                components: null,
              });
            }}
          >
            <Text style={styles.retryButtonText}>Use Simple Canvas</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render main drawing interface
  const DrawingCanvas = engineState.components?.canvas || FallbackCanvas;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.canvasContainer}>
        <DrawingCanvas
          ref={canvasRef}
          width={Dimensions.get('window').width}
          height={Dimensions.get('window').height}
          onReady={() => console.log('Canvas ready')}
          onStrokeStart={handleStrokeStart}
          onStrokeMove={handleStrokeMove}
          onStrokeEnd={handleStrokeEnd}
          engine={engineRef.current}
        />
      </View>

      <DrawingToolsBar
        selectedTool={drawingState.tool}
        onToolChange={(tool) => setDrawingState((prev) => ({ ...prev, tool }))}
        brushSize={drawingState.brushSize}
        onSizeChange={(size) => setDrawingState((prev) => ({ ...prev, brushSize: size }))}
        color={drawingState.color}
        onColorChange={(color) => setDrawingState((prev) => ({ ...prev, color }))}
      />

      {/* Performance Monitor (dev only) */}
      {FEATURE_FLAGS.ENABLE_PERFORMANCE_MONITORING && __DEV__ && (
        <View style={styles.performanceMonitor}>
          <Text style={styles.perfText}>FPS: {performanceMetrics.fps}</Text>
          <Text style={styles.perfText}>Latency: {performanceMetrics.strokeLatency}ms</Text>
          <Text style={styles.perfText}>Memory: {performanceMetrics.memoryUsage}MB</Text>
        </View>
      )}

      {/* Engine Status */}
      <View style={styles.engineStatus}>
        <Text style={styles.statusText}>
          {engineState.engine ? '🚀 Professional Engine' : '🎨 Simple Canvas'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  canvasContainer: {
    flex: 1,
  },
  canvas: {
    flex: 1,
    backgroundColor: '#fff',
  },
  canvasContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvasEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  canvasTitle: {
    fontSize: 18,
    color: '#666',
  },
  
  // Tools styles
  toolsContainer: {
    position: 'absolute',
    left: 20,
    top: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  toolSection: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  toolButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  toolButtonActive: {
    backgroundColor: '#007AFF',
  },
  toolIcon: {
    fontSize: 20,
  },
  
  // Color styles
  colorSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    width: 144,
  },
  colorButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    margin: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  colorButtonActive: {
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  
  // Size styles
  sizeSection: {
    flexDirection: 'row',
  },
  sizeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginRight: 4,
    backgroundColor: '#f0f0f0',
  },
  sizeButtonActive: {
    backgroundColor: '#007AFF20',
  },
  sizeIndicator: {
    borderRadius: 20,
  },
  
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  
  // Error styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#666',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Performance monitor
  performanceMonitor: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 8,
  },
  perfText: {
    color: '#0f0',
    fontSize: 10,
    fontFamily: 'Courier',
  },
  
  // Engine status
  engineStatus: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});