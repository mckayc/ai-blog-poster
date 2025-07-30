
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
    const prompt = `You are an expert data extractor. Analyze the content of the provided URL and extract the product's title, brand, price, a detailed description (summarize the key features and specifications if the description is long), and the primary high-resolution product image URL. URL: ${productUrl}. Respond ONLY with a single, minified JSON object with the keys: "title", "brand", "price", "description", "imageUrl". Do not include markdown 'json' block or any other text.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
            temperature: 0.0,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    brand: { type: Type.STRING },
                    price: { type: Type.STRING },
                    description: { type: Type.STRING },
                    imageUrl: { type: Type.STRING },
                },
                required: ["title", "brand", "price", "description", "imageUrl"]
            }
        }
    });
    return JSON.parse(response.text.trim());
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


export const generateBlogPostStream = async (products, instructions, templatePrompt, includeComparisonCards) => {
    const apiKey = getApiKey();
    const settings = await getSettings();
    const ai = new GoogleGenAI({ apiKey });

    const productDetails = products.map((p, index) => `
      Product ${index + 1}:
      - Name/Title: ${p.name || p.title}
      - Brand: ${p.brand || 'N/A'}
      - Affiliate Link: ${p.affiliateLink}
      - Image URL: ${p.imageUrl}
      - Raw Description/Details: ${p.description}
    `).join('\n');
    
    const toneInstruction = settings.tone 
        ? `The overall tone of the post must be: ${settings.tone}.`
        : 'The overall tone of the post must be neutral and informative.';

    const comparisonCardHtml = `A 'Comparison Card' is a self-contained HTML table used to compare a single feature. You MUST use this format to ensure it displays correctly in all editors.
Example for one feature:
<table style="width:100%; border-collapse: separate; border-spacing: 0; background-color: #2d3748; border-radius: 8px; margin-bottom: 12px; border: 1px solid #4a5568; font-family: sans-serif;">
  <thead>
    <tr>
      <th colspan="2" style="padding: 12px 16px; font-size: 1rem; color: #a0aec0; font-weight: normal; border-bottom: 1px solid #4a5568; text-align: left;">Feature Name (e.g., Screen Size)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 16px; text-align: center; width: 50%; vertical-align: top; border-right: 1px solid #4a5568;">
        <p style="margin: 0; font-size: 1.1rem; color: #ffffff; font-weight: bold;">Value for Product 1</p>
        <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: #a0aec0;">Product 1 Name</p>
      </td>
      <td style="padding: 16px; text-align: center; width: 50%; vertical-align: top;">
        <p style="margin: 0; font-size: 1.1rem; color: #ffffff; font-weight: bold;">Value for Product 2</p>
        <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: #a0aec0;">Product 2 Name</p>
      </td>
    </tr>
  </tbody>
</table>
You MUST generate one of these tables for each key feature.`;

    const comparisonInstruction = includeComparisonCards
        ? `**Specification Comparison Section using TABLE-BASED CARDS:**
After the individual product sections, you MUST create a 'Specification Comparison' section.
This section MUST use the 'Comparison Card' format defined above, which uses styled HTML tables for maximum compatibility. Do NOT use a standard, plain HTML table grid for this if cards are requested. Generate one styled table card per feature.
${comparisonCardHtml}`
        : `**Comparison Table:**
After the individual product sections, you MUST include a comparison table.
The table MUST be styled with inline CSS. Use \`<table style="width: 100%; border-collapse: collapse;">\`. Table header cells (\`<th>\`) should be styled with \`style="border: 1px solid #cccccc; padding: 12px; text-align: left; background-color: #f2f2f2; color: #333333; font-weight: bold;"\`. Standard table cells (\`<td>\`) should be styled with \`style="border: 1px solid #cccccc; padding: 12px; text-align: left; vertical-align: top;"\`.`;


    const defaultPromptTemplate = `
      You are an expert blog writer specializing in creating beautiful, well-structured, and engaging product comparisons that can be easily pasted into platforms like WordPress or Blogger.

      ---
      **CRITICAL OUTPUT RULES (MUST be followed):**
      1.  **JSON Output:** Your entire response must be a single, valid JSON object.
      2.  **JSON Schema:** The JSON object must have four keys: "title" (string), "heroImageUrl" (string), "content" (string), and "tags" (array of strings).
      3.  **Title Generation:** You MUST generate a new, compelling, SEO-friendly title for the blog post that reflects a comparison, such as "Product A vs. Product B: Which is Best for You?". Do NOT just use a single product's title.
      4.  **Content Quality:** You MUST rewrite and summarize the provided product 'Raw Description/Details' and 'Name/Title', creating original and engaging descriptions. Do NOT simply copy-paste text. Poorly written Amazon descriptions must be improved.
      5.  **No Prices:** You MUST NOT include any specific prices in the content. Instead, guide the user to check the current price via an affiliate link.
      6.  **Hero Image:** For the "heroImageUrl", select the most visually appealing product image URL from the provided Product Information. This image will be the main banner for the post.
      7.  **SEO Tags:** For the "tags", generate an array of 5-7 relevant SEO keywords for the post (e.g., ["product type", "brand name", "comparison", "review"]).
      8.  **HTML Content & Styling:** The "content" value must be a string of clean, well-structured HTML. Use inline CSS styles for formatting like borders, padding, and background colors to ensure the post looks good when pasted into external platforms. Do not use <style> tags or CSS classes. When using blockquotes, style them with a left border and padding using inline CSS (e.g., style="border-left: 4px solid #cccccc; padding-left: 1rem; margin-left: 1rem; font-style: italic;").
      9.  **In-Content Images:** For each product discussed in the HTML, you MUST embed its specific image BEFORE its description using an \`<img>\` tag. The image should have a descriptive alt text.
      10. **Comparison Format:** You MUST generate a comparison section using the format specified in the {{COMPARISON_FORMAT_INSTRUCTION}} section below.
      11. **Affiliate Links:** Integrate affiliate links naturally. The primary link text should be the product's title (e.g., <a href="...">Sony WH-1000XM5</a>). For variety, you may occasionally use the text: "{{CTA_TEXT}}". Do not just say "click here".
      12. **Tone:** ${toneInstruction}
      13. **Footer:** The VERY LAST element in the HTML string MUST be a footer: \`<p style="font-size: small; color: #888888; text-align: center;">{{FOOTER_TEXT}}</p>\`.
      14. **Follow Instructions:** Adhere to all instructions from the 'Global Settings' and 'Specific Instructions' sections.

      ---
      **Core Task:**
      {{USER_PROVIDED_TEMPLATE_TASK}}

      The blog post structure should be:
      1. An introduction that grabs the reader's attention.
      2. A detailed section for each product, including its image and a well-written description.
      {{COMPARISON_FORMAT_INSTRUCTION}}
      3. A final "Verdict" or "Recommendation" section summarizing which product is best for different types of users.
      ---

      **Global Settings (General Writing Style):**
      {{GENERAL_SETTINGS}}
      
      **Specific Instructions for This Post:**
      {{SPECIFIC_INSTRUCTIONS}}
      ---

      **Product Information to Use:**
      {{PRODUCT_DETAILS}}
    `;
    
    // If a user template is provided, use it. Otherwise, use the default task.
    const task = templatePrompt || `Write a comprehensive and engaging blog post comparing the products provided.`;
    
    let finalPrompt = defaultPromptTemplate
        .replace('{{USER_PROVIDED_TEMPLATE_TASK}}', task)
        .replace(/\{\{COMPARISON_FORMAT_INSTRUCTION\}\}/g, comparisonInstruction)
        .replace('{{PRODUCT_DETAILS}}', productDetails)
        .replace('{{GENERAL_SETTINGS}}', settings.generalInstructions || 'No general instructions provided.')
        .replace('{{SPECIFIC_INSTRUCTIONS}}', instructions || 'No specific instructions provided.')
        .replace(/\{\{CTA_TEXT\}\}/g, settings.ctaText || 'Check latest price')
        .replace('{{FOOTER_TEXT}}', settings.footerText || '');
    
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