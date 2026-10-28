export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getFileUrl = (fileData) => {
    if (!fileData) return null;

    // 1. If it's a string
    if (typeof fileData === 'string') {
        const trimmed = fileData.trim();
        if (!trimmed) return null;

        // If it's already a full HTTP/HTTPS URL, a Base64 Data URL, or a Blob URL: return as is!
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
            const baseUrl = API_URL.replace('/api', '');
            return `${baseUrl}${trimmed}`;
        }

        const baseUrl = API_URL.replace('/api', '');
        return `${baseUrl}/uploads/${trimmed.replace(/^\//, '')}`;
    }

    // 2. If it's an object with url property
    if (fileData.url) {
        const url = String(fileData.url).trim();

        if (
            url.startsWith('http://') ||
            url.startsWith('https://') ||
            url.startsWith('data:') ||
            url.startsWith('blob:')
        ) {
            if (url.includes('upload/') && !url.toLowerCase().endsWith('.pdf')) {
                return url.replace('upload/', 'upload/f_auto,q_auto/');
            }
            return url;
        }

        if (url.startsWith('/uploads/')) {
            const baseUrl = API_URL.replace('/api', '');
            return `${baseUrl}${url}`;
        }

        return url;
    }

    return null;
};
