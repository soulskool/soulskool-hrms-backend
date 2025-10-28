import Employee from '../../models/Employee.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs'; // Need bcrypt to compare passwords

// @desc    Auth employee & get token
// @route   POST /api/employee/login
// @access  Public
const loginEmployee = async (req, res) => {
  const { employeeId, password } = req.body;

  if (!employeeId || !password) {
      return res.status(400).json({ message: 'Please provide Employee ID and Password' });
  }

  try {
    // Find employee by employeeId and explicitly select the password for comparison
    const employee = await Employee.findOne({ 'employeeInfo.employeeId': employeeId }).select('+employeeInfo.password');

    if (employee && employee.employeeInfo.password) {
       // Compare submitted password with stored plain text password
       const isMatch = (password === employee.employeeInfo.password);
       // NOTE: If you were using hashing, it would be:
       // const isMatch = await bcrypt.compare(password, employee.employeeInfo.password);

       if (isMatch) {
            // Check if employee account is active
            if (!employee.isActive) {
                return res.status(403).json({ message: 'Account is inactive. Please contact HR.' });
            }

            // Generate JWT
            const token = jwt.sign({ userId: employee._id }, process.env.JWT_SECRET, {
                expiresIn: '30d', // Token expires in 30 days
            });

            // Set JWT as an HTTP-Only cookie
            res.cookie('jwt_employee', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
                sameSite: 'strict', // Prevent CSRF attacks
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            });

            // Send back employee info (excluding password)
            res.json({
                _id: employee._id,
                name: employee.employeeInfo.name,
                email: employee.employeeInfo.email,
                employeeId: employee.employeeInfo.employeeId,
                profilePicture: employee.employeeInfo.profilePicture,
                // Add any other info needed on the frontend dashboard
            });
       } else {
            res.status(401).json({ message: 'Invalid Employee ID or Password' });
       }
    } else {
      res.status(401).json({ message: 'Invalid Employee ID or Password' });
    }
  } catch (error) {
    console.error('Employee Login Error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Logout employee / clear cookie
// @route   POST /api/employee/logout
// @access  Private (Employee)
const logoutEmployee = (req, res) => {
  res.cookie('jwt_employee', '', {
    httpOnly: true,
    expires: new Date(0), // Set expiry to past date
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Get employee profile (Get Me)
// @route   GET /api/employee/profile
// @access  Private (Employee)
const getEmployeeProfile = async (req, res) => {
    // req.employee is populated by the protectEmployee middleware
    if (req.employee) {
        res.json({
            _id: req.employee._id,
            name: req.employee.employeeInfo.name,
            email: req.employee.employeeInfo.email,
            employeeId: req.employee.employeeInfo.employeeId,
            profilePicture: req.employee.employeeInfo.profilePicture,
             // Add any other necessary fields
        });
    } else {
        // This case should ideally not be reached if protectEmployee works correctly
        res.status(404).json({ message: 'Employee not found' });
    }
};

export { loginEmployee, logoutEmployee, getEmployeeProfile };