'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

import type { Feature, FeatureCollection, Polygon } from 'geojson';

import ControlPanel from './control-panel';
import { initDrawControl } from './draw-control';
import { feature } from '@turf/turf';
import type { GeoJsonProperties } from 'geojson';

const basemaps = {
  positron: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  satellite: 'https://roblabs.com/xyz-raster-sources/styles/arcgis-world-imagery.json',
};

const MapComponent: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const draw = useRef<mapboxgl.Draw | null>(null);
  const [polygons, setPolygons] = useState<Feature<Polygon>[]>([]);
  const [basemap, setBasemap] = useState<keyof typeof basemaps>('positron');

  const handleBasemapChange = useCallback((newBasemap: string) => {
    setBasemap(newBasemap as keyof typeof basemaps);
  }, []);

  const manageCreateForm = useCallback((features: Feature<Polygon, GeoJsonProperties>[]) => {
    // (parameter) features: Feature<Polygon, GeoJsonProperties>[]
    // return nothing and console log tha twe created the form
    if (!features || features.length === 0) {
      console.error('No features provided for form creation');
      return;
    }
    console.log('Created form for feature:', features[0]);
  }
  , []);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: basemaps[basemap],
      center: [-91.874, 42.76],
      zoom: 12,
    });

    map.current.on('load', () => {
      if (!map.current) return;

      map.current.getCanvas().className = 'mapboxgl-canvas maplibregl-canvas';
      map.current.getContainer().classList.add('mapboxgl-map');

      const canvasContainer = map.current.getCanvasContainer();
      canvasContainer.classList.add('mapboxgl-canvas-container');
      if (canvasContainer.classList.contains('maplibregl-interactive')) {
        canvasContainer.classList.add('mapboxgl-interactive');
      }

      draw.current = initDrawControl({
        map: map.current,
        onUpdate: (features) => setPolygons(features),
        onCreate: (features) => manageCreateForm(features)
      });
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!map.current || !draw.current) return;

    const existingPolygons = draw.current.getAll() as FeatureCollection<Polygon>;

    try {
      map.current.removeControl(draw.current);
    } catch {}

    map.current.setStyle(basemaps[basemap]);

    map.current.once('styledata', () => {
      if (!map.current || !draw.current) return;

      map.current.addControl(draw.current);

      if (existingPolygons?.features?.length) {
        draw.current.set(existingPolygons);
      }
    });
  }, [basemap]);

  return (


    <div className="relative h-screen w-full">
      <div className="absolute top-4 left-4 flex space-x-2 bg-white p-2 rounded-lg shadow-lg z-10">
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

      <div ref={mapContainer} id="map" className="h-full w-full" />
      <ControlPanel polygons={polygons} />
    </div>
  );
};

export default MapComponent;
