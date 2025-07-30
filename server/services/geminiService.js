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
      - Title for context: ${p.title}
      - Affiliate Link: ${p.affiliateLink}
      - Image URL: ${p.imageUrl}
      - Raw Description/Details: ${p.description}
    `).join('\n');
    
    const defaultUserPrompt = `
      Write a comprehensive and engaging blog post comparing the products provided.
      The structure should be:
      1. An introduction.
      2. A section for each product, including its image and a detailed description.
      3. A comparison table.
      4. A final recommendation.
    `;
    
    const toneInstruction = settings.tone 
        ? `The overall tone of the post must be: ${settings.tone}.`
        : 'The overall tone of the post must be neutral and informative.';

    const masterPrompt = `
      You are an expert blog writer specializing in creating beautiful, well-structured, and engaging product comparisons. Your primary task is to write a comparison blog post using the product data provided.

      You should use the user-provided template as a structural guide. However, if the template seems unrelated to comparing products, you MUST IGNORE it and write a standard, high-quality comparison post. The product comparison is always the most important goal.

      **User-Provided Template/Structure:**
      {{USER_PROMPT_TEMPLATE}}

      ---
      **CRITICAL OUTPUT RULES (MUST be followed):**
      1.  **JSON Output:** Your entire response must be a single, valid JSON object.
      2.  **JSON Schema:** The JSON object must have four keys: "title" (string), "heroImageUrl" (string), "content" (string), and "tags" (array of strings).
      3.  **Content Quality:** You MUST rewrite and summarize the provided product 'Raw Description/Details' and 'Title for context', creating original and engaging descriptions. Do NOT simply copy-paste text. Use the information to form your own high-quality, readable content. Poorly written Amazon descriptions must be improved.
      4.  **No Prices:** You MUST NOT include any specific prices in the content. Instead, guide the user to check the current price via an affiliate link.
      5.  **Hero Image:** For the "heroImageUrl", select the most visually appealing product image URL from the provided Product Information. This image will be the main banner for the post.
      6.  **SEO Tags:** For the "tags", generate an array of 5-7 relevant SEO keywords for the post (e.g., ["product type", "brand name", "comparison", "review"]).
      7.  **HTML Content:** The "content" value must be a string of well-structured HTML.
      8.  **In-Content Images:** For each product discussed in the HTML, you MUST embed its specific image BEFORE its description using an \`<img>\` tag. The image should have a descriptive alt text.
      9.  **Comparison Table:** The HTML MUST include a comparison table (\`<table>\`) that compares key features of the products side-by-side. The table should have columns like "Feature", "${products[0]?.title || 'Product 1'}", "${products[1]?.title || 'Product 2'}".
      10. **Affiliate Links:** Integrate affiliate links naturally. The primary link text should be the product's title (e.g., <a href="...">Sony WH-1000XM5</a>). For variety, you may occasionally use the text: "{{CTA_TEXT}}". Do not just say "click here".
      11. **Tone:** ${toneInstruction}
      12. **Footer:** The VERY LAST element in the HTML string MUST be a footer: \`<p class="footer-disclaimer">{{FOOTER_TEXT}}</p>\`.
      13. **Follow Instructions:** Adhere to all instructions from the 'Global Settings' and 'Specific Instructions' sections.

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
        .replace(/\{\{CTA_TEXT\}\}/g, settings.ctaText || 'Check latest price')
        .replace('{{FOOTER_TEXT}}', settings.footerText || '');
    
    console.log('--- FINAL PROMPT SENT TO GEMINI (STREAM) ---');
    // console.log(finalPrompt); // Keep this commented to avoid overly verbose logs
    
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          heroImageUrl: { type: Type.STRING },
          content: { type: Type.STRING },
          tags: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "heroImageUrl", "content", "tags"]
    };

    const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: finalPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });
    
    return response;
};

export const regenerateBlogPostStream = async (existingPost, newInstructions) => {
    const apiKey = getApiKey();
    const settings = await getSettings();
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
    You are an expert content editor. Your task is to rewrite the provided blog post based on the new instructions, providing a new title and new content.

    **New Instructions to apply:**
    ${newInstructions}

    ---
    **CRITICAL OUTPUT RULES (MUST be followed):**
    1.  **JSON Output:** Your entire response must be a single, valid JSON object.
    2.  **JSON Schema:** The JSON object must have two keys: "title" (string), and "content" (string).
    3.  **Rewrite Title & Content:** Rewrite the entire article content AND generate a new, fitting title based on the new instructions. The new title should reflect the changes requested.
    4.  **Preserve Core Info:** Preserve the core product information and affiliate links from the original article. The original products are: ${existingPost.products.map(p => p.title).join(', ')}.
    5.  **HTML Content:** The "content" value must be a string of well-structured HTML. Maintain good formatting.
    6.  **Footer:** After all other content, the VERY LAST element must be a footer: \`<p class="footer-disclaimer">${settings.footerText}</p>\`

    ---
    **ORIGINAL POST TO REWRITE:**
    \`\`\`json
    ${JSON.stringify({ title: existingPost.title, content: existingPost.content }, null, 2)}
    \`\`\`
    ---

    Now, provide the complete, rewritten JSON object based on the new instructions.
    `;

    console.log('--- REGENERATION PROMPT SENT TO GEMINI (STREAM) ---');
    // console.log(prompt); // Keep this commented to avoid overly verbose logs

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "The new, rewritten title for the blog post." },
          content: { type: Type.STRING, description: "The new, rewritten HTML content for the blog post." },
        },
        required: ["title", "content"]
    };

    const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });

    return response;
};