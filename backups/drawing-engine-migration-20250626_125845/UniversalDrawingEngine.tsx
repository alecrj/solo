import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import { Canvas as RNCanvas } from 'react-native-canvas';

// Try to import Skia, but don't crash if it fails
let SkiaCanvas: any = null;
let Skia: any = null;
let useTouchHandler: any = null;

try {
  const skiaModule = require('@shopify/react-native-skia');
  SkiaCanvas = skiaModule.Canvas;
  Skia = skiaModule.Skia;
  useTouchHandler = skiaModule.useTouchHandler;
} catch (error) {
  console.log('⚠️ Skia not available, using fallback canvas');
}

interface DrawingEngineProps {
  width: number;
  height: number;
  onDrawingUpdate?: (data: any) => void;
}

export const UniversalDrawingEngine: React.FC<DrawingEngineProps> = ({
  width,
  height,
  onDrawingUpdate
}) => {
  const [engineType, setEngineType] = useState<'skia' | 'canvas' | 'webview'>(
    SkiaCanvas ? 'skia' : 'canvas'
  );
  
  // Skia implementation
  const SkiaImplementation = () => {
    const touchHandler = useTouchHandler({
      onActive: (event) => {
        // Handle touch
        onDrawingUpdate?.({ type: 'touch', event });
      }
    });
    
    return (
      <SkiaCanvas style={{ width, height }} onTouch={touchHandler}>
        {/* Skia drawing code */}
      </SkiaCanvas>
    );
  };
  
  // Fallback Canvas implementation  
  const CanvasImplementation = () => {
    const canvasRef = useRef<RNCanvas>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    
    useEffect(() => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Set up canvas
        canvas.width = width;
        canvas.height = height;
        
        // Clear canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
      }
    }, [width, height]);
    
    const handleTouchStart = useCallback((e: any) => {
      setIsDrawing(true);
      const touch = e.nativeEvent.touches[0];
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(touch.pageX, touch.pageY);
      }
    }, []);
    
    const handleTouchMove = useCallback((e: any) => {
      if (!isDrawing) return;
      const touch = e.nativeEvent.touches[0];
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.lineTo(touch.pageX, touch.pageY);
        ctx.stroke();
      }
    }, [isDrawing]);
    
    const handleTouchEnd = useCallback(() => {
      setIsDrawing(false);
    }, []);
    
    return (
      <View
        style={{ width, height }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <RNCanvas ref={canvasRef} style={{ width, height }} />
      </View>
    );
  };
  
  // WebView fallback for absolute compatibility
  const WebViewImplementation = () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body { margin: 0; overflow: hidden; }
          canvas { touch-action: none; }
        </style>
      </head>
      <body>
        <canvas id="canvas"></canvas>
        <script>
          const canvas = document.getElementById('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          
          let isDrawing = false;
          
          canvas.addEventListener('touchstart', (e) => {
            isDrawing = true;
            const touch = e.touches[0];
            ctx.beginPath();
            ctx.moveTo(touch.clientX, touch.clientY);
          });
          
          canvas.addEventListener('touchmove', (e) => {
            if (!isDrawing) return;
            e.preventDefault();
            const touch = e.touches[0];
            ctx.lineTo(touch.clientX, touch.clientY);
            ctx.stroke();
          });
          
          canvas.addEventListener('touchend', () => {
            isDrawing = false;
          });
        </script>
      </body>
      </html>
    `;
    
    return (
      <View style={{ width, height }}>
        {Platform.OS === 'web' ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <View>
            {/* Use React Native WebView here */}
          </View>
        )}
      </View>
    );
  };
  
  // Auto-select best engine
  useEffect(() => {
    if (!SkiaCanvas) {
      console.log('📱 Using Canvas fallback (Skia not available)');
      setEngineType('canvas');
    }
  }, []);
  
  return (
    <View style={styles.container}>
      {engineType === 'skia' && SkiaCanvas ? (
        <SkiaImplementation />
      ) : engineType === 'canvas' ? (
        <CanvasImplementation />
      ) : (
        <WebViewImplementation />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white'
  }
});

// Export a working drawing API
export const DrawingAPI = {
  isAvailable: () => true,
  engineType: () => SkiaCanvas ? 'skia' : 'canvas',
  createCanvas: (props: DrawingEngineProps) => <UniversalDrawingEngine {...props} />
};
