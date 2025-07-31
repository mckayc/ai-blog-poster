
import { getDb } from '../database.js';

const parsePost = (post) => {
    if (!post) return null;
    console.log(`[POST PARSER] --- Parsing post ID: ${post.id} ---`);

    let products = [];
    try {
        console.log(`[POST PARSER] Raw products for ${post.id}:`, post.products);
        console.log(`[POST PARSER] Type of products: ${typeof post.products}`);
        if (post.products) {
            const parsed = JSON.parse(post.products);
            if (Array.isArray(parsed)) {
                products = parsed;
                console.log(`[POST PARSER] Successfully parsed products for ${post.id} into an array.`);
            } else {
                console.warn(`[POST PARSER] Parsed products for ${post.id}, but result is not an array. Type: ${typeof parsed}`);
            }
        } else {
             console.log(`[POST PARSER] Post ${post.id} has no products field.`);
        }
    } catch (e) {
        console.error(`[POST PARSER] CRITICAL: Failed to parse products for ${post.id}. Value: ${post.products}. Error:`, e.message);
    }

    let tags = [];
    try {
        console.log(`[POST PARSER] Raw tags for ${post.id}:`, post.tags);
        console.log(`[POST PARSER] Type of tags: ${typeof post.tags}`);
        if (post.tags) {
            const parsed = JSON.parse(post.tags);
            if (Array.isArray(parsed)) {
                tags = parsed;
                console.log(`[POST PARSER] Successfully parsed tags for ${post.id} into an array.`);
            } else {
                console.warn(`[POST PARSER] Parsed tags for ${post.id}, but result is not an array. Type: ${typeof parsed}`);
            }
        } else {
             console.log(`[POST PARSER] Post ${post.id} has no tags field.`);
        }
    } catch (e) {
        console.error(`[POST PARSER] CRITICAL: Failed to parse tags for ${post.id}. Value: ${post.tags}. Error:`, e.message);
    }
    
    console.log(`[POST PARSER] --- Finished parsing post ID: ${post.id} ---`);

    return {
        ...post,
        products: products,
        tags: tags,
        asins: post.asins || '',
    };
}

export const getAllPosts = async () => {
    const db = await getDb();
    let posts = await db.all('SELECT id, name, title, createdAt, products, tags, heroImageUrl, asins FROM posts ORDER BY createdAt DESC');
    return posts.map(parsePost);
};

export const getPostById = async (id) => {
    const db = await getDb();
    const post = await db.get('SELECT * FROM posts WHERE id = ?', id);
    return parsePost(post);
};

export const saveOrUpdatePost = async (postData) => {
    const { id, name, title, content, products, createdAt, heroImageUrl, tags, asins } = postData;
    const db = await getDb();

    if (id) { // Update
        await db.run(
            'UPDATE posts SET name = ?, title = ?, content = ?, products = ?, createdAt = ?, heroImageUrl = ?, tags = ?, asins = ? WHERE id = ?',
            name, title, content, JSON.stringify(products || []), createdAt, heroImageUrl, JSON.stringify(tags || []), asins || '', id
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
            asins: asins || '',
        };
        await db.run(
            'INSERT INTO posts (id, name, title, content, products, createdAt, heroImageUrl, tags, asins) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            newPost.id, newPost.name, newPost.title, newPost.content, newPost.products, newPost.createdAt, newPost.heroImageUrl, newPost.tags, newPost.asins
        );
        return { success: true, id: newPost.id };
    }
};

export const deletePostById = async (id) => {
    const db = await getDb();
    await db.run('DELETE FROM posts WHERE id = ?', id);
    return { success: true };
};

export const deleteMultiplePostsByIds = async (ids) => {
    const db = await getDb();
    const placeholders = ids.map(() => '?').join(',');
    const sql = `DELETE FROM posts WHERE id IN (${placeholders})`;
    const result = await db.run(sql, ids);
    console.log(`[DB LOG] Bulk deleted ${result.changes} posts.`);
    return { success: true, count: result.changes };
};