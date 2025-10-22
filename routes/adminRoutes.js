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

export default router;