// Terrain Constants
// Centralized definitions for all terrain types, colors, and costs

/**
 * Interface defining the structure of terrain data
 * Contains all necessary information for rendering and pathfinding
 */
export interface TerrainDefinition {
  name: string;
  color: {
    base: { r: number; g: number; b: number }; // Base RGB color values
    variation: { r: number; g: number; b: number }; // Color variation ranges
  };
  cost: number; // Movement cost for pathfinding (higher = more difficult)
  boundary: number; // Noise value threshold for terrain type
}

/**
 * Terrain boundaries (noise value thresholds)
 * These values determine which terrain type is assigned based on Perlin noise values
 * Lower values = more water, higher values = more elevated terrain
 */
export const TERRAIN_BOUNDARIES = {
  water: 0.40,  
  sand: 0.45,  
  land: 0.65,  
  hills: 0.75, 
  mountain: 0.85,
  snow: 0.95
};

/**
 * Complete terrain definitions
 * Contains all terrain types with their visual and gameplay properties
 * Each terrain has base colors, variation ranges, movement costs, and noise boundaries
 */
export const TERRAIN_DEFINITIONS: Record<string, TerrainDefinition> = {
  water: {
    name: 'water',
    color: {
      base: { r: 20, g: 60, b: 120 }, // Deep blue base color
      variation: { r: 40, g: 80, b: 100 } // Blue-green variation
    },
    cost: Infinity, // Impassable terrain
    boundary: TERRAIN_BOUNDARIES.water
  },
  sand: {
    name: 'sand',
    color: {
      base: { r: 200, g: 180, b: 100 }, // Sandy beige base color
      variation: { r: 55, g: 75, b: 50 } // Earth tone variation
    },
    cost: 3,
    boundary: TERRAIN_BOUNDARIES.sand
  },
  land: {
    name: 'land',
    color: {
      base: { r: 50, g: 120, b: 50 }, // Green base color
      variation: { r: 100, g: 100, b: 50 } // Natural green variation
    },
    cost: 1,
    boundary: TERRAIN_BOUNDARIES.land
  },
  hills: {
    name: 'hills',
    color: {
      base: { r: 160, g: 140, b: 100 }, // Brownish hill color
      variation: { r: 60, g: 50, b: 40 } // Earth tone variation
    },
    cost: 2,
    boundary: TERRAIN_BOUNDARIES.hills
  },
  mountain: {
    name: 'mountain',
    color: {
      base: { r: 120, g: 100, b: 80 }, // Rocky mountain color
      variation: { r: 60, g: 40, b: 30 } // Dark earth variation
    },
    cost: 4, 
    boundary: TERRAIN_BOUNDARIES.mountain
  },
  snow: {
    name: 'snow',
    color: {
      base: { r: 200, g: 220, b: 240 }, // Light blue-white base
      variation: { r: 55, g: 35, b: 15 } // Subtle blue variation
    },
    cost: 5, 
    boundary: TERRAIN_BOUNDARIES.snow
  }
};

/**
 * Helper function to get terrain color with intensity variation
 * Calculates the final RGB color by combining base color with intensity-based variation
 */
export function getTerrainColor(terrain: string, intensity: number): string {
  const definition = TERRAIN_DEFINITIONS[terrain];
  if (!definition) {
    console.warn(`Unknown terrain type: ${terrain}, using land color`);
    return getTerrainColor('land', intensity);
  }

  // Calculate RGB values by adding intensity-scaled variation to base color
  const r = Math.floor(definition.color.base.r + intensity * definition.color.variation.r);
  const g = Math.floor(definition.color.base.g + intensity * definition.color.variation.g);
  const b = Math.floor(definition.color.base.b + intensity * definition.color.variation.b);

  // Ensure RGB values are within valid range (0-255)
  const clampedR = Math.max(0, Math.min(255, r));
  const clampedG = Math.max(0, Math.min(255, g));
  const clampedB = Math.max(0, Math.min(255, b));

  return `rgb(${clampedR}, ${clampedG}, ${clampedB})`;
}

/**
 * Helper function to get terrain movement cost
 * Returns the movement cost for pathfinding algorithms
 */
export function getTerrainCost(terrain: string): number {
  return TERRAIN_DEFINITIONS[terrain]?.cost ?? 1;
}

/**
 * Helper function to get all terrain names
 * Returns an array of all available terrain type names
 */
export function getAllTerrainNames(): string[] {
  return Object.keys(TERRAIN_DEFINITIONS);
}

/**
 * Helper function to get terrain order for pathfinding
 * Returns terrain types in order from lowest to highest elevation
 */
export function getTerrainOrder(): string[] {
  return ['water', 'sand', 'land', 'hills', 'mountain', 'snow'];
}

/**
 * Helper function to get terrain color for UI indicators (matches map rendering)
 * Returns a consistent color for UI elements that matches the map's visual appearance
 */
export function getTerrainBaseColor(terrain: string): string {
  const definition = TERRAIN_DEFINITIONS[terrain];
  if (!definition) {
    return 'rgb(50, 120, 50)'; // Default to land color
  }
  
  // Use the same high intensity as the map rendering (0.8-1.0)
  // This ensures UI indicators match the visual appearance of the map
  const baseIntensity = 0.8;
  const variation = 0.2;
  const intensity = Math.min(1.0, baseIntensity + (0.5 * variation)); // Use 0.5 for average intensity
  
  const r = Math.floor(definition.color.base.r + intensity * definition.color.variation.r);
  const g = Math.floor(definition.color.base.g + intensity * definition.color.variation.g);
  const b = Math.floor(definition.color.base.b + intensity * definition.color.variation.b);
  
  // Ensure RGB values are within valid range (0-255)
  const clampedR = Math.max(0, Math.min(255, r));
  const clampedG = Math.max(0, Math.min(255, g));
  const clampedB = Math.max(0, Math.min(255, b));
  
  return `rgb(${clampedR}, ${clampedG}, ${clampedB})`;
}
