import { GoogleGenAI, Type } from "@google/genai";
import { getDb } from '../database.js';

const getApiKey = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        throw new Error("API key is not configured in the .env file on the server.");
    }
    return apiKey;
};

const getGeneralSettings = async () => {
    const db = await getDb();
    const result = await db.get('SELECT value FROM settings WHERE key = ?', 'general_settings');
    return result?.value || '';
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

export const generateBlogPost = async (products, instructions, templatePrompt) => {
    const apiKey = getApiKey();
    const generalSettings = await getGeneralSettings();
    const ai = new GoogleGenAI({ apiKey });

    const productDetails = products.map((p, index) => `
        Product ${index + 1}:
        - Title: ${p.title}
        - Price: ${p.price}
        - Description: ${p.description}
        - Image URL: ${p.imageUrl}
        - Affiliate Link: ${p.affiliateLink}
    `).join('\n');

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
    
    console.log('--- FINAL PROMPT SENT TO GEMINI ---');
    console.log(finalPrompt);

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "The SEO-friendly title of the blog post." },
            content: { type: Type.STRING, description: "The full blog post content, formatted in valid HTML." }
        },
        required: ["title", "content"]
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: finalPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });
    
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};
