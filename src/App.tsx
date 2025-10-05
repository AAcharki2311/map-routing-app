import React, { useRef, useCallback, useState } from "react";
import MapCanvas, { MapCanvasRef } from "./components/MapCanvas";
import FloatingPanel from "./components/FloatingPanel";
import "./App.css";

function App() {
  const mapCanvasRef = useRef<MapCanvasRef>(null);

  // Handler function for the "Generate Map" button click
  // Check if MapCanvas reference exists and regenerate the map
  const handleGenerate = () => {
    if (mapCanvasRef.current) {
      mapCanvasRef.current.regenerateMap();
    }
  };

  // Handler function for terrain visibility changes
  // This function is called when user toggles terrain type checkboxes
  const handleTerrainVisibilityChange = (terrainVisibility: { [key: string]: boolean }) => {
    if (mapCanvasRef.current) {
      mapCanvasRef.current.setTerrainVisibility(terrainVisibility);
    }
  };

  // Store the callback from FloatingPanel
  const [floatingPanelCallback, setFloatingPanelCallback] = useState<(() => void) | null>(null);

  // Handler function for when pins change on the map
  const handlePinsChange = useCallback(() => {
    // Call the FloatingPanel's callback to trigger coordinate update
    if (floatingPanelCallback) {
      floatingPanelCallback();
    }
  }, [floatingPanelCallback]);

  // Handler to receive callback from FloatingPanel
  const handleFloatingPanelCallback = useCallback((callback: () => void) => {
    setFloatingPanelCallback(() => callback);
  }, []);

  return (
    <div className="app-container">
      {/* Container for the map canvas with styling */}
      <div className="canvas-container">
        {/* MapCanvas component with ref for direct method calls */}
        <MapCanvas ref={mapCanvasRef} onPinsChange={handlePinsChange} />
      </div>

      {/* Floating control panel component */}
      <FloatingPanel 
        onGenerate={handleGenerate} 
        mapCanvasRef={mapCanvasRef} 
        onTerrainVisibilityChange={handleTerrainVisibilityChange}
        onPinsChange={handleFloatingPanelCallback}
      />
    </div>
  );
}

export default App;
