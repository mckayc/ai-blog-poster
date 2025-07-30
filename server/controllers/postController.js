
import * as postService from '../services/postService.js';
import * as geminiService from '../services/geminiService.js';
import * as templateService from '../services/templateService.js';

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

export const getPostById = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await postService.getPostById(id);
        if (post) {
            res.json(post);
        } else {
            res.status(404).json({ message: 'Post not found' });
        }
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

export const deleteMultiplePosts = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Invalid or empty array of post IDs provided.' });
        }
        const result = await postService.deleteMultiplePostsByIds(ids);
        res.json(result);
    } catch (error) {
        handle_error(res, error);
    }
};

export const generatePostStream = async (req, res) => {
    try {
        const { products, instructions, templateId, includeComparisonCards } = req.body;
        
        let templatePrompt = null;
        if (templateId && templateId !== 'default') {
            const template = await templateService.getTemplateById(templateId);
            if (template) {
                templatePrompt = template.prompt;
            }
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');

        const stream = await geminiService.generateBlogPostStream(products, instructions, templatePrompt, includeComparisonCards);

        for await (const chunk of stream) {
            res.write(chunk.text);
        }
        res.end();

    } catch (error) {
        console.error("--- STREAMING CONTROLLER ERROR ---");
        console.error(JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        res.status(500).end(`STREAM_ERROR: ${error.message}`);
    }
};

export const generateTitleIdea = async (req, res) => {
    try {
        const { products } = req.body;
        const result = await geminiService.generateTitleIdea(products);
        res.json(result);
    } catch(error) {
        handle_error(res, error);
    }
};

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