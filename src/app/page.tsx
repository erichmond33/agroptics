'use client';

import { useRef, useState } from 'react';
import React from 'react';
import type { Feature, Polygon, GeoJsonProperties } from 'geojson';
import ControlPanel from '@map/components/ControlPanel';
import FeatureForm from '@map/components/FeatureForm';
import BasemapSwitcher from '@map/components/BasemapSwitcher';
import Legend from '@map/components/Legend';
import { MapManager, MapState, BasemapType, BASEMAPS } from '@map/utils/mapManager';

export default function App() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapManager = useRef<MapManager | null>(null);
  
  const [state, setState] = useState<MapState>({
    polygons: [],
    basemap: 'positron',
    selectedFeature: null,
    showForm: false,
    layerVisibility: {}
  });

  // Initialize map when component mounts
  React.useEffect(() => {
    if (!mapContainer.current) return;

    mapManager.current = new MapManager(mapContainer.current, setState);
    mapManager.current.initialize(state.basemap);

    return () => {
      mapManager.current?.destroy();
    };
  }, []);

  // Handle basemap changes
  React.useEffect(() => {
    if (mapManager.current) {
      mapManager.current.updateBasemap(state.basemap);
    }
  }, [state.basemap]);

  // Handle feature visibility changes
  React.useEffect(() => {
    if (mapManager.current) {
      mapManager.current.updateFeatureVisibility(state.polygons, state.layerVisibility);
    }
  }, [state.layerVisibility, state.polygons]);

  const handleBasemapChange = (newBasemap: string) => {
    setState(prev => ({ ...prev, basemap: newBasemap as BasemapType }));
  };

  const handleSubmitFeature = async (data: {
    name: string;
    description: string;
    feature: Feature<Polygon>;
  }) => {
    try {
      await mapManager.current?.saveFeature(data);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error saving feature');
    }
  };

  const handleFormCancel = () => {
    setState(prev => ({ ...prev, showForm: false, selectedFeature: null }));
  };

  const handleLayerVisibilityChange = (newVisibility: { [key: string]: boolean }) => {
    setState(prev => ({
      ...prev,
      layerVisibility: { ...prev.layerVisibility, ...newVisibility },
    }));
  };

  return (
    <div className="relative h-screen w-full">
      <div ref={mapContainer} id="map" className="h-full w-full" />
      
      <div className="absolute top-0 left-0 flex flex-col gap-4 p-4 z-20 w-80 bg-transparent">
        <BasemapSwitcher basemap={state.basemap} onChange={handleBasemapChange} />
        <ControlPanel selectedFeature={state.selectedFeature} />
        
        {state.showForm && state.selectedFeature && (
          <FeatureForm
            feature={state.selectedFeature}
            onSubmit={handleSubmitFeature}
            onCancel={handleFormCancel}
          />
        )}
      </div>
      
      <Legend 
        polygons={state.polygons} 
        map={mapManager.current?.mapInstance} 
        layerVisibility={state.layerVisibility} 
        setLayerVisibility={handleLayerVisibilityChange}
      />
    </div>
  );
}