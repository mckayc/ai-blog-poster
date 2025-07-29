import { Router } from 'express';
import { getDb } from './database.js';
import { GoogleGenAI, Type } from "@google/genai";

const router = Router();

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
router.get('/api/settings', async (req, res) => {
  try {
    const generalSettings = await getSetting('general_settings') || '';
    res.json({ generalSettings });
  } catch (e) {
    res.status(500).json({ message: 'Failed to get settings' });
  }
});

router.post('/api/settings', async (req, res) => {
  try {
    const { generalSettings } = req.body;
    await setSetting('general_settings', generalSettings);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to save settings' });
  }
});

router.get('/api/api-key', async (req, res) => {
    try {
        const apiKey = await getSetting('gemini_api_key');
        res.json({ apiKey: apiKey ? '********' : null }); // Return placeholder for security
    } catch(e) {
        res.status(500).json({ message: 'Failed to check API key' });
    }
});


router.post('/api/api-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    await setSetting('gemini_api_key', apiKey);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to save API key' });
  }
});

router.post('/api/test-connection', async (req, res) => {
    try {
        const apiKey = await getSetting('gemini_api_key');
        if (!apiKey) {
            return res.status(400).json({ success: false, message: 'API Key not set.' });
        }
        const ai = new GoogleGenAI({ apiKey });
        await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Hello',
        });
        res.json({ success: true });
    } catch (e) {
        console.error("API Test Error:", e.message);
        res.status(400).json({ success: false, message: 'Connection failed. Please check your API key.' });
    }
});

// --- Template Routes ---
router.get('/api/templates', async (req, res) => {
  const db = await getDb();
  const templates = await db.all('SELECT * FROM templates ORDER BY name');
  res.json(templates);
});

router.post('/api/templates', async (req, res) => {
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

router.delete('/api/templates/:id', async (req, res) => {
  const { id } = req.params;
  const db = await getDb();
  await db.run('DELETE FROM templates WHERE id = ?', id);
  res.json({ success: true });
});

// --- Post Routes ---
router.get('/api/posts', async (req, res) => {
  const db = await getDb();
  let posts = await db.all('SELECT * FROM posts ORDER BY createdAt DESC');
  posts = posts.map(p => ({...p, products: JSON.parse(p.products)}));
  res.json(posts);
});

router.post('/api/posts', async (req, res) => {
    const { id, title, content, products, createdAt } = req.body;
    const db = await getDb();
    if (id) { // Update
        await db.run(
            'UPDATE posts SET title = ?, content = ?, products = ?, createdAt = ? WHERE id = ?', 
            title, content, JSON.stringify(products || []), createdAt, id
        );
    } else { // Create
        const newPost = {
            id: crypto.randomUUID(),
            title,
            content,
            products: JSON.stringify(products || []),
            createdAt: new Date().toISOString()
        };
        await db.run(
            'INSERT INTO posts (id, title, content, products, createdAt) VALUES (?, ?, ?, ?, ?)',
            newPost.id, newPost.title, newPost.content, newPost.products, newPost.createdAt
        );
    }
    res.status(201).json({ success: true });
});

router.delete('/api/posts/:id', async (req, res) => {
    const { id } = req.params;
    const db = await getDb();
    await db.run('DELETE FROM posts WHERE id = ?', id);
    res.json({ success: true });
});

// --- Gemini API Proxy Routes ---
router.post('/api/gemini/fetch-product', async (req, res) => {
    const { productUrl } = req.body;
    const apiKey = await getSetting('gemini_api_key');

    if (!apiKey) {
        return res.status(400).json({ message: "API key is not configured." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are an expert data extractor. Analyze the content of the provided URL and extract the product's title, price, a detailed description (summarize the key features and specifications if the description is long), and the primary high-resolution product image URL. URL: ${productUrl}. Respond ONLY with a single, minified JSON object with the keys: "title", "price", "description", "imageUrl". Do not include markdown 'json' block or any other text.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
                temperature: 0.0,
            }
        });
        const text = response.text.trim();
        const jsonMatch = text.match(/\{.*\}/s);
        if (!jsonMatch) {
            throw new Error("Invalid JSON response from AI.");
        }
        res.json(JSON.parse(jsonMatch[0]));
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Failed to fetch product data from the URL." });
    }
});

router.post('/api/gemini/generate-post', async (req, res) => {
    const { products, instructions, templatePrompt } = req.body;
    const apiKey = await getSetting('gemini_api_key');
    const generalSettings = await getSetting('general_settings') || '';

    if (!apiKey) {
        return res.status(400).json({ message: "API key is not configured." });
    }
    
    const ai = new GoogleGenAI({ apiKey });
    const productDetails = products.map((p, index) => `
        Product ${index + 1}:
        - Title: ${p.title}
        - Price: ${p.price}
        - Description: ${p.description}
        - Image URL: ${p.imageUrl}
        - Affiliate Link: ${p.affiliateLink}
    `).join('\\n');

    const defaultPrompt = `
        You are an expert blog writer specializing in product comparisons for platforms like WordPress and Blogger.
        Your task is to generate a comprehensive, engaging, and SEO-friendly blog post comparing the following products.

        **General Writing Style & Instructions from User:**
        {{GENERAL_SETTINGS}}

        **Specific Instructions for this post:**
        {{SPECIFIC_INSTRUCTIONS}}

        **Product Information:**
        {{PRODUCT_DETAILS}}

        **Output Requirements:**
        1.  Generate a compelling, SEO-friendly title for the blog post.
        2.  Write the blog post content in HTML format.
        3.  The HTML should be well-structured with headings (h2, h3), paragraphs (p), lists (ul, li), and bold tags (strong) to highlight key features.
        4.  Create a detailed comparison, discussing the pros and cons of each product.
        5.  Incorporate the affiliate links naturally within the text, for example, in a "Check Price" or "Buy Now" context using an anchor tag (<a>). Make sure the affiliate link is the href value. Use the product title or a call to action as the link text.
        6.  Conclude with a summary and a recommendation for different types of buyers.
        7.  The tone should be helpful, informative, and persuasive.
    `;
    
    let finalPrompt = (templatePrompt || defaultPrompt)
        .replace('{{PRODUCT_DETAILS}}', productDetails)
        .replace('{{GENERAL_SETTINGS}}', generalSettings || 'No general instructions provided.')
        .replace('{{SPECIFIC_INSTRUCTIONS}}', instructions || 'No specific instructions provided.');

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING }
        },
        required: ["title", "content"]
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: finalPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });
        const jsonText = response.text.trim();
        res.json(JSON.parse(jsonText));
    } catch (e) {
        console.error("Error generating blog post:", e);
        res.status(500).json({ message: "Failed to generate blog post." });
    }
});

export default router;
