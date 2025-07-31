
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

export const generateTags = async (title, content) => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `You are an SEO expert. Based on the following blog post title and a snippet of its content, generate an array of 5-7 relevant SEO tags.

Title: ${title}
Content Snippet: ${content.substring(0, 500)}...

Respond ONLY with a single, minified JSON array of strings, like ["tag1", "tag2", "tag3"]. Do not include any other text or markdown.`;

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


export const generateBlogPost = async (options) => {
    const {
        products,
        instructions,
        templatePrompt,
        introductionStyle,
        introductionTone,
        descriptionStyle,
        descriptionTone,
        comparisonCards,
        photoComparison
    } = options;

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
    
    // --- Dynamic Section Generation ---
    const getComparisonCardsHtml = () => `
        <h2 style="font-size: 1.5rem; font-weight: bold; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 24px; margin-bottom: 16px;">Specification Comparison</h2>
        <!-- A 'Comparison Card' is a self-contained HTML table used to compare a single feature. You MUST use this format to ensure it displays correctly in all editors. -->
        <!-- Example for one feature:
        <table style="width:100%; border-collapse: separate; border-spacing: 0; background-color: #f9fafb; border-radius: 8px; margin-bottom: 12px; border: 1px solid #e5e7eb; font-family: sans-serif;">
          <thead>
            <tr><th colspan="2" style="padding: 12px 16px; font-size: 1rem; color: #6b7280; font-weight: normal; border-bottom: 1px solid #e5e7eb; text-align: left;">Feature Name (e.g., Screen Size)</th></tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 16px; text-align: center; width: 50%; vertical-align: top; border-right: 1px solid #e5e7eb;"><p style="margin: 0; font-size: 1.1rem; color: #111827; font-weight: bold;">Value for Product 1</p><p style="margin: 4px 0 0 0; font-size: 0.8rem; color: #6b7280;">Product 1 Name</p></td>
              <td style="padding: 16px; text-align: center; width: 50%; vertical-align: top;"><p style="margin: 0; font-size: 1.1rem; color: #111827; font-weight: bold;">Value for Product 2</p><p style="margin: 4px 0 0 0; font-size: 0.8rem; color: #6b7280;">Product 2 Name</p></td>
            </tr>
          </tbody>
        </table>
        -->
        <!-- You MUST generate one of these styled table cards for each key feature to compare. -->
    `;
    
    const getPhotoComparisonHtml = () => `
        <h2 style="font-size: 1.5rem; font-weight: bold; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 24px; margin-bottom: 16px;">At a Glance</h2>
        <div style="display:flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-bottom: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
            ${products.map(p => `
            <div style="text-align: center; max-width: 200px;">
                <a href="${p.affiliateLink || '#'}" style="text-decoration: none;">
                    <img src="${p.imageUrl}" alt="${p.name}" style="width: 200px; height: 200px; object-fit: contain; border-radius: 8px; border: 1px solid #e5e7eb;" />
                </a>
                <p style="margin: 8px 0 0 0; font-size: 0.8rem; color: #6b7280;">${p.brand || ''}</p>
                <h4 style="margin: 4px 0 0 0; font-size: 1rem; color: #1f2937;">
                    <a href="${p.affiliateLink || '#'}" style="color: #1f2937; text-decoration: none;">${p.name}</a>
                </h4>
            </div>
            `).join('')}
        </div>
    `;

    let placement = { beginning: '', middle: '', end: '' };
    if (photoComparison.enabled) {
        const html = getPhotoComparisonHtml();
        if(photoComparison.placement.beginning) placement.beginning += html;
        if(photoComparison.placement.middle) placement.middle += html;
        if(photoComparison.placement.end) placement.end += html;
    }
    if (comparisonCards.enabled) {
        const html = getComparisonCardsHtml();
        if(comparisonCards.placement.beginning) placement.beginning += html;
        if(comparisonCards.placement.middle) placement.middle += html;
        if(comparisonCards.placement.end) placement.end += html;
    }

    const mainPrompt = `
      You are an expert blog writer specializing in creating beautiful, well-structured, and engaging product comparisons that can be easily pasted into platforms like WordPress or Blogger.

      ---
      **CRITICAL OUTPUT RULES (MUST be followed):**
      1.  **JSON Output:** Your entire response must be a single, valid JSON object with four keys: "title" (string), "heroImageUrl" (string), "content" (string), and "tags" (array of strings).
      2.  **Title Generation:** Generate a new, compelling, SEO-friendly title for the blog post that reflects a comparison.
      3.  **Content Quality:** You MUST rewrite and summarize the provided 'Raw Description/Details'. Do NOT simply copy-paste text. Poorly written Amazon descriptions must be improved.
      4.  **No Prices:** Do NOT include specific prices in the content. Instead, guide the user to check the current price via an affiliate link.
      5.  **Hero Image:** For "heroImageUrl", select the most visually appealing product image URL from the provided Product Information.
      6.  **SEO Tags:** For "tags", generate an array of 5-7 relevant SEO keywords for the post.
      7.  **HTML Content & Styling (LIGHT THEME):** The "content" value must be a string of clean, well-structured HTML. Use inline CSS for styling to ensure compatibility with a standard light-background editor (like WordPress). Use dark text colors (e.g., #1f2937, #374151) and standard blue links (e.g., #2563eb).
      8.  **In-Content Images:** For each product discussed, embed its specific image BEFORE its description using an \`<img>\` tag.
      9.  **Affiliate Links:** Integrate affiliate links naturally. The primary link text should be the product's title (e.g., <a href="...">Sony WH-1000XM5</a>). For variety, use the text: "{{CTA_TEXT}}".
      10. **Footer:** The VERY LAST element in the HTML string MUST be a footer: \`<p style="font-size: small; color: #6b7280; text-align: center;">{{FOOTER_TEXT}}</p>\`.
      11. **Follow ALL Instructions:** Adhere to all instructions for each section.

      ---
      **CONTENT STRUCTURE & INSTRUCTIONS**

      **Core Task:**
      {{USER_PROVIDED_TEMPLATE_TASK}}
      
      The blog post's final HTML content must follow this structure:

      {{PLACEMENT_BEGINNING}}

      <h2 style="font-size: 1.5rem; font-weight: bold; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 24px; margin-bottom: 16px;">Introduction</h2>
      <!-- Generate the introduction here based on the 'Introduction Instructions' below. -->

      <!-- Generate a detailed section for each product based on the 'Product Description Instructions' below. -->

      {{PLACEMENT_MIDDLE}}

      <h2 style="font-size: 1.5rem; font-weight: bold; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 24px; margin-bottom: 16px;">The Verdict</h2>
      <!-- Generate a final "Verdict" or "Recommendation" section summarizing which product is best for different types of users. -->

      {{PLACEMENT_END}}
      
      ---
      **SECTION-SPECIFIC INSTRUCTIONS**

      **Introduction Instructions:**
      - Style: {{INTRODUCTION_STYLE}}
      - Tone: {{INTRODUCTION_TONE}}

      **Product Description Instructions:**
      - For each product, create a separate section with its own \`<h3>\` heading.
      - Style: {{DESCRIPTION_STYLE}}
      - Tone: {{DESCRIPTION_TONE}}

      **Global Settings (General Writing Style):**
      {{GENERAL_SETTINGS}}
      
      **Specific Instructions for This Post:**
      {{SPECIFIC_INSTRUCTIONS}}
      ---

      **Product Information to Use:**
      {{PRODUCT_DETAILS}}
    `;
    
    const task = templatePrompt || `Write a comprehensive and engaging blog post comparing the products provided.`;
    
    let finalPrompt = mainPrompt
        .replace('{{USER_PROVIDED_TEMPLATE_TASK}}', task)
        .replace('{{PLACEMENT_BEGINNING}}', placement.beginning)
        .replace('{{PLACEMENT_MIDDLE}}', placement.middle)
        .replace('{{PLACEMENT_END}}', placement.end)
        .replace('{{INTRODUCTION_STYLE}}', introductionStyle)
        .replace('{{INTRODUCTION_TONE}}', introductionTone)
        .replace('{{DESCRIPTION_STYLE}}', descriptionStyle)
        .replace('{{DESCRIPTION_TONE}}', descriptionTone)
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

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: finalPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });
    
    return JSON.parse(response.text.trim());
};