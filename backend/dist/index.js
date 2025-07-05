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
const zod_middleware_1 = require("./middleware/zod.middleware");
const geoUtils_1 = require("./utils/geoUtils");
const app = (0, express_1.default)();
const port = 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Database connection test
app.get("/api", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [rows] = yield db_1.pool.query("SELECT 1 AS test");
        res.json((0, geoUtils_1.createSuccessResponse)("Database connection successful", rows));
    }
    catch (error) {
        console.error("Database connection error:", error);
        res.status(500).json((0, geoUtils_1.createErrorResponse)("Database connection failed"));
    }
}));
// Get all fields
app.get("/api/fields", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [rows] = yield db_1.pool.query("SELECT * FROM fields ORDER BY name");
        res.json(rows);
    }
    catch (error) {
        console.error("Failed to fetch fields:", error);
        res.status(500).json((0, geoUtils_1.createErrorResponse)("Failed to fetch fields"));
    }
}));
// Create a new field
app.post("/api/field", zod_middleware_1.validateField, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description, geojson } = req.body;
    try {
        const [result] = yield db_1.pool.query("INSERT INTO fields (name, description, geojson) VALUES (?, ?, ?)", [name, description, JSON.stringify(geojson)]);
        const [newField] = yield db_1.pool.query("SELECT * FROM fields WHERE id = LAST_INSERT_ID()");
        res.status(201).json((0, geoUtils_1.createSuccessResponse)("Field created successfully", undefined, newField[0]));
    }
    catch (error) {
        console.error("Failed to create field:", error);
        res.status(500).json((0, geoUtils_1.createErrorResponse)("Failed to create field"));
    }
}));
// Get weather data for a field
app.get("/api/weather/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const fieldId = parseInt(req.params.id);
    if (isNaN(fieldId)) {
        res.status(400).json((0, geoUtils_1.createErrorResponse)("Invalid field ID"));
        return;
    }
    try {
        // Get field data
        const [rows] = yield db_1.pool.query("SELECT geojson FROM fields WHERE id = ?", [fieldId]);
        const fieldData = rows[0];
        if (!fieldData) {
            res.status(404).json((0, geoUtils_1.createErrorResponse)("Field not found"));
            return;
        }
        // Calculate centroid
        const geojson = fieldData.geojson;
        const coordinates = geojson.geometry.coordinates[0];
        const centroid = (0, geoUtils_1.calculateCentroid)(coordinates);
        // Find closest station
        const stationsPath = path_1.default.join(__dirname, "stations.json");
        const stationsData = JSON.parse(fs_1.default.readFileSync(stationsPath, "utf8"));
        const stations = stationsData.stations;
        const closestResult = (0, geoUtils_1.findClosestStation)(centroid, stations);
        if (!closestResult) {
            res.status(404).json((0, geoUtils_1.createErrorResponse)("No weather station found"));
            return;
        }
        const { station: closestStation } = closestResult;
        // Fetch weather data
        const response = yield fetch(closestStation.url);
        if (!response.ok) {
            throw new Error(`Weather API returned status ${response.status}`);
        }
        const weatherData = yield response.json();
        res.json(weatherData);
    }
    catch (error) {
        console.error("Failed to fetch weather data:", error);
        res.status(500).json((0, geoUtils_1.createErrorResponse)("Failed to fetch weather data"));
    }
}));
// Delete field by ID
app.delete("/api/field/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const fieldId = req.params.id;
    if (!fieldId || isNaN(parseInt(fieldId))) {
        res.status(400).json((0, geoUtils_1.createErrorResponse)("Invalid field ID"));
        return;
    }
    try {
        const [result] = yield db_1.pool.query("DELETE FROM fields WHERE id = ?", [fieldId]);
        if (result.affectedRows === 0) {
            res.status(404).json((0, geoUtils_1.createErrorResponse)("Field not found"));
            return;
        }
        res.status(200).json((0, geoUtils_1.createSuccessResponse)("Field deleted successfully"));
    }
    catch (error) {
        console.error("Failed to delete field:", error);
        res.status(500).json((0, geoUtils_1.createErrorResponse)("Failed to delete field"));
    }
}));
// Delete field by GeoJSON ID
app.delete("/api/field/geojson/:geojsonId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const geojsonId = req.params.geojsonId;
    if (!geojsonId) {
        res.status(400).json((0, geoUtils_1.createErrorResponse)("Invalid GeoJSON ID"));
        return;
    }
    try {
        const [result] = yield db_1.pool.query("DELETE FROM fields WHERE JSON_EXTRACT(geojson, '$.id') = ?", [geojsonId]);
        if (result.affectedRows === 0) {
            res.status(404).json((0, geoUtils_1.createErrorResponse)("Field not found"));
            return;
        }
        res.status(200).json((0, geoUtils_1.createSuccessResponse)("Field deleted successfully"));
    }
    catch (error) {
        console.error("Failed to delete field by GeoJSON ID:", error);
        res.status(500).json((0, geoUtils_1.createErrorResponse)("Failed to delete field"));
    }
}));
// Update field name and/or description
app.put("/api/field/:id", zod_middleware_1.validateFieldUpdate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!id || isNaN(parseInt(id))) {
        res.status(400).json((0, geoUtils_1.createErrorResponse)("Invalid field ID"));
        return;
    }
    if (!name && !description) {
        res.status(400).json((0, geoUtils_1.createErrorResponse)("Invalid input", [
            {
                message: "At least one field (name or description) must be provided",
                path: [],
            },
        ]));
        return;
    }
    try {
        // Check if field exists
        const [existingField] = yield db_1.pool.query("SELECT * FROM fields WHERE id = ?", [id]);
        if (existingField.length === 0) {
            res.status(404).json((0, geoUtils_1.createErrorResponse)("Field not found", [
                { message: `Field with id ${id} does not exist`, path: ["id"] },
            ]));
            return;
        }
        // Build dynamic update query
        const updates = [];
        const values = [];
        if (name) {
            updates.push("name = ?");
            values.push(name);
        }
        if (description !== undefined) {
            updates.push("description = ?");
            values.push(description);
        }
        values.push(id);
        // Execute update
        yield db_1.pool.query(`UPDATE fields SET ${updates.join(", ")} WHERE id = ?`, values);
        // Fetch updated field
        const [updatedField] = yield db_1.pool.query("SELECT * FROM fields WHERE id = ?", [id]);
        res.status(200).json((0, geoUtils_1.createSuccessResponse)("Field updated successfully", undefined, updatedField[0]));
    }
    catch (error) {
        console.error("Failed to update field:", error);
        res.status(500).json((0, geoUtils_1.createErrorResponse)("Failed to update field", [
            { message: "An unexpected error occurred", path: [] },
        ]));
    }
}));
// Start server
app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
});
