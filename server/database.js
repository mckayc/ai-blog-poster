import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

// --- DB Initialization Logging START ---
console.log('--- Database Service Loaded ---');
const CWD = process.cwd();
console.log(`[DB LOG] Current Working Directory: ${CWD}`);

const DB_PATH = path.join(CWD, 'data');
const DB_FILE = path.join(DB_PATH, 'database.db');

console.log(`[DB LOG] Resolved DB Directory Path: ${DB_PATH}`);
console.log(`[DB LOG] Resolved DB File Path: ${DB_FILE}`);

// Ensure the data directory exists
console.log(`[DB LOG] Checking if directory exists: ${DB_PATH}`);
if (!fs.existsSync(DB_PATH)) {
  console.log(`[DB LOG] Directory does not exist. Attempting to create...`);
  try {
    fs.mkdirSync(DB_PATH, { recursive: true });
    console.log(`[DB LOG] Successfully created directory: ${DB_PATH}`);
  } catch (error) {
    console.error(`[DB LOG] FATAL ERROR: Could not create directory: ${DB_PATH}`, error);
    // Let the error propagate to be caught by the server startup
  }
} else {
  console.log(`[DB LOG] Directory already exists.`);
}
// --- DB Initialization Logging END ---


let db;

export const getDb = async () => {
  if (db) {
    return db;
  }

  try {
    console.log(`[DB LOG] Attempting to open/create database file at: ${DB_FILE}`);
    db = await open({
      filename: DB_FILE,
      driver: sqlite3.Database,
    });
    console.log(`[DB LOG] Database file opened successfully.`);

    console.log(`[DB LOG] Running table creation queries (CREATE TABLE IF NOT EXISTS)...`);
    // Use CREATE TABLE IF NOT EXISTS for idempotent schema setup.
    await db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        name TEXT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        products TEXT,
        createdAt TEXT NOT NULL,
        heroImageUrl TEXT,
        tags TEXT
      );

      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        prompt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        title TEXT,
        productUrl TEXT UNIQUE,
        imageUrl TEXT,
        price TEXT,
        description TEXT,
        brand TEXT,
        affiliateLink TEXT,
        category TEXT,
        tags TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );
    `);
      
    console.log('[DB LOG] All tables checked/created successfully.');
    console.log('--- Database connection established and tables ensured. ---');
    return db;

  } catch (error) {
    console.error(`[DB LOG] FATAL ERROR during database initialization:`, error);
    // Re-throw the error to be caught by the server startup sequence
    throw error;
  }
};