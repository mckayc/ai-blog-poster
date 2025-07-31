
import { Router } from 'express';
import * as postController from './controllers/postController.js';
import * as productController from './controllers/productController.js';
import * as templateService from './services/templateService.js';
import { getDb } from './database.js';

const router = Router();

// --- Post Routes ---
router.get('/posts', postController.getAllPosts);
router.get('/posts/:id', postController.getPostById);
router.post('/posts', postController.saveOrUpdatePost);
router.delete('/posts/:id', postController.deletePostById);
router.delete('/posts', postController.deleteMultiplePosts); // Bulk delete

// --- Product Routes ---
router.get('/products', productController.getAllProducts);
router.get('/products/categories', productController.getUniqueCategories);
router.post('/products', productController.createProduct);
router.get('/products/:id', productController.getProductById);
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);
router.delete('/products', productController.deleteMultipleProducts); // Bulk delete
router.post('/products/fetch-and-save', productController.fetchAndSaveProduct);


// --- Gemini API Proxy Routes ---
router.post('/gemini/generate-post-stream', postController.generatePostStream);
router.post('/gemini/generate-title', postController.generateTitleIdea);
router.post('/gemini/generate-tags', postController.generateTags);
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
  try {
    const templates = await templateService.getAllTemplates();
    res.json(templates);
  } catch (e) {
    console.error('Failed to get templates:', e);
    res.status(500).json({ message: 'Failed to get templates' });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const templateData = req.body;
    const result = await templateService.saveTemplate(templateData);
    const status = templateData.id ? 200 : 201;
    res.status(status).json(result);
  } catch (e) {
    console.error('Failed to save template:', e);
    res.status(500).json({ message: 'Failed to save template' });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await templateService.deleteTemplate(id);
    res.json(result);
  } catch (e) {
    console.error(`Failed to delete template with id ${req.params.id}:`, e);
    res.status(500).json({ message: 'Failed to delete template' });
  }
});

export default router;
