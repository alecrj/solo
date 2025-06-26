export interface ApplePencilInput {
    x: number;
    y: number;
    pressure: number;
    tiltX: number;
    tiltY: number;
    azimuth: number;
    altitude: number;
    timestamp: number;
    force?: number;
    radiusX?: number;
    radiusY?: number;
    rotation?: number;
    type: 'pencil' | 'finger' | 'stylus';
  }
  
  export interface ApplePencilCapabilities {
    supportsPressure: boolean;
    supportsTilt: boolean;
    supportsAzimuth: boolean;
    supportsForce: boolean;
    maxPressure: number;
    generation: 1 | 2;
    model: string;
    firmwareVersion?: string;
    batteryLevel?: number;
    isConnected: boolean;
    latency: number;
    samplingRate: number;
  }