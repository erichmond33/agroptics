import type { Feature, FeatureCollection, Polygon } from 'geojson';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface FieldData {
  id?: string;
  name: string;
  description: string;
  geojson: Feature<Polygon>;
}

export interface SaveFieldRequest {
  name: string;
  description: string;
  geojson: Feature<Polygon>;
}

export interface SaveFieldResponse {
  field: FieldData;
}

/**
 * Fetch all existing fields from the API
 */
export const getFields = async (): Promise<FeatureCollection<Polygon> | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/fields`);
    if (!response.ok) {
      throw new Error('Failed to fetch fields');
    }
    const rows = await response.json();
    const featureCollection: FeatureCollection<Polygon> = {
      type: 'FeatureCollection',
      features: rows.map((row: any) => ({
        ...row.geojson,
        properties: {
          ...row,
        },
      })),
    };
    return featureCollection;
  } catch (error) {
    console.error('Error fetching existing fields:', error);
    return null;
  }
};

/**
 * Save a new field to the API
 */
export const saveField = async (fieldData: SaveFieldRequest): Promise<SaveFieldResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/field`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fieldData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Server error:', errorData);

    // Check if it's a Zod error (has 'error' and 'details' fields)
    if (errorData.error === 'Invalid input' && errorData.details?.[0]?.message) {
      throw new Error(`Failed to save feature: ${errorData.details[0].message}`);
    } else {
      throw new Error(`Failed to save feature: ${JSON.stringify(errorData, null, 2)}`);
    }
  }

  return await response.json();
};

/**
 * Delete a field by its ID
 */
export const deleteField = async (featureId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/field/geojson/${featureId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete polygon with ID ${featureId} from database`);
  }
};