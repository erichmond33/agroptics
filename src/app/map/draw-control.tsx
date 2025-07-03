// components/DrawControl.ts
import { Map as MapLibreMap } from 'maplibre-gl';
import MapboxDraw, {
  DrawCreateEvent,
  DrawDeleteEvent,
  DrawUpdateEvent,
} from '@mapbox/mapbox-gl-draw';
import type { FeatureCollection, Polygon } from 'geojson';

type InitDrawControlOptions = {
  map: MapLibreMap;
  onUpdate: (polygons: FeatureCollection<Polygon>['features']) => void;
};

export function initDrawControl({ map, onUpdate }: InitDrawControlOptions): MapboxDraw {
  const draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: {
      polygon: true,
      trash: true,
    },
    defaultMode: 'simple_select',
  });

  const originalOnAdd = draw.onAdd.bind(draw);
  draw.onAdd = (mapInstance: MapLibreMap) => {
    const controlContainer = originalOnAdd(mapInstance);
    controlContainer.classList.add('maplibregl-ctrl', 'maplibregl-ctrl-group');
    return controlContainer;
  };

  map.addControl(draw);

  const updatePolygons = (
    e: DrawCreateEvent | DrawDeleteEvent | DrawUpdateEvent
  ) => {
    const data = draw.getAll() as FeatureCollection<Polygon>;
    onUpdate(data.features || []);
  };

  map.on('draw.create', updatePolygons);
  map.on('draw.delete', updatePolygons);
  map.on('draw.update', updatePolygons);

  return draw;
}
