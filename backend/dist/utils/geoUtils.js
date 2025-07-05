"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.haversineDistance = haversineDistance;
exports.calculateCentroid = calculateCentroid;
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
// Calculate centroid of a polygon
function calculateCentroid(coordinates) {
    let xSum = 0, ySum = 0, area = 0, n = coordinates.length;
    for (let i = 0; i < n - 1; i++) {
        const x0 = coordinates[i][0];
        const y0 = coordinates[i][1];
        const x1 = coordinates[i + 1][0];
        const y1 = coordinates[i + 1][1];
        const a = x0 * y1 - x1 * y0;
        area += a;
        xSum += (x0 + x1) * a;
        ySum += (y0 + y1) * a;
    }
    area /= 2;
    xSum /= (6 * area);
    ySum /= (6 * area);
    return { lon: xSum, lat: ySum };
}
