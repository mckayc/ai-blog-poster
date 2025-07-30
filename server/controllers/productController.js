import * as productService from '../services/productService.js';
import * as geminiService from '../services/geminiService.js';

const handle_error = (res, error) => {
    console.error("--- PRODUCT CONTROLLER ERROR ---");
    console.error(JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    const errorMessage = error.message || "An unknown server error occurred.";
    res.status(500).json({ message: `Server Error: ${errorMessage}` });
};

export const getAllProducts = async (req, res) => {
    try {
        const { search, category } = req.query;
        const products = await productService.getAllProducts({ search, category });
        res.json(products);
    } catch (error) {
        handle_error(res, error);
    }
};

export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await productService.getProductById(id);
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        handle_error(res, error);
    }
};

export const createProduct = async (req, res) => {
    try {
        const productData = req.body;
        const newProduct = await productService.createProduct(productData);
        res.status(201).json(newProduct);
    } catch (error) {
        handle_error(res, error);
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const productData = req.body;
        const updatedProduct = await productService.updateProduct(id, productData);
        res.json(updatedProduct);
    } catch (error) {
        handle_error(res, error);
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await productService.deleteProduct(id);
        res.status(200).json({ success: true });
    } catch (error) {
        handle_error(res, error);
    }
};

export const getUniqueCategories = async (req, res) => {
    try {
        const categories = await productService.getUniqueCategories();
        res.json(categories);
    } catch (error) {
        handle_error(res, error);
    }
};

export const fetchAndSaveProduct = async (req, res) => {
    try {
        const { productUrl } = req.body;
        if (!productUrl) {
            return res.status(400).json({ message: "productUrl is required." });
        }
        
        // 1. Fetch data from Gemini
        const scrapedData = await geminiService.fetchProductData(productUrl);
        
        // 2. Find or create product in DB
        const product = await productService.findOrCreateProductFromScrape({ ...scrapedData, productUrl });
        
        res.json(product);
    } catch (error) {
        handle_error(res, error);
    }
};