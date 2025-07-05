import { Feature, Polygon } from 'geojson';
import { Map as MapLibreMap } from 'maplibre-gl';
import { Dispatch, SetStateAction } from 'react';
import { ZoomIn } from 'lucide-react'; // Assuming you use lucide-react for icons

interface LegendProps {
  polygons: Feature<Polygon>[];
  map: MapLibreMap | null;
  layerVisibility: { [key: string]: boolean };
  setLayerVisibility: Dispatch<SetStateAction<{ [key: string]: boolean }>>;
}

export default function Legend({ polygons, map, layerVisibility, setLayerVisibility }: LegendProps) {
  const handleToggleVisibility = (featureId: string) => {
    setLayerVisibility((prev) => ({
      ...prev,
      [featureId]: !prev[featureId],
    }));
  };

  const handleZoomToLayer = (feature: Feature<Polygon>) => {
    if (!map || !feature.geometry.coordinates[0]) return;

    // Calculate bounds for the polygon
    const coordinates = feature.geometry.coordinates[0] as [number, number][];
    const bounds = coordinates.reduce(
      (bounds, coord) => {
        return [
          [Math.min(bounds[0][0], coord[0]), Math.min(bounds[0][1], coord[1])],
          [Math.max(bounds[1][0], coord[0]), Math.max(bounds[1][1], coord[1])],
        ];
      },
      [
        [Infinity, Infinity],
        [-Infinity, -Infinity],
      ]
    ) as [[number, number], [number, number]];

    map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 15,
    });
  };

  return (
    <div className="absolute bottom-10 right-4 z-10 bg-white p-4 rounded shadow-lg max-h-[80vh] overflow-y-auto">
      <h3 className="text-black text-lg font-bold mb-2">Fields</h3>
      {polygons.length === 0 ? (
        <p className="text-black">No fields available</p>
      ) : (
        <ul>
          {polygons.map((feature) => {
            const featureId = feature.id?.toString() || feature.properties?.id?.toString() || JSON.stringify(feature.geometry.coordinates);
            const fieldName = feature.properties?.name || 'Unnamed Field';
            return (
              <li key={featureId} className="flex items-center justify-between mb-2">
                <div className="text-black flex items-center">
                  <input
                    type="checkbox"
                    checked={layerVisibility[featureId] !== false}
                    onChange={() => handleToggleVisibility(featureId)}
                    className="mr-2"
                  />
                  <span>{fieldName}</span>
                </div>
                <button
                  onClick={() => handleZoomToLayer(feature)}
                  className="ml-2 text-blue-500 hover:text-blue-700"
                  title="Zoom to field"
                >
                  <ZoomIn size={20} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}