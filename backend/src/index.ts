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
import { calculateCentroid, haversineDistance } from "./utils/geoUtils";

const app = express();
const port = 3001;

// Enable CORS for all routes
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// PUT endpoint to update field name and/or description
app.put("/api/field/:id", validateFieldUpdate, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description } = req.body as Partial<FieldSchemaType>;

    // Ensure at least one field is provided for update
    if (!name && !description) {
      res.status(400).json({
        error: "Invalid input",
        details: [
          {
            message:
              "At least one field (name or description) must be provided",
            path: [],
          },
        ],
      });
      return;
    }

    try {
      // Check if the field exists
      const [existingField] = await pool.query(
        "SELECT * FROM fields WHERE id = ?",
        [id]
      );
      if ((existingField as any[]).length === 0) {
        res.status(404).json({
          error: "Field not found",
          details: [
            { message: `Field with id ${id} does not exist`, path: ["id"] },
          ],
        });
        return;
      }

      // Build the update query dynamically based on provided fields
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

      values.push(id); // Add ID for the WHERE clause

      // Execute the update query
      await pool.query(
        `UPDATE fields SET ${updates.join(", ")} WHERE id = ?`,
        values
      );

      // Fetch the updated field
      const [updatedField] = await pool.query(
        "SELECT * FROM fields WHERE id = ?",
        [id]
      );

      res.status(200).json({
        message: "Field updated successfully",
        field: (updatedField as any[])[0],
      });
    } catch (err) {
      console.error("Failed to update field:", err);
      res.status(500).json({
        error: "Failed to update field",
        details: [{ message: "An unexpected error occurred", path: [] }],
      });
      return;
    }
  }
);

app.post("/api/field", validateField, async (req: Request, res: Response) => {
  const { name, description, geojson } = req.body as FieldSchemaType;

  try {
    const [result] = await pool.query(
      "INSERT INTO fields (name, description, geojson) VALUES (?, ?, ?)",
      [name, description, JSON.stringify(geojson)]
    );

    const [newField] = await pool.query(
      "SELECT * FROM fields WHERE id = LAST_INSERT_ID()"
    );

    res.status(201).json({
      message: "Field created successfully",
      field: (newField as any[])[0],
    });
  } catch (err) {
    console.error("Failed to create field:", err);
    res.status(500).json({ error: "Failed to create field" });
  }
});

// New endpoint to find the closest station
app.get("/api/weather/:id", async (req: Request, res: Response) => {
  const fieldId = parseInt(req.params.id);

  try {
    // Query the database for the field's geojson
    const [rows] = await pool.query("SELECT geojson FROM fields WHERE id = ?", [
      fieldId,
    ]);
    const field = (rows as any[])[0];

    // Parse geojson and extract coordinates
    const geojson = field.geojson;
    const coordinates = geojson.geometry.coordinates[0]; // First ring of the polygon
    const centroid = calculateCentroid(coordinates);

    // Calculate distance to each station
    let closestStation = null;
    let minDistance = Infinity;

    // Load stations data
    const stationsPath = path.join(__dirname, "stations.json");
    const stationsData = JSON.parse(
      fs.readFileSync(stationsPath, "utf8")
    ).stations;

    for (const station of stationsData) {
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

    try {
      const response = await fetch(closestStation.url);
      const weatherData = await response.json();
      res.json(weatherData);
    } catch (err) {
      res
        .status(500)
        .json({ error: "Failed to fetch weather data from closest station" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to calculate closest station" });
  }
});

app.get("/api", async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS test");
    res.json({ message: "Database connection successful", data: rows });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.get("/api/fields", async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query("SELECT * FROM fields ORDER BY name");
    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch fields:", error);
    res.status(500).json({ error: "Failed to fetch fields" });
  }
});

app.delete("/api/field/:id", async (req, res) => {
  const fieldId = req.params.id;

  try {
    const [result] = await pool.query("DELETE FROM fields WHERE id = ?", [
      fieldId,
    ]);
    res.status(200).json({ message: "Field deleted successfully" });
  } catch (err) {
    console.error("Failed to delete field:", err);
    res.status(500).json({ error: "Failed to delete field" });
  }
});

app.delete("/api/field/geojson/:geojsonId", async (req, res) => {
  const geojsonId = req.params.geojsonId;

  try {
    const [result] = await pool.query(
      "DELETE FROM fields WHERE JSON_EXTRACT(geojson, '$.id') = ?",
      [geojsonId]
    );

    res.status(200).json({ message: "Field deleted successfully" });
  } catch (err) {
    console.error("Failed to delete field by GeoJSON ID:", err);
    res.status(500).json({ error: "Failed to delete field" });
  }
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
