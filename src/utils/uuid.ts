// A simple, browser-safe, and dependency-free function to generate a UUID.
// This is used for creating unique keys for React elements and temporary object IDs,
// providing a fallback for environments where `crypto.randomUUID` is not available.
export const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
