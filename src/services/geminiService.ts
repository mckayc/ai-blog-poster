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

export const fetchProductData = async (
  productUrl: string
): Promise<Partial<Product>> => {
  return fetch('/api/gemini/fetch-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productUrl })
  }).then(handleResponse);
};
