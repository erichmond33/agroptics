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
  onCreate: (Polygon: FeatureCollection<Polygon>['features']) => void;
};

export function initDrawControl({ map, onUpdate, onCreate }: InitDrawControlOptions): MapboxDraw {
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
    e: DrawCreateEvent | DrawDeleteEvent | DrawUpdateEvent | any
  ) => {
    console.log("event");
    const data = draw.getAll() as FeatureCollection<Polygon>;
    onUpdate(data.features || []);

    if (e.type === 'draw.create') {
      console.log("draw.create event");
    }
    if (e.type === 'draw.delete') {
      console.log("draw.delete event");
    }
    if (e.type === 'draw.update') {
      console.log("draw.update event");
    }
    // if (e.type === 'draw.render') {
    //   console.log("draw.render event");
    // }
   
  };

  const createPolygons = (
    e: DrawCreateEvent
  ) => {
    const data = draw.getAll() as FeatureCollection<Polygon>;
    onCreate(data.features || []);
    console.log("draw.create event 2");
  };


  map.on('draw.create', updatePolygons);
  map.on('draw.delete', updatePolygons);
  map.on('draw.update', updatePolygons);
  // map.on('draw.selectionchange', updatePolygons);
  map.on('draw.render', updatePolygons);
  // map.on('draw.combine', updatePolygons);
  // map.on('draw.uncombine', updatePolygons);
  // map.on('draw.modechange', updatePolygons);
  // map.on('draw.actionable', updatePolygons);

  map.on('draw.create', createPolygons);

  return draw;
}
