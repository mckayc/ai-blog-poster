import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_PATH, 'database.db');

// Ensure the data directory exists
if (!fs.existsSync(DB_PATH)) {
  fs.mkdirSync(DB_PATH);
}

let db;

// Basic migration logic
const runMigrations = async (dbInstance) => {
    const columns = await dbInstance.all('PRAGMA table_info(posts)');
    
    // Migration 1: Add 'name' column
    if (!columns.some(c => c.name === 'name')) {
        console.log("Running migration: Adding 'name' column to 'posts' table.");
        await dbInstance.exec('ALTER TABLE posts ADD COLUMN name TEXT');
        await dbInstance.exec('UPDATE posts SET name = title WHERE name IS NULL');
    }

    // Migration 2: Add 'heroImageUrl' column
    if (!columns.some(c => c.name === 'heroImageUrl')) {
        console.log("Running migration: Adding 'heroImageUrl' column to 'posts' table.");
        await dbInstance.exec('ALTER TABLE posts ADD COLUMN heroImageUrl TEXT');
    }

    // Migration 3: Add 'tags' column
    if (!columns.some(c => c.name === 'tags')) {
        console.log("Running migration: Adding 'tags' column to 'posts' table.");
        await dbInstance.exec('ALTER TABLE posts ADD COLUMN tags TEXT');
    }
}

export const getDb = async () => {
  if (db) return db;

  db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database,
  });

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
  `);
    
  // Run migrations after ensuring tables exist
  await runMigrations(db);

  console.log('Database connected and tables ensured.');
  return db;
};