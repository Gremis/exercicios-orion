const express = require('express');
const { Pool } = require('pg');

const app = express();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionTimeoutMillis: 5000,
  query_timeout: 5000,
});

pool.on('error', () => {
  console.error('An idle database connection failed.');
});

app.use(express.json());

app.get('/health', async (request, response) => {
  try {
    await pool.query('SELECT 1');
    response.status(200).json({ status: 'ok' });
  } catch {
    response.status(503).json({ status: 'error' });
  }
});

app.post('/notes', async (request, response) => {
  const content = request.body?.content;

  if (typeof content !== 'string' || content.trim().length === 0) {
    return response.status(400).json({ error: 'Content must be a non-empty string.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO notes (content) VALUES ($1) RETURNING id, content',
      [content.trim()],
    );
    response.status(201).json(result.rows[0]);
  } catch {
    response.status(503).json({ error: 'Database operation failed.' });
  }
});

app.get('/notes', async (request, response) => {
  try {
    const result = await pool.query('SELECT id, content FROM notes ORDER BY id');
    response.status(200).json(result.rows);
  } catch {
    response.status(503).json({ error: 'Database operation failed.' });
  }
});

app.use((error, request, response, next) => {
  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({ error: 'Invalid JSON body.' });
  }

  if (error.type === 'entity.too.large') {
    return response.status(413).json({ error: 'Request body is too large.' });
  }

  response.status(500).json({ error: 'Internal server error.' });
});

async function start() {
  const requiredVariables = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME'];

  if (requiredVariables.some((name) => !process.env[name])) {
    throw new Error('Database configuration is incomplete.');
  }

  await pool.query(
    'CREATE TABLE IF NOT EXISTS notes (id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, content TEXT NOT NULL)',
  );

  await new Promise((resolve, reject) => {
    const server = app.listen(3000, '0.0.0.0', resolve);
    server.on('error', reject);
  });
}

start().catch(() => {
  console.error('Application initialization failed.');
  process.exit(1);
});
