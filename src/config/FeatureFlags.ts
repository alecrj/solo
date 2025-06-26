// src/config/FeatureFlags.ts
export class FeatureFlags {
    private static flags = {
      // Core engine flags
      USE_NEW_DRAWING_ENGINE: false,
      USE_METAL_ACCELERATION: false,
      USE_TILE_BASED_RENDERING: false,
      USE_APPLE_PENCIL_V2: false,
      
      // Performance flags
      ENABLE_120FPS_MODE: false,
      ENABLE_PREDICTIVE_STROKE: false,
      ENABLE_GPU_ACCELERATION: false,
      
      // Rollout percentages
      DRAWING_ENGINE_ROLLOUT_PERCENT: 0,
    };
  
    static isEnabled(flag: string, userId?: string): boolean {
      // A/B testing logic
      if (userId && flag.includes('ROLLOUT_PERCENT')) {
        return this.checkRolloutPercentage(flag, userId);
      }
      return this.flags[flag] || false;
    }
  
    private static checkRolloutPercentage(flag: string, userId: string): boolean {
      const percentage = this.flags[flag];
      const hash = this.hashUserId(userId);
      return (hash % 100) < percentage;
    }
  }