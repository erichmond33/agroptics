import * as React from 'react';
import area from '@turf/area';

function ControlPanel(props) {
  let polygonArea = 0;
  for (const polygon of props.polygons) {
    polygonArea += area(polygon);
    // console.log(polygon);
  }

  return (
    <div className="absolute top-20 left-4 bg-white text-black p-4 rounded-lg shadow-lg z-10 w-48">
      <h3 className="text-lg font-semibold mb-2">Draw Polygon</h3>
      {polygonArea > 0 && (
        <p>
          {Math.round(polygonArea * 100) / 100} <br />
          square meters
        </p>
      )}
    </div>
  );
}

export default React.memo(ControlPanel);