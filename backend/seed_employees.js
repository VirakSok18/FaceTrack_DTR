import mongoose from 'mongoose';
import Employee from './models/Employee.js';
import DTR from './models/DTR.js';
import dotenv from 'dotenv';
dotenv.config();

const lunaId = '57598576';
const photos = [
    '/uploads/employee_photos/shwcase_emp_1.png',
    '/uploads/employee_photos/shwcase_emp_2.png',
    '/uploads/employee_photos/shwcase_emp_3.png',
    '/uploads/employee_photos/shwcase_emp_4.png',
    '/uploads/employee_photos/shwcase_emp_5.png',
    '/uploads/employee_photos/shwcase_emp_6.png'
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dtr');
        console.log('Connected to MongoDB');

        const luna = await Employee.findOne({ employeeId: lunaId });
        if (!luna) {
            console.error('Luna the engine not found! Please create her first.');
            process.exit(1);
        }

        // Delete ALL existing showcase employees (keep Luna)
        await Employee.deleteMany({ employeeId: { $ne: lunaId } });
        console.log('Cleared existing showcase employees');

        const templateAttachments = {
            cv: luna.cv,
            contract: luna.contract,
            nationalIdFile: luna.nationalIdFile,
            passportFile: luna.passportFile,
            nssfFile: luna.nssfFile
        };

        const roles = [
            'Software Engineer', 'UI/UX Designer', 'Project Manager',
            'QA Engineer', 'System Administrator', 'HR Manager'
        ];

        const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];

        const employees = [];
        // Only 6 employees since we have 6 photos
        for (let i = 0; i < 6; i++) {
            const name = `${firstNames[i]} ${lastNames[i]}`;
            const employeeId = (2024000 + i).toString();

            employees.push({
                ...templateAttachments,
                photo: { url: photos[i], public_id: null },
                employeeId,
                name,
                role: roles[i],
                dateOfBirth: new Date(1985 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
                startDate: new Date(2023, 0, 1 + i * 10), // Starting from early 2023
                contact: `${name.toLowerCase().replace(' ', '.')}@example.com`,
                phone: `0${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`,
                isForeigner: i > 4,
                nationalId: (Math.floor(Math.random() * 900000) + 100000).toString(),
                nssf: (Math.floor(Math.random() * 900000) + 100000).toString(),
                workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                shiftStart: '09:00',
                shiftEnd: '18:00',
                requiredHours: 8
            });
        }

        const createdEmployees = await Employee.insertMany(employees);
        console.log('Successfully seeded 6 employees');

        const dtrEntries = [];
        const today = new Date();

        for (const emp of createdEmployees) {
            const startStr = emp.startDate.toISOString().split('T')[0];
            const endStr = today.toISOString().split('T')[0];

            let current = new Date(emp.startDate);
            while (current <= today) {
                // Skip weekends
                const dayOfWeek = current.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    const dateStr = current.toISOString().split('T')[0];
                    const rand = Math.random();
                    let status = 'Present';
                    let lateMinutes = 0;
                    let clockIn = new Date(current);

                    if (rand > 0.95) {
                        status = 'Absent';
                    } else if (rand > 0.85) {
                        status = 'Late';
                        lateMinutes = Math.floor(Math.random() * 30) + 1;
                        clockIn.setHours(9, lateMinutes, 0);
                    } else {
                        clockIn.setHours(8, 45 + Math.floor(Math.random() * 15), 0); // Arriving slightly early
                    }

                    if (status !== 'Absent') {
                        const clockOut = new Date(current);
                        clockOut.setHours(18, Math.floor(Math.random() * 20), 0);
                        const workedHours = (clockOut - clockIn) / (1000 * 60 * 60);

                        dtrEntries.push({
                            employeeId: emp.employeeId,
                            date: dateStr,
                            clockIn,
                            clockOut,
                            status,
                            lateMinutes,
                            workedHours: parseFloat(workedHours.toFixed(2))
                        });
                    } else {
                        dtrEntries.push({
                            employeeId: emp.employeeId,
                            date: dateStr,
                            clockIn: new Date(current.setHours(9, 0, 0)),
                            status,
                            lateMinutes: 0,
                            workedHours: 0
                        });
                    }
                }
                current.setDate(current.getDate() + 1);
            }
        }

        // Clear all dtr except Luna
        await DTR.deleteMany({ employeeId: { $ne: lunaId } });
        await DTR.insertMany(dtrEntries);
        console.log(`Successfully seeded ${dtrEntries.length} DTR logs`);

        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
