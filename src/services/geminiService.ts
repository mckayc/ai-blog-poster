import { Product } from '../types';

const handleResponse = async (res: Response) => {
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'An unknown API error occurred' }));
        throw new Error(error.message || 'An API error occurred');
    }
    return res.json();
};

export const testApiKey = async (): Promise<boolean> => {
  try {
    const res = await fetch('/api/test-connection', { method: 'POST' });
    const data = await res.json();
    return data.success;
  } catch (error) {
    console.error("API Key test failed:", error);
    return false;
  }
};

export interface GenerationOptions {
    products: Product[];
    instructions: string;
    templateId: string | null;
    introductionStyle: string;
    introductionTone: string;
    descriptionStyle: string;
    descriptionTone: string;
    comparisonCards: { enabled: boolean; placement: Record<string, boolean> };
    photoComparison: { enabled: boolean; placement: Record<string, boolean> };
}

export interface GenerationResponse {
    title: string;
    heroImageUrl: string;
    content: string;
    tags: string[];
}

// Replaces generatePostStream with a more robust, non-streaming version.
export const generateFullPost = async (options: GenerationOptions): Promise<GenerationResponse> => {
    return fetch('/api/gemini/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
    }).then(handleResponse);
};

export const generateTitleIdea = async (products: Product[]): Promise<string[]> => {
    return fetch('/api/gemini/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products })
    }).then(handleResponse);
};

export const generateTags = async (title: string, content: string): Promise<string[]> => {
    return fetch('/api/gemini/generate-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
    }).then(handleResponse);
};