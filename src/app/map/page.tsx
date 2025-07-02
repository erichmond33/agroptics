"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import Map from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import DrawControl from './draw-control';
import ControlPanel from './control-panel';

export default function App() {
  const [features, setFeatures] = useState({});
  const [basemap, setBasemap] = useState('positron');
  const [viewState, setViewState] = useState({
    latitude: 37.7577,
    longitude: -122.4376,
    zoom: 10,
  });
  const mapRef = useRef<any>(null);
  const drawRef = useRef<any>(null);

  const basemaps = {
    positron: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    satellite: 'https://roblabs.com/xyz-raster-sources/styles/arcgis-world-imagery.json',
  };

  const onUpdate = useCallback((e: any) => {
    setFeatures((currFeatures) => {
      const newFeatures = { ...currFeatures };
      for (const f of e.features) {
        newFeatures[f.id] = f;
      }
      return newFeatures;
    });
  }, []);

  const onDelete = useCallback((e: any) => {
    setFeatures((currFeatures) => {
      const newFeatures = { ...currFeatures };
      for (const f of e.features) {
        delete newFeatures[f.id];
      }
      return newFeatures;
    });
  }, []);

  const handleBasemapChange = useCallback((newBasemap: string) => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      setViewState({
        latitude: map.getCenter().lat,
        longitude: map.getCenter().lng,
        zoom: map.getZoom(),
      });
    }
    setBasemap(newBasemap);
  }, []);

  // Reapply features to DrawControl after basemap change
  useEffect(() => {
    if (drawRef.current && Object.keys(features).length > 0) {
      const featureArray = Object.values(features);
      drawRef.current.set({
        type: 'FeatureCollection',
        features: featureArray,
      });
    }
  }, [basemap, features]);

  return (
    <div className="relative w-screen h-screen">
      <Map
        key={basemap}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={basemaps[basemap]}
        mapLib={maplibregl}
        ref={mapRef}
      >
        <DrawControl
          ref={drawRef}
          position="top-left"
          displayControlsDefault={false}
          controls={{
            polygon: true,
            trash: true,
          }}
          defaultMode="draw_polygon"
          onCreate={onUpdate}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
        <div className="absolute top-4 right-4 flex space-x-2 bg-white p-2 rounded-lg shadow-lg z-10">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              basemap === 'positron'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => handleBasemapChange('positron')}
          >
            Positron
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              basemap === 'satellite'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => handleBasemapChange('satellite')}
          >
            Satellite
          </button>
        </div>
      </Map>
      <ControlPanel polygons={Object.values(features)} />
    </div>
  );
}

export function renderToDom(container: HTMLElement) {
  import('react-dom/client').then(({ createRoot }) => {
    createRoot(container).render(<App />);
  });
}