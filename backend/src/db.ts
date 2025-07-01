import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: 'db', // Matches docker-compose service name
  user: 'admin',
  password: 'password',
  database: 'geo_weather',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});