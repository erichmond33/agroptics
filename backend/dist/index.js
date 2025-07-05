"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("./db");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const port = 3001;
// Enable CORS for all routes
app.use((0, cors_1.default)());
// Parse JSON request bodies
app.use(express_1.default.json());
// Haversine formula to calculate distance between two points (in kilometers)
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
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
// New endpoint to find the closest station
app.get('/api/weather/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const fieldId = parseInt(req.params.id);
    try {
        // Query the database for the field's geojson
        const [rows] = yield db_1.pool.query('SELECT geojson FROM fields WHERE id = ?', [fieldId]);
        const field = rows[0];
        // Parse geojson and extract coordinates
        const geojson = field.geojson;
        const coordinates = geojson.geometry.coordinates[0]; // First ring of the polygon
        const centroid = calculateCentroid(coordinates);
        // Calculate distance to each station
        let closestStation = null;
        let minDistance = Infinity;
        // Load stations data
        const stationsPath = path_1.default.join(__dirname, 'stations.json');
        const stationsData = JSON.parse(fs_1.default.readFileSync(stationsPath, 'utf8')).stations;
        for (const station of stationsData) {
            const distance = haversineDistance(centroid.lat, centroid.lon, station.latitude, station.longitude);
            if (distance < minDistance) {
                minDistance = distance;
                closestStation = station;
            }
        }
        try {
            const response = yield fetch(closestStation.url);
            const weatherData = yield response.json();
            res.json(weatherData);
        }
        catch (err) {
            res.status(500).json({ error: 'Failed to fetch weather data from closest station' });
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to calculate closest station' });
    }
}));
app.post('/api/field', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description, geojson } = req.body;
    try {
        const [result] = yield db_1.pool.query('INSERT INTO fields (name, description, geojson) VALUES (?, ?, ?)', [name, description, JSON.stringify(geojson)]);
        const [newField] = yield db_1.pool.query('SELECT * FROM fields WHERE id = LAST_INSERT_ID()');
        res.status(201).json({
            message: 'Field created successfully',
            field: newField[0],
        });
    }
    catch (err) {
        console.error('Failed to create field:', err);
        res.status(500).json({ error: 'Failed to create field' });
    }
}));
app.get('/api', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [rows] = yield db_1.pool.query('SELECT 1 AS test');
        res.json({ message: 'Database connection successful', data: rows });
    }
    catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
}));
app.get('/api/fields', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [rows] = yield db_1.pool.query('SELECT * FROM fields ORDER BY name');
        res.json(rows);
    }
    catch (error) {
        console.error('Failed to fetch fields:', error);
        res.status(500).json({ error: 'Failed to fetch fields' });
    }
}));
app.delete("/api/field/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const fieldId = req.params.id;
    try {
        const [result] = yield db_1.pool.query("DELETE FROM fields WHERE id = ?", [fieldId]);
        res.status(200).json({ message: "Field deleted successfully" });
    }
    catch (err) {
        console.error("Failed to delete field:", err);
        res.status(500).json({ error: "Failed to delete field" });
    }
}));
app.delete("/api/field/geojson/:geojsonId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const geojsonId = req.params.geojsonId;
    try {
        const [result] = yield db_1.pool.query("DELETE FROM fields WHERE JSON_EXTRACT(geojson, '$.id') = ?", [geojsonId]);
        res.status(200).json({ message: "Field deleted successfully" });
    }
    catch (err) {
        console.error("Failed to delete field by GeoJSON ID:", err);
        res.status(500).json({ error: "Failed to delete field" });
    }
}));
app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
});
