'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import type { Feature, FeatureCollection, Polygon, GeoJsonProperties } from 'geojson';
import ControlPanel from './control-panel';
import FeatureForm from './feature-form';
import { initDrawControl } from './draw-control';
import BasemapSwitcher from './basemap-switcher';
import Legend from './legend';
import { featureCollection } from '@turf/turf';
import WeatherViewer from './WeatherViewer';

const basemaps = {
  positron: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  satellite: 'https://roblabs.com/xyz-raster-sources/styles/arcgis-world-imagery.json',
};

export default function App() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const draw = useRef<mapboxgl.Draw | null>(null);
  const [polygons, setPolygons] = useState<Feature<Polygon>[]>([]);
  const [basemap, setBasemap] = useState<keyof typeof basemaps>('positron');
  const [selectedFeature, setSelectedFeature] = useState<Feature<Polygon, GeoJsonProperties> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState<{ [key: string]: boolean }>({});
  const existingFeatures = useRef<FeatureCollection<Polygon> | null>(null);

  const handleBasemapChange = useCallback((newBasemap: string) => {
    setBasemap(newBasemap as keyof typeof basemaps);
  }, []);

  const fetchExistingFields = async (): Promise<FeatureCollection<Polygon> | null> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fields`);
      if (!response.ok) {
        throw new Error('Failed to fetch fields');
      }
      const rows = await response.json();
      const featureCollection: FeatureCollection<Polygon> = {
        type: 'FeatureCollection',
        features: rows.map((row: any) => ({
          ...row.geojson,
          properties: {
            ...row,
          },
        })),
      };
      existingFeatures.current = featureCollection;
      const visibility = featureCollection.features.reduce((acc, feature) => {
        const featureId = feature.id?.toString() || feature.properties?.id?.toString() || JSON.stringify(feature.geometry.coordinates);
        return { ...acc, [featureId]: true };
      }, {});
      setLayerVisibility(visibility);
      return featureCollection;
    } catch (error) {
      console.error('Error fetching existing fields:', error);
      return null;
    }
  };

  const loadFeaturesToMap = () => {
    fetchExistingFields().then((fields) => {
      if (fields) {
        setPolygons(fields.features);
        const drawFeatures = featureCollection(fields.features);
        draw.current?.set(drawFeatures);
      }
      console.log('Existing features loaded:', fields);
    });
  };

  const checkFeatureExists = async (feature: Feature<Polygon>): Promise<boolean> => {
    if (!existingFeatures.current) {
      const fields = await fetchExistingFields();
      if (!fields) return false;
      existingFeatures.current = fields;
    }
    return existingFeatures.current.features.some(
      (existingFeature) =>
        existingFeature.geometry.type === feature.geometry.type &&
        JSON.stringify(existingFeature.geometry.coordinates) ===
          JSON.stringify(feature.geometry.coordinates)
    );
  };

  const handleSubmitFeature = async (data: {
    name: string;
    description: string;
    feature: Feature<Polygon>;
  }) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          geojson: data.feature,
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        const savedField = responseData.field; // Extract the returned field object

        // Ensure the savedField has the expected structure
        const featureId = savedField.id?.toString() || data.feature.id?.toString() || JSON.stringify(data.feature.geometry.coordinates);

        // Create the updated feature using returned field data
        const updatedFeature = {
          ...data.feature,
          properties: {
            ...data.feature.properties, // Preserve existing properties
            id: featureId, // Use the server-returned ID
            name: savedField.name, // Use server-returned name
            description: savedField.description, // Use server-returned description
          },
        };

        setPolygons((prev) => [...prev, updatedFeature]);
        setLayerVisibility((prev) => ({ ...prev, [featureId]: true }));
        setShowForm(false);
        setSelectedFeature(updatedFeature);

        loadFeaturesToMap();
      } else {
        alert('Failed to save feature');
      }
    } catch (error) {
      console.error('Error saving feature:', error);
      alert('Error saving feature');
    }
  };

  const manageCreateForm = useCallback(async (feature?: Feature<Polygon, GeoJsonProperties>) => {
    if (!feature) {
      console.log('No feature selected');
      setShowForm(false);
      setSelectedFeature(null);
      return;
    }
    setSelectedFeature(feature);
    console.log('Selected feature:', feature);

    const exists = await checkFeatureExists(feature);
    if (exists) {
      console.log('Feature already exists in database');
      setShowForm(false);
    } else {
      console.log('Feature does not exist, showing form');
      setShowForm(true);
    }
  }, []);

  const deletePolygon = useCallback((featureId: string) => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/field/geojson/${featureId}`, {
      method: 'DELETE',
    })
      .then((response) => {
        if (response.ok) {
          console.log(`Polygon with ID ${featureId} deleted from database`);
          setSelectedFeature(null);
        }
        else {
          console.error(`Failed to delete polygon with ID ${featureId} from database`);
        }
      }
      )
      .catch((error) => {
        console.error('Error deleting polygon from database:', error);
      });


  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: basemaps[basemap],
      center: [-104.033, 40.097],
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

      loadFeaturesToMap();

      draw.current = initDrawControl({
        map: map.current,
        onUpdate: (features) => {
          console.log('Draw update event triggered: ', features);
          setPolygons(features);
        },
        onSelected: (feature) => manageCreateForm(feature),
        onDelete: (featureId) => deletePolygon(featureId),
      });
    });

    return () => {
      map.current?.remove();
    };
  }, []);


useEffect(() => {
  if (!map.current || !draw.current) return;

  const existingPolygons = draw.current.getAll() as FeatureCollection<Polygon>;
  
  // Preserve the current selection
  const selectedIds = draw.current.preserveSelection();

  try {
    map.current.removeControl(draw.current);
  } catch {}

  map.current.setStyle(basemaps[basemap]);

  map.current.once('styledata', () => {
    if (!map.current || !draw.current) return;

    map.current.addControl(draw.current);

    if (existingPolygons?.features?.length) {
      draw.current.set(existingPolygons);
      
      // Restore the selection
      draw.current.restoreSelection(selectedIds);
    }
  });
}, [basemap]);

  // Update feature visibility in Draw control
  useEffect(() => {
    if (!draw.current || !polygons.length) return;

    // Filter features based on layerVisibility
    const visibleFeatures = polygons.filter((feature) => {
      const featureId = feature.id?.toString() || feature.properties?.id?.toString() || JSON.stringify(feature.geometry.coordinates);
      return layerVisibility[featureId] !== false;
    });

    // Update Draw control with visible features only
    draw.current.set(featureCollection(visibleFeatures));
  }, [layerVisibility, polygons]);

  return (
<div className="relative h-screen w-full">
  <div ref={mapContainer} id="map" className="h-full w-full" />
  <div className="absolute top-0 left-0 flex flex-col gap-4 p-4 z-20 w-80 bg-transparent">
    <BasemapSwitcher basemap={basemap} onChange={handleBasemapChange} />
    <ControlPanel selectedFeature={selectedFeature} />
    {showForm && selectedFeature && (
      <FeatureForm
        feature={selectedFeature}
        onSubmit={handleSubmitFeature}
        onCancel={() => {
          setShowForm(false);
          setSelectedFeature(null);
        }}
      />
    )}
  </div>
  <Legend polygons={polygons} map={map.current} layerVisibility={layerVisibility} setLayerVisibility={setLayerVisibility} />
</div>
  );
}