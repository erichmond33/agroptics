import * as React from 'react';
import area from '@turf/area';

function ControlPanel(props) {
  let polygonArea = 0;
  for (const polygon of props.polygons) {
    polygonArea += area(polygon);
  }

  return (
    <div className="relative h-screen w-full">
      <div className="absolute top-4 left-4 flex space-x-2 bg-white p-2 rounded-lg shadow-lg z-10">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${basemap === 'positron'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          onClick={() => handleBasemapChange('positron')}
        >
          Positron
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${basemap === 'satellite'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          onClick={() => handleBasemapChange('satellite')}
        >
          Satellite
        </button>
      </div>
  );
}

export default React.memo(PolygonInfo);