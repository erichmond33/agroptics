"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateField = exports.FieldSchema = void 0;
const zod_1 = require("zod");
const turf = __importStar(require("@turf/turf"));
// Define Zod schema for GeoJSON
const GeoJSONSchema = zod_1.z.object({
    type: zod_1.z.literal('Feature'),
    geometry: zod_1.z.object({
        type: zod_1.z.literal('Polygon'),
        coordinates: zod_1.z.array(zod_1.z.array(zod_1.z.array(zod_1.z.number()))),
    }),
    properties: zod_1.z.record(zod_1.z.any()).optional(),
    id: zod_1.z.string().optional(),
});
// Define Zod schema for field creation
exports.FieldSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required').max(20, 'Name must be 20 characters or less'),
    description: zod_1.z.string().max(200, 'Description must be 200 characters or less').optional(),
    geojson: GeoJSONSchema,
});
// Middleware to validate field creation
const validateField = (req, res, next) => {
    try {
        const validatedData = exports.FieldSchema.parse(req.body);
        const { geojson } = validatedData;
        // Calculate the area of the polygon using Turf.js
        const polygon = turf.polygon(geojson.geometry.coordinates);
        const areaSquareMeters = turf.area(polygon);
        const areaAcres = areaSquareMeters / 4046.8564224; // Convert square meters to acres
        // Check if the area exceeds 100 acres
        if (areaAcres > 100) {
            res.status(400).json({
                error: 'Invalid input',
                details: [{ message: 'Polygon area exceeds 100 acres', path: ['geojson'] }],
            });
            return; // Early return is fine, but we ensure the function is typed as void
        }
        req.body = validatedData; // Replace request body with validated data
        next();
    }
    catch (err) {
        if (err instanceof zod_1.ZodError) {
            res.status(400).json({ error: 'Invalid input', details: err.errors });
        }
        else {
            res.status(500).json({ error: 'Server error during validation' });
        }
    }
};
exports.validateField = validateField;
