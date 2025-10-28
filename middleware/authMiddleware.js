// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Employee from '../models/Employee.js';

const protectAdmin = async (req, res, next) => {
  let token;

  token = req.cookies.jwt_admin;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.admin = await Admin.findById(decoded.userId).select('-password');
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const protectEmployee = async (req, res, next) => {
  let token = req.cookies.jwt_employee; // Use a different cookie name

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Fetch employee, explicitly selecting necessary fields and excluding password
      // Important: Ensure employeeInfo.employeeId is selected if needed later
      req.employee = await Employee.findById(decoded.userId).select('-employeeInfo.password');
       if (!req.employee) {
           throw new Error('Employee not found');
       }
       // Add employee string ID to request for convenience
       req.employeeIdString = req.employee.employeeInfo.employeeId;
      next();
    } catch (error) {
      console.error('Employee Auth Error:', error.message);
      res.status(401).json({ message: 'Not authorized as employee, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized as employee, no token' });
  }
};

export { protectAdmin, protectEmployee };