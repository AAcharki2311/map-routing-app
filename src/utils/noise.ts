/**
 * Noise Generation Module
 * Handles Perlin noise generation for terrain creation using fractal noise techniques
 * This module provides the foundation for procedural terrain generation
 */

import { makeNoise2D } from 'fast-simplex-noise';
import { TERRAIN_BOUNDARIES } from './terrainConstants';

/**
 * Creates a new noise instance for each generation to ensure different maps
 * Uses a random seed to generate unique terrain patterns
 */
function createNoiseInstance() {
  return makeNoise2D(() => Math.random());
}

/**
 * Generates fractal Perlin noise with multiple octaves (layers)
 * Combines multiple noise layers at different frequencies to create natural-looking terrain
 */
function generateFractalNoise(x: number, y: number, noise2D: any, octaves: number = 4, persistence: number = 0.5): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0; // Used for normalization

  // Combine multiple octaves of noise
  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence; // Reduce amplitude for each octave (so we get finer features and not too noisy)
    frequency *= 2; // Double frequency for each octave (so we get more detail)
  }

  // Normalize to ensure values are between 0 and 1
  return (value / maxValue + 1) / 2;
}

/**
 * Generates a complete 2D noise map for terrain generation
 * Creates a normalized noise map that can be used to determine terrain types
 */
export function generateMap(width: number, height: number): number[][] {
  // Create a new noise instance for each map generation
  const noise2D = createNoiseInstance();
  
  const map: number[][] = [];
  let minValue = Infinity;
  let maxValue = -Infinity;

  // First pass: generate noise and find min/max for normalization
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const val = generateFractalNoise(x / 50, y / 50, noise2D); 
      // 50 is best to see the terrain features. 
      // Higher = less features (zoomed in on like a mountain range) and Smaller = more features (zoomed out)
      row.push(val);
      minValue = Math.min(minValue, val);
      maxValue = Math.max(maxValue, val);
    }
    map.push(row);
  }

  // Second pass: normalize to ensure at least one point at 0 and one at 1
  // This guarantees the full range of terrain types will be present
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      map[y][x] = (map[y][x] - minValue) / (maxValue - minValue);
    }
  }

  return map;
}

/**
 * Determines terrain type based on noise value
 * Uses threshold to assign terrain types
 */
export function getTerrainType(val: number): string {
  if (val < TERRAIN_BOUNDARIES.water) return "water";
  if (val < TERRAIN_BOUNDARIES.sand) return "sand";
  if (val < TERRAIN_BOUNDARIES.land) return "land";
  if (val < TERRAIN_BOUNDARIES.hills) return "hills";
  if (val < TERRAIN_BOUNDARIES.mountain) return "mountain";
  if (val < TERRAIN_BOUNDARIES.snow) return "snow";
  return "snow"; // Default fallback for values >= snow threshold
}

/**
 * Calculates terrain intensity for coloring based on position within terrain range
 * Returns a value between 0 and 1 representing how "intense" the terrain is
 */
export function getTerrainIntensity(val: number, terrain: string): number {
  switch (terrain) {
    case "water":
      // Water intensity from 0 to water boundary
      return val / TERRAIN_BOUNDARIES.water;
    case "sand":
      // Sand intensity within its range
      return (val - TERRAIN_BOUNDARIES.water) / (TERRAIN_BOUNDARIES.sand - TERRAIN_BOUNDARIES.water);
    case "land":
      // Land intensity within its range
      return (val - TERRAIN_BOUNDARIES.sand) / (TERRAIN_BOUNDARIES.land - TERRAIN_BOUNDARIES.sand);
    case "hills":
      // Hills intensity within its range
      return (val - TERRAIN_BOUNDARIES.land) / (TERRAIN_BOUNDARIES.hills - TERRAIN_BOUNDARIES.land);
    case "mountain":
      // Mountain intensity within its range
      return (val - TERRAIN_BOUNDARIES.hills) / (TERRAIN_BOUNDARIES.mountain - TERRAIN_BOUNDARIES.hills);
    case "snow":
      // Snow intensity within its range
      return (val - TERRAIN_BOUNDARIES.mountain) / (TERRAIN_BOUNDARIES.snow - TERRAIN_BOUNDARIES.mountain);
    default:
      return 0; // Default intensity for unknown terrain
  }
}
