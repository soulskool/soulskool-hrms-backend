// controllers/admin/employeeController.js
import Employee from '../../models/Employee.js';
import { uploadToBunny } from '../../utils/bunnyCdn.js';


// // Helper function to remove empty string properties from an object recursively
// const cleanEmptyStrings = (obj) => {
//   if (obj === null || obj === undefined) return obj;
//   Object.keys(obj).forEach(key => {
//     if (typeof obj[key] === 'object' && obj[key] !== null) {
//       cleanEmptyStrings(obj[key]);
//     } else if (obj[key] === '') {
//       delete obj[key]; // Remove the key if its value is an empty string
//     }
//   });
//   return obj;
// };

// /**
//  * @desc    Create a new employee
//  * @route   POST /api/admin/employees
//  * @access  Private/Admin
//  */
//  const createEmployee = async (req, res) => {
//   try {
//     if (!req.body.jsonData) {
//       return res.status(400).json({ message: 'Employee data is missing.' });
//     }
//     const rawData = JSON.parse(req.body.jsonData);

//     // Clean the data to remove empty strings before validation
//     const data = cleanEmptyStrings(rawData);
    
//     const { employeeInfo } = data;

//     if (!employeeInfo || !employeeInfo.name || !employeeInfo.employeeId || !employeeInfo.password || !employeeInfo.email) {
//       return res.status(400).json({ message: 'Name, Employee ID, Email, and Password are required.' });
//     }

//     const employeeExists = await Employee.findOne({ 'employeeInfo.employeeId': employeeInfo.employeeId });
//     if (employeeExists) {
//       return res.status(400).json({ message: 'An employee with this ID already exists.' });
//     }

//     let profilePictureUrl = '';
//     if (req.file) {
//       const fileName = `profile-pictures/${employeeInfo.employeeId}-${Date.now()}`;
//       profilePictureUrl = await uploadToBunny(req.file.buffer, fileName);
//     }
    
//     const employee = new Employee({
//       ...data,
//       employeeInfo: {
//         ...employeeInfo,
//         profilePicture: profilePictureUrl,
//       },
//     });

//     const createdEmployee = await employee.save();
//     res.status(201).json(createdEmployee);

//   } catch (error) {
//     console.warn('Error creating employee:', error);
//     if (error.name === 'ValidationError') {
//         return res.status(400).json({ message: error.message });
//     }
//     res.status(500).json({ message: 'Server Error', error: error.message });
//   }
// };


// /**
//  * @desc    Update an existing employee
//  * @route   PUT /api/admin/employees/:id
//  * @access  Private/Admin
//  */
// const updateEmployee = async (req, res) => {
//   try {
//     const employee = await Employee.findById(req.params.id);
//     if (!employee) {
//       return res.status(404).json({ message: 'Employee not found.' });
//     }
    
//     if (!req.body.jsonData) {
//       return res.status(400).json({ message: 'Employee data is missing.' });
//     }
//     const rawData = JSON.parse(req.body.jsonData);

//     // Clean the data to remove empty strings
//     const data = cleanEmptyStrings(rawData);

//     // Prevent password from being updated this way
//     if (data.employeeInfo) {
//         delete data.employeeInfo.password;
//     }

//     // Deep merge the new data into the existing employee document
//     employee.set(data, { merge: true });

//     if (req.file) {
//       const fileName = `profile-pictures/${employee.employeeInfo.employeeId}-${Date.now()}`;
//       employee.employeeInfo.profilePicture = await uploadToBunny(req.file.buffer, fileName);
//     }

//     const updatedEmployee = await employee.save();
//     res.json(updatedEmployee);

//   } catch (error) {
//     console.warn('Error updating employee:', error);
//      if (error.name === 'ValidationError') {
//         return res.status(400).json({ message: error.message });
//     }
//     res.status(500).json({ message: 'Server Error', error: error.message });
//   }
// };


// // @desc    Get all employees
// // @route   GET /api/admin/employees
// // @access  Private/Admin
// const getAllEmployees = async (req, res) => {
//   try {
//     const employees = await Employee.find({}).select('employeeInfo.name employeeInfo.employeeId jobDetails.currentPosition');
//     res.json(employees);
//   } catch (error) {
//     res.status(500).json({ message: 'Server Error', error: error.message });
//   }
// };







const cleanEmptyStrings = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'object') {
      cleanEmptyStrings(obj[key]);
      if (Object.keys(obj[key]).length === 0 && !(obj[key] instanceof Date) && !Array.isArray(obj[key])) {
         delete obj[key];
      }
    } else if (obj[key] === '') {
      delete obj[key];
    }
  });
  if(Object.keys(obj).length === 0 && !(obj instanceof Date) && !Array.isArray(obj)) {
      return undefined;
  }
  return obj;
};

/**
 * @desc    Create a new employee
 * @route   POST /api/admin/employees
 * @access  Private/Admin
 */
 const createEmployee = async (req, res) => {
  try {
    if (!req.body.jsonData) {
      return res.status(400).json({ message: 'Employee data is missing.' });
    }
    let data = JSON.parse(req.body.jsonData);
    data = cleanEmptyStrings(data);

    const { employeeInfo, isActive } = data;

    if (!employeeInfo || !employeeInfo.name || !employeeInfo.employeeId || !employeeInfo.password || !employeeInfo.email) {
      return res.status(400).json({ message: 'Name, Employee ID, Email, and Password are required.' });
    }

    const employeeExists = await Employee.findOne({ 'employeeInfo.employeeId': employeeInfo.employeeId });
    if (employeeExists) {
      return res.status(400).json({ message: 'An employee with this ID already exists.' });
    }

    let profilePictureUrl = '';
  if (req.file) {
      const fileName = `${employeeInfo.employeeId}-${Date.now()}`; // Just the base file name
      // Pass the folder name as the third argument
      profilePictureUrl = await uploadToBunny(req.file.buffer, fileName, 'employee-pictures');
    }

    const employeeData = {
        ...data,
        employeeInfo: {
            ...employeeInfo,
            // Password saved directly (plain text)
            profilePicture: profilePictureUrl,
        },
        isActive: isActive !== undefined ? isActive : true,
    };

    const employee = new Employee(employeeData);
    const createdEmployee = await employee.save();
    res.status(201).json(createdEmployee);

  } catch (error) {
    console.error('Error creating employee:', error);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ message: `Validation Failed: ${messages.join(', ')}` });
    }
    res.status(500).json({ message: 'Server Error occurred while creating employee.', error: error.message });
  }
};


/**
 * @desc    Update an existing employee
 * @route   PUT /api/admin/employees/:id
 * @access  Private/Admin
 */
 const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id); // No need to select password, it's not hidden
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    if (!req.body.jsonData) {
      return res.status(400).json({ message: 'Employee data is missing.' });
    }
    let data = JSON.parse(req.body.jsonData);
    data = cleanEmptyStrings(data);

    // If a new password is provided, save it directly (plain text)
    // If no password is provided in the form data, the existing one remains untouched by employee.set()
    if (data.employeeInfo && data.employeeInfo.password === '') {
        // If user explicitly cleared the password field, maybe prevent it or handle as needed
        // For now, let's just delete it so .set() doesn't try to save an empty string if required
         delete data.employeeInfo.password;
         // Alternatively, ensure password is NEVER set to empty if required=true
         // data.employeeInfo.password = employee.employeeInfo.password; // Keep old one
    }

    if (data.isActive !== undefined) {
      employee.isActive = data.isActive;
    }

    // Merge other data
    employee.set(data);

    // Handle profile picture update
    if (req.file) {
      const fileName = `${employee.employeeInfo.employeeId}-${Date.now()}`;
      // Pass the folder name as the third argument
      employee.employeeInfo.profilePicture = await uploadToBunny(req.file.buffer, fileName, 'employee-pictures');
    }

    const updatedEmployee = await employee.save();
    res.json(updatedEmployee);

  } catch (error) {
    console.error('Error updating employee:', error);
     if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ message: `Validation Failed: ${messages.join(', ')}` });
    }
    res.status(500).json({ message: 'Server Error occurred while updating employee.', error: error.message });
  }
};


/**
 * @desc    Get all employees (including inactive, with ALL data)
 * @route   GET /api/admin/employees
 * @access  Private/Admin
 */
const getAllEmployees = async (req, res) => {
  try {
    // Fetch ALL fields for all employees
    const employees = await Employee.find({}) // Fetch both active and inactive
        .sort({ createdAt: -1 }); // Sort by creation date
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};







 const getEmployeeById = async (req, res) => {
  try {
    // Explicitly exclude the password field
    const employee = await Employee.findById(req.params.id).select('-employeeInfo.password');
    if (employee) {
      res.json(employee);
    } else {
      res.status(404).json({ message: 'Employee not found' });
    }
  } catch (error) {
    console.error('Error fetching employee by ID:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Delete an employee permanently (Hard Delete)
 * @route   DELETE /api/admin/employees/:id
 * @access  Private/Admin
 */
 const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id); // CHANGED to findByIdAndDelete

    if (employee) {
      // Optionally: Delete associated files (like profile picture) from BunnyCDN here
      res.json({ message: 'Employee deleted successfully' });
    } else {
      res.status(404).json({ message: 'Employee not found' });
    }
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
};