import { getDb } from '../database.js';

export const getAllPosts = async () => {
    const db = await getDb();
    let posts = await db.all('SELECT * FROM posts ORDER BY createdAt DESC');
    return posts.map(p => ({ ...p, products: JSON.parse(p.products) }));
};

export const saveOrUpdatePost = async (postData) => {
    const { id, title, content, products, createdAt } = postData;
    const db = await getDb();

    if (id) { // Update
        await db.run(
            'UPDATE posts SET title = ?, content = ?, products = ?, createdAt = ? WHERE id = ?',
            title, content, JSON.stringify(products || []), createdAt, id
        );
    } else { // Create
        const newPost = {
            id: crypto.randomUUID(),
            title,
            content,
            products: JSON.stringify(products || []),
            createdAt: new Date().toISOString()
        };
        await db.run(
            'INSERT INTO posts (id, title, content, products, createdAt) VALUES (?, ?, ?, ?, ?)',
            newPost.id, newPost.title, newPost.content, newPost.products, newPost.createdAt
        );
    }
    return { success: true };
};

export const deletePostById = async (id) => {
    const db = await getDb();
    await db.run('DELETE FROM posts WHERE id = ?', id);
    return { success: true };
};
