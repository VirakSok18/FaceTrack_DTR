
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 5000;
const BOUNDARY = '--------------------------boundary' + Date.now();

// 1. Create temp files
const tempPdfPath = path.join(process.cwd(), 'test_cv.pdf');
const tempImgPath = path.join(process.cwd(), 'test_photo.png');

fs.writeFileSync(tempPdfPath, '%PDF-1.0\n%EOF');
fs.writeFileSync(tempImgPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));

// 2. Helper to send request
function sendRequest(method, path, bodyBuffer = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: path,
            method: method,
            headers: headers
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : {};
                    resolve({ statusCode: res.statusCode, body: parsed });
                } catch (e) {
                    console.error('Failed to parse JSON:', data);
                    resolve({ statusCode: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);
        if (bodyBuffer) req.write(bodyBuffer);
        req.end();
    });
}

// 3. Construct Multipart Body
function createMultipartBody(fields, files) {
    const parts = [];

    // Fields
    for (const [key, value] of Object.entries(fields)) {
        parts.push(Buffer.from(`--${BOUNDARY}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
    }

    // Files
    for (const file of files) {
        const fileContent = fs.readFileSync(file.path);
        parts.push(Buffer.from(`--${BOUNDARY}\r\nContent-Disposition: form-data; name="${file.fieldname}"; filename="${path.basename(file.path)}"\r\nContent-Type: ${file.mimetype}\r\n\r\n`));
        parts.push(fileContent);
        parts.push(Buffer.from('\r\n'));
    }

    parts.push(Buffer.from(`--${BOUNDARY}--`));
    return Buffer.concat(parts);
}

async function runTest() {
    try {
        console.log('Starting Hybrid Storage Verification...');

        const body = createMultipartBody(
            {
                name: 'Test Employee',
                age: 30,
                startDate: '2023-01-01',
                contact: 'test@example.com',
                phone: '1234567890'
            },
            [
                { fieldname: 'photo', path: tempImgPath, mimetype: 'image/png' },
                { fieldname: 'cv', path: tempPdfPath, mimetype: 'application/pdf' }
            ]
        );

        console.log('Sending POST /api/employees...');
        const createRes = await sendRequest('POST', '/api/employees', body, {
            'Content-Type': `multipart/form-data; boundary=${BOUNDARY}`,
            'Content-Length': body.length
        });

        if (createRes.statusCode !== 200) {
            throw new Error(`Create failed: ${JSON.stringify(createRes.body)}`);
        }

        const employee = createRes.body;
        console.log('Employee Created:', employee._id);

        // CHECK 1: Photo on Cloudinary
        if (!employee.photo.url.includes('res.cloudinary.com')) {
            throw new Error('Photo URL does not point to Cloudinary: ' + employee.photo.url);
        }
        console.log('PASS: Photo is on Cloudinary.');

        // CHECK 2: CV is local
        if (!employee.cv.url.startsWith('/uploads/')) {
            throw new Error('CV URL does not point to local uploads: ' + employee.cv.url);
        }
        console.log('PASS: CV is local.');

        // CHECK 3: File exists on disk
        const localCvName = path.basename(employee.cv.url);
        const localCvPath = path.join(process.cwd(), 'uploads', localCvName);
        if (!fs.existsSync(localCvPath)) {
            throw new Error('CV file not found on disk: ' + localCvPath);
        }
        console.log('PASS: CV file exists on disk.');

        // CHECK 4: Cleanup (Delete)
        console.log('Deleting employee...');
        const deleteRes = await sendRequest('DELETE', `/api/employees/${employee.employeeId}`);
        if (deleteRes.statusCode !== 200) {
            throw new Error('Delete failed');
        }

        // Verify local file deleted
        if (fs.existsSync(localCvPath)) {
            throw new Error('CV file was NOT deleted from disk after employee deletion.');
        }
        console.log('PASS: Local CV file deleted.');

        console.log('\nALL TESTS PASSED.');

    } catch (error) {
        console.error('\nTEST FAILED:', error.message);
    } finally {
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
        if (fs.existsSync(tempImgPath)) fs.unlinkSync(tempImgPath);
    }
}

runTest();
