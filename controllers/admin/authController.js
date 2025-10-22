// controllers/admin/authController.js
import Admin from '../../models/Admin.js';
import jwt from 'jsonwebtoken';

// @desc    Auth admin & get token
// @route   POST /api/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });

    if (admin && (await admin.matchPassword(password))) {
      const token = jwt.sign({ userId: admin._id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
      });

      res.cookie('jwt_admin', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development', // Use secure cookies in production
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.json({
        _id: admin._id,
        name: admin.name,
        email: admin.email,
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Logout admin / clear cookie
// @route   POST /api/admin/logout
// @access  Private
const logoutAdmin = (req, res) => {
  res.cookie('jwt_admin', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Get admin profile
// @route   GET /api/admin/profile
// @access  Private
const getAdminProfile = async (req, res) => {
    if (req.admin) {
        res.json({
            _id: req.admin._id,
            name: req.admin.name,
            email: req.admin.email,
        });
    } else {
        res.status(404).json({ message: 'Admin not found' });
    }
};

export { loginAdmin, logoutAdmin, getAdminProfile };