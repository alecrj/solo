export const FeatureFlags = {
  // AI Features
  AI_STROKE_PREDICTION: true,
  AI_SHAPE_COMPLETION: true,
  AI_STYLE_LEARNING: true,
  AI_PROPORTION_CORRECTION: true,
  
  // Growth Features
  DRAWING_BATTLES: true,
  VIRAL_SHARING: true,
  SMART_NOTIFICATIONS: true,
  SOCIAL_PROOF: true,
  
  // Performance Features
  WEBGL_RENDERING: true,
  PREDICTIVE_CACHING: true,
  MEMORY_OPTIMIZATION: true,
  
  // Experimental Features
  AR_DRAWING: false,
  VOICE_COMMANDS: false,
  MULTIPLAYER_CANVAS: false,
  NFT_EXPORT: false
};

export const isFeatureEnabled = (feature: keyof typeof FeatureFlags): boolean => {
  return FeatureFlags[feature] || false;
};
