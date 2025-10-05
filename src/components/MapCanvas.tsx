import React, { forwardRef, useImperativeHandle, useRef, useEffect, useCallback, useState } from "react";
import { generateTerrainData, drawMapToCanvas } from "../utils/mapGenerator";
import { findPath, PathResult } from "../utils/pathfinding_quicker";
import "./styles/MapCanvas.css";

// Interface for exposing MapCanvas methods to parent components
export interface MapCanvasRef {
  regenerateMap: () => void;
  getPins: () => { x: number; y: number }[];
  clearPins: () => void;
  getPath: () => PathResult | null;
  isCalculating: () => boolean;
  setTerrainVisibility: (terrainVisibility: { [key: string]: boolean }) => void;
}

// Interface for individual pin coordinates on the map
interface Pin {
  x: number;
  y: number;
}

// Props interface for the MapCanvas component
interface MapCanvasProps {
  onPinsChange?: () => void;
}

// MapCanvas component - main interactive map display with pathfinding capabilities
const MapCanvas = forwardRef<MapCanvasRef, MapCanvasProps>(({ onPinsChange }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [path, setPath] = useState<PathResult | null>(null);
  
  // State to track if pathfinding is currently in progress
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Terrain visibility settings - controls which terrain types appear in new maps
  const terrainVisibilityRef = useRef<{ [key: string]: boolean }>({
    water: true,
    sand: true,
    land: true,
    hills: true,
    mountain: true,
    snow: true
  });
  const terrainDataRef = useRef<any>(null);
  const scaledConfigRef = useRef<any>(null);

  // Function to redraw pins and path on the canvas without regenerating the map
  const drawPins = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the entire canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw the map if we have stored terrain data and scaled config
    if (terrainDataRef.current && scaledConfigRef.current) {
      const terrainData = terrainDataRef.current;
      // Enable texture + height shading for richer visuals
      drawMapToCanvas(canvas, terrainData, scaledConfigRef.current, {
        useTextures: true,
        textureScale: 6,
        heightShading: true,
        shadeStrength: 0.35,
        lightDir: { x: -1, y: -1 }
      });
    }

    // Calculate map offset for centering the map on the canvas
    const config = scaledConfigRef.current;
    if (!config) return;
    
    const mapWidth = config.width * config.cellSize;
    const mapHeight = config.height * config.cellSize;
    const offsetX = (canvas.width - mapWidth) / 2;
    const offsetY = (canvas.height - mapHeight) / 2;

    // Draw pathfinding result if it exists and is successful
    if (path && path.success && path.path.length > 0) {
      const cellSize = config.cellSize;
      ctx.strokeStyle = '#ff0000'; // Red path
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      for (let i = 0; i < path.path.length; i++) {
        const node = path.path[i];
        // Convert grid coordinates to canvas coordinates with offset
        const canvasX = offsetX + node.x * cellSize + cellSize / 2;
        const canvasY = offsetY + node.y * cellSize + cellSize / 2;
        
        if (i === 0) {
          ctx.moveTo(canvasX, canvasY);
        } else {
          ctx.lineTo(canvasX, canvasY);
        }
      }
      ctx.stroke();
    }

    // Draw user-placed pins with visual distinction (red for first, blue for second)
    pins.forEach((pin, index) => {
      ctx.fillStyle = index === 0 ? '#ff4444' : '#4444ff'; // Red for first pin, blue for second
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add white border for better visibility
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Add pin number for identification
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText((index + 1).toString(), pin.x, pin.y + 4);
    });
  }, [pins, path]);

  // Function to generate a new map with screen-aware dimensions and terrain
  const generateNewMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use full viewport dimensions for maximum screen utilization
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    // Set the canvas size to match viewport
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Calculate the aspect ratio of the screen for proper map scaling
    const screenAspectRatio = canvasWidth / canvasHeight;
    
    // Create a map config that matches the screen aspect ratio
    // Use a base grid size and adjust one dimension to match the screen ratio
    const baseGridSize = 300;
    let mapWidth, mapHeight;
    
    if (screenAspectRatio > 1) {
      // Screen is wider than tall -> expand width
      mapWidth = Math.floor(baseGridSize * screenAspectRatio);
      mapHeight = baseGridSize;
    } else {
      // Screen is taller than wide -> expand height
      mapWidth = baseGridSize;
      mapHeight = Math.floor(baseGridSize / screenAspectRatio);
    }

    // Calculate cell size to fill the entire canvas while maintaining aspect ratio
    const cellSizeX = canvasWidth / mapWidth;
    const cellSizeY = canvasHeight / mapHeight;
    const cellSize = Math.min(cellSizeX, cellSizeY);

    // Create configuration object for map generation
    const screenAwareConfig = {
      width: mapWidth,
      height: mapHeight,
      cellSize: cellSize
    };

    // Generate terrain data and cache it for performance
    const terrainData = generateTerrainData(screenAwareConfig, terrainVisibilityRef.current);
    terrainDataRef.current = terrainData;
    scaledConfigRef.current = screenAwareConfig;
    // Initial render with texture + height shading
    drawMapToCanvas(canvas, terrainData, screenAwareConfig, {
      useTextures: true,
      textureScale: 6,
      heightShading: true,
      shadeStrength: 0.35,
      lightDir: { x: -1, y: -1 }
    });
  }, []);

  // Handle canvas click events to place pins for pathfinding
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get click coordinates relative to the canvas
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Clear old path immediately when placing a new pin and set calculating state
    setPath(null);
    setIsCalculating(true);

    // Manage pin placement with a maximum of 2 pins
    setPins(prevPins => {
      let newPins = [...prevPins];
      
      if (newPins.length >= 2) {
        // Remove the first pin and add the new one (FIFO)
        newPins = [newPins[1], { x, y }];
      } else {
        // Add the new pin to the existing pins
        newPins = [...newPins, { x, y }];
      }
      
      return newPins;
    });
  }, []);

  // Clear all pins and path data from the map
  const clearPins = () => {
    setPins([]);
    setPath(null);
  };

  // Regenerate the entire map and clear all user data
  const regenerateMap = () => {
    clearPins(); // Clear pins when regenerating map
    generateNewMap();
  };

  // Update terrain visibility settings for future map generation
  const setTerrainVisibilityHandler = (newTerrainVisibility: { [key: string]: boolean }) => {
    const typedVisibility = newTerrainVisibility as { 
      water: boolean; 
      sand: boolean; 
      land: boolean; 
      hills: boolean; 
      mountain: boolean; 
      snow: boolean 
    };
    terrainVisibilityRef.current = typedVisibility;
  };

  // Expose methods to parent components through ref
  useImperativeHandle(ref, () => ({
    regenerateMap,
    getPins: () => pins,
    clearPins,
    getPath: () => path,
    isCalculating: () => isCalculating,
    setTerrainVisibility: setTerrainVisibilityHandler
  }));

  // Generate initial map on component mount with small delay for proper sizing
  useEffect(() => {
    // Small delay to ensure container is properly sized
    setTimeout(() => {
      generateNewMap();
    }, 10);
  }, [generateNewMap]);

  // Handle window resize events to regenerate map with new dimensions
  useEffect(() => {
    const handleResize = () => {
      // Small delay to ensure container has updated dimensions
      setTimeout(() => {
        generateNewMap();
      }, 10);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [generateNewMap]);

  // Calculate pathfinding route when two pins are placed (asynchronously)
  useEffect(() => {
    // Notify parent component that pins have changed immediately
    onPinsChange?.();
    
    if (pins.length === 2 && terrainDataRef.current && scaledConfigRef.current) {
      const terrainData = terrainDataRef.current;
      const scaledConfig = scaledConfigRef.current;
      
      // Calculate map offset for centering to convert canvas coordinates to grid coordinates
      const mapWidth = scaledConfig.width * scaledConfig.cellSize;
      const mapHeight = scaledConfig.height * scaledConfig.cellSize;
      const offsetX = (window.innerWidth - mapWidth) / 2;
      const offsetY = (window.innerHeight - mapHeight) / 2;
      
      // Convert canvas coordinates to grid coordinates, accounting for map offset
      const cellSize = scaledConfig.cellSize;
      const startX = Math.floor((pins[0].x - offsetX) / cellSize);
      const startY = Math.floor((pins[0].y - offsetY) / cellSize);
      const endX = Math.floor((pins[1].x - offsetX) / cellSize);
      const endY = Math.floor((pins[1].y - offsetY) / cellSize);
      
      // Ensure coordinates are within terrain map bounds
      const maxX = terrainData.terrainMap[0].length - 1;
      const maxY = terrainData.terrainMap.length - 1;
      
      if (startX >= 0 && startY >= 0 && startX <= maxX && startY <= maxY &&
          endX >= 0 && endY >= 0 && endX <= maxX && endY <= maxY) {
        // Perform pathfinding asynchronously to avoid blocking UI
        setTimeout(() => {
          const result = findPath(
            startX, startY,
            endX, endY,
            terrainData.terrainMap
          );
          // Convert grid-cell distance to pixel units for UI by scaling with cell size
          const scaledResult = { ...result, distance: result.distance * scaledConfig.cellSize };
          setPath(scaledResult);
          setIsCalculating(false);
        }, 0);
      } else {
        // Set failed path if coordinates are out of bounds
        setPath({ path: [], distance: 0, success: false });
        setIsCalculating(false);
      }
    } else {
      // Clear path if less than 2 pins are placed
      setPath(null);
      setIsCalculating(false);
    }
  }, [pins, onPinsChange]);

  // Notify parent when calculating state changes
  useEffect(() => {
    onPinsChange?.();
  }, [isCalculating, onPinsChange]);

  // Redraw pins immediately when pins state changes (without waiting for pathfinding)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Draw pins immediately for responsive UI
    drawPins(canvas);
  }, [pins, drawPins]);

  // Redraw when path changes (after pathfinding completes)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Redraw to show the calculated path
    drawPins(canvas);
  }, [path, drawPins]);

  // Return the MapCanvas component with interactive canvas
  return (
    <div className="map-canvas-container">
      <canvas
        ref={canvasRef}
        className="map-canvas"
        style={{ 
          backgroundColor: '#1a1a2e',
          cursor: 'crosshair'
        }}
        onClick={handleCanvasClick}
      />
    </div>
  );
});

MapCanvas.displayName = 'MapCanvas';

export default MapCanvas;
