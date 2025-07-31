
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

// --- DB Initialization Logging START ---
console.log('--- Database Service Loaded ---');

// Define an absolute, fixed path for the data directory inside the container.
// This path MUST match the container-side path in the docker-compose.yml volume mapping (e.g., /path/on/host:/usr/src/app/data).
// Using a fixed path prevents issues with the container's working directory (CWD).
const DB_PATH = '/usr/src/app/data';
const DB_FILE = path.join(DB_PATH, 'database.db');

console.log(`[DB LOG] Using absolute DB Directory Path: ${DB_PATH}`);
console.log(`[DB LOG] Using absolute DB File Path: ${DB_FILE}`);

// Ensure the data directory exists at the absolute path
console.log(`[DB LOG] Checking if directory exists: ${DB_PATH}`);
if (!fs.existsSync(DB_PATH)) {
  console.log(`[DB LOG] Directory does not exist. Attempting to create...`);
  try {
    fs.mkdirSync(DB_PATH, { recursive: true });
    console.log(`[DB LOG] Successfully created directory: ${DB_PATH}`);
  } catch (error) {
    console.error(`[DB LOG] FATAL ERROR: Could not create directory: ${DB_PATH}`, error);
    // Let the error propagate to be caught by the server startup
    throw error;
  }
} else {
  console.log(`[DB LOG] Directory already exists.`);
}
// --- DB Initialization Logging END ---


let db;

const runMigrations = async (dbInstance) => {
    console.log('[DB LOG] Checking database schema for migrations...');
    try {
        const postsColumns = await dbInstance.all('PRAGMA table_info(posts)');
        if (!postsColumns.some(c => c.name === 'asins')) {
            console.log('[DB LOG] Missing "asins" column in "posts" table. Applying migration...');
            await dbInstance.exec('ALTER TABLE posts ADD COLUMN asins TEXT');
            console.log('[DB LOG] Successfully added "asins" column.');
        } else {
            console.log('[DB LOG] "asins" column already exists. No migration needed.');
        }
    } catch (error) {
        console.error('[DB LOG] Error running migrations:', error);
        throw error; // Propagate error to stop server startup if migration fails
    }
};

const seedInitialTemplates = async (dbInstance) => {
    const defaultTemplates = [
        { name: 'Versus (Standard)', prompt: 'Write a comprehensive blog post comparing Product 1 and Product 2. Cover their key features, performance, design, and value. Conclude with a recommendation for different types of users.' },
        { name: 'Top 3 List (Best Overall, Best Budget, Best Premium)', prompt: 'Create a "Top 3" listicle for the provided products. Identify the "Best Overall", "Best for Budget", and "Best Premium Option". Justify your choices with detailed explanations.' },
        { name: 'Top 5 List (Ranked)', prompt: 'Generate a ranked "Top 5" list of the given products. Start with an introduction, then present each product from #5 to #1, explaining its pros and cons. Conclude with a summary table.' },
        { name: 'Detailed Single Product Review', prompt: 'Write an in-depth review of the first product provided. Cover its design, features, performance, user experience, and who it\'s best for. If other products are provided, use them as points of comparison.' },
        { name: 'Problem/Solution Format', prompt: 'Structure the blog post in a "Problem/Solution" format. Start by describing a common problem the target audience faces. Then, present each product as a potential solution, explaining how its features address the problem.' },
        { name: 'Feature Deep-Dive Comparison', prompt: 'Instead of a general overview, do a deep-dive comparison of 2-3 specific features across all the products. For example, if they are cameras, compare only the "Image Quality", "Video Capabilities", and "Battery Life".' },
        { name: 'Beginner\'s Guide', prompt: 'Write a beginner\'s guide to this product category. Introduce the basic concepts, then explain how each of the provided products fits into the landscape for a newcomer.' },
        { name: 'Upgrade Guide (Is it worth it?)', prompt: 'Frame the post as an upgrade guide. Assume the reader owns an older version of this type of product. Compare the new products and help the reader decide if it\'s worth upgrading.' },
        { name: 'Myth vs. Fact', prompt: 'Structure the post around common myths or misconceptions in this product category. For each myth, present the facts and use the provided products to illustrate your points.' },
        { name: 'Checklist Style Buying Guide', prompt: 'Create a buying guide in a checklist format. List the most important factors to consider when buying this type of product, and then evaluate each of the provided products against that checklist.' },
        { name: 'For a Specific Niche (e.g., For Students)', prompt: 'Write the comparison specifically for a niche audience (e.g., students, travelers, remote workers, gamers). All comparisons and recommendations should be tailored to that audience\'s needs.' },
        { name: 'Pros and Cons Focus', prompt: 'The main focus of the article should be a clear, balanced "Pros and Cons" list for each product. Write a brief intro and conclusion, but the bulk of the content should be the pro/con lists.' },
        { name: 'Long-Term Review Perspective', prompt: 'Write the post from the perspective of a long-term review. Discuss not just the features, but also the potential durability, reliability, and long-term value of the products.' },
        { name: 'Head-to-Head Battle', prompt: 'Write the post as a "Head-to-Head Battle". Create distinct rounds for the comparison (e.g., Round 1: Design, Round 2: Performance). Declare a "winner" for each round and an overall champion.' },
        { name: 'Unboxing and First Impressions', prompt: 'Simulate an "unboxing and first impressions" post. Describe what it would be like to open each product for the first time, discussing the packaging, included accessories, and initial thoughts on the build quality.' },
        { name: 'The Ultimate Guide', prompt: 'Create "The Ultimate Guide" to choosing between these products. Make it highly detailed, covering every conceivable angle, from major features to minor details and software ecosystem.' },
        { name: 'Quick Roundup (Less Detail)', prompt: 'Generate a "Quick Roundup". The post should be shorter and more scannable. Use bullet points heavily and focus on the most important highlights of each product rather than deep detail.' },
        { name: 'Eco-Friendly / Sustainability Angle', prompt: 'Compare the products from an eco-friendly or sustainability perspective. Discuss materials, packaging, power efficiency, and the manufacturer\'s environmental policies, if known.' },
        { name: 'Gift Guide Format', prompt: 'Write the post as a gift guide. Frame the products as potential gifts and explain who the ideal recipient would be for each one (e.g., "For the Tech-Savvy Dad," "For the Creative Student").' },
        { name: 'Technical Deep-Dive for Experts', prompt: 'Write a highly technical comparison for an expert audience. Don\'t shy away from jargon or detailed specifications. Assume the reader is already very knowledgeable about the product category.' },
        { name: 'Value for Money Analysis', prompt: 'Focus the entire post on analyzing the "value for money" of each product. Compare their features directly against their price points to determine which offers the best bang for the buck.' }
    ];

    try {
        const countResult = await dbInstance.get('SELECT COUNT(*) as count FROM templates');
        if (countResult.count === 0) {
            console.log('[DB LOG] Templates table is empty. Seeding with default templates...');
            const stmt = await dbInstance.prepare('INSERT INTO templates (id, name, prompt) VALUES (?, ?, ?)');
            for (const t of defaultTemplates) {
                await stmt.run(crypto.randomUUID(), t.name, t.prompt);
            }
            await stmt.finalize();
            console.log(`[DB LOG] Successfully seeded ${defaultTemplates.length} templates.`);
        } else {
            console.log('[DB LOG] Templates table already has data. Skipping seed.');
        }
    } catch(error) {
         console.error('[DB LOG] Error seeding default templates:', error);
    }
};

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
        tags TEXT,
        asins TEXT
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
    
    // Run migrations before seeding
    await runMigrations(db);

    // Seed templates if necessary
    await seedInitialTemplates(db);

    // Final check to confirm the file exists on the filesystem
    if (fs.existsSync(DB_FILE)) {
        console.log(`[DB LOG] SUCCESS: Filesystem check confirms '${DB_FILE}' exists.`);
        console.log(`[DB LOG] Your database should now be visible in your mapped host directory.`);
    } else {
        console.error(`[DB LOG] CRITICAL FAILURE: Filesystem check shows '${DB_FILE}' does NOT exist after creation attempt. This is likely a Docker volume permission issue.`);
    }

    console.log('--- Database connection established and tables ensured. ---');
    return db;

  } catch (error) {
    console.error(`[DB LOG] FATAL ERROR during database initialization:`, error);
    // Re-throw the error to be caught by the server startup sequence
    throw error;
  }
};
