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
    // Migration 1: Add 'name' column to posts table
    const columns = await dbInstance.all('PRAGMA table_info(posts)');
    const hasNameColumn = columns.some(c => c.name === 'name');
    if (!hasNameColumn) {
        console.log("Running migration: Adding 'name' column to 'posts' table.");
        await dbInstance.exec('ALTER TABLE posts ADD COLUMN name TEXT');
        // Backfill name with existing title for old records
        await dbInstance.exec('UPDATE posts SET name = title WHERE name IS NULL');
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
      createdAt TEXT NOT NULL
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