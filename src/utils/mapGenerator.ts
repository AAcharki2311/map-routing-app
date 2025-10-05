import { generateMap, getTerrainType } from './noise';
import { getTerrainColor } from './terrainConstants';

/**
 * Configuration interface for map generation
 * Defines the dimensions and cell size for the generated map
 */
export interface MapConfig {
  width: number;    // Width of the map in cells
  height: number;   // Height of the map in cells
  cellSize: number; // Size of each cell in pixels
}

/**
 * Data structure containing the generated terrain information
 * Includes both the raw noise values and the processed terrain types
 */
export interface TerrainData {
  noiseMap: number[][];   // 2D array of noise values (0-1)
  terrainMap: string[][]; // 2D array of terrain type strings
}

// Optional rendering features to enhance visual quality (non-breaking defaults)
export interface RenderOptions {
  useTextures?: boolean;           // Apply subtle procedural textures per terrain (default: false)
  textureScale?: number;           // Controls texture frequency (default: 6)
  heightShading?: boolean;         // Apply lighting/shading using height normals (default: false)
  shadeStrength?: number;          // Shading intensity multiplier (default: 0.35)
  lightDir?: { x: number; y: number }; // 2D light direction on the map (default: {x: -1, y: -1})
}

/**
 * Default configuration for map generation
 * Creates a 300x300 cell map with 3-pixel cells
 */
export const DEFAULT_MAP_CONFIG: MapConfig = {
  width: 300,
  height: 300,
  cellSize: 3
};

//Generates terrain data based on configuration and optional terrain visibility settings
export function generateTerrainData(
  config: MapConfig, 
  terrainVisibility?: { [key: string]: boolean }
): TerrainData {
  // Generate the base noise map using Perlin noise
  const noiseMap = generateMap(config.width, config.height);
  
  // If terrain visibility is specified, generate terrain based on selected types only
  if (terrainVisibility) {
    // Filter to get only the terrain types that are enabled
    const availableTerrains = Object.keys(terrainVisibility).filter(terrain => terrainVisibility[terrain]);
    
    // Edge case: if no terrains are selected, default everything to land
    if (availableTerrains.length === 0) {
      const terrainMap = noiseMap.map(row => row.map(() => 'land'));
      return { noiseMap, terrainMap };
    }
    
    // Edge case: if only one terrain is selected, use it everywhere
    if (availableTerrains.length === 1) {
      const terrainMap = noiseMap.map(row => row.map(() => availableTerrains[0]));
      return { noiseMap, terrainMap };
    }
    
    // For multiple terrains, filter out deselected terrains and apply special logic
    const terrainMap = noiseMap.map((row, rowIndex) => 
      row.map((noiseValue, colIndex) => {
        // First determine what terrain type this noise value would normally be
        const originalTerrain = getTerrainType(noiseValue);
        
        // If this terrain is selected, use it directly
        if (terrainVisibility[originalTerrain]) {
          return originalTerrain;
        }
        
        // Special logic for sand: only place it next to water (beach effect)
        if (terrainVisibility['sand'] && !terrainVisibility[originalTerrain]) {
          // Only place sand next to water, and only if the original terrain is land
          if (originalTerrain === 'land') {
            const isNearWater = checkNearWater(noiseMap, rowIndex, colIndex, 1);
            if (isNearWater) {
              return 'sand';
            }
          }
        }
        
        // If this terrain is not selected, find the closest available terrain
        // Define the noise value ranges for each terrain type
        const terrainRanges = [
          { terrain: 'water', min: 0, max: 0.40 },
          { terrain: 'sand', min: 0.40, max: 0.45 },
          { terrain: 'land', min: 0.45, max: 0.65 },
          { terrain: 'hills', min: 0.65, max: 0.75 },
          { terrain: 'mountain', min: 0.75, max: 0.85 },
          { terrain: 'snow', min: 0.85, max: 0.95 }
        ];
        
        // Find the closest available terrain based on noise value
        // This ensures smooth transitions even when some terrain types are disabled
        let closestTerrain = availableTerrains[0];
        let minDistance = Infinity;
        
        for (const terrain of availableTerrains) {
          const terrainRange = terrainRanges.find(r => r.terrain === terrain);
          if (terrainRange) {
            // Calculate the center point of the terrain's noise range
            const terrainCenter = (terrainRange.min + terrainRange.max) / 2;
            const distance = Math.abs(noiseValue - terrainCenter);
            
            // Keep track of the terrain with the smallest distance
            if (distance < minDistance) {
              minDistance = distance;
              closestTerrain = terrain;
            }
          }
        }
        
        return closestTerrain;
      })
    );
    
    return { noiseMap, terrainMap };
  }
  
  // Default behavior: use all terrain types without filtering
  const terrainMap = noiseMap.map(row => row.map(val => getTerrainType(val)));
  return { noiseMap, terrainMap };
}

// Helper function to check if a location is near water (for beach effect)
function checkNearWater(noiseMap: number[][], row: number, col: number, radius: number): boolean {
  const height = noiseMap.length;
  const width = noiseMap[0].length;
  
  // Check all cells within the specified radius
  for (let r = Math.max(0, row - radius); r <= Math.min(height - 1, row + radius); r++) {
    for (let c = Math.max(0, col - radius); c <= Math.min(width - 1, col + radius); c++) {
      // Skip the center cell (the one we're checking around)
      if (r === row && c === col) continue;
      
      // Calculate distance from the center point
      const distance = Math.sqrt((r - row) ** 2 + (c - col) ** 2);
      // Check if within radius and if the cell is water (noise < 0.40)
      if (distance <= radius && noiseMap[r][c] < 0.40) { // Water threshold
        return true;
      }
    }
  }
  return false;
}

/**
 * Renders the terrain data to a canvas element
 * Draws each cell with appropriate terrain colors and centers the map on the canvas
 */
/**
 * Renders the terrain data to a canvas element
 * Draws each cell with terrain colors and centers the map on the canvas
 * Optionally enhances visuals using textures and height-based shading
 */
export function drawMapToCanvas(
  canvas: HTMLCanvasElement,
  terrainData: TerrainData,
  config: MapConfig,
  options?: RenderOptions
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear the canvas before drawing
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Calculate the total map size in pixels
  const mapWidth = config.width * config.cellSize;
  const mapHeight = config.height * config.cellSize;
  
  // Calculate offset to center the map on the canvas
  const offsetX = (canvas.width - mapWidth) / 2;
  const offsetY = (canvas.height - mapHeight) / 2;

  // Prepare render options with defaults
  const useTextures = options?.useTextures === true;
  const textureScale = options?.textureScale ?? 6;
  const heightShading = options?.heightShading === true;
  const shadeStrength = options?.shadeStrength ?? 0.35;
  const lightDir = normalize2D(options?.lightDir ?? { x: -1, y: -1 });

  // Draw each cell of the terrain map; optional effects are applied per-cell
  for (let y = 0; y < config.height; y++) {
    for (let x = 0; x < config.width; x++) {
      const terrain = terrainData.terrainMap[y][x];
      const noiseValue = terrainData.noiseMap[y][x];
      
      // Calculate color intensity with variation for visual interest
      const baseIntensity = 0.8; // High base intensity
      const variation = 0.2; // Small variation for visual interest
      let intensity = Math.min(1.0, baseIntensity + (noiseValue * variation));
      let color = getTerrainColor(terrain, intensity);

      // Optional: height-based shading using local gradient as a surface normal
      if (heightShading) {
        const n = estimateNormal(terrainData.noiseMap, x, y);
        const diffuse = Math.max(0, n.x * lightDir.x + n.y * lightDir.y);
        color = applyShading(color, diffuse * shadeStrength);
      }

      // Optional: subtle procedural textures per terrain (adds small RGB noise)
      // Texture value is deterministic per (x,y,terrain) and scaled to be barely visible
      if (useTextures) {
        const tex = terrainTexture(terrain, x, y, textureScale);
        color = applyTexture(color, tex);
      }

      ctx.fillStyle = color;
      
      // Draw the cell with offset to center the map on the canvas
      ctx.fillRect(
        offsetX + x * config.cellSize, 
        offsetY + y * config.cellSize, 
        config.cellSize, 
        config.cellSize
      );
    }
  }
}

// ----- Rendering helpers (shading/texture utilities) -----

// Normalize 2D vector
function normalize2D(v: { x: number; y: number }): { x: number; y: number } {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

// Estimate 2D normal from heightmap using central differences (screen-space)
// dx, dy approximate the local slope; we flip Y to account for canvas Y-down coordinates
function estimateNormal(heightMap: number[][], x: number, y: number): { x: number; y: number } {
  const h = heightMap.length;
  const w = heightMap[0].length;
  const xm = Math.max(0, x - 1);
  const xp = Math.min(w - 1, x + 1);
  const ym = Math.max(0, y - 1);
  const yp = Math.min(h - 1, y + 1);
  const dx = heightMap[y][xp] - heightMap[y][xm];
  const dy = heightMap[yp][x] - heightMap[ym][x];
  // Flip y because screen y grows downward
  return normalize2D({ x: dx, y: -dy });
}

// Apply brightness adjustment to an rgb(r,g,b) string (simple diffuse shading)
// Darken an rgb color by a given [0,1] strength factor (simple Lambertian look)
function applyShading(rgb: string, strength: number): string {
  const { r, g, b } = parseRgb(rgb);
  const factor = clamp01(1 - strength);
  const nr = Math.round(r * factor);
  const ng = Math.round(g * factor);
  const nb = Math.round(b * factor);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

// Tiny procedural texture: blue-noise-like hash based on coordinates and terrain
function terrainTexture(terrain: string, x: number, y: number, scale: number): number {
  const k = hash2D(x / scale, y / scale, terrainHashSeed(terrain));
  // Center around 0, small amplitude
  return (k - 0.5) * 0.12;
}

// Stable per-terrain seed
// Stable per-terrain seed so each terrain gets a distinct, repeatable texture pattern
function terrainHashSeed(terrain: string): number {
  let seed = 0;
  for (let i = 0; i < terrain.length; i++) seed = (seed * 31 + terrain.charCodeAt(i)) >>> 0;
  return seed;
}

// Simple deterministic hash function -> [0,1)
// Deterministic hash producing [0,1)
function hash2D(x: number, y: number, seed: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return s - Math.floor(s);
}

// Apply texture to color
function applyTexture(rgb: string, tex: number): string {
  const { r, g, b } = parseRgb(rgb);
  const nr = clamp255(r + tex * 255);
  const ng = clamp255(g + tex * 255);
  const nb = clamp255(b + tex * 255);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

// Parse rgb string to object
function parseRgb(rgb: string): { r: number; g: number; b: number } {
  const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 10), g: parseInt(m[2], 10), b: parseInt(m[3], 10) };
}

// Clamp value to 0-255
function clamp255(v: number): number { return Math.max(0, Math.min(255, Math.round(v))); }

// Clamp value to 0-1
function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }

// Creates a complete map canvas with generated terrain data
export function createMapCanvas(
  config: MapConfig = DEFAULT_MAP_CONFIG
): { canvas: HTMLCanvasElement; terrainData: TerrainData } {
  // Create a new canvas element
  const canvas = document.createElement('canvas');
  canvas.width = config.width * config.cellSize;
  canvas.height = config.height * config.cellSize;
  
  // Generate terrain data and render it to the canvas
  const terrainData = generateTerrainData(config);
  drawMapToCanvas(canvas, terrainData, config);
  
  return { canvas, terrainData };
}
