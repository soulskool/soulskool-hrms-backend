// routes/adminRoutes.js
import express from 'express';
const router = express.Router();
import {
  loginAdmin,
  logoutAdmin,
  getAdminProfile,
} from '../controllers/admin/authController.js';
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from '../controllers/admin/employeeController.js';
import { protectAdmin } from '../middleware/authMiddleware.js';
import { upload } from '../utils/bunnyCdn.js';
import {
    getTodayAttendanceOverview,
    getPastAttendanceRecords,
    exportMonthlyAttendanceExcel
} from '../controllers/admin/attendanceController.js';

import {
    getPendingLeaveRequests,
    updateLeaveRequestStatus,
    getAllLeaveBalances,
    updateEmployeeLeaveBalance,
    getApprovedLeaveHistory,
} from '../controllers/admin/leaveController.js';

import {
    adminCreateTask,
    adminGetAllTasks,
    adminUpdateTask,
    adminUpdateTaskStatus,
    adminDeleteTask,
    exportMonthlyTasksExcel,
} from '../controllers/admin/taskController.js';



import { // Salary Controller Imports
    createSalary,
    getSalaryByEmployeeId,
    updateSalary,
    deleteSalary,
    getAllSalaries,
} from '../controllers/admin/salaryController.js';
import { // Payslip Controller Imports
    generatePayslip,
    getPayslips,
    getPayslipById,
    releasePayslip,
    deletePayslip,
    downloadPayslip,
    exportMonthlyPayslipStatement,
    getMonthlyPayslipStatement,
} from '../controllers/admin/payslipController.js';









// Auth Routes
router.post('/login', loginAdmin);
router.post('/logout', logoutAdmin);
router.get('/profile', protectAdmin, getAdminProfile);

// Employee Management Routes
router.route('/employees')
  .post(protectAdmin, upload.single('profilePicture'), createEmployee)
  .get(protectAdmin, getAllEmployees);

router.route('/employees/:id')
  .get(protectAdmin, getEmployeeById)
  .put(protectAdmin, upload.single('profilePicture'), updateEmployee)
  .delete(protectAdmin, deleteEmployee);



router.get('/attendance/today-overview', protectAdmin, getTodayAttendanceOverview);
router.get('/attendance/history', protectAdmin, getPastAttendanceRecords);

// --- Leave Management Routes (Admin) ---
router.get('/leave/pending', protectAdmin, getPendingLeaveRequests);
router.put('/leave/requests/:requestId', protectAdmin, updateLeaveRequestStatus); 
router.get('/leave/approved', protectAdmin, getApprovedLeaveHistory);
router.get('/leave/balances', protectAdmin, getAllLeaveBalances);
router.put('/leave/balances/:employeeId', protectAdmin, updateEmployeeLeaveBalance); // Update specific employee balance


router.post('/tasks', protectAdmin, adminCreateTask);           // Create task for any employee
router.get('/tasks', protectAdmin, adminGetAllTasks);           // Get all tasks (filterable)
router.put('/tasks/:taskId', protectAdmin, adminUpdateTask);       // Update any task
router.patch('/tasks/:taskId/status', protectAdmin, adminUpdateTaskStatus); // Mark any task complete/reopen
router.delete('/tasks/:taskId', protectAdmin, adminDeleteTask);
router.get('/tasks/export', protectAdmin, exportMonthlyTasksExcel);


// --- Salary Management (Admin) ---
router.post('/salaries', protectAdmin, createSalary);
router.get('/salaries', protectAdmin, getAllSalaries);
router.get('/salaries/employee/:employeeId', protectAdmin, getSalaryByEmployeeId);
router.put('/salaries/:salaryId', protectAdmin, updateSalary);
router.delete('/salaries/:salaryId', protectAdmin, deleteSalary);




// --- Payslip Management (Admin) ---
router.post('/payslips/generate', protectAdmin, generatePayslip);
router.get('/payslips', protectAdmin, getPayslips); // List payslips (admin view)
router.get('/payslips/:payslipId', protectAdmin, getPayslipById); // Get specific payslip details
router.patch('/payslips/:payslipId/release', protectAdmin, releasePayslip); // Mark as released
router.delete('/payslips/:payslipId', protectAdmin, deletePayslip);
router.get('/payslips/:payslipId/download', protectAdmin, downloadPayslip);

router.get('/payslips/statement/data', protectAdmin, getMonthlyPayslipStatement);
router.get('/payslips/statement/export', protectAdmin, exportMonthlyPayslipStatement);


router.get('/attendance/export', protectAdmin, exportMonthlyAttendanceExcel);

export default router;