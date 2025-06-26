export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private frameCallbacks: Map<string, () => void> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Track FPS for drawing
  trackFPS(componentName: string) {
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let fps = 0;

    const calculateFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTime;
      
      if (deltaTime >= 1000) {
        fps = Math.round((frameCount * 1000) / deltaTime);
        this.recordMetric(`${componentName}_fps`, fps);
        
        frameCount = 0;
        lastFrameTime = currentTime;
        
        // Alert if FPS drops below 30
        if (fps < 30) {
          console.warn(`Low FPS detected in ${componentName}: ${fps}`);
          this.optimizePerformance(componentName);
        }
      }
      
      requestAnimationFrame(calculateFPS);
    };
    
    this.frameCallbacks.set(componentName, calculateFPS);
    calculateFPS();
  }

  // Memory monitoring
  trackMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.recordMetric('heap_used', memory.usedJSHeapSize / 1048576); // MB
        this.recordMetric('heap_total', memory.totalJSHeapSize / 1048576);
        
        // Alert if memory usage is high
        const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        if (usage > 0.9) {
          console.warn('High memory usage detected:', Math.round(usage * 100) + '%');
          this.triggerMemoryCleanup();
        }
      }, 5000);
    }
  }

  // Track render times
  measureRenderTime(componentName: string, renderFn: () => void) {
    const startTime = performance.now();
    renderFn();
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    this.recordMetric(`${componentName}_render_time`, renderTime);
    
    if (renderTime > 16) { // Longer than one frame
      console.warn(`Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  }

  // Network performance
  trackAPICall(endpoint: string, startTime: number) {
    const duration = performance.now() - startTime;
    this.recordMetric(`api_${endpoint}`, duration);
    
    if (duration > 1000) {
      console.warn(`Slow API call to ${endpoint}: ${duration.toFixed(0)}ms`);
    }
  }

  // Get performance report
  getPerformanceReport() {
    const report: any = {};
    
    this.metrics.forEach((values, metric) => {
      report[metric] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      };
    });
    
    return report;
  }

  private recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }
  }

  private optimizePerformance(componentName: string) {
    // Auto-optimization strategies
    console.log(`Applying optimizations for ${componentName}`);
    
    // Reduce quality settings
    // Defer non-critical updates
    // Enable hardware acceleration
  }

  private triggerMemoryCleanup() {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Clear caches
    // Unload unused assets
    console.log('Memory cleanup triggered');
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
