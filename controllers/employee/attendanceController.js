import Attendance from '../../models/Attendance.js';
import mongoose from 'mongoose';
import moment from 'moment-timezone'; // For timezone handling

// Helper function to get the start of the day in IST
const getStartOfDayIST = (date = new Date()) => {
  return moment(date).tz('Asia/Kolkata').startOf('day').toDate();
};

// @desc    Mark Check-In for the logged-in employee
// @route   POST /api/employee/attendance/checkin
// @access  Private (Employee)
const markCheckIn = async (req, res) => {
  const employeeId = req.employee._id; // Get ObjectId from protectEmployee middleware
  const employeeIdString = req.employeeIdString; // Get string ID
  const now = new Date();
  const todayISTStart = getStartOfDayIST(now);

  try {
    // Find if an attendance record exists for today
    let attendanceRecord = await Attendance.findOne({
      employee: employeeId,
      date: todayISTStart,
    });

    if (attendanceRecord && attendanceRecord.checkInTime) {
      return res.status(400).json({ message: 'Already checked in today.' });
    }

    // Determine if late (after 10:30 AM IST)
    const checkInTimeIST = moment(now).tz('Asia/Kolkata');
    const lateThreshold = moment(todayISTStart).tz('Asia/Kolkata').set({ hour: 10, minute: 30 });
    const isLate = checkInTimeIST.isAfter(lateThreshold);

    if (attendanceRecord) {
      // Update existing record (e.g., if created by admin as Absent initially)
      attendanceRecord.checkInTime = now;
      attendanceRecord.status = 'Present';
      attendanceRecord.isLate = isLate;
      await attendanceRecord.save();
    } else {
      // Create a new attendance record
      attendanceRecord = await Attendance.create({
        employee: employeeId,
        employeeIdString: employeeIdString,
        date: todayISTStart,
        checkInTime: now,
        status: 'Present',
        isLate: isLate,
      });
    }

    res.status(201).json({
        message: 'Checked in successfully.',
        checkInTime: attendanceRecord.checkInTime,
        isLate: attendanceRecord.isLate,
     });

  } catch (error) {
    console.error('Check-in Error:', error);
    res.status(500).json({ message: 'Server error during check-in.' });
  }
};


// @desc    Mark Check-Out for the logged-in employee
// @route   POST /api/employee/attendance/checkout
// @access  Private (Employee)
const markCheckOut = async (req, res) => {
  const employeeId = req.employee._id;
  const now = new Date();
  const todayISTStart = getStartOfDayIST(now);

  try {
    // Find today's attendance record
    const attendanceRecord = await Attendance.findOne({
      employee: employeeId,
      date: todayISTStart,
    });

    if (!attendanceRecord || !attendanceRecord.checkInTime) {
      return res.status(400).json({ message: 'You have not checked in today.' });
    }

    if (attendanceRecord.checkOutTime) {
         return res.status(400).json({ message: 'Already checked out today.' });
    }

    // Update the check-out time
    attendanceRecord.checkOutTime = now;
    await attendanceRecord.save();

    res.status(200).json({
        message: 'Checked out successfully.',
        checkOutTime: attendanceRecord.checkOutTime,
     });

  } catch (error) {
    console.error('Check-out Error:', error);
    res.status(500).json({ message: 'Server error during check-out.' });
  }
};


export { markCheckIn, markCheckOut };