import express from 'express';
const router = express.Router();
import {
    loginEmployee,
    logoutEmployee,
    getEmployeeProfile
} from '../controllers/employee/authController.js';
import {
    markCheckIn,
    markCheckOut
} from '../controllers/employee/attendanceController.js';
import { protectEmployee } from '../middleware/authMiddleware.js';

import {
    applyForLeave, getMyLeaveRequests, getMyLeaveBalance
} from '../controllers/employee/leaveController.js';

import {
    createMyTask,
    getMyTasks,
    updateMyTask,
    updateMyTaskStatus,
} from '../controllers/employee/taskController.js';
import { // Payslip Controller Imports
    getMyPayslips,
    getMyPayslipById,
    downloadMyPayslip,
} from '../controllers/employee/payslipController.js';

// --- Authentication ---
router.post('/login', loginEmployee);
router.post('/logout', logoutEmployee); // Should be protected? Typically yes.
router.get('/profile', protectEmployee, getEmployeeProfile); // Protect profile route

// --- Attendance ---
router.post('/attendance/checkin', protectEmployee, markCheckIn);
router.post('/attendance/checkout', protectEmployee, markCheckOut);


router.post('/leave/apply', protectEmployee, applyForLeave);
router.get('/leave/requests', protectEmployee, getMyLeaveRequests); // e.g., /requests?status=Pending&page=1
router.get('/leave/balance', protectEmployee, getMyLeaveBalance);


router.post('/tasks', protectEmployee, createMyTask);          // Create task for self
router.get('/tasks', protectEmployee, getMyTasks);              // Get my tasks (filter by status)
router.put('/tasks/:taskId', protectEmployee, updateMyTask);      // Update my task
router.patch('/tasks/:taskId/status', protectEmployee, updateMyTaskStatus); // Mark my task complete/reopen

router.get('/payslips', protectEmployee, getMyPayslips); // Get my released payslips (paginated)
router.get('/payslips/:payslipId', protectEmployee, getMyPayslipById); // Get details of my specific payslip
router.get('/payslips/:payslipId/download', protectEmployee, downloadMyPayslip);
export default router;