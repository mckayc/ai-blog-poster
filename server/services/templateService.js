
import { getDb } from '../database.js';

export const getTemplateById = async (id) => {
    const db = await getDb();
    const template = await db.get('SELECT * FROM templates WHERE id = ?', id);
    return template;
};

export const getAllTemplates = async () => {
    const db = await getDb();
    const templates = await db.all('SELECT * FROM templates ORDER BY name');
    return templates;
};

export const saveTemplate = async (templateData) => {
    const { id, name, prompt } = templateData;
    const db = await getDb();

    if (id) { // Update
        await db.run('UPDATE templates SET name = ?, prompt = ? WHERE id = ?', name, prompt, id);
        return { success: true, id };
    } else { // Create
        const newId = crypto.randomUUID();
        await db.run('INSERT INTO templates (id, name, prompt) VALUES (?, ?, ?)', newId, name, prompt);
        return { success: true, id: newId };
    }
};

export const deleteTemplate = async (id) => {
    const db = await getDb();
    await db.run('DELETE FROM templates WHERE id = ?', id);
    return { success: true };
};
