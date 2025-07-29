import { BlogPost, Template } from '../types';

const handleResponse = async (res: Response) => {
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'An API error occurred');
    }
    return res.json();
};

// --- Settings Management ---
export const getSettings = async (): Promise<{ generalSettings: string }> => {
    return fetch('/api/settings').then(handleResponse);
};

export const saveSettings = async (settings: string): Promise<any> => {
    return fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generalSettings: settings })
    }).then(handleResponse);
};


// --- API Key Management ---
export const getApiKeyStatus = async (): Promise<{ apiKey: string | null }> => {
    return fetch('/api/api-key').then(handleResponse);
}

export const saveApiKey = async (apiKey: string): Promise<any> => {
    return fetch('/api/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
    }).then(handleResponse);
};


// --- Blog Post Management ---
export const getPosts = (): Promise<BlogPost[]> => {
    return fetch('/api/posts').then(handleResponse);
};

export const savePost = (post: BlogPost): Promise<any> => {
    return fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
    }).then(handleResponse);
};

export const updatePost = (updatedPost: BlogPost): Promise<any> => {
    return fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPost)
    }).then(handleResponse);
};

export const deletePost = (postId: string): Promise<any> => {
    return fetch(`/api/posts/${postId}`, { method: 'DELETE' }).then(handleResponse);
};

// --- Template Management ---
export const getTemplates = (): Promise<Template[]> => {
    return fetch('/api/templates').then(handleResponse);
};

export const saveTemplate = (template: Omit<Template, 'id'>): Promise<any> => {
    return fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
    }).then(handleResponse);
};

export const updateTemplate = (updatedTemplate: Template): Promise<any> => {
    return fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTemplate)
    }).then(handleResponse);
};

export const deleteTemplate = (templateId: string): Promise<any> => {
    return fetch(`/api/templates/${templateId}`, { method: 'DELETE' }).then(handleResponse);
};
