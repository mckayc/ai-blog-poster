
import { GoogleGenAI, Type } from "@google/genai";
import { Product } from '../types';

export const testApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) return false;
  try {
    const ai = new GoogleGenAI({ apiKey });
    // A simple, low-cost prompt to test connectivity and authentication
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "hello",
    });
    return !!response.text;
  } catch (error) {
    console.error("API Key Test Failed:", error);
    return false;
  }
};

interface GeneratedPost {
  title: string;
  post: string;
  labels: string;
  metaDescription: string;
  socialMediaSnippets: string;
}

export const generateBlogPost = async (
  apiKey: string,
  products: Product[],
  generalInstructions: string,
  specificInstructions: string,
  seo: { primary: string, secondary: string }
): Promise<GeneratedPost> => {
  if (!apiKey) {
    throw new Error("Gemini API key is not configured.");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  const productDetails = products.map(p => ({
    title: p.title,
    price: p.price,
    imageUrl: p.imageUrl,
    description: p.description,
    otherInfo: p.otherInfo,
    affiliateLink: p.affiliateLink,
  }));
  
  const prompt = `
    **Base Instruction:**
    ${generalInstructions}
    
    **Product Data:**
    Here is the product data in JSON format. Use this information to write the blog post.
    \`\`\`json
    ${JSON.stringify(productDetails, null, 2)}
    \`\`\`

    **SEO Instructions:**
    - Primary Keyword: "${seo.primary || 'not specified'}"
    - Secondary Keywords: "${seo.secondary || 'not specified'}"
    - If keywords are provided, you MUST skillfully integrate the primary keyword into the post title, meta description, and at least one heading. The secondary keywords should be used naturally throughout the post content.
    
    **Specific Instructions for this Post:**
    ${specificInstructions || "No specific instructions provided. Proceed with the general instructions."}
    
    **Your Task:**
    Generate the response in the requested JSON format based on all instructions.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: 'A catchy, SEO-friendly title for the blog post.'
        },
        post: {
            type: Type.STRING,
            description: 'The full blog post content in clean HTML format. This should be a complete HTML document body, ready to be pasted.'
        },
        labels: {
            type: Type.STRING,
            description: 'A comma-separated list of relevant labels, tags, or keywords for the blog post.'
        },
        metaDescription: {
            type: Type.STRING,
            description: 'A concise, SEO-friendly meta description for the blog post (under 160 characters), incorporating the primary keyword if provided.'
        },
        socialMediaSnippets: {
            type: Type.STRING,
            description: 'A string containing 2-3 distinct, engaging snippets for promoting the post on social media (e.g., for Twitter, Facebook). Each snippet should be on a new line.'
        }
    },
    required: ["title", "post", "labels", "metaDescription", "socialMediaSnippets"],
  };
  
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema,
        }
    });

    const parsedResponse = JSON.parse(response.text);
    // Basic validation
    if (parsedResponse.title && parsedResponse.post && typeof parsedResponse.labels !== 'undefined' && parsedResponse.metaDescription && parsedResponse.socialMediaSnippets) {
        return parsedResponse;
    } else {
        throw new Error("Received incomplete JSON data from API.");
    }
  } catch (error) {
    console.error("Error generating blog post:", error);
    if (error instanceof Error) {
        throw new Error(`Error generating content: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating content.");
  }
};
