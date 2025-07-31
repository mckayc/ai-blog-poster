
import { BlogPost, Template, AppSettings, Product } from '../types';

const handleResponse = async (res: Response) => {
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'An API error occurred and the response body was not valid JSON.' }));
        throw new Error(error.message || 'An unknown API error occurred');
    }
    return res.json();
};

// --- Settings Management ---
export const getSettings = (): Promise<AppSettings> => {
    return fetch('/api/settings').then(handleResponse);
};

export const saveSettings = (settings: AppSettings): Promise<any> => {
    return fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
    }).then(handleResponse);
};


// --- API Key Management ---
export const getApiKeyStatus = (): Promise<{ apiKey: 'SET' | null }> => {
    return fetch('/api/api-key').then(handleResponse);
}

// --- Blog Post Management ---
export const getPosts = (): Promise<BlogPost[]> => {
    return fetch('/api/posts').then(handleResponse);
};

export const getPost = (postId: string): Promise<BlogPost> => {
    return fetch(`/api/posts/${postId}`).then(handleResponse);
}

export const savePost = (post: Partial<BlogPost>): Promise<{ success: boolean; id: string }> => {
    return fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
    }).then(handleResponse);
};

export const updatePost = (updatedPost: Partial<BlogPost>): Promise<any> => {
    return fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPost)
    }).then(handleResponse);
};

export const deletePost = (postId: string): Promise<any> => {
    return fetch(`/api/posts/${postId}`, { method: 'DELETE' }).then(handleResponse);
};

export const deletePosts = (postIds: string[]): Promise<any> => {
    return fetch('/api/posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: postIds })
    }).then(handleResponse);
};

// --- Template Management ---
export const getTemplates = (): Promise<Template[]> => {
    return fetch('/api/templates').then(handleResponse);
};

export const saveTemplate = (template: Omit<Template, 'id'> & { id?: string }): Promise<any> => {
    return fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
    }).then(handleResponse);
};


export const deleteTemplate = (templateId: string): Promise<any> => {
    return fetch(`/api/templates/${templateId}`, { method: 'DELETE' }).then(handleResponse);
};

// --- Product Management ---
export const getProducts = (filters: {search?: string, category?: string}): Promise<Product[]> => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.category) params.set('category', filters.category);
    return fetch(`/api/products?${params.toString()}`).then(handleResponse);
};

export const getUniqueCategories = (): Promise<string[]> => {
    return fetch('/api/products/categories').then(handleResponse);
};

export const saveProduct = (product: Partial<Product>): Promise<Product> => {
    const url = product.id ? `/api/products/${product.id}` : '/api/products';
    const method = product.id ? 'PUT' : 'POST';
    return fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
    }).then(handleResponse);
};

export const deleteProduct = (productId: string): Promise<any> => {
    return fetch(`/api/products/${productId}`, { method: 'DELETE' }).then(handleResponse);
};

export const deleteProducts = (productIds: string[]): Promise<any> => {
    return fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: productIds })
    }).then(handleResponse);
};

export const fetchAndSaveProduct = (productUrl: string): Promise<Product> => {
    return fetch('/api/products/fetch-and-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productUrl })
    }).then(handleResponse);
};
