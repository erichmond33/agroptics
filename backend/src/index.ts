import express, { Request, Response } from 'express';
import { pool } from './db';

const app = express();
const port = 3001;

app.use(express.json());

app.get('/api2', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS test');
    res.json({ message: 'Connected to MySQL', rows });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});