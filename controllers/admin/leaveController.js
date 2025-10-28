// hr-portal-backend/src/controllers/admin/leaveController.js

import LeaveRequest from '../../models/LeaveRequest.js';
import Employee from '../../models/Employee.js';
import mongoose from 'mongoose';

// @desc    Get all pending leave requests for admin review
// @route   GET /api/admin/leave/pending
// @access  Private (Admin)
const getPendingLeaveRequests = async (req, res) => {
    try {
        const pendingRequests = await LeaveRequest.find({ status: 'Pending' })
            .populate('employee', 'employeeInfo.name employeeInfo.employeeId') // Populate basic employee info
            .sort({ createdAt: 'asc' }); // Sort by oldest first

        res.json(pendingRequests);
    } catch (error) {
        console.error("Error fetching pending leave requests:", error);
        res.status(500).json({ message: 'Server error fetching pending requests.' });
    }
};

// @desc    Approve or Reject a leave request
// @route   PUT /api/admin/leave/requests/:requestId
// @access  Private (Admin)
// const updateLeaveRequestStatus = async (req, res) => {
//     const { requestId } = req.params;
//     const { status, adminRemarks } = req.body; // Expect 'Approved' or 'Rejected'
//     const adminId = req.admin._id; // Admin taking the action

//     if (!mongoose.Types.ObjectId.isValid(requestId)) {
//         return res.status(400).json({ message: 'Invalid Leave Request ID.' });
//     }
//     if (!['Approved', 'Rejected'].includes(status)) {
//         return res.status(400).json({ message: 'Invalid status provided.' });
//     }

//     const session = await mongoose.startSession(); // Use transaction for multi-doc update
//     session.startTransaction();

//     try {
//         const leaveRequest = await LeaveRequest.findById(requestId).session(session);

//         if (!leaveRequest) {
//             await session.abortTransaction();
//             session.endSession();
//             return res.status(404).json({ message: 'Leave request not found.' });
//         }

//         if (leaveRequest.status !== 'Pending') {
//              await session.abortTransaction();
//              session.endSession();
//             return res.status(400).json({ message: `Request already ${leaveRequest.status.toLowerCase()}.` });
//         }

//         // Update the leave request
//         leaveRequest.status = status;
//         leaveRequest.actionTakenBy = adminId;
//         leaveRequest.actionTakenAt = new Date();
//         leaveRequest.adminRemarks = adminRemarks || ''; // Optional remarks

//         // If Approved, deduct leave balance
//         if (status === 'Approved') {
//             const employee = await Employee.findById(leaveRequest.employee).session(session);
//             if (!employee) {
//                 throw new Error('Employee associated with the leave request not found.');
//             }

//             const leaveType = leaveRequest.leaveType; // 'earned', 'sick', or 'casual'
//             const daysToDeduct = leaveRequest.numberOfDays;

//             if (employee.leaveBalances[leaveType] === undefined || employee.leaveBalances[leaveType] < daysToDeduct) {
//                 throw new Error(`Insufficient ${leaveType} leave balance for employee ${employee.employeeInfo.employeeId}.`);
//             }

//             employee.leaveBalances[leaveType] -= daysToDeduct;
//             await employee.save({ session }); // Save employee within transaction
//         }

//         await leaveRequest.save({ session }); // Save leave request within transaction

//         await session.commitTransaction();
//         session.endSession();

//         res.json({ message: `Leave request ${status.toLowerCase()} successfully.`, request: leaveRequest });

//     } catch (error) {
//         await session.abortTransaction();
//         session.endSession();
//         console.error("Error updating leave request status:", error);
//         res.status(500).json({ message: 'Server error while updating leave status.', error: error.message });
//     }
// };



const updateLeaveRequestStatus = async (req, res) => {
    const { requestId } = req.params;
    const { status, adminRemarks } = req.body; // Expect 'Approved' or 'Rejected'
    const adminId = req.admin._id;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({ message: 'Invalid Leave Request ID.' });
    }
    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status provided.' });
    }

    try {
        // Find the leave request first
        const leaveRequest = await LeaveRequest.findById(requestId);

        if (!leaveRequest) {
            return res.status(404).json({ message: 'Leave request not found.' });
        }

        if (leaveRequest.status !== 'Pending') {
            return res.status(400).json({ message: `Request already ${leaveRequest.status.toLowerCase()}.` });
        }

        // --- Perform updates sequentially ---

        // 1. If Approved, find and update the employee's balance first
        if (status === 'Approved') {
            const employee = await Employee.findById(leaveRequest.employee);
            if (!employee) {
                // If employee not found, maybe reject the request? Or just log and proceed?
                // For now, let's reject the action.
                return res.status(404).json({ message: `Employee (${leaveRequest.employee}) not found. Cannot approve leave.` });

                // OR: throw new Error('Employee associated with the leave request not found.');
            }

            const leaveType = leaveRequest.leaveType;
            const daysToDeduct = leaveRequest.numberOfDays;

            if (employee.leaveBalances[leaveType] === undefined || employee.leaveBalances[leaveType] < daysToDeduct) {
                // Not enough balance, prevent approval
                return res.status(400).json({ message: `Insufficient ${leaveType} leave balance for employee ${employee.employeeInfo.employeeId}. Cannot approve.` });

                // OR: throw new Error(`Insufficient ${leaveType} leave balance...`);
            }

            // Deduct balance and save employee document
            employee.leaveBalances[leaveType] -= daysToDeduct;
            await employee.save(); // Save the employee update
        }

        // 2. Update the leave request status and details
        leaveRequest.status = status;
        leaveRequest.actionTakenBy = adminId;
        leaveRequest.actionTakenAt = new Date();
        leaveRequest.adminRemarks = adminRemarks || '';

        // Save the leave request update
        const updatedLeaveRequest = await leaveRequest.save();

        // --- End sequential updates ---

        res.json({ message: `Leave request ${status.toLowerCase()} successfully.`, request: updatedLeaveRequest });

    } catch (error) {
        // Catch errors from either save operation
        console.error("Error updating leave request status:", error);
        // Provide specific feedback if balance check failed implicitly (though explicit checks are above)
         if (error.message.includes('Insufficient')) {
              return res.status(400).json({ message: error.message });
         }
        res.status(500).json({ message: 'Server error while updating leave status.', error: error.message });
    }
};











// @desc    Get leave balances for all employees
// @route   GET /api/admin/leave/balances
// @access  Private (Admin)
const getAllLeaveBalances = async (req, res) => {
    try {
        const employees = await Employee.find({ isActive: true }) // Optionally filter by active
            .select('employeeInfo.name employeeInfo.employeeId leaveBalances')
            .sort('employeeInfo.name');

        res.json(employees);
    } catch (error) {
        console.error("Error fetching all leave balances:", error);
        res.status(500).json({ message: 'Server error fetching leave balances.' });
    }
};

// @desc    Update leave balance for a specific employee
// @route   PUT /api/admin/leave/balances/:employeeId
// @access  Private (Admin)
const updateEmployeeLeaveBalance = async (req, res) => {
    const { employeeId } = req.params; // This is the ObjectId
    const { earned, sick, casual } = req.body; // Expect numbers

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({ message: 'Invalid Employee ID format.' });
    }

    // Validate input balances
    const updates = {};
    if (earned !== undefined && typeof earned === 'number' && earned >= 0) updates['leaveBalances.earned'] = earned;
    if (sick !== undefined && typeof sick === 'number' && sick >= 0) updates['leaveBalances.sick'] = sick;
    if (casual !== undefined && typeof casual === 'number' && casual >= 0) updates['leaveBalances.casual'] = casual;

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No valid leave balance updates provided.' });
    }

    try {
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found.' });
        }

        // Use findByIdAndUpdate for atomic update if possible, or fetch/save
        const updatedEmployee = await Employee.findByIdAndUpdate(
            employeeId,
            { $set: updates },
            { new: true, runValidators: true } // Return updated doc, run schema validators
        ).select('employeeInfo.name employeeInfo.employeeId leaveBalances'); // Select relevant fields

        if (!updatedEmployee) {
             return res.status(404).json({ message: 'Employee not found during update.' });
        }

        res.json({ message: 'Leave balances updated successfully.', employee: updatedEmployee });

    } catch (error) {
        console.error("Error updating leave balance:", error);
         if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Failed: ${messages.join(', ')}` });
        }
        res.status(500).json({ message: 'Server error updating leave balance.' });
    }
};


export {
    getPendingLeaveRequests,
    updateLeaveRequestStatus,
    getAllLeaveBalances,
    updateEmployeeLeaveBalance,
};