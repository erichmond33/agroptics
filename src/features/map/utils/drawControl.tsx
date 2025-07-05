import { Map as MapLibreMap } from 'maplibre-gl';
import MapboxDraw, {
  DrawCreateEvent,
  DrawDeleteEvent,
  DrawUpdateEvent,
} from '@mapbox/mapbox-gl-draw';
import type { Feature, FeatureCollection, Polygon, GeoJsonProperties } from 'geojson';
import { drawStyles } from '../styles/mapboxDrawStyles';

type InitDrawControlOptions = {
  map: MapLibreMap;
  onUpdate: (polygons: FeatureCollection<Polygon>['features']) => void;
  onSelected?: (feature?: Feature<Polygon, GeoJsonProperties>) => void;
  onDelete?: (featureId: string) => void;
};

// Extend MapboxDraw with custom methods
interface ExtendedMapboxDraw extends MapboxDraw {
  preserveSelection: () => string[];
  restoreSelection: (selectedIds: string[]) => void;
}

export function initDrawControl({ 
  map, 
  onUpdate, 
  onSelected, 
  onDelete 
}: InitDrawControlOptions): ExtendedMapboxDraw {
  const draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: {
      polygon: true,
      trash: true
    },
    defaultMode: 'simple_select',
    userProperties: true,
    modes: {
      ...MapboxDraw.modes,
      simple_select: {
        ...MapboxDraw.modes.simple_select,
        dragMove: () => {}, // Disable dragging in simple_select mode
      },
      direct_select: {
        ...MapboxDraw.modes.direct_select,
        dragFeature: () => {}, // Disable feature dragging
        dragVertex: () => {}, // Disable vertex dragging
      },
      draw_polygon: MapboxDraw.modes.draw_polygon, // Use default draw_polygon mode
    },
    styles: drawStyles
  }) as ExtendedMapboxDraw;

  // Add custom methods for selection preservation
  draw.preserveSelection = function(): string[] {
    return this.getSelectedIds();
  };

  draw.restoreSelection = function(selectedIds: string[]): void {
    if (!selectedIds || selectedIds.length === 0) return;
    
    // Use setTimeout to ensure features are fully loaded
    setTimeout(() => {
      try {
        // Check if the feature still exists
        const allFeatures = this.getAll();
        const featureExists = allFeatures.features.some(f => 
          selectedIds.includes(f.id as string)
        );
        
        if (featureExists) {
          this.changeMode('simple_select', { featureIds: selectedIds });
        }
      } catch (error) {
        console.warn('Failed to restore selection:', error);
      }
    }, 100);
  };

  // Override onAdd to ensure proper CSS classes
  const originalOnAdd = draw.onAdd.bind(draw);
  draw.onAdd = (mapInstance: MapLibreMap) => {
    const controlContainer = originalOnAdd(mapInstance);
    controlContainer.classList.add('maplibregl-ctrl', 'maplibregl-ctrl-group');
    return controlContainer;
  };

  // Add the control to the map
  map.addControl(draw);

  // Flag to prevent recursive event handling
  let isProcessingEvent = false;

  // Handle polygon updates (create, update, delete)
  const handlePolygonUpdate = (e: DrawDeleteEvent | DrawUpdateEvent) => {
    if (isProcessingEvent) return;
    isProcessingEvent = true;

    try {
      console.log(`Processing ${e.type} event`);
      const data = draw.getAll() as FeatureCollection<Polygon>;
      onUpdate(data.features || []);

      if (e.type === 'draw.update') {
        console.log('Polygon updated, switching to simple_select mode');
        // Delay mode change to avoid event loop issues
        setTimeout(() => {
          draw.changeMode('simple_select');
        }, 0);
      }
    } catch (error) {
      console.error(`Error handling ${e.type}:`, error);
    } finally {
      isProcessingEvent = false;
    }
  };

  // Handle polygon deletion
  const handlePolygonDelete = (e: DrawDeleteEvent) => {
    if (isProcessingEvent) return;
    
    try {
      console.log('Deleting polygon:', e.features);
      const featureId = e.features[0]?.id;
      if (featureId && onDelete) {
        onDelete(featureId as string);
      }
    } catch (error) {
      console.error('Error in handlePolygonDelete:', error);
    }
  };

  // Handle polygon selection
  const handlePolygonSelection = (e: { features: Feature<Polygon, GeoJsonProperties>[] }) => {
    try {
      const firstFeature = e.features[0];
      if (onSelected) {
        onSelected(firstFeature);
      }
    } catch (error) {
      console.error('Error in handlePolygonSelection:', error);
    }
  };

  // Prevent switching to direct_select mode entirely
  const handleModeChange = (e: { mode: string }) => {
    if (e.mode === 'direct_select') {
      setTimeout(() => {
        draw.changeMode('simple_select');
      }, 0);
    }
  };

  // Register event listeners
  map.on('draw.delete', handlePolygonUpdate);
  map.on('draw.update', handlePolygonUpdate);
  map.on('draw.selectionchange', handlePolygonSelection);
  map.on('draw.delete', handlePolygonDelete);
  map.on('draw.modechange', handleModeChange);

  return draw;
}