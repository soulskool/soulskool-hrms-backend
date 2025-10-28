import Salary from '../../models/Salary.js';
import Employee from '../../models/Employee.js';
import mongoose from 'mongoose';

// @desc    Create salary details for an employee
// @route   POST /api/admin/salaries
// @access  Private (Admin)
const createSalary = async (req, res) => {
    const { employeeId, monthlySalary, professionalTax, bankDetails } = req.body; // Expect Employee ObjectId

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({ message: 'Invalid Employee ID format.' });
    }
    if (monthlySalary === undefined || professionalTax === undefined) {
        return res.status(400).json({ message: 'Monthly Salary and Professional Tax are required.' });
    }

    try {
        // 1. Verify Employee exists
        const employee = await Employee.findById(employeeId).select('employeeInfo.employeeId employeeInfo.name isActive'); // Fetch name and isActive too
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found.' });
        }
        if (!employee.isActive) {
             return res.status(400).json({ message: 'Cannot add salary for an inactive employee.' });
        }

        // 2. Check if salary already exists
        const salaryExists = await Salary.findOne({ employee: employeeId });
        if (salaryExists) {
            return res.status(400).json({ message: 'Salary details already exist for this employee. Use update instead.' });
        }

        // 3. Create new salary record
        const newSalary = await Salary.create({
            employee: employeeId,
            employeeIdString: employee.employeeInfo.employeeId,
            monthlySalary,
            professionalTax,
            bankDetails: bankDetails || {},
        });

        // 4. *** FIX: Populate the employee details before sending response ***
        const populatedSalary = await Salary.findById(newSalary._id)
            .populate('employee', 'employeeInfo.name employeeInfo.employeeId isActive'); // Populate needed fields

        res.status(201).json(populatedSalary); // Send the populated object

    } catch (error) {
        console.error("Error creating salary:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Failed: ${messages.join(', ')}` });
        }
         if (error.code === 11000) {
            return res.status(400).json({ message: 'Salary details already exist for this employee (duplicate key).' });
        }
        res.status(500).json({ message: 'Server error creating salary details.' });
    }
};
// @desc    Get salary details for a specific employee
// @route   GET /api/admin/salaries/employee/:employeeId
// @access  Private (Admin)
const getSalaryByEmployeeId = async (req, res) => {
    const { employeeId } = req.params; // Expect Employee ObjectId

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({ message: 'Invalid Employee ID format.' });
    }

    try {
        const salary = await Salary.findOne({ employee: employeeId })
            .populate('employee', 'employeeInfo.name employeeInfo.employeeId'); // Populate basic info

        if (!salary) {
            return res.status(404).json({ message: 'Salary details not found for this employee.' });
        }
        res.json(salary);
    } catch (error) {
        console.error("Error fetching salary:", error);
        res.status(500).json({ message: 'Server error fetching salary details.' });
    }
};


// @desc    Update salary details for an employee
// @route   PUT /api/admin/salaries/:salaryId
// @access  Private (Admin)
const updateSalary = async (req, res) => {
    const { salaryId } = req.params; // Expect Salary ObjectId
    const { monthlySalary, professionalTax , bankDetails} = req.body;

    if (!mongoose.Types.ObjectId.isValid(salaryId)) {
        return res.status(400).json({ message: 'Invalid Salary Record ID format.' });
    }

    const updates = {};
    if (monthlySalary !== undefined) updates.monthlySalary = monthlySalary;
    if (professionalTax !== undefined) updates.professionalTax = professionalTax;


if (bankDetails && typeof bankDetails === 'object') {
        for (const key in bankDetails) {
            if (Object.hasOwnProperty.call(bankDetails, key)) {
                // Only set if the value is provided (allows clearing fields if needed by sending empty string/null)
                 updates[`bankDetails.${key}`] = bankDetails[key];
            }
        }
    }

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No update fields provided.' });
    }



    
    try {
        const updatedSalary = await Salary.findByIdAndUpdate(
            salaryId,
            { $set: updates },
            { new: true, runValidators: true } // Return updated doc, run schema validation
        ).populate('employee', 'employeeInfo.name employeeInfo.employeeId isActive');

        if (!updatedSalary) {
            return res.status(404).json({ message: 'Salary record not found.' });
        }

        res.json(updatedSalary);

    } catch (error) {
        console.error("Error updating salary:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Failed: ${messages.join(', ')}` });
        }
        res.status(500).json({ message: 'Server error updating salary details.' });
    }
};

// @desc    Delete salary details for an employee
// @route   DELETE /api/admin/salaries/:salaryId
// @access  Private (Admin)
const deleteSalary = async (req, res) => {
    const { salaryId } = req.params; // Expect Salary ObjectId

    if (!mongoose.Types.ObjectId.isValid(salaryId)) {
        return res.status(400).json({ message: 'Invalid Salary Record ID format.' });
    }

    try {
        // Optional: Check if payslips exist that reference this salary? Prevent deletion?
        // const payslipsExist = await Payslip.exists({ salaryDetails: salaryId });
        // if (payslipsExist) {
        //     return res.status(400).json({ message: 'Cannot delete salary record as payslips reference it.' });
        // }

        const deletedSalary = await Salary.findByIdAndDelete(salaryId);

        if (!deletedSalary) {
            return res.status(404).json({ message: 'Salary record not found.' });
        }

        res.json({ message: 'Salary details deleted successfully.' });

    } catch (error) {
        console.error("Error deleting salary:", error);
        res.status(500).json({ message: 'Server error deleting salary details.' });
    }
};

// @desc    Get all salary records (optional: add pagination)
// @route   GET /api/admin/salaries
// @access  Private (Admin)
const getAllSalaries = async (req, res) => {
    try {
        const salaries = await Salary.find({})
            .populate('employee', 'employeeInfo.name employeeInfo.employeeId isActive') // Populate employee info
            .sort({ createdAt: -1 }); // Sort by creation date
        res.json(salaries);
    } catch (error) {
         console.error("Error fetching all salaries:", error);
        res.status(500).json({ message: 'Server error fetching salary list.' });
    }
};


export {
    createSalary,
    getSalaryByEmployeeId,
    updateSalary,
    deleteSalary,
    getAllSalaries,
};