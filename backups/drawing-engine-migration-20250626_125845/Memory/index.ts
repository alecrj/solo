/**
 * Memory Management - Professional Tile System & Cache Manager
 * 
 * Enterprise-grade memory management system for handling large canvases
 * through tile-based architecture and intelligent caching strategies.
 * 
 * Key Features:
 * - Tile-based canvas architecture (256x256 or 512x512)
 * - LRU cache management
 * - Memory pool allocation
 * - Automatic garbage collection
 * - Memory usage monitoring
 * - Compression for inactive tiles
 * 
 * @fileoverview Memory management and tile system
 * @author Enterprise Drawing Team
 * @version 2.0.0
 */

import { EventEmitter } from 'events';

/**
 * Memory management configuration
 */
export interface MemoryConfig {
  /** Tile cache size in MB */
  tileCacheSize: number;
  /** Tile dimensions */
  tileSize: number;
  /** Maximum number of tiles in memory */
  maxTilesInMemory: number;
  /** Compression settings */
  compression: {
    enabled: boolean;
    threshold: number; // MB
    algorithm: 'lz4' | 'zstd' | 'deflate';
  };
  /** Memory pool settings */
  memoryPool: {
    initialSize: number;
    maxSize: number;
    growthFactor: number;
  };
}

/**
 * Tile data structure
 */
export interface Tile {
  /** Tile coordinates */
  x: number;
  y: number;
  /** Tile identifier */
  id: string;
  /** Image data */
  data: ImageData | null;
  /** Compressed data */
  compressedData: ArrayBuffer | null;
  /** Tile state */
  state: 'empty' | 'dirty' | 'clean' | 'compressed' | 'loading';
  /** Last access timestamp */
  lastAccessed: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** Dirty region within tile */
  dirtyRegion: { x: number; y: number; width: number; height: number } | null;
  /** Reference count */
  refCount: number;
}

/**
 * Memory usage statistics
 */
export interface MemoryStats {
  /** Total memory used */
  totalUsage: number;
  /** Tiles in memory */
  tilesInMemory: number;
  /** Compressed tiles */
  compressedTiles: number;
  /** Cache hit ratio */
  cacheHitRatio: number;
  /** Memory breakdown */
  breakdown: {
    tiles: number;
    brushCache: number;
    other: number;
  };
}

/**
 * Memory pool for efficient allocation
 */
class MemoryPool {
  private pools: Map<number, ArrayBuffer[]> = new Map();
  private config: MemoryConfig['memoryPool'];
  private totalAllocated = 0;
  private allocationStats = new Map<number, { allocated: number; free: number }>();

  constructor(config: MemoryConfig['memoryPool']) {
    this.config = config;
    this.initializePools();
  }

  /**
   * Initialize memory pools for common sizes
   */
  private initializePools(): void {
    const commonSizes = [
      256 * 256 * 4, // 256x256 RGBA
      512 * 512 * 4, // 512x512 RGBA
      1024 * 1024 * 4, // 1024x1024 RGBA
    ];

    for (const size of commonSizes) {
      this.pools.set(size, []);
      this.allocationStats.set(size, { allocated: 0, free: 0 });
      
      // Pre-allocate initial buffers
      for (let i = 0; i < this.config.initialSize; i++) {
        const buffer = new ArrayBuffer(size);
        this.pools.get(size)!.push(buffer);
        this.totalAllocated += size;
      }
    }
  }

  /**
   * Allocate buffer from pool
   */
  public allocate(size: number): ArrayBuffer {
    const pool = this.pools.get(size);
    
    if (pool && pool.length > 0) {
      const buffer = pool.pop()!;
      const stats = this.allocationStats.get(size)!;
      stats.allocated++;
      return buffer;
    }

    // Create new buffer if pool is empty and under limit
    if (this.totalAllocated < this.config.maxSize * 1024 * 1024) {
      const buffer = new ArrayBuffer(size);
      this.totalAllocated += size;
      
      if (stats) {
        stats.allocated++;
      }
      
      return buffer;
    }

    // Pool exhausted - trigger garbage collection
    this.garbageCollect();
    
    // Try again after GC
    if (pool && pool.length > 0) {
      return pool.pop()!;
    }

    // Last resort - allocate anyway (may cause memory pressure)
    console.warn('Memory pool exhausted, allocating new buffer');
    return new ArrayBuffer(size);
  }

  /**
   * Return buffer to pool
   */
  public deallocate(buffer: ArrayBuffer, size: number): void {
    const pool = this.pools.get(size);
    
    if (pool) {
      pool.push(buffer);
      const stats = this.allocationStats.get(size)!;
      stats.free++;
    }
  }

  /**
   * Force garbage collection
   */
  private garbageCollect(): void {
    // Trim pools to reasonable sizes
    for (const [size, pool] of this.pools) {
      const maxPoolSize = Math.floor(this.config.initialSize * this.config.growthFactor);
      if (pool.length > maxPoolSize) {
        const excess = pool.length - maxPoolSize;
        pool.splice(0, excess);
        this.totalAllocated -= excess * size;
      }
    }
  }

  /**
   * Get memory pool statistics
   */
  public getStats(): any {
    return {
      totalAllocated: this.totalAllocated,
      pools: Array.from(this.allocationStats.entries()).map(([size, stats]) => ({
        size,
        allocated: stats.allocated,
        free: stats.free,
        poolSize: this.pools.get(size)?.length || 0,
      })),
    };
  }
}

/**
 * LRU Cache for tile management
 */
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private accessOrder: K[] = [];
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  /**
   * Get value from cache
   */
  public get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.markAsUsed(key);
    }
    return value;
  }

  /**
   * Set value in cache
   */
  public set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      this.markAsUsed(key);
    } else {
      if (this.cache.size >= this.maxSize) {
        this.evictLeastUsed();
      }
      this.cache.set(key, value);
      this.accessOrder.push(key);
    }
  }

  /**
   * Check if key exists in cache
   */
  public has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete value from cache
   */
  public delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }
    return deleted;
  }

  /**
   * Mark key as recently used
   */
  private markAsUsed(key: K): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used item
   */
  private evictLeastUsed(): K | undefined {
    const leastUsed = this.accessOrder.shift();
    if (leastUsed !== undefined) {
      this.cache.delete(leastUsed);
    }
    return leastUsed;
  }

  /**
   * Get all keys in access order
   */
  public keys(): K[] {
    return [...this.accessOrder];
  }

  /**
   * Get cache size
   */
  public size(): number {
    return this.cache.size;
  }

  /**
   * Clear cache
   */
  public clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }
}

/**
 * Tile compression manager
 */
class CompressionManager {
  private config: MemoryConfig['compression'];
  private compressionStats = {
    compressed: 0,
    decompressed: 0,
    compressionRatio: 0,
    totalSaved: 0,
  };

  constructor(config: MemoryConfig['compression']) {
    this.config = config;
  }

  /**
   * Compress tile data
   */
  public async compressTile(tile: Tile): Promise<ArrayBuffer | null> {
    if (!this.config.enabled || !tile.data) return null;

    try {
      const startTime = performance.now();
      
      // Convert ImageData to ArrayBuffer
      const buffer = new ArrayBuffer(tile.data.data.length);
      const view = new Uint8Array(buffer);
      view.set(tile.data.data);

      // Apply compression (placeholder - would use actual compression library)
      const compressedData = await this.compressBuffer(buffer);
      
      const compressionTime = performance.now() - startTime;
      
      // Update stats
      this.compressionStats.compressed++;
      this.compressionStats.totalSaved += buffer.byteLength - compressedData.byteLength;
      this.compressionStats.compressionRatio = compressedData.byteLength / buffer.byteLength;

      console.debug(`Tile compressed: ${buffer.byteLength} -> ${compressedData.byteLength} bytes (${compressionTime.toFixed(2)}ms)`);
      
      return compressedData;
    } catch (error) {
      console.error('Tile compression failed:', error);
      return null;
    }
  }

  /**
   * Decompress tile data
   */
  public async decompressTile(compressedData: ArrayBuffer, width: number, height: number): Promise<ImageData | null> {
    if (!this.config.enabled) return null;

    try {
      const startTime = performance.now();
      
      // Decompress data
      const decompressedBuffer = await this.decompressBuffer(compressedData);
      
      // Convert back to ImageData
      const imageData = new ImageData(
        new Uint8ClampedArray(decompressedBuffer),
        width,
        height
      );
      
      const decompressionTime = performance.now() - startTime;
      this.compressionStats.decompressed++;

      console.debug(`Tile decompressed: ${compressedData.byteLength} -> ${decompressedBuffer.byteLength} bytes (${decompressionTime.toFixed(2)}ms)`);
      
      return imageData;
    } catch (error) {
      console.error('Tile decompression failed:', error);
      return null;
    }
  }

  /**
   * Compress buffer using selected algorithm
   */
  private async compressBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    // Placeholder for actual compression
    // In a real implementation, this would use:
    // - LZ4 for fast compression
    // - Zstandard for balanced compression
    // - Deflate for broad compatibility
    
    switch (this.config.algorithm) {
      case 'lz4':
        return this.lz4Compress(buffer);
      case 'zstd':
        return this.zstdCompress(buffer);
      case 'deflate':
        return this.deflateCompress(buffer);
      default:
        return buffer;
    }
  }

  /**
   * Decompress buffer
   */
  private async decompressBuffer(compressedData: ArrayBuffer): Promise<ArrayBuffer> {
    switch (this.config.algorithm) {
      case 'lz4':
        return this.lz4Decompress(compressedData);
      case 'zstd':
        return this.zstdDecompress(compressedData);
      case 'deflate':
        return this.deflateDecompress(compressedData);
      default:
        return compressedData;
    }
  }

  // Compression algorithm implementations (placeholders)
  private async lz4Compress(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    // Would use actual LZ4 library
    return buffer;
  }

  private async lz4Decompress(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    return buffer;
  }

  private async zstdCompress(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    // Would use actual Zstandard library
    return buffer;
  }

  private async zstdDecompress(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    return buffer;
  }

  private async deflateCompress(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    // Use built-in compression
    const stream = new CompressionStream('deflate');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    writer.write(new Uint8Array(buffer));
    writer.close();
    
    const chunks: Uint8Array[] = [];
    let result = await reader.read();
    
    while (!result.done) {
      chunks.push(result.value);
      result = await reader.read();
    }
    
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const compressed = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      compressed.set(chunk, offset);
      offset += chunk.length;
    }
    
    return compressed.buffer;
  }

  private async deflateDecompress(buffer: ArrayBuffer): Promise<ArrayBuffer> {
    const stream = new DecompressionStream('deflate');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    writer.write(new Uint8Array(buffer));
    writer.close();
    
    const chunks: Uint8Array[] = [];
    let result = await reader.read();
    
    while (!result.done) {
      chunks.push(result.value);
      result = await reader.read();
    }
    
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const decompressed = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      decompressed.set(chunk, offset);
      offset += chunk.length;
    }
    
    return decompressed.buffer;
  }

  /**
   * Get compression statistics
   */
  public getStats(): any {
    return { ...this.compressionStats };
  }
}

/**
 * Professional Tile System
 * 
 * Manages canvas tiles for efficient memory usage and rendering
 * of large artworks.
 */
export class TileSystem extends EventEmitter {
  private config: MemoryConfig;
  private tiles: Map<string, Tile> = new Map();
  private tileCache: LRUCache<string, Tile>;
  private memoryPool: MemoryPool;
  private compressionManager: CompressionManager;
  
  // Tile management
  private readonly TILE_SIZE: number;
  private canvasWidth = 0;
  private canvasHeight = 0;
  private tilesX = 0;
  private tilesY = 0;
  
  // Memory tracking
  private memoryUsage = 0;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(config: MemoryConfig) {
    super();
    this.config = config;
    this.TILE_SIZE = config.tileSize;
    
    this.tileCache = new LRUCache(config.maxTilesInMemory);
    this.memoryPool = new MemoryPool(config.memoryPool);
    this.compressionManager = new CompressionManager(config.compression);
  }

  /**
   * Initialize tile system for canvas size
   */
  public initialize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.tilesX = Math.ceil(width / this.TILE_SIZE);
    this.tilesY = Math.ceil(height / this.TILE_SIZE);
    
    console.log(`Tile system initialized: ${this.tilesX}x${this.tilesY} tiles (${this.TILE_SIZE}x${this.TILE_SIZE} each)`);
    
    this.emit('initialized', {
      canvasSize: { width, height },
      tileCount: { x: this.tilesX, y: this.tilesY },
      tileSize: this.TILE_SIZE,
    });
  }

  /**
   * Get tile by coordinates
   */
  public async getTile(tileX: number, tileY: number): Promise<Tile | null> {
    const tileId = this.getTileId(tileX, tileY);
    
    // Check cache first
    let tile = this.tileCache.get(tileId);
    if (tile) {
      this.cacheHits++;
      tile.lastAccessed = performance.now();
      tile.refCount++;
      return tile;
    }
    
    this.cacheMisses++;
    
    // Check if tile exists in storage
    tile = this.tiles.get(tileId);
    if (tile) {
      // Load tile into cache
      await this.loadTileToCache(tile);
      return tile;
    }
    
    // Create new empty tile
    tile = this.createEmptyTile(tileX, tileY);
    this.tiles.set(tileId, tile);
    this.tileCache.set(tileId, tile);
    
    return tile;
  }

  /**
   * Create empty tile
   */
  private createEmptyTile(tileX: number, tileY: number): Tile {
    const tileId = this.getTileId(tileX, tileY);
    const bufferSize = this.TILE_SIZE * this.TILE_SIZE * 4; // RGBA
    
    // Allocate from memory pool
    const buffer = this.memoryPool.allocate(bufferSize);
    const data = new ImageData(
      new Uint8ClampedArray(buffer),
      this.TILE_SIZE,
      this.TILE_SIZE
    );
    
    // Initialize with transparent pixels
    data.data.fill(0);
    
    const tile: Tile = {
      x: tileX,
      y: tileY,
      id: tileId,
      data,
      compressedData: null,
      state: 'empty',
      lastAccessed: performance.now(),
      memoryUsage: bufferSize,
      dirtyRegion: null,
      refCount: 1,
    };
    
    this.memoryUsage += bufferSize;
    return tile;
  }

  /**
   * Load tile into cache (decompress if needed)
   */
  private async loadTileToCache(tile: Tile): Promise<void> {
    if (tile.state === 'compressed' && tile.compressedData) {
      // Decompress tile
      tile.data = await this.compressionManager.decompressTile(
        tile.compressedData,
        this.TILE_SIZE,
        this.TILE_SIZE
      );
      
      if (tile.data) {
        tile.state = 'clean';
        tile.memoryUsage = tile.data.data.length;
        this.memoryUsage += tile.memoryUsage;
      }
    }
    
    tile.lastAccessed = performance.now();
    tile.refCount++;
    this.tileCache.set(tile.id, tile);
  }

  /**
   * Mark tile as dirty
   */
  public markTileDirty(tileX: number, tileY: number, region?: { x: number; y: number; width: number; height: number }): void {
    const tileId = this.getTileId(tileX, tileY);
    const tile = this.tiles.get(tileId) || this.tileCache.get(tileId);
    
    if (tile) {
      tile.state = 'dirty';
      tile.lastAccessed = performance.now();
      
      // Update dirty region
      if (region) {
        if (tile.dirtyRegion) {
          // Expand existing dirty region
          const minX = Math.min(tile.dirtyRegion.x, region.x);
          const minY = Math.min(tile.dirtyRegion.y, region.y);
          const maxX = Math.max(tile.dirtyRegion.x + tile.dirtyRegion.width, region.x + region.width);
          const maxY = Math.max(tile.dirtyRegion.y + tile.dirtyRegion.height, region.y + region.height);
          
          tile.dirtyRegion = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          };
        } else {
          tile.dirtyRegion = { ...region };
        }
      } else {
        // Mark entire tile as dirty
        tile.dirtyRegion = { x: 0, y: 0, width: this.TILE_SIZE, height: this.TILE_SIZE };
      }
      
      this.emit('tileDirty', { tileX, tileY, region: tile.dirtyRegion });
    }
  }

  /**
   * Get tiles intersecting with region
   */
  public getTilesInRegion(x: number, y: number, width: number, height: number): { tileX: number; tileY: number }[] {
    const tiles: { tileX: number; tileY: number }[] = [];
    
    const startTileX = Math.floor(x / this.TILE_SIZE);
    const endTileX = Math.floor((x + width - 1) / this.TILE_SIZE);
    const startTileY = Math.floor(y / this.TILE_SIZE);
    const endTileY = Math.floor((y + height - 1) / this.TILE_SIZE);
    
    for (let tileY = startTileY; tileY <= endTileY; tileY++) {
      for (let tileX = startTileX; tileX <= endTileX; tileX++) {
        if (tileX >= 0 && tileX < this.tilesX && tileY >= 0 && tileY < this.tilesY) {
          tiles.push({ tileX, tileY });
        }
      }
    }
    
    return tiles;
  }

  /**
   * Release tile reference
   */
  public releaseTile(tileX: number, tileY: number): void {
    const tileId = this.getTileId(tileX, tileY);
    const tile = this.tileCache.get(tileId);
    
    if (tile) {
      tile.refCount = Math.max(0, tile.refCount - 1);
      
      // If no more references, consider for compression
      if (tile.refCount === 0 && tile.state === 'clean') {
        this.scheduleCompression(tile);
      }
    }
  }

  /**
   * Schedule tile for compression
   */
  private async scheduleCompression(tile: Tile): Promise<void> {
    if (!this.config.compression.enabled) return;
    
    // Check if memory usage exceeds threshold
    const memoryThreshold = this.config.compression.threshold * 1024 * 1024;
    if (this.memoryUsage < memoryThreshold) return;
    
    try {
      const compressedData = await this.compressionManager.compressTile(tile);
      
      if (compressedData && compressedData.byteLength < tile.memoryUsage) {
        // Compression successful
        tile.compressedData = compressedData;
        tile.state = 'compressed';
        
        // Free uncompressed data
        if (tile.data) {
          this.memoryPool.deallocate(tile.data.data.buffer, tile.data.data.length);
          tile.data = null;
          this.memoryUsage -= tile.memoryUsage;
          tile.memoryUsage = compressedData.byteLength;
        }
        
        this.emit('tileCompressed', { tileId: tile.id, originalSize: tile.memoryUsage, compressedSize: compressedData.byteLength });
      }
    } catch (error) {
      console.error('Tile compression failed:', error);
    }
  }

  /**
   * Generate tile ID from coordinates
   */
  private getTileId(tileX: number, tileY: number): string {
    return `${tileX}_${tileY}`;
  }

  /**
   * Force garbage collection
   */
  public async garbageCollect(): Promise<void> {
    const startTime = performance.now();
    let freedMemory = 0;
    let compressedTiles = 0;
    
    // Get tiles sorted by last access time
    const allTiles = Array.from(this.tiles.values()).sort(
      (a, b) => a.lastAccessed - b.lastAccessed
    );
    
    for (const tile of allTiles) {
      // Skip tiles that are still referenced or already compressed
      if (tile.refCount > 0 || tile.state === 'compressed') continue;
      
      // Compress old, unreferenced tiles
      if (tile.state === 'clean' && tile.data) {
        await this.scheduleCompression(tile);
        compressedTiles++;
      }
      
      // Remove from cache if very old
      const age = performance.now() - tile.lastAccessed;
      if (age > 60000) { // 1 minute
        this.tileCache.delete(tile.id);
        if (tile.data) {
          freedMemory += tile.memoryUsage;
          this.memoryUsage -= tile.memoryUsage;
        }
      }
    }
    
    const gcTime = performance.now() - startTime;
    
    this.emit('garbageCollected', {
      freedMemory,
      compressedTiles,
      gcTime,
      remainingTiles: this.tiles.size,
      cacheSize: this.tileCache.size(),
    });
  }

  /**
   * Get memory usage statistics
   */
  public getMemoryStats(): MemoryStats {
    const cacheHitRatio = this.cacheHits + this.cacheMisses > 0
      ? this.cacheHits / (this.cacheHits + this.cacheMisses)
      : 0;
    
    let compressedTiles = 0;
    for (const tile of this.tiles.values()) {
      if (tile.state === 'compressed') compressedTiles++;
    }
    
    return {
      totalUsage: this.memoryUsage,
      tilesInMemory: this.tileCache.size(),
      compressedTiles,
      cacheHitRatio,
      breakdown: {
        tiles: this.memoryUsage,
        brushCache: 0, // Would be calculated from brush system
        other: 0,
      },
    };
  }

  /**
   * Clear all tiles
   */
  public clear(): void {
    for (const tile of this.tiles.values()) {
      if (tile.data) {
        this.memoryPool.deallocate(tile.data.data.buffer, tile.data.data.length);
      }
    }
    
    this.tiles.clear();
    this.tileCache.clear();
    this.memoryUsage = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    
    this.emit('cleared');
  }

  /**
   * Shutdown tile system
   */
  public shutdown(): void {
    this.clear();
    this.emit('shutdown');
  }
}

/**
 * Memory Manager - Main coordination class
 * 
 * Coordinates tile system, memory pools, and cache management
 * for optimal memory usage.
 */
export class MemoryManager extends EventEmitter {
  private config: MemoryConfig;
  private tileSystem: TileSystem;
  private performanceMonitor: any;
  private gcInterval: number | null = null;
  private isInitialized = false;

  constructor(config: { tileCacheSize: number; performanceMonitor: any }) {
    super();
    
    this.config = {
      tileCacheSize: config.tileCacheSize,
      tileSize: 256,
      maxTilesInMemory: Math.floor((config.tileCacheSize * 1024 * 1024) / (256 * 256 * 4)),
      compression: {
        enabled: true,
        threshold: config.tileCacheSize * 0.8, // 80% of cache size
        algorithm: 'deflate',
      },
      memoryPool: {
        initialSize: 10,
        maxSize: config.tileCacheSize * 2, // Allow 2x cache size for pools
        growthFactor: 1.5,
      },
    };
    
    this.performanceMonitor = config.performanceMonitor;
    this.tileSystem = new TileSystem(this.config);
    
    this.setupEventListeners();
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    this.tileSystem.on('tileDirty', (data) => {
      this.performanceMonitor?.recordMemoryUsage(this.getUsageStats());
    });
    
    this.tileSystem.on('garbageCollected', (data) => {
      this.emit('memoryOptimized', data);
    });
  }

  /**
   * Initialize memory manager
   */
  public async initialize(): Promise<void> {
    // Start periodic garbage collection
    this.gcInterval = window.setInterval(() => {
      this.tileSystem.garbageCollect();
    }, 30000); // Every 30 seconds
    
    this.isInitialized = true;
    this.emit('initialized');
  }

  /**
   * Initialize tile system for canvas
   */
  public initializeCanvas(width: number, height: number): void {
    this.tileSystem.initialize(width, height);
  }

  /**
   * Get tile from tile system
   */
  public async getTile(tileX: number, tileY: number): Promise<any> {
    return this.tileSystem.getTile(tileX, tileY);
  }

  /**
   * Mark tile as dirty
   */
  public markTileDirty(tileX: number, tileY: number, region?: any): void {
    this.tileSystem.markTileDirty(tileX, tileY, region);
  }

  /**
   * Get tiles in region
   */
  public getTilesInRegion(x: number, y: number, width: number, height: number): any[] {
    return this.tileSystem.getTilesInRegion(x, y, width, height);
  }

  /**
   * Get memory usage statistics
   */
  public getUsageStats(): MemoryStats {
    return this.tileSystem.getMemoryStats();
  }

  /**
   * Force garbage collection
   */
  public async forceGarbageCollection(): Promise<void> {
    await this.tileSystem.garbageCollect();
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...updates };
    // Would reinitialize tile system if needed
  }

  /**
   * Shutdown memory manager
   */
  public async shutdown(): Promise<void> {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
    
    this.tileSystem.shutdown();
    this.isInitialized = false;
    
    this.emit('shutdown');
  }
}

/**
 * Default memory configuration
 */
export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  tileCacheSize: 512, // MB
  tileSize: 256,
  maxTilesInMemory: 8192, // 512MB / (256*256*4 bytes)
  compression: {
    enabled: true,
    threshold: 400, // MB
    algorithm: 'deflate',
  },
  memoryPool: {
    initialSize: 10,
    maxSize: 1024, // MB
    growthFactor: 1.5,
  },
};