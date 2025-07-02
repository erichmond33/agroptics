"use strict";
// import { Request, Response } from 'express';
// import pool from '../db';
// import { Field } from '../types';
// export const createField = async (req: Request, res: Response) => {
//   const { name, description, geojson } = req.body;
//   const userId = 1; // Default user
//   try {
//     const [result] = await pool.query<mysql.ResultSetHeader>(
//       'INSERT INTO fields (user_id, name, description, geojson) VALUES (?, ?, ?, ?)',
//       [userId, name, description, JSON.stringify(geojson)]
//     );
//     res.status(201).json({ id: result.insertId, name, description, geojson });
//   } catch (error) {
//     res.status(500).json({ error: 'Database error' });
//   }
// };
// export const getFields = async (req: Request, res: Response) => {
//   try {
//     const [rows] = await pool.query<Field[]>('SELECT * FROM fields');
//     res.json(rows);
//   } catch (error) {
//     res.status(500).json({ error: 'Database error' });
//   }
// };
