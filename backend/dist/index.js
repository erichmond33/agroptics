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
// Enable CORS for all routes
app.use((0, cors_1.default)());
// Parse JSON request bodies
app.use(express_1.default.json());
// PUT endpoint to update field name and/or description
app.put("/api/field/:id", zod_middleware_1.validateFieldUpdate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, description } = req.body;
    // Ensure at least one field is provided for update
    if (!name && !description) {
        res.status(400).json({
            error: "Invalid input",
            details: [
                {
                    message: "At least one field (name or description) must be provided",
                    path: [],
                },
            ],
        });
        return;
    }
    try {
        // Check if the field exists
        const [existingField] = yield db_1.pool.query("SELECT * FROM fields WHERE id = ?", [id]);
        if (existingField.length === 0) {
            res.status(404).json({
                error: "Field not found",
                details: [
                    { message: `Field with id ${id} does not exist`, path: ["id"] },
                ],
            });
            return;
        }
        // Build the update query dynamically based on provided fields
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
        values.push(id); // Add ID for the WHERE clause
        // Execute the update query
        yield db_1.pool.query(`UPDATE fields SET ${updates.join(", ")} WHERE id = ?`, values);
        // Fetch the updated field
        const [updatedField] = yield db_1.pool.query("SELECT * FROM fields WHERE id = ?", [id]);
        res.status(200).json({
            message: "Field updated successfully",
            field: updatedField[0],
        });
    }
    catch (err) {
        console.error("Failed to update field:", err);
        res.status(500).json({
            error: "Failed to update field",
            details: [{ message: "An unexpected error occurred", path: [] }],
        });
        return;
    }
}));
app.post("/api/field", zod_middleware_1.validateField, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description, geojson } = req.body;
    try {
        const [result] = yield db_1.pool.query("INSERT INTO fields (name, description, geojson) VALUES (?, ?, ?)", [name, description, JSON.stringify(geojson)]);
        const [newField] = yield db_1.pool.query("SELECT * FROM fields WHERE id = LAST_INSERT_ID()");
        res.status(201).json({
            message: "Field created successfully",
            field: newField[0],
        });
    }
    catch (err) {
        console.error("Failed to create field:", err);
        res.status(500).json({ error: "Failed to create field" });
    }
}));
// New endpoint to find the closest station
app.get("/api/weather/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const fieldId = parseInt(req.params.id);
    try {
        // Query the database for the field's geojson
        const [rows] = yield db_1.pool.query("SELECT geojson FROM fields WHERE id = ?", [
            fieldId,
        ]);
        const field = rows[0];
        // Parse geojson and extract coordinates
        const geojson = field.geojson;
        const coordinates = geojson.geometry.coordinates[0]; // First ring of the polygon
        const centroid = (0, geoUtils_1.calculateCentroid)(coordinates);
        // Calculate distance to each station
        let closestStation = null;
        let minDistance = Infinity;
        // Load stations data
        const stationsPath = path_1.default.join(__dirname, "stations.json");
        const stationsData = JSON.parse(fs_1.default.readFileSync(stationsPath, "utf8")).stations;
        for (const station of stationsData) {
            const distance = (0, geoUtils_1.haversineDistance)(centroid.lat, centroid.lon, station.latitude, station.longitude);
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
            res
                .status(500)
                .json({ error: "Failed to fetch weather data from closest station" });
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to calculate closest station" });
    }
}));
app.get("/api", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [rows] = yield db_1.pool.query("SELECT 1 AS test");
        res.json({ message: "Database connection successful", data: rows });
    }
    catch (error) {
        console.error("Database connection error:", error);
        res.status(500).json({ error: "Database connection failed" });
    }
}));
app.get("/api/fields", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [rows] = yield db_1.pool.query("SELECT * FROM fields ORDER BY name");
        res.json(rows);
    }
    catch (error) {
        console.error("Failed to fetch fields:", error);
        res.status(500).json({ error: "Failed to fetch fields" });
    }
}));
app.delete("/api/field/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const fieldId = req.params.id;
    try {
        const [result] = yield db_1.pool.query("DELETE FROM fields WHERE id = ?", [
            fieldId,
        ]);
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
