import { Map as MapLibreMap } from 'maplibre-gl';
import MapboxDraw, {
  DrawCreateEvent,
  DrawDeleteEvent,
  DrawUpdateEvent,
} from '@mapbox/mapbox-gl-draw';
import type { Feature, FeatureCollection, Polygon, GeoJsonProperties } from 'geojson';
import { drawStyles } from './styles/mapbox-draw-styles';

type InitDrawControlOptions = {
  map: MapLibreMap;
  onUpdate: (polygons: FeatureCollection<Polygon>['features']) => void;
  onSelected?: (feature?: Feature<Polygon, GeoJsonProperties>) => void;
  onDelete?: (featureId: string) => void;
};

export function initDrawControl({ map, onUpdate, onSelected, onDelete }: InitDrawControlOptions): MapboxDraw {
  const draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: {
      polygon: true,
      trash: true
    },
    defaultMode: 'simple_select',
    userProperties: true,
    // Override dragging behavior for specific modes
    modes: {
      ...MapboxDraw.modes,
      simple_select: {
        ...MapboxDraw.modes.simple_select,
        dragMove: () => {}, // Prevent dragging entire features in simple_select
      },
      direct_select: {
        ...MapboxDraw.modes.direct_select,
        dragFeature: () => {}, // Prevent dragging entire features in direct_select
        dragVertex: () => {}, // Prevent dragging vertices in direct_select
      },
      draw_polygon: MapboxDraw.modes.draw_polygon, // Use default draw_polygon mode
    },
    styles: drawStyles
  });

  // Add method to preserve and restore selection
  draw.preserveSelection = function() {
    return this.getSelectedIds();
  };

  draw.restoreSelection = function(selectedIds) {
    if (selectedIds && selectedIds.length > 0) {
      // Use setTimeout to ensure features are fully loaded
      setTimeout(() => {
        try {
          // Check if the feature still exists
          const allFeatures = this.getAll();
          const featureExists = allFeatures.features.some(f => selectedIds.includes(f.id));
          
          if (featureExists) {
            this.changeMode('simple_select', { featureIds: selectedIds });
          }
        } catch (error) {
          console.warn('Failed to restore selection:', error);
        }
      }, 100);
    }
  };

  const originalOnAdd = draw.onAdd.bind(draw);
  draw.onAdd = (mapInstance: MapLibreMap) => {
    const controlContainer = originalOnAdd(mapInstance);
    controlContainer.classList.add('maplibregl-ctrl', 'maplibregl-ctrl-group');
    return controlContainer;
  };

  map.addControl(draw);

  let isProcessingEvent = false; // Flag to prevent recursive event handling

  const updatePolygons = (
    e: DrawDeleteEvent | DrawUpdateEvent
  ) => {
    if (isProcessingEvent) return; // Prevent recursion
    isProcessingEvent = true;

    try {
      console.log("event", e.type);
      const data = draw.getAll() as FeatureCollection<Polygon>;
      onUpdate(data.features || []);

      if (e.type === 'draw.delete') {
        console.log("draw.delete event");
      }
      if (e.type === 'draw.update') {
        console.log("draw.update event");
        // Delay mode change to avoid event loop
        setTimeout(() => {
          draw.changeMode('simple_select');
        }, 0);
      }
    } finally {
      isProcessingEvent = false; // Reset flag
    }
  };

  const deletePolygon = (e: DrawDeleteEvent) => {
    if (isProcessingEvent) return;
    isProcessingEvent = true;
    
    try {
      console.log("Deleting polygon:", e.features);
      const featureId = e.features[0]?.id;
      if (featureId) {
        draw.delete(featureId);
        onDelete?.(featureId);
      }
    }
    catch (error) {
      console.error('Error in deletePolygon:', error);
    }
  finally {
      isProcessingEvent = false; // Reset flag
    }
  }

  const selectPolygon = (e: { features: Feature<Polygon, GeoJsonProperties>[] }) => {
    try {
      const firstFeature = e.features[0];
      onSelected?.(firstFeature);
    } catch (error) {
      console.error('Error in handlePolygonSelection:', error);
    }
  };

  // Prevent switching to direct_select mode entirely
  map.on('draw.modechange', (e) => {
    if (e.mode === 'direct_select') {
      setTimeout(() => {
        draw.changeMode('simple_select');
      }, 0);
    }
  });

  // Listen to necessary events
  map.on('draw.delete', updatePolygons);
  map.on('draw.update', updatePolygons);
  // map.on('draw.create', updatePolygons);
  map.on('draw.selectionchange', selectPolygon);
  map.on('draw.delete', deletePolygon);

  return draw;
}