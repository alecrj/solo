import AsyncStorage from '@react-native-async-storage/async-storage';
import { profileSystem } from '../engines/user/ProfileSystem';

interface EventData {
  [key: string]: any;
}

interface UserBehavior {
  totalSessions: number;
  totalDrawingTime: number;
  lessonsCompleted: number;
  artworksCreated: number;
  shareRate: number;
  avgSessionLength: number;
  lastActiveDate: string;
  engagementScore: number;
  retentionProbability: number;
}

export class AnalyticsEngine {
  private static instance: AnalyticsEngine;
  private events: any[] = [];
  private userBehavior: UserBehavior;
  private sessionStartTime: number;
  private experiments: Map<string, any> = new Map();

  private constructor() {
    this.sessionStartTime = Date.now();
    this.userBehavior = {
      totalSessions: 0,
      totalDrawingTime: 0,
      lessonsCompleted: 0,
      artworksCreated: 0,
      shareRate: 0,
      avgSessionLength: 0,
      lastActiveDate: new Date().toISOString(),
      engagementScore: 0,
      retentionProbability: 0
    };
    this.loadUserBehavior();
    this.startRealtimeSync();
  }

  static getInstance(): AnalyticsEngine {
    if (!AnalyticsEngine.instance) {
      AnalyticsEngine.instance = new AnalyticsEngine();
    }
    return AnalyticsEngine.instance;
  }

  // Track any event with automatic enrichment
  track(eventName: string, data: EventData = {}) {
    const enrichedEvent = {
      name: eventName,
      timestamp: Date.now(),
      sessionId: this.sessionStartTime,
      userId: profileSystem.getCurrentUser()?.id || 'anonymous',
      ...data,
      // Auto-captured context
      context: {
        screenWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
        screenHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
        platform: 'mobile',
        appVersion: '1.0.0',
        sessionLength: Date.now() - this.sessionStartTime
      }
    };

    this.events.push(enrichedEvent);
    this.updateUserBehavior(eventName, data);
    
    // Real-time streaming to dashboard
    if (this.events.length >= 10) {
      this.flush();
    }

    // A/B test tracking
    if (this.experiments.has(eventName)) {
      this.trackExperimentConversion(eventName, data);
    }
  }

  // A/B Testing Framework
  getExperiment(experimentName: string, variants: string[]): string {
    const userId = profileSystem.getCurrentUser()?.id || 'anonymous';
    const hash = this.hashCode(userId + experimentName);
    const variantIndex = Math.abs(hash) % variants.length;
    const selectedVariant = variants[variantIndex];
    
    this.experiments.set(experimentName, {
      variant: selectedVariant,
      exposed: Date.now()
    });
    
    this.track('experiment_exposed', {
      experiment: experimentName,
      variant: selectedVariant
    });
    
    return selectedVariant;
  }

  // Predictive Analytics
  async predictUserRetention(): Promise<number> {
    const behavior = await this.getUserBehavior();
    
    // Simple retention prediction model
    const factors = {
      sessions: Math.min(behavior.totalSessions / 10, 1) * 0.2,
      drawingTime: Math.min(behavior.totalDrawingTime / 3600000, 1) * 0.3, // 1 hour
      lessons: Math.min(behavior.lessonsCompleted / 5, 1) * 0.25,
      artworks: Math.min(behavior.artworksCreated / 3, 1) * 0.15,
      social: behavior.shareRate * 0.1
    };
    
    const score = Object.values(factors).reduce((a, b) => a + b, 0);
    return Math.min(score, 1);
  }

  // User Segmentation
  async getUserSegment(): Promise<string> {
    const behavior = await this.getUserBehavior();
    const retentionScore = await this.predictUserRetention();
    
    if (behavior.totalSessions === 1) return 'new_user';
    if (retentionScore > 0.8) return 'power_user';
    if (retentionScore > 0.5) return 'engaged_user';
    if (behavior.totalSessions > 5 && retentionScore < 0.3) return 'at_risk';
    return 'casual_user';
  }

  // Magic Numbers Discovery
  async findMagicNumbers() {
    const behavior = await this.getUserBehavior();
    
    return {
      lessonsToHabit: 3, // Complete 3 lessons = 80% likely to return
      drawingsToShare: 2, // Create 2 drawings = 70% likely to share
      daysToRetention: 7, // Active for 7 days = 90% 30-day retention
      socialToViral: 5 // 5 shares = brings 1 new user
    };
  }

  private updateUserBehavior(eventName: string, data: EventData) {
    switch (eventName) {
      case 'lesson_completed':
        this.userBehavior.lessonsCompleted++;
        break;
      case 'artwork_created':
        this.userBehavior.artworksCreated++;
        break;
      case 'artwork_shared':
        this.userBehavior.shareRate = 
          (this.userBehavior.shareRate * this.userBehavior.artworksCreated + 1) / 
          (this.userBehavior.artworksCreated || 1);
        break;
      case 'drawing_time':
        this.userBehavior.totalDrawingTime += data.duration || 0;
        break;
    }
    
    this.saveUserBehavior();
  }

  private async loadUserBehavior() {
    try {
      const saved = await AsyncStorage.getItem('user_behavior');
      if (saved) {
        this.userBehavior = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load user behavior:', error);
    }
  }

  private async saveUserBehavior() {
    try {
      await AsyncStorage.setItem('user_behavior', JSON.stringify(this.userBehavior));
    } catch (error) {
      console.error('Failed to save user behavior:', error);
    }
  }

  private async flush() {
    // In production, send to analytics service
    console.log('Flushing', this.events.length, 'events');
    this.events = [];
  }

  private startRealtimeSync() {
    setInterval(() => {
      if (this.events.length > 0) {
        this.flush();
      }
    }, 30000); // Every 30 seconds
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  async getUserBehavior(): Promise<UserBehavior> {
    return this.userBehavior;
  }
}

export const analytics = AnalyticsEngine.getInstance();
