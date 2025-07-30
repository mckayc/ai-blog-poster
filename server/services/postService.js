import { getDb } from '../database.js';

const parsePost = (post) => {
    if (!post) return null;
    return {
        ...post,
        products: post.products ? JSON.parse(post.products) : [],
        tags: post.tags ? JSON.parse(post.tags) : [],
    };
}

export const getAllPosts = async () => {
    const db = await getDb();
    let posts = await db.all('SELECT id, name, title, createdAt, products, tags, heroImageUrl FROM posts ORDER BY createdAt DESC');
    return posts.map(parsePost);
};

export const getPostById = async (id) => {
    const db = await getDb();
    const post = await db.get('SELECT * FROM posts WHERE id = ?', id);
    return parsePost(post);
};

export const saveOrUpdatePost = async (postData) => {
    const { id, name, title, content, products, createdAt, heroImageUrl, tags } = postData;
    const db = await getDb();

    if (id) { // Update
        await db.run(
            'UPDATE posts SET name = ?, title = ?, content = ?, products = ?, createdAt = ?, heroImageUrl = ?, tags = ? WHERE id = ?',
            name, title, content, JSON.stringify(products || []), createdAt, heroImageUrl, JSON.stringify(tags || []), id
        );
        return { success: true, id: id };
    } else { // Create a new post
        const newPost = {
            id: crypto.randomUUID(),
            name: name || 'New Post',
            title: title || 'Untitled Post',
            content: content || '',
            products: JSON.stringify(products || []),
            createdAt: new Date().toISOString(),
            heroImageUrl: heroImageUrl || '',
            tags: JSON.stringify(tags || []),
        };
        await db.run(
            'INSERT INTO posts (id, name, title, content, products, createdAt, heroImageUrl, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            newPost.id, newPost.name, newPost.title, newPost.content, newPost.products, newPost.createdAt, newPost.heroImageUrl, newPost.tags
        );
        return { success: true, id: newPost.id };
    }
};

export const deletePostById = async (id) => {
    const db = await getDb();
    await db.run('DELETE FROM posts WHERE id = ?', id);
    return { success: true };
};