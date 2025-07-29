
import { BlogPost, Template } from '../types';

/**
 * NOTE: This application uses the browser's localStorage to persist data.
 * This is a client-side solution suitable for single-user, browser-based apps.
 * It simulates the requested SQLite database functionality without a backend.
 * Data is stored on the user's computer within their browser's storage.
 */

const API_KEY_STORAGE_KEY = 'gemini_api_key';
const SETTINGS_STORAGE_KEY = 'blog_post_settings';
const POSTS_STORAGE_KEY = 'generated_blog_posts';
const TEMPLATES_STORAGE_KEY = 'blog_post_templates';

// --- API Key Management ---
export const getApiKey = (): string | null => {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error("Could not access localStorage to get API key:", error);
    return null;
  }
};

export const saveApiKey = (apiKey: string): void => {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  } catch (error) {
    console.error("Could not access localStorage to save API key:", error);
  }
};

// --- Settings Management ---
export const getSettings = (): string | null => {
  try {
    return localStorage.getItem(SETTINGS_STORAGE_KEY);
  } catch (error) {
    console.error("Could not access localStorage to get settings:", error);
    return null;
  }
};

export const saveSettings = (settings: string): void => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, settings);
  } catch (error) {
    console.error("Could not access localStorage to save settings:", error);
  }
};

// --- Blog Post Management ---
export const getPosts = (): BlogPost[] => {
  try {
    const postsJson = localStorage.getItem(POSTS_STORAGE_KEY);
    return postsJson ? JSON.parse(postsJson) : [];
  } catch (error) {
    console.error("Could not access localStorage to get posts:", error);
    return [];
  }
};

export const savePost = (post: BlogPost): void => {
  try {
    const posts = getPosts();
    posts.unshift(post); // Add new post to the beginning
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
  } catch (error) {
    console.error("Could not access localStorage to save post:", error);
  }
};

export const updatePost = (updatedPost: BlogPost): void => {
  try {
    let posts = getPosts();
    posts = posts.map(p => p.id === updatedPost.id ? updatedPost : p);
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
  } catch (error) {
    console.error("Could not access localStorage to update post:", error);
  }
};

export const deletePost = (postId: string): void => {
  try {
    let posts = getPosts();
    posts = posts.filter(p => p.id !== postId);
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
  } catch (error) {
    console.error("Could not access localStorage to delete post:", error);
  }
};

// --- Template Management ---
export const getTemplates = (): Template[] => {
  try {
    const templatesJson = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return templatesJson ? JSON.parse(templatesJson) : [];
  } catch (error) {
    console.error("Could not access localStorage to get templates:", error);
    return [];
  }
};

export const saveTemplate = (template: Template): void => {
  try {
    const templates = getTemplates();
    templates.push(template);
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error("Could not access localStorage to save template:", error);
  }
};

export const updateTemplate = (updatedTemplate: Template): void => {
  try {
    let templates = getTemplates();
    templates = templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t);
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error("Could not access localStorage to update template:", error);
  }
};

export const deleteTemplate = (templateId: string): void => {
  try {
    let templates = getTemplates();
    templates = templates.filter(t => t.id !== templateId);
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error("Could not access localStorage to delete template:", error);
  }
};
