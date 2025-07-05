// components/FeatureForm.tsx
import { useState } from 'react';
import type { Feature, Polygon } from 'geojson';

interface FeatureFormProps {
  feature: Feature<Polygon>;
  onSubmit: (data: { name: string; description: string; feature: Feature<Polygon> }) => void;
  onCancel: () => void;
}

export default function FeatureForm({ feature, onSubmit, onCancel }: FeatureFormProps) {
  const [name, setName] = useState(feature.properties?.name || '');
  const [description, setDescription] = useState(feature.properties?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Name is required');
      return;
    }
    onSubmit({ name, description, feature });
  };

  return (
    <div className="w-full bg-white p-4 rounded-lg shadow-lg max-w-sm mx-auto">
      <h3 className="text-lg text-black font-semibold mb-4">Add Feature</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-black mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="text-black mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full px-4 py-2 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-600"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}