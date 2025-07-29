import { Router } from 'express';
import * as postController from './controllers/postController.js';

// This is a placeholder for future controllers for other resources.
// import * as templateController from './controllers/templateController.js';
// import * as settingsController from './controllers/settingsController.js';

const router = Router();

// --- Post Routes ---
router.get('/posts', postController.getAllPosts);
router.post('/posts', postController.saveOrUpdatePost);
router.delete('/posts/:id', postController.deletePostById);

// --- Gemini API Proxy Routes ---
router.post('/gemini/generate-post', postController.generatePost);
router.post('/gemini/fetch-product', postController.fetchProduct);
router.post('/test-connection', postController.testConnection);

// --- Settings, API Key, and Template routes are omitted for this refactoring pass ---
// --- but would follow the same controller/service pattern. ---

// For now, we'll keep the non-post routes here for simplicity,
// but they should be moved to their own controllers as the app grows.

import { getDb } from './database.js';

// Helper to get/set settings
const getSetting = async (key) => {
  const db = await getDb();
  const result = await db.get('SELECT value FROM settings WHERE key = ?', key);
  return result?.value;
};

const setSetting = async (key, value) => {
  const db = await getDb();
  await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
};


// --- Settings and API Key Routes ---
router.get('/settings', async (req, res) => {
  try {
    const generalSettings = await getSetting('general_settings') || '';
    res.json({ generalSettings });
  } catch (e) {
    res.status(500).json({ message: 'Failed to get settings' });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const { generalSettings } = req.body;
    await setSetting('general_settings', generalSettings);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to save settings' });
  }
});

router.get('/api-key', async (req, res) => {
    try {
        const apiKey = process.env.API_KEY;
        res.json({ apiKey: apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE' ? '********' : null });
    } catch(e) {
        res.status(500).json({ message: 'Failed to check API key' });
    }
});


router.post('/api-key', async (req, res) => {
  res.status(501).json({ message: 'API Key must be set in the .env file on the server. This endpoint is disabled.'})
});

// --- Template Routes ---
router.get('/templates', async (req, res) => {
  const db = await getDb();
  const templates = await db.all('SELECT * FROM templates ORDER BY name');
  res.json(templates);
});

router.post('/templates', async (req, res) => {
  const { id, name, prompt } = req.body;
  const db = await getDb();
  if (id) { // Update
    await db.run('UPDATE templates SET name = ?, prompt = ? WHERE id = ?', name, prompt, id);
  } else { // Create
    const newId = crypto.randomUUID();
    await db.run('INSERT INTO templates (id, name, prompt) VALUES (?, ?, ?)', newId, name, prompt);
  }
  res.status(201).json({ success: true });
});

router.delete('/templates/:id', async (req, res) => {
  const { id } = req.params;
  const db = await getDb();
  await db.run('DELETE FROM templates WHERE id = ?', id);
  res.json({ success: true });
});


export default router;
