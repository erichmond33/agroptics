import { z, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';
import * as turf from '@turf/turf';

// Define Zod schema for GeoJSON
const GeoJSONSchema = z.object({
  type: z.literal('Feature'),
  geometry: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.array(z.number()))),
  }),
  properties: z.record(z.any()).optional(),
  id: z.string().optional(),
});

// Define Zod schema for field creation
export const FieldSchema = z.object({
  name: z.string().min(1, 'Name is required').max(20, 'Name must be 20 characters or less'),
  description: z.string().max(200, 'Description must be 200 characters or less').optional(),
  geojson: GeoJSONSchema,
});

// Type for validated data
export type FieldSchemaType = z.infer<typeof FieldSchema>;

// Middleware to validate field creation
export const validateField = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const validatedData = FieldSchema.parse(req.body) as FieldSchemaType;
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
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Invalid input', details: err.errors });
    } else {
      res.status(500).json({ error: 'Server error during validation' });
    }
  }
};

// Zod schema for field update (excluding geojson)
export const FieldUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(20, 'Name must be 20 characters or less')
    .optional(),
  description: z
    .string()
    .max(200, 'Description must be 200 characters or less')
    .optional(),
});

// Middleware to validate field update
export const validateFieldUpdate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const validatedData = FieldUpdateSchema.parse(req.body);
    req.body = validatedData; // Replace request body with validated data
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: 'Invalid input',
        details: err.errors.map((e) => ({
          message: e.message,
          path: e.path,
        })),
      });
      return;
    }
    res.status(500).json({
      error: 'Server error during validation',
      details: [{ message: 'An unexpected error occurred', path: [] }],
    });
    return;
  }
};