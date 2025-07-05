// Types
export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  field?: T;
  error?: string;
  details?: Array<{ message: string; path: string[] }>;
}

export interface Station {
  latitude: number;
  longitude: number;
  url: string;
  [key: string]: any;
}

export interface Coordinate {
  lat: number;
  lon: number;
}

export interface GeoJsonCoordinate extends Array<number> {
  0: number; // longitude
  1: number; // latitude
}

// API Response Utilities
export const createErrorResponse = (
  message: string,
  details?: Array<{ message: string; path: string[] }>
): ApiResponse => ({
  error: message,
  ...(details && { details }),
});

export const createSuccessResponse = <T>(
  message: string,
  data?: T,
  field?: T
): ApiResponse<T> => ({
  message,
  ...(data && { data }),
  ...(field && { field }),
});

// Geographic Utility Functions
export const calculateCentroid = (coordinates: GeoJsonCoordinate[]): Coordinate => {
  let totalLat = 0;
  let totalLon = 0;
  
  for (const coord of coordinates) {
    totalLon += coord[0]; // longitude
    totalLat += coord[1]; // latitude
  }
  
  return {
    lat: totalLat / coordinates.length,
    lon: totalLon / coordinates.length,
  };
};

export const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

export const findClosestStation = (
  centroid: Coordinate,
  stations: Station[]
): { station: Station; distance: number } | null => {
  let closestStation: Station | null = null;
  let minDistance = Infinity;

  for (const station of stations) {
    const distance = haversineDistance(
      centroid.lat,
      centroid.lon,
      station.latitude,
      station.longitude
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestStation = station;
    }
  }

  return closestStation ? { station: closestStation, distance: minDistance } : null;
};

// Helper function
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};