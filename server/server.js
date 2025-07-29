import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDb } from './database.js';
import apiRoutes from './routes.js';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database
getDb().catch(err => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});

// Middleware
app.use(cors());
app.use(express.json()); // Use express's built-in JSON parser

// API Routes
app.use('/api', apiRoutes);

// Serve static files from the React app
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});


app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});