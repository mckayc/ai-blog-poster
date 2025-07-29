import { getDb } from '../database.js';

export const getAllPosts = async () => {
    const db = await getDb();
    let posts = await db.all('SELECT * FROM posts ORDER BY createdAt DESC');
    // Ensure products is always an array
    return posts.map(p => ({ ...p, products: p.products ? JSON.parse(p.products) : [] }));
};

export const getPostById = async (id) => {
    const db = await getDb();
    const post = await db.get('SELECT * FROM posts WHERE id = ?', id);
    if (post) {
        // Ensure products is always an array
        return { ...post, products: post.products ? JSON.parse(post.products) : [] };
    }
    return null;
};

export const saveOrUpdatePost = async (postData) => {
    const { id, title, content, products, createdAt } = postData;
    const db = await getDb();

    if (id) { // Update
        await db.run(
            'UPDATE posts SET title = ?, content = ?, products = ?, createdAt = ? WHERE id = ?',
            title, content, JSON.stringify(products || []), createdAt, id
        );
        return { success: true, id: id };
    } else { // Create a new post (can be a placeholder)
        const newPost = {
            id: crypto.randomUUID(),
            title: title || 'New Post',
            content: content || '',
            products: JSON.stringify(products || []),
            createdAt: new Date().toISOString()
        };
        await db.run(
            'INSERT INTO posts (id, title, content, products, createdAt) VALUES (?, ?, ?, ?, ?)',
            newPost.id, newPost.title, newPost.content, newPost.products, newPost.createdAt
        );
        return { success: true, id: newPost.id };
    }
};

export const deletePostById = async (id) => {
    const db = await getDb();
    await db.run('DELETE FROM posts WHERE id = ?', id);
    return { success: true };
};