// hr-portal-backend/src/controllers/employee/leaveController.js

import LeaveRequest from '../../models/LeaveRequest.js';
import Employee from '../../models/Employee.js'; // Needed to check balance maybe
import mongoose from 'mongoose';
//import calculateLeaveDays from '../../models/LeaveRequest.js'

// Helper function to calculate leave duration (moved here or import from utils)
const calculateLeaveDays = (fromDate, toDate, fromSession, toSession) => {
    try {
        const start = new Date(fromDate);
        const end = new Date(toDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
             throw new Error("Invalid date format provided.");
        }
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        if (end < start) {
            throw new Error("To date cannot be earlier than from date.");
        }

        const diffTime = Math.abs(end - start);
        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (fromSession === 'Session 2') diffDays -= 0.5;
        if (toSession === 'Session 1') diffDays -= 0.5;

        if (diffDays <= 0 && fromSession === toSession) return 0.5; // Same day, one session
        if (diffDays <= 0 && fromSession !== toSession) return 1;   // Same day, both sessions
        if (diffDays < 0.5) return 0.5; // Catch any edge cases resulting in less than 0.5

        return diffDays;
    } catch (e) {
        console.error("Error calculating leave days:", e.message);
        // Re-throw or return an indicator of error
        throw new Error(`Could not calculate leave duration: ${e.message}`);
    }
};


// @desc    Apply for leave
// @route   POST /api/employee/leave/apply
// @access  Private (Employee)
const applyForLeave = async (req, res) => {
    const { leaveType, fromDate, toDate, fromSession, toSession, reason, applyingTo } = req.body;
    const employeeId = req.employee._id;

    if (!leaveType || !fromDate || !toDate || !fromSession || !toSession || !reason) {
        return res.status(400).json({ message: 'All fields marked * are required.' });
    }

    let requestedDays;
    try {
        // Calculate days *before* creating the document
        requestedDays = calculateLeaveDays(fromDate, toDate, fromSession, toSession);
        if (requestedDays < 0.5) {
             throw new Error("Calculated leave duration is invalid (< 0.5 days).");
        }
    } catch (error) {
         console.error("Leave Calculation Error on Apply:", error);
         return res.status(400).json({ message: error.message || 'Could not calculate leave duration.' });
    }

    try {
        // Check balance (optional, uncommented as requested)
        const employee = await Employee.findById(employeeId).select('leaveBalances');
        if (!employee || !employee.leaveBalances || employee.leaveBalances[leaveType] === undefined) {
             return res.status(400).json({ message: `Leave balance information not found.` });
        }
        if (employee.leaveBalances[leaveType] < requestedDays) {
            return res.status(400).json({ message: `Insufficient ${leaveType} leave balance (${employee.leaveBalances[leaveType]} available).` });
        }

        // Create the new request, including the calculated numberOfDays
        const newLeaveRequest = new LeaveRequest({
            employee: employeeId,
            leaveType,
            fromDate: new Date(fromDate),
            toDate: new Date(toDate),
            fromSession,
            toSession,
            reason,
            applyingTo,
            status: 'Pending',
            numberOfDays: requestedDays, // Pass the calculated value
        });

        // No need for explicit .validate() here, .save() will do it
        const savedRequest = await newLeaveRequest.save();

        res.status(201).json({ message: 'Leave request submitted successfully.', request: savedRequest });

    } catch (error) {
        console.error("Error applying for leave:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Failed: ${messages.join(', ')}` });
        }
        // Handle potential errors from calculateLeaveDays if re-thrown
        if (error.message.startsWith('Could not calculate leave duration') || error.message.startsWith('Leave duration cannot be less than')) {
             return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error while submitting leave request.' });
    }
}

// @desc    Get employee's own leave requests (pending and history, paginated)
// @route   GET /api/employee/leave/requests?status=Pending&page=1&limit=10
// @access  Private (Employee)
const getMyLeaveRequests = async (req, res) => {
    const employeeId = req.employee._id;
    const { status } = req.query; // 'Pending' or 'History' (Approved/Rejected)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = { employee: employeeId };

    if (status === 'Pending') {
        query.status = 'Pending';
    } else if (status === 'History') {
        query.status = { $in: ['Approved', 'Rejected'] };
    } else {
        // If no status or invalid status, maybe return all? Or error? Let's default to all.
    }

    try {
        const requests = await LeaveRequest.find(query)
            .sort({ createdAt: -1 }) // Sort by application date, newest first
            .skip(skip)
            .limit(limit)
            .lean(); // Use lean for performance

        const totalRequests = await LeaveRequest.countDocuments(query);

        res.json({
            requests,
            currentPage: page,
            totalPages: Math.ceil(totalRequests / limit),
            totalRequests,
        });

    } catch (error) {
        console.error("Error fetching leave requests:", error);
        res.status(500).json({ message: 'Server error while fetching leave requests.' });
    }
};


// @desc    Get employee's own leave balances
// @route   GET /api/employee/leave/balance
// @access  Private (Employee)
const getMyLeaveBalance = async (req, res) => {
     const employeeId = req.employee._id;
     try {
         const employee = await Employee.findById(employeeId).select('leaveBalances');
         if (!employee) {
             return res.status(404).json({ message: 'Employee not found.' });
         }
         res.json(employee.leaveBalances || { earned: 0, sick: 0, casual: 0 }); // Return default if not set
     } catch (error) {
         console.error("Error fetching leave balance:", error);
         res.status(500).json({ message: 'Server error while fetching leave balance.' });
     }
};


export { applyForLeave, getMyLeaveRequests, getMyLeaveBalance };