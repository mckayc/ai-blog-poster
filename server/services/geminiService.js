import { GoogleGenAI, Type } from "@google/genai";
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
        tone: '',
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

export const generateTitleIdea = async (products) => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const productTitles = products.map(p => p.title).join(', ');

    const prompt = `You are an expert copywriter. Based on the following products, generate 3 compelling, SEO-friendly blog post titles. The user wants to compare these products.

Products: ${productTitles}

Respond ONLY with a single, minified JSON array of strings, like ["Title 1", "Title 2", "Title 3"]. Do not include any other text or markdown.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });

    return JSON.parse(response.text.trim());
};


export const generateBlogPostStream = async (products, instructions, templatePrompt) => {
    const apiKey = getApiKey();
    const settings = await getSettings();
    const ai = new GoogleGenAI({ apiKey });

    const productDetails = products.map((p, index) => `
      Product ${index + 1}:
      - Brand: ${p.brand || 'N/A'}
      - Title: ${p.title}
      - Affiliate Link: ${p.affiliateLink}
      - Details: ${p.description}
      - Price: ${p.price}
    `).join('\n');
    
    const defaultUserPrompt = `
      Write a comprehensive and engaging blog post comparing the products provided.
      - Create a detailed comparison, discussing the pros and cons of each product.
      - Incorporate the affiliate links naturally within the text.
      - Conclude with a summary and a recommendation for different types of buyers.
    `;
    
    const toneInstruction = settings.tone 
        ? `The overall tone of the post must be: ${settings.tone}.`
        : 'The overall tone of the post must be neutral and informative.';

    const masterPrompt = `
      You are an expert blog writer specializing in product comparisons. Your primary task is to write an engaging and informative comparison blog post using the product data provided.

      You should use the following user-provided template as a structural guide for your post. However, if the template seems unrelated to comparing the provided products, you MUST ignore the template's specific instructions and write a standard comparison post that includes an introduction, a detailed look at each product, a comparison section (like a table or pros/cons), and a final recommendation. The product comparison is always the most important goal.

      **User-Provided Template/Structure:**
      {{USER_PROMPT_TEMPLATE}}

      ---
      **CRITICAL OUTPUT RULES (MUST be followed regardless of the template):**
      1.  The VERY FIRST element in the HTML you generate MUST be an \`<h1>\` tag containing a compelling, SEO-friendly title for the post.
      2.  Your output MUST be valid, well-structured HTML, using headings (h2, h3), paragraphs (p), and lists (ul, li). Use bold tags (strong) for emphasis.
      3.  Whenever you mention a product, you MUST integrate its affiliate link naturally. The link text for the affiliate link MUST be exactly: "{{CTA_TEXT}}".
          Example: "The Super-Widget 5000 is great for beginners. <a href="...affiliate_link_here...">{{CTA_TEXT}}</a>"
      4.  ${toneInstruction}
      5.  Follow all instructions in the 'Global Settings' and 'Specific Instructions' sections below.
      6.  After all other content, the VERY LAST element must be a footer: <p class="footer-disclaimer">{{FOOTER_TEXT}}</p>

      ---
      **Global Settings (General Writing Style):**
      {{GENERAL_SETTINGS}}
      
      **Specific Instructions for This Post:**
      {{SPECIFIC_INSTRUCTIONS}}
      ---

      **Product Information to Use:**
      {{PRODUCT_DETAILS}}
    `;
    
    let finalPrompt = masterPrompt
        .replace('{{USER_PROMPT_TEMPLATE}}', templatePrompt || defaultUserPrompt)
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

export const regenerateBlogPostStream = async (existingContent, newInstructions) => {
    const apiKey = getApiKey();
    const settings = await getSettings();
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert content editor. Your task is to rewrite the provided HTML blog post based on the new instructions.

    **New Instructions:**
    ${newInstructions}

    **RULES:**
    1.  Rewrite the entire article, do not just add to it or comment on it.
    2.  Your output MUST be the full, rewritten article in valid HTML.
    3.  The VERY FIRST element of your output MUST be an \`<h1>\` tag with the post's title.
    4.  Preserve the core product information and affiliate links from the original article.
    5.  Adhere to the new instructions to modify the tone, structure, or content.
    6.  After all other content, the VERY LAST element must be a footer: <p class="footer-disclaimer">${settings.footerText}</p>

    ---
    **ORIGINAL HTML ARTICLE TO REWRITE:**
    \`\`\`html
    ${existingContent}
    \`\`\`
    ---

    Now, provide the complete, rewritten HTML based on the new instructions.
    `;

    console.log('--- REGENERATION PROMPT SENT TO GEMINI (STREAM) ---');
    console.log(prompt);

    const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    return response;
};