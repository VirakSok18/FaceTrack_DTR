import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isPDF = file.mimetype === 'application/pdf';
    return {
      folder: 'employee_dtr',
      resource_type: isPDF ? 'raw' : 'image',
      public_id: `${Date.now()}-${file.originalname}` // Preserve full filename with ext
    };
  }
});

export { cloudinary, storage };
