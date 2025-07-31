
import { Product } from '../types';

const handleResponse = async (res: Response) => {
    if (!res.ok) {
        const error = await res.json();
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

export const generatePostStream = async (options: GenerationOptions): Promise<Response> => {
    const response = await fetch('/api/gemini/generate-post-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
    });

    if (!response.ok) {
        const errorText = await response.text();
        let error;
        try {
            error = JSON.parse(errorText);
        } catch(e) {
            error = { message: errorText || 'An unknown API error occurred during streaming setup.' };
        }
        throw new Error(error.message);
    }

    return response;
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
