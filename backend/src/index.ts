import express, { Request, Response } from 'express';
import { pool } from './db';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

const app = express();
const port = 3001;

// Enable CORS for all routes
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Haversine formula to calculate distance between two points (in kilometers)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate centroid of a polygon
function calculateCentroid(coordinates: number[][]): { lat: number; lon: number } {
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
app.get('/api/weather/:id', async (req: Request, res: Response) => {
  const fieldId = parseInt(req.params.id);

  try {
    // Query the database for the field's geojson
    const [rows] = await pool.query('SELECT geojson FROM fields WHERE id = ?', [fieldId]);
    const field = (rows as any[])[0];

    // Parse geojson and extract coordinates
    const geojson = field.geojson;
    const coordinates = geojson.geometry.coordinates[0]; // First ring of the polygon
    const centroid = calculateCentroid(coordinates);

    // Calculate distance to each station
    let closestStation = null;
    let minDistance = Infinity;

    // Load stations data
    const stationsPath = path.join(__dirname, 'stations.json');
    const stationsData = JSON.parse(fs.readFileSync(stationsPath, 'utf8')).stations;

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
      res.status(500).json({ error: 'Failed to fetch weather data from closest station' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to calculate closest station' });
  }
});

app.post('/api/field', async (req: Request, res: Response) => {
  const { name, description, geojson } = req.body;

  try {
    const [result] = await pool.query(
      'INSERT INTO fields (name, description, geojson) VALUES (?, ?, ?)',
      [name, description, JSON.stringify(geojson)]
    );

    const [newField] = await pool.query(
      'SELECT * FROM fields WHERE id = LAST_INSERT_ID()'
    );

    res.status(201).json({
      message: 'Field created successfully',
      field: (newField as any[])[0],
    });
  } catch (err) {
    console.error('Failed to create field:', err);
    res.status(500).json({ error: 'Failed to create field' });
  }
});

app.get('/api', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS test');
    res.json({ message: 'Database connection successful', data: rows });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.get('/api/fields', async (req: Request, res: Response): Promise<void> => {
    try {
        const [rows] = await pool.query('SELECT * FROM fields ORDER BY name');
        res.json(rows);
    }
    catch (error) {
        console.error('Failed to fetch fields:', error);
        res.status(500).json({ error: 'Failed to fetch fields' });
    }
});


app.delete("/api/field/:id", async (req, res) => {
  const fieldId = req.params.id;
  
  try {
    const [result] = await pool.query("DELETE FROM fields WHERE id = ?", [fieldId]);
    res.status(200).json({ message: "Field deleted successfully" });
  }
  catch (err) {
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