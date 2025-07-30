import { Router } from 'express';
import * as postController from './controllers/postController.js';
import { getDb } from './database.js';

const router = Router();

// --- Post Routes ---
router.get('/posts', postController.getAllPosts);
router.get('/posts/:id', postController.getPostById);
router.post('/posts', postController.saveOrUpdatePost);
router.delete('/posts/:id', postController.deletePostById);

// --- Gemini API Proxy Routes ---
router.post('/gemini/generate-post-stream', postController.generatePostStream);
router.post('/gemini/regenerate-post-stream', postController.regeneratePostStream);
router.post('/gemini/fetch-product', postController.fetchProduct);
router.post('/gemini/generate-title', postController.generateTitleIdea);
router.post('/test-connection', postController.testConnection);

// --- Settings and API Key Routes ---
const SETTINGS_KEY = 'app_settings';

router.get('/settings', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.get('SELECT value FROM settings WHERE key = ?', SETTINGS_KEY);
    const defaultSettings = { 
        generalInstructions: '', 
        tone: '', 
        ctaText: 'Check Price', 
        footerText: 'As an affiliate, I earn from qualifying purchases. This does not affect the price you pay.' 
    };
    const savedSettings = result ? JSON.parse(result.value) : {};
    const settings = { ...defaultSettings, ...savedSettings };
    res.json(settings);
  } catch (e) {
    res.status(500).json({ message: 'Failed to get settings' });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const settings = req.body;
    await getDb().then(db => 
        db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', SETTINGS_KEY, JSON.stringify(settings))
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to save settings' });
  }
});

router.get('/api-key', async (req, res) => {
    try {
        const apiKey = process.env.API_KEY;
        res.json({ apiKey: apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE' ? 'SET' : null });
    } catch(e) {
        res.status(500).json({ message: 'Failed to check API key' });
    }
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
     res.status(200).json({ success: true, id });
  } else { // Create
    const newId = crypto.randomUUID();
    await db.run('INSERT INTO templates (id, name, prompt) VALUES (?, ?, ?)', newId, name, prompt);
    res.status(201).json({ success: true, id: newId });
  }
});

router.delete('/templates/:id', async (req, res) => {
  const { id } = req.params;
  const db = await getDb();
  await db.run('DELETE FROM templates WHERE id = ?', id);
  res.json({ success: true });
});

export default router;