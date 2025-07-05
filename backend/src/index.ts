import express, { Request, Response } from "express";
import { pool } from "./db";
import fs from "fs";
import path from "path";
import cors from "cors";
import {
  validateField,
  FieldSchemaType,
  validateFieldUpdate,
} from "./middleware/zod.middleware";
import { 
  calculateCentroid, 
  findClosestStation,
  ApiResponse,
  Station,
  createErrorResponse,
  createSuccessResponse
} from "./utils/geoUtils";

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection test
app.get("/api", async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query("SELECT 1 AS test");
    res.json(createSuccessResponse("Database connection successful", rows));
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json(createErrorResponse("Database connection failed"));
  }
});

// Get all fields
app.get("/api/fields", async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query("SELECT * FROM fields ORDER BY name");
    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch fields:", error);
    res.status(500).json(createErrorResponse("Failed to fetch fields"));
  }
});

// Create a new field
app.post("/api/field", validateField, async (req: Request, res: Response): Promise<void> => {
  const { name, description, geojson } = req.body as FieldSchemaType;

  try {
    const [result] = await pool.query(
      "INSERT INTO fields (name, description, geojson) VALUES (?, ?, ?)",
      [name, description, JSON.stringify(geojson)]
    );

    const [newField] = await pool.query(
      "SELECT * FROM fields WHERE id = LAST_INSERT_ID()"
    );

    res.status(201).json(
      createSuccessResponse("Field created successfully", undefined, (newField as any[])[0])
    );
  } catch (error) {
    console.error("Failed to create field:", error);
    res.status(500).json(createErrorResponse("Failed to create field"));
  }
});

// Get weather data for a field
app.get("/api/weather/:id", async (req: Request, res: Response): Promise<void> => {
  const fieldId = parseInt(req.params.id);

  if (isNaN(fieldId)) {
    res.status(400).json(createErrorResponse("Invalid field ID"));
    return;
  }

  try {
    // Get field data
    const [rows] = await pool.query("SELECT geojson FROM fields WHERE id = ?", [fieldId]);
    const fieldData = (rows as any[])[0];

    if (!fieldData) {
      res.status(404).json(createErrorResponse("Field not found"));
      return;
    }

    // Calculate centroid
    const geojson = fieldData.geojson;
    const coordinates = geojson.geometry.coordinates[0];
    const centroid = calculateCentroid(coordinates);

    // Find closest station
    const stationsPath = path.join(__dirname, "stations.json");
    const stationsData = JSON.parse(fs.readFileSync(stationsPath, "utf8"));
    const stations: Station[] = stationsData.stations;

    const closestResult = findClosestStation(centroid, stations);
    
    if (!closestResult) {
      res.status(404).json(createErrorResponse("No weather station found"));
      return;
    }

    const { station: closestStation } = closestResult;

    // Fetch weather data
    const response = await fetch(closestStation.url);
    if (!response.ok) {
      throw new Error(`Weather API returned status ${response.status}`);
    }

    const weatherData = await response.json();
    res.json(weatherData);
  } catch (error) {
    console.error("Failed to fetch weather data:", error);
    res.status(500).json(createErrorResponse("Failed to fetch weather data"));
  }
});

// Delete field by ID
app.delete("/api/field/:id", async (req: Request, res: Response): Promise<void> => {
  const fieldId = req.params.id;

  if (!fieldId || isNaN(parseInt(fieldId))) {
    res.status(400).json(createErrorResponse("Invalid field ID"));
    return;
  }

  try {
    const [result] = await pool.query("DELETE FROM fields WHERE id = ?", [fieldId]);
    
    if ((result as any).affectedRows === 0) {
      res.status(404).json(createErrorResponse("Field not found"));
      return;
    }

    res.status(200).json(createSuccessResponse("Field deleted successfully"));
  } catch (error) {
    console.error("Failed to delete field:", error);
    res.status(500).json(createErrorResponse("Failed to delete field"));
  }
});

// Delete field by GeoJSON ID
app.delete("/api/field/geojson/:geojsonId", async (req: Request, res: Response): Promise<void> => {
  const geojsonId = req.params.geojsonId;

  if (!geojsonId) {
    res.status(400).json(createErrorResponse("Invalid GeoJSON ID"));
    return;
  }

  try {
    const [result] = await pool.query(
      "DELETE FROM fields WHERE JSON_EXTRACT(geojson, '$.id') = ?",
      [geojsonId]
    );

    if ((result as any).affectedRows === 0) {
      res.status(404).json(createErrorResponse("Field not found"));
      return;
    }

    res.status(200).json(createSuccessResponse("Field deleted successfully"));
  } catch (error) {
    console.error("Failed to delete field by GeoJSON ID:", error);
    res.status(500).json(createErrorResponse("Failed to delete field"));
  }
});

// Update field name and/or description
app.put("/api/field/:id", validateFieldUpdate, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, description } = req.body as Partial<FieldSchemaType>;

  if (!id || isNaN(parseInt(id))) {
    res.status(400).json(createErrorResponse("Invalid field ID"));
    return;
  }

  if (!name && !description) {
    res.status(400).json(
      createErrorResponse("Invalid input", [
        {
          message: "At least one field (name or description) must be provided",
          path: [],
        },
      ])
    );
    return;
  }

  try {
    // Check if field exists
    const [existingField] = await pool.query("SELECT * FROM fields WHERE id = ?", [id]);
    
    if ((existingField as any[]).length === 0) {
      res.status(404).json(
        createErrorResponse("Field not found", [
          { message: `Field with id ${id} does not exist`, path: ["id"] },
        ])
      );
      return;
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | undefined)[] = [];

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
    await pool.query(`UPDATE fields SET ${updates.join(", ")} WHERE id = ?`, values);

    // Fetch updated field
    const [updatedField] = await pool.query("SELECT * FROM fields WHERE id = ?", [id]);

    res.status(200).json(
      createSuccessResponse("Field updated successfully", undefined, (updatedField as any[])[0])
    );
  } catch (error) {
    console.error("Failed to update field:", error);
    res.status(500).json(
      createErrorResponse("Failed to update field", [
        { message: "An unexpected error occurred", path: [] },
      ])
    );
  }
});

// Start server
app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});