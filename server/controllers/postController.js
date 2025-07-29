import * as postService from '../services/postService.js';
import * as geminiService from '../services/geminiService.js';

const handle_error = (res, error) => {
    console.error("--- CONTROLLER ERROR ---");
    console.error(JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    const errorMessage = error.message || "An unknown server error occurred.";
    res.status(500).json({ message: `Server Error: ${errorMessage}\n\nPlease check the Docker container logs for the full technical details.` });
};

export const getAllPosts = async (req, res) => {
    try {
        const posts = await postService.getAllPosts();
        res.json(posts);
    } catch (error) {
        handle_error(res, error);
    }
};

export const saveOrUpdatePost = async (req, res) => {
    try {
        const postData = req.body;
        const result = await postService.saveOrUpdatePost(postData);
        res.status(201).json(result);
    } catch (error) {
        handle_error(res, error);
    }
};

export const deletePostById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await postService.deletePostById(id);
        res.json(result);
    } catch (error) {
        handle_error(res, error);
    }
};

export const generatePost = async (req, res) => {
    try {
        const { products, instructions, templatePrompt } = req.body;
        const result = await geminiService.generateBlogPost(products, instructions, templatePrompt);
        res.json(result);
    } catch (error) {
        handle_error(res, error);
    }
};

export const fetchProduct = async (req, res) => {
    try {
        const { productUrl } = req.body;
        const result = await geminiService.fetchProductData(productUrl);
        res.json(result);
    } catch(error) {
        handle_error(res, error);
    }
}

export const testConnection = async (req, res) => {
    try {
        const success = await geminiService.testApiKey();
        if (success) {
            res.json({ success: true });
        } else {
             res.status(400).json({ success: false, message: 'Connection failed. Please check your API key in the .env file.' });
        }
    } catch(error) {
        handle_error(res, error);
    }
}
