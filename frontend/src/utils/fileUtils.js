export const getFileUrl = (fileData) => {
    if (!fileData) return null;
    if (typeof fileData === 'string') {
        const trimmed = fileData.trim();
        // If it's already an absolute URL, base64 data URL, or blob preview URL, return as-is
        if (
            trimmed.startsWith('http://') ||
            trimmed.startsWith('https://') ||
            trimmed.startsWith('data:') ||
            trimmed.startsWith('blob:')
        ) {
            return trimmed;
        }

        // Handle local backend relative paths
        if (trimmed.startsWith('/uploads/')) {
            return `http://localhost:5000${trimmed}`;
        }
        return `http://localhost:5000/uploads/${trimmed.replace(/^\//, '')}`;
    }
    // Handle objects (from Cloudinary or local storage)
    if (fileData.url) {
        const url = String(fileData.url).trim();
        if (
            url.startsWith('http://') ||
            url.startsWith('https://') ||
            url.startsWith('data:') ||
            url.startsWith('blob:')
        ) {
            return url;
        }
        if (url.startsWith('/uploads/')) {
            return `http://localhost:5000${url}`;
        }
        return url;
    }
    return null;
};
