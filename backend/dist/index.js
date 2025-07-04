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
// import 'utf8';
require("fs");
require("path");
require("axios");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const port = 3001;
// Enable CORS for all routes
app.use((0, cors_1.default)());
// Add middleware to parse JSON request bodies
app.use(express_1.default.json());
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
app.post("/api/field", (req, res) => {
    const { name, description, geojson } = req.body;
    // if (typeof geojson !== 'object' || !geojson.type || !geojson.coordinates) {
    //   return res.status(400).json({ error: "Invalid GeoJSON format" });
    // }
    // if (name.length > 20) {
    //   return res.status(400).json({ error: "Name must be 20 characters or less" });
    // }
    // if (description.length > 200) {
    //   return res.status(400).json({ error: "Description must be 200 characters or less" });
    // }
    try {
        db_1.pool.query("INSERT INTO fields (name, description, geojson) VALUES (?, ?, ?)", [name, description, JSON.stringify(geojson)]);
        res.status(201).json({ message: "Field created successfully" });
    }
    catch (err) {
        console.error("Failed to create field:", err);
        res.status(500).json({ error: "Failed to create field" });
    }
});
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
