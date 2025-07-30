import { getDb } from '../database.js';

export const getTemplateById = async (id) => {
    const db = await getDb();
    const template = await db.get('SELECT * FROM templates WHERE id = ?', id);
    return template;
};
