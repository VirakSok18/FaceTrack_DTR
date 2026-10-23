
import { cloudinary } from './config/cloudinary.js';
import fs from 'fs';
import path from 'path';
import https from 'https';

const tempFilePath = path.join(process.cwd(), 'temp_test.png');
// 1x1 Red PNG
const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(tempFilePath, pngBuffer);

console.log('Created temporary PNG file:', tempFilePath);

async function verifyUpload() {
    const mode = 'auto';

    console.log(`\n--- Testing PNG upload (resource_type: ${mode}) ---`);
    let result;
    try {
        result = await cloudinary.uploader.upload(tempFilePath, {
            folder: 'employee_dtr',
            resource_type: mode,
            public_id: `test_png_${Date.now()}`
        });

        console.log(`Upload successful.`);
        console.log('URL:', result.secure_url);

        await new Promise((resolve) => {
            const req = https.get(result.secure_url, (res) => {
                console.log(`FETCH Status Code: ${res.statusCode}`);
                console.log(`FETCH Content-Type: ${res.headers['content-type']}`);

                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        console.log('Response Body:', data.substring(0, 200));
                    }
                    resolve();
                });
            });
            req.on('error', (e) => {
                console.error(`Problem with request: ${e.message}`);
                resolve();
            });
        });
    } catch (error) {
        console.error(`Upload failed:`, error.message);
    } finally {
        if (result && result.public_id) {
            try {
                await cloudinary.uploader.destroy(result.public_id);
                console.log(`Cleaned up.`);
            } catch (cleanupErr) {
                console.error('Cleanup error:', cleanupErr.message);
            }
        }
    }

    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
}

verifyUpload();
