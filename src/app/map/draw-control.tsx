// src/app/map/draw-control.tsx
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { useControl } from 'react-map-gl/maplibre';
import type { ControlPosition } from 'react-map-gl/maplibre';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'; // Ensure CSS is imported

type DrawControlProps = ConstructorParameters<typeof MapboxDraw>[0] & {
  position?: ControlPosition;
  onCreate?: (evt: { features: object[] }) => void;
  onUpdate?: (evt: { features: object[]; action: string }) => void;
  onDelete?: (evt: { features: object[] }) => void;
};

// Custom styles to fix line-dasharray issue
const drawStyles = [
  {
    id: 'gl-draw-line',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#3bb2d0',
      'line-width': 2,
      'line-dasharray': ['literal', [2, 2]], // Use ["literal", [2, 2]] for MapLibre compatibility
    },
  },
  {
    id: 'gl-draw-polygon',
    type: 'fill',
    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: {
      'fill-color': '#3bb2d0',
      'fill-outline-color': '#3bb2d0',
      'fill-opacity': 0.5,
    },
  },
  {
    id: 'gl-draw-polygon-and-line-vertex',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
    paint: {
      'circle-radius': 5,
      'circle-color': '#fff',
      'circle-stroke-color': '#3bb2d0',
      'circle-stroke-width': 2,
    },
  },
  // Add other necessary styles for points, midpoints, etc.
];

export default function DrawControl(props: DrawControlProps) {
  useControl<MapboxDraw>(
    () =>
      new MapboxDraw({
        ...props,
        styles: drawStyles, // Pass custom styles
      }),
    ({ map }) => {
      map.on('draw.create', props.onCreate);
      map.on('draw.update', props.onUpdate);
      map.on('draw.delete', props.onDelete);
    },
    ({ map }) => {
      map.off('draw.create', props.onCreate);
      map.off('draw.update', props.onUpdate);
      map.off('draw.delete', props.onDelete);
    },
    {
      position: props.position,
    }
  );

  return null;
}

DrawControl.defaultProps = {
  onCreate: () => {},
  onUpdate: () => {},
  onDelete: () => {},
};