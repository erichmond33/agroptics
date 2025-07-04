import express, { Request, Response } from 'express';
import { pool } from './db';
// import 'utf8';
import 'fs';
import 'path';
import 'axios';
import cors from 'cors';

const app = express();
const port = 3001;

// Enable CORS for all routes
app.use(cors());

// Add middleware to parse JSON request bodies
app.use(express.json());

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
    pool.query(
      "INSERT INTO fields (name, description, geojson) VALUES (?, ?, ?)",
      [name, description, JSON.stringify(geojson)]
    );
    res.status(201).json({ message: "Field created successfully" });
  } catch (err) {
    console.error("Failed to create field:", err);
    res.status(500).json({ error: "Failed to create field" });
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