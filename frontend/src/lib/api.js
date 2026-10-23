export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getFileUrl = (fileData) => {
    if (!fileData) return null;

    // If it's a Cloudinary object { url, public_id }
    if (fileData.url) {
        const url = fileData.url;

        // If it's already a full URL (Cloudinary), handle it
        if (url.startsWith('http')) {
            // Apply auto quality/format ONLY for images (not PDFs)
            if (url.includes('upload/') && !url.toLowerCase().endsWith('.pdf')) {
                return url.replace('upload/', 'upload/f_auto,q_auto/');
            }
            return url;
        }

        // If it's a local path (starts with /uploads/), construct full URL
        if (url.startsWith('/uploads/')) {
            const baseUrl = API_URL.replace('/api', '');
            return `${baseUrl}${url}`;
        }

        return url;
    }

    // If it's just a string path (legacy)
    if (typeof fileData === 'string') {
        if (fileData.startsWith("http")) return fileData;

        // Handle paths that start with /uploads/
        if (fileData.startsWith('/uploads/')) {
            const baseUrl = API_URL.replace('/api', '');
            return `${baseUrl}${fileData}`;
        }

        const baseUrl = API_URL.replace('/api', '');
        return `${baseUrl}/uploads/${fileData.replace(/^\//, '')}`;
    }

    return null;
}
