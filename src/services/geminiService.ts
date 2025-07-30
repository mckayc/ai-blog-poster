
import { Product, Template } from '../types';

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

export const generatePostStream = async (products: Product[], instructions: string, templateId: string | null): Promise<Response> => {
    const response = await fetch('/api/gemini/generate-post-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products, instructions, templateId })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'An unknown API error occurred during streaming setup.' }));
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
