import { GoogleGenAI } from "@google/genai";
import { getDb } from '../database.js';

const getApiKey = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        throw new Error("API key is not configured in the .env file on the server.");
    }
    return apiKey;
};

const getSettings = async () => {
    const db = await getDb();
    const result = await db.get('SELECT value FROM settings WHERE key = ?', 'app_settings');
    const defaults = {
        generalInstructions: 'Write in a friendly, conversational tone.',
        tone: 'friendly',
        ctaText: 'Check Price',
        footerText: 'As an affiliate, I earn from qualifying purchases. This does not affect the price you pay.'
    };
    const saved = result ? JSON.parse(result.value) : {};
    return { ...defaults, ...saved };
}

export const testApiKey = async () => {
    try {
        const apiKey = getApiKey();
        const ai = new GoogleGenAI({ apiKey });
        await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Hello',
        });
        return true;
    } catch (error) {
        console.error("API Key test failed:", error.message);
        return false;
    }
};

export const fetchProductData = async (productUrl) => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are an expert data extractor. Analyze the content of the provided URL and extract the product's title, price, a detailed description (summarize the key features and specifications if the description is long), and the primary high-resolution product image URL. URL: ${productUrl}. Respond ONLY with a single, minified JSON object with the keys: "title", "price", "description", "imageUrl". Do not include markdown 'json' block or any other text.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
            temperature: 0.0,
        }
    });
    const text = response.text.trim();
    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) {
        throw new Error("Invalid JSON response from AI. Could not find a JSON object.");
    }
    return JSON.parse(jsonMatch[0]);
};


export const generateBlogPostStream = async (products, instructions, templatePrompt) => {
    const apiKey = getApiKey();
    const settings = await getSettings();
    const ai = new GoogleGenAI({ apiKey });

    const productDetails = products.map((p, index) => `
      Product ${index + 1}:
      - Title: ${p.title}
      - Affiliate Link: ${p.affiliateLink}
      - Details: ${p.description}
      - Price: ${p.price}
    `).join('\n');

    const defaultPrompt = `
      You are an expert blog writer. Your output MUST be valid, well-structured HTML.

      **CRITICAL OUTPUT RULES:**
      1.  The VERY FIRST element in the HTML you generate MUST be an \`<h1>\` tag containing a compelling, SEO-friendly title for the post.
      2.  Whenever you mention a product by its title (or a close variation), you MUST wrap a related call-to-action in an anchor tag (\`<a>\`) with the 'href' attribute set to its corresponding affiliate link. The link text MUST be exactly: "{{CTA_TEXT}}".
          Example: "The Super-Widget 5000 is great for beginners. <a href="...affiliate_link_here...">{{CTA_TEXT}}</a>"
          Do NOT just list the links. Integrate them naturally after mentioning the product.
      3.  The overall tone of the post must be: ${settings.tone}.
      4.  Structure the post with headings (h2, h3), paragraphs (p), and lists (ul, li). Use bold tags (strong) for emphasis.
      5.  Include a detailed comparison, pros and cons, and a final recommendation.
      6.  Follow all instructions in the 'General Writing Style' and 'Specific Instructions' sections below.

      ---
      **GENERAL WRITING STYLE:**
      {{GENERAL_SETTINGS}}
      
      **SPECIFIC INSTRUCTIONS FOR THIS POST:**
      {{SPECIFIC_INSTRUCTIONS}}
      ---

      **PRODUCT INFORMATION TO USE:**
      {{PRODUCT_DETAILS}}
      
      ---
      **FINAL STEP: FOOTER**
      After the entire blog post content is written, append the following footer text. It must be the absolute last part of the output. Wrap it in a paragraph tag with a 'footer-disclaimer' class like this: <p class="footer-disclaimer">{{FOOTER_TEXT}}</p>
    `;
    
    let finalPrompt = (templatePrompt || defaultPrompt)
        .replace('{{PRODUCT_DETAILS}}', productDetails)
        .replace('{{GENERAL_SETTINGS}}', settings.generalInstructions || 'No general instructions provided.')
        .replace('{{SPECIFIC_INSTRUCTIONS}}', instructions || 'No specific instructions provided.')
        .replace(/\{\{CTA_TEXT\}\}/g, settings.ctaText || 'Check Price')
        .replace('{{FOOTER_TEXT}}', settings.footerText || '');
    
    console.log('--- FINAL PROMPT SENT TO GEMINI (STREAM) ---');
    console.log(finalPrompt);

    const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: finalPrompt
    });
    
    return response;
};