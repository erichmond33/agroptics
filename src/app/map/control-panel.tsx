import * as React from 'react';
import area from '@turf/area';
import type { Feature, Polygon } from 'geojson';
import WeatherViewer from './WeatherViewer';

interface ControlPanelProps {
  selectedFeature: Feature<Polygon> | null;
}

function ControlPanel({ selectedFeature }: ControlPanelProps) {
  let polygonArea = 0;
  if (selectedFeature) {
    polygonArea = area(selectedFeature);
  }

  return (
    <div className="bg-white text-black p-4 rounded-lg shadow-lg w-full">
      <h3 className="text-lg font-semibold mb-2">
        Selected Feature
      </h3>
      {polygonArea > 0 ? (
        <>
          <h4 className="text-md font-bold mb-1">Area</h4>
          <p className="text-sm">
            {Math.round(polygonArea * 100) / 100} m²
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-500">No polygon selected</p>
      )}
      {selectedFeature?.properties?.name && (
        <div className="mt-2">
          <h4 className="text-md font-bold mb-1">Name</h4>
          <p className="text-sm text-gray-700">{selectedFeature?.properties?.name}</p>
        </div>
      )}
      {selectedFeature?.properties?.description && (
        <div className="mt-2">
          <h4 className="text-md font-bold mb-1">Description</h4>
          <p className="text-sm text-gray-700">{selectedFeature?.properties?.description}</p>
        </div>
      )}
      {selectedFeature?.properties?.name && (
        <div className="mt-2">
          <WeatherViewer selectedFeature={selectedFeature} />
        </div>
      )}
    </div>
  );
}

export default React.memo(ControlPanel);