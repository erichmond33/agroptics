// components/BasemapSwitcher.jsx
import React from 'react';

export default function BasemapSwitcher({ basemap, onChange }) {
  return (
    <div className="flex space-x-2 bg-white p-2 rounded-lg shadow-lg">
      <button
        className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          basemap === 'positron'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        onClick={() => onChange('positron')}
      >
        Positron
      </button>
      <button
        className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          basemap === 'satellite'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        onClick={() => onChange('satellite')}
      >
        Satellite
      </button>
    </div>
  );
}