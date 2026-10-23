export const getFileUrl = (fileData) => {
    if (!fileData) return null;
    if (typeof fileData === 'string') {
        // Handle legacy local paths or direct strings
        if (fileData.startsWith('http')) return fileData;
        return `http://localhost:5000/uploads/${fileData}`;
    }
    // Handle objects (from Cloudinary or local storage)
    if (fileData.url) {
        // If URL is already absolute (starts with http), return as-is
        if (fileData.url.startsWith('http')) return fileData.url;
        // If URL is relative (starts with /uploads/), construct full URL to backend
        if (fileData.url.startsWith('/uploads/')) {
            return `http://localhost:5000${fileData.url}`;
        }
        return fileData.url;
    }
    return null;
};
