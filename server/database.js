import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_PATH, 'database.db');

// Ensure the data directory exists
if (!fs.existsSync(DB_PATH)) {
  fs.mkdirSync(DB_PATH, { recursive: true });
}

let db;

export const getDb = async () => {
  if (db) return db;

  db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database,
  });

  // Use CREATE TABLE IF NOT EXISTS for idempotent schema setup.
  // This is simpler than a full migration system for this app's scale.
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
    
  console.log('Database connected and tables ensured.');
  return db;
};