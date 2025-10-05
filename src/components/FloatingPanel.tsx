import React, { useState, useRef, useEffect, useCallback } from "react";
import { IconMapPin, IconCalculator, IconArrowsMaximize, IconWand, IconMinus, IconPlus } from "@tabler/icons-react";
import { MapCanvasRef } from "./MapCanvas";
import { getTerrainBaseColor } from "../utils/terrainConstants";
import "./styles/FloatingPanel.css";

// Props interface for the floating control panel
type FloatingPanelProps = {
  onGenerate: () => void;
  mapCanvasRef?: React.RefObject<MapCanvasRef | null>;
  onTerrainVisibilityChange?: (terrainVisibility: { [key: string]: boolean }) => void;
  onPinsChange?: (callback: () => void) => void;
};

// FloatingPanel component - draggable control interface for map operations
export default function FloatingPanel({ onGenerate, mapCanvasRef, onTerrainVisibilityChange, onPinsChange }: FloatingPanelProps) {
  // State for displaying pin coordinates and calculated distance
  const [location1, setLocation1] = useState("Not selected");
  const [location2, setLocation2] = useState("Not selected");
  const [distance, setDistance] = useState("Not calculated");
  const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);
  const [pinsChangeTrigger, setPinsChangeTrigger] = useState(0);
  
  // Terrain visibility state - controls which terrain types appear in new maps
  const [terrainVisibility, setTerrainVisibility] = useState({
    water: true,
    sand: true,
    land: true,
    hills: true,
    mountain: true,
    snow: true
  });
  
  // Dragging state for panel positioning
  const [position, setPosition] = useState({ x: 30, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle mouse down for dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  // Generate new map and reset all pin data
  const handleGenerate = async () => {
    setIsGeneratingLocal(true);
    
    // Reset pin coordinates and distance immediately
    setLocation1("Not selected");
    setLocation2("Not selected");
    setDistance("Not calculated");
    
    // Call the generate function
    onGenerate();
    
    // Reset the generating state after a short delay
    setTimeout(() => {
      setIsGeneratingLocal(false);
    }, 1000);
  };


  // Toggle terrain visibility for map generation
  const handleTerrainToggle = (terrainType: string) => {
    const newVisibility = {
      ...terrainVisibility,
      [terrainType]: !terrainVisibility[terrainType as keyof typeof terrainVisibility]
    };
    setTerrainVisibility(newVisibility);
    onTerrainVisibilityChange?.(newVisibility);
  };

  // Toggle minimize state
  const handleMinimizeToggle = () => {
    setIsMinimized(!isMinimized);
  };

  // Function to update coordinates display
  const updateCoordinates = useCallback(() => {
    if (mapCanvasRef?.current) {
      const pins = mapCanvasRef.current.getPins();
      const path = mapCanvasRef.current.getPath();
      const calculating = mapCanvasRef.current.isCalculating();
      
      if (pins.length >= 1) {
        setLocation1(`Pin 1: (${Math.round(pins[0].x)}, ${Math.round(pins[0].y)})`);
      } else {
        setLocation1("Not selected");
      }
      
      if (pins.length >= 2) {
        setLocation2(`Pin 2: (${Math.round(pins[1].x)}, ${Math.round(pins[1].y)})`);
      } else {
        setLocation2("Not selected");
      }
      
      // Update distance based on pathfinding result
      if (calculating) {
        setDistance("Calculating...");
      } else if (path && path.success) {
        const distanceText = `${Math.round(path.distance * 10) / 10} units`;
        const timeText = path.computationTime ? ` (${path.computationTime}ms)` : '';
        setDistance(distanceText + timeText);
      } else if (pins.length === 2) {
        setDistance("No path found");
      } else {
        setDistance("Not calculated");
      }
    }
  }, [mapCanvasRef]);

  // Update coordinates when mapCanvasRef changes or pins change
  useEffect(() => {
    updateCoordinates();
  }, [updateCoordinates, pinsChangeTrigger]);

  // Create a callback that the parent can call when pins change
  const triggerCoordinateUpdate = useCallback(() => {
    setPinsChangeTrigger(prev => prev + 1);
  }, []);

  // Expose the callback to parent
  useEffect(() => {
    if (onPinsChange) {
      // Pass our callback to the parent
      onPinsChange(triggerCoordinateUpdate);
    }
  }, [onPinsChange, triggerCoordinateUpdate]);

  // Handle panel dragging with viewport boundary constraints
  useEffect(() => {
    // Handle mouse move for dragging functionality
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // Constrain to viewport bounds
        const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 380);
        const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 200);
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }
    };

    // Handle mouse up for dragging functionality
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    // Add event listeners for dragging functionality
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    // Remove event listeners for dragging functionality
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // Return the FloatingPanel component
  return (
    <div 
      ref={panelRef}
      className={`floating-panel ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        position: 'fixed'
      }}
    >
      {/* Header */}
      <div className="panel-header">
        <h3 className="panel-title">🗺️ Map Controls</h3>
        <div className="header-controls">
          <button 
            className="minimize-button"
            onClick={handleMinimizeToggle}
            title={isMinimized ? "Expand panel" : "Minimize panel"}
          >
            {isMinimized ? <IconPlus size={12} /> : <IconMinus size={12} />}
          </button>
          <div 
            className="drag-handle"
            onMouseDown={handleMouseDown}
          >
            <IconArrowsMaximize size={12} />
          </div>
        </div>
      </div>

      {/* Generate Map Button */}
      <div className="action-section">
        <button
          onClick={handleGenerate}
          className={`generate-button ${isGeneratingLocal ? 'generating' : ''}`}
          disabled={isGeneratingLocal}
        >
          <div className="button-icon">
            <IconWand size={16} />
            {isGeneratingLocal ? 'Generating...' : 'Generate Map'}
          </div>
        </button>
      </div>

      {/* Minimized Layout */}
      {isMinimized ? (
        <div className="minimized-layout">
          <div className="minimized-row">
            <div className="minimized-field">
              <label className="minimized-label">Pin 1</label>
              <div className="minimized-input-container">
                <input
                  type="text"
                  value={location1}
                  readOnly
                  className="minimized-output-field"
                />
                <IconMapPin size={14} className="minimized-input-icon" />
              </div>
            </div>
            <div className="minimized-field">
              <label className="minimized-label">Pin 2</label>
              <div className="minimized-input-container">
                <input
                  type="text"
                  value={location2}
                  readOnly
                  className="minimized-output-field"
                />
                <IconMapPin size={14} className="minimized-input-icon" />
              </div>
            </div>
          </div>
          <div className="minimized-field">
            <label className="minimized-label">Distance</label>
            <div className="minimized-input-container">
              <input
                type="text"
                value={distance}
                readOnly
                className="minimized-output-field"
              />
              <IconCalculator size={14} className="minimized-input-icon" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Same UI as minimized state for generate/pin/distance fields */}
          <div className="minimized-layout">
            <div className="minimized-row">
              <div className="minimized-field">
                <label className="minimized-label">Pin 1</label>
                <div className="minimized-input-container">
                  <input
                    type="text"
                    value={location1}
                    readOnly
                    className="minimized-output-field"
                  />
                  <IconMapPin size={14} className="minimized-input-icon" />
                </div>
              </div>
              <div className="minimized-field">
                <label className="minimized-label">Pin 2</label>
                <div className="minimized-input-container">
                  <input
                    type="text"
                    value={location2}
                    readOnly
                    className="minimized-output-field"
                  />
                  <IconMapPin size={14} className="minimized-input-icon" />
                </div>
              </div>
            </div>
            <div className="minimized-field">
              <label className="minimized-label">Distance</label>
              <div className="minimized-input-container">
                <input
                  type="text"
                  value={distance}
                  readOnly
                  className="minimized-output-field"
                />
                <IconCalculator size={14} className="minimized-input-icon" />
              </div>
            </div>
          </div>

          {/* Grey line separator */}
          <div className="separator"></div>

          {/* Terrain Selection - Only in expanded state */}
          <div className="terrain-section">
            <label className="terrain-label">Terrain Types</label>
            <div className="terrain-checkboxes">
              {Object.entries(terrainVisibility).map(([terrainType, isVisible]) => (
                <div key={terrainType} className="terrain-checkbox-container">
                  <input
                    type="checkbox"
                    id={`terrain-${terrainType}`}
                    checked={isVisible}
                    onChange={() => handleTerrainToggle(terrainType)}
                    className="terrain-checkbox"
                  />
                  <label htmlFor={`terrain-${terrainType}`} className="terrain-checkbox-label">
                    <span className="terrain-checkbox-custom"></span>
                    <div 
                      className="terrain-color-square" 
                      style={{ backgroundColor: getTerrainBaseColor(terrainType) }}
                    ></div>
                    <span className="terrain-name">{terrainType.charAt(0).toUpperCase() + terrainType.slice(1)}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
