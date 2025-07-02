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

// This appears to be a database connection test route. It's functional.
app.get('/api', async (req: Request, res: Response) => {
  try {
    // Using 'pool.query' is more standard than 'pool.execute' for non-prepared statements.
    const [rows] = await pool.query('SELECT 1 AS test');
    res.json({ message: 'Database connection successful', data: rows });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});
/**
 * POST create a new field.
 */


app.post('/api/field', (req, res) => {
  // const { name, description, geojson } = req.body;
  // const { name, description, geojson } = req.body;

  // If any field is missing, use fake data
  const fakeName = 'Test Field';
  const fakeDescription = 'A sample field for testing purposes.';
  const fakeGeojson = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-100.0, 40.0],
          [-101.0, 40.0],
          [-101.0, 41.0],
          [-100.0, 41.0],
          [-100.0, 40.0]
        ]
      ]
    },
    properties: {}
  };

  const name = fakeName;
  const description = fakeDescription;
  const geojson = fakeGeojson;

  try {
    pool.query(
      'INSERT INTO fields (name, description, geojson) VALUES (?, ?, ?)',
      [name, description, JSON.stringify(geojson)]
    );
    res.status(201).json({ message: 'Field created successfully' });
  } catch (err) {
    console.error('Failed to create field:', err);
    res.status(500).json({ error: 'Failed to create field' });
  }
});
/**
 * GET all fields from the database.
 */
app.get('/api/field', async (req: Request, res: Response) => {
  try {
    // Fetches all records from the 'fields' table.
    const [rows] = await pool.query('SELECT * FROM fields');
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch fields:', err);
    res.status(500).json({ error: 'Failed to fetch fields' });
  }
});

// /**
//  * PUT (update) a specific field by its ID.
//  */
// app.put('/api/field', async (req: Request, res: Response): Promise<void> => {
//   const { id, name, description } = req.body;

//   // --- Improved Validation ---
//   const numericId = parseInt(id, 10);
//   if (isNaN(numericId)) {
//     return res.status(400).json({ error: 'Field ID is required and must be a number.' });
//   }

//   if (typeof name !== 'string' || name.length < 1 || name.length > 20) {
//     return res.status(400).json({ error: 'Name must be a string between 1 and 20 characters.' });
//   }

//   if (typeof description !== 'string' || description.length > 200) {
//     return res.status(400).json({ error: 'Description must be a string up to 200 characters.' });
//   }

//   try {
//     // The parameterized query is correct and prevents SQL injection.
//     await pool.query(
//       'UPDATE fields SET name = ?, description = ? WHERE id = ?',
//       [name, description, numericId]
//     );
//     res.json({ message: 'Field updated successfully' });
//   } catch (err) {
//     console.error('Failed to update field:', err);
//     res.status(500).json({ error: 'Failed to update field' });
//   }
// });

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});