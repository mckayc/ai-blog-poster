import { getDb } from '../database.js';

const parseProduct = (product) => {
    if (!product) return null;
    return {
        ...product,
        tags: product.tags ? JSON.parse(product.tags) : [],
    };
}

const serializeProduct = (product) => {
    if (!product) return null;
    return {
        ...product,
        tags: JSON.stringify(product.tags || []),
    };
}

export const getAllProducts = async ({ search, category }) => {
    const db = await getDb();
    let query = 'SELECT * FROM products';
    const params = [];
    const conditions = [];

    if (search) {
        conditions.push('(name LIKE ? OR brand LIKE ? OR tags LIKE ?)');
        const searchLike = `%${search}%`;
        params.push(searchLike, searchLike, searchLike);
    }

    if (category) {
        conditions.push('category = ?');
        params.push(category);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY updatedAt DESC';

    const products = await db.all(query, params);
    return products.map(parseProduct);
};

export const getProductById = async (id) => {
    const db = await getDb();
    const product = await db.get('SELECT * FROM products WHERE id = ?', id);
    return parseProduct(product);
};

export const createProduct = async (productData) => {
    const db = await getDb();
    const now = new Date().toISOString();
    const newProduct = {
        id: crypto.randomUUID(),
        name: productData.name,
        title: productData.title || '',
        productUrl: productData.productUrl || '',
        imageUrl: productData.imageUrl || '',
        price: productData.price || '',
        description: productData.description || '',
        brand: productData.brand || '',
        affiliateLink: productData.affiliateLink || '',
        category: productData.category || 'Uncategorized',
        tags: productData.tags || [],
        createdAt: now,
        updatedAt: now,
    };
    const serialized = serializeProduct(newProduct);
    await db.run(
        'INSERT INTO products (id, name, title, productUrl, imageUrl, price, description, brand, affiliateLink, category, tags, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        Object.values(serialized)
    );
    return newProduct;
};

export const updateProduct = async (id, productData) => {
    const db = await getDb();
    const now = new Date().toISOString();
    const existing = await getProductById(id);
    if (!existing) throw new Error("Product not found");

    const updatedProduct = { ...existing, ...productData, updatedAt: now };
    const serialized = serializeProduct(updatedProduct);
    
    await db.run(
        'UPDATE products SET name = ?, title = ?, productUrl = ?, imageUrl = ?, price = ?, description = ?, brand = ?, affiliateLink = ?, category = ?, tags = ?, updatedAt = ? WHERE id = ?',
        serialized.name, serialized.title, serialized.productUrl, serialized.imageUrl, serialized.price, serialized.description, serialized.brand, serialized.affiliateLink, serialized.category, serialized.tags, serialized.updatedAt, id
    );
    return updatedProduct;
};

export const deleteProduct = async (id) => {
    const db = await getDb();
    await db.run('DELETE FROM products WHERE id = ?', id);
    return { success: true };
};

export const getUniqueCategories = async () => {
    const db = await getDb();
    const rows = await db.all('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category');
    return rows.map(r => r.category);
};

export const findOrCreateProductFromScrape = async (scrapedData) => {
    const db = await getDb();
    const { productUrl, title, price, description, imageUrl } = scrapedData;
    
    let product = await db.get('SELECT * FROM products WHERE productUrl = ?', productUrl);

    if (product) {
        // Product exists, update it with fresh data
        product.title = title || product.title;
        product.price = price || product.price;
        product.description = description || product.description;
        product.imageUrl = imageUrl || product.imageUrl;
        // The user might have given it a better name, so we only update the name if it's the same as the old title
        if (product.name === product.title || !product.name) {
            product.name = title;
        }
        return await updateProduct(product.id, product);
    } else {
        // Product doesn't exist, create a new one
        const newProductData = {
            name: title, // Default name to the scraped title
            title: title,
            productUrl: productUrl,
            imageUrl: imageUrl,
            price: price,
            description: description,
            category: 'Uncategorized',
            tags: [],
        };
        return await createProduct(newProductData);
    }
};
