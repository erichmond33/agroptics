"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findClosestStation = exports.haversineDistance = exports.calculateCentroid = exports.createSuccessResponse = exports.createErrorResponse = void 0;
// API Response Utilities
const createErrorResponse = (message, details) => (Object.assign({ error: message }, (details && { details })));
exports.createErrorResponse = createErrorResponse;
const createSuccessResponse = (message, data, field) => (Object.assign(Object.assign({ message }, (data && { data })), (field && { field })));
exports.createSuccessResponse = createSuccessResponse;
// Geographic Utility Functions
const calculateCentroid = (coordinates) => {
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
exports.calculateCentroid = calculateCentroid;
const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
};
exports.haversineDistance = haversineDistance;
const findClosestStation = (centroid, stations) => {
    let closestStation = null;
    let minDistance = Infinity;
    for (const station of stations) {
        const distance = (0, exports.haversineDistance)(centroid.lat, centroid.lon, station.latitude, station.longitude);
        if (distance < minDistance) {
            minDistance = distance;
            closestStation = station;
        }
    }
    return closestStation ? { station: closestStation, distance: minDistance } : null;
};
exports.findClosestStation = findClosestStation;
// Helper function
const toRadians = (degrees) => {
    return degrees * (Math.PI / 180);
};
