import express from 'express';
import {
    getEmployeeDTR,
    clockIn,
    clockOut,
    getAttendanceSummary,
    getDailyReport,
    processDailyAttendance
} from '../controllers/dtrController.js';

const router = express.Router();

router.get('/:employeeId', getEmployeeDTR);
router.get('/summary/:employeeId', getAttendanceSummary);
router.get('/report/:date', getDailyReport);
router.post('/process', processDailyAttendance);
router.post('/clockin', clockIn);
router.post('/clockout', clockOut);

export default router;