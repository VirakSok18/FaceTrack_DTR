import mongoose from 'mongoose';
import Employee from './models/Employee.js';
import dotenv from 'dotenv';
dotenv.config();

async function update() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const result = await Employee.updateOne(
            { employeeId: '2024005' },
            { $set: { passportFile: { url: '/uploads/employee_docs/jennifer_passport.jpg', public_id: null } } }
        );
        console.log('Update result:', result);
        process.exit(0);
    } catch (err) {
        console.error('Update failed:', err);
        process.exit(1);
    }
}

update();
