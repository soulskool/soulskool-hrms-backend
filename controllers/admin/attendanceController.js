import Attendance from '../../models/Attendance.js';
import Employee from '../../models/Employee.js';
import moment from 'moment-timezone';

// Helper function to get the start of the day in IST
const getStartOfDayIST = (date = new Date()) => {
  return moment(date).tz('Asia/Kolkata').startOf('day').toDate();
};

// @desc    Get overview of today's attendance
// @route   GET /api/admin/attendance/today-overview
// @access  Private (Admin)
const getTodayAttendanceOverview = async (req, res) => {
  const todayISTStart = getStartOfDayIST();
  const todayISTEnd = moment(todayISTStart).tz('Asia/Kolkata').endOf('day').toDate();

  try {
    // 1. Get total active employee count
    const totalActiveEmployees = await Employee.countDocuments({ isActive: true });

    // 2. Get today's attendance records
    const todaysAttendance = await Attendance.find({
      date: todayISTStart,
      status: 'Present', // Only count present employees for checked-in stats
    }).populate('employee', 'employeeInfo.name employeeInfo.employeeId'); // Populate basic employee info

    const checkedInCount = todaysAttendance.length;
    const notCheckedInCount = totalActiveEmployees - checkedInCount; // Simple calculation

    // 3. Count late check-ins
    const lateCheckInCount = todaysAttendance.filter(att => att.isLate).length;

    // 4. Format the list of checked-in employees
    const checkedInList = todaysAttendance.map(att => ({
        _id: att.employee._id,
        name: att.employee.employeeInfo.name,
        employeeId: att.employee.employeeInfo.employeeId,
        checkInTime: att.checkInTime, // Send the full timestamp
        isLate: att.isLate,
    }));

    res.json({
        totalActiveEmployees,
        checkedInCount,
        notCheckedInCount,
        lateCheckInCount,
        checkedInList,
    });

  } catch (error) {
    console.error("Error fetching today's attendance overview:", error);
    res.status(500).json({ message: 'Server error fetching attendance overview.' });
  }
};


// @desc    Get past attendance records with pagination
// @route   GET /api/admin/attendance/history?page=1&limit=15
// @access  Private (Admin)
const getPastAttendanceRecords = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 15; // Number of days per page
    const skip = (page - 1) * limit;

    try {
        // 1. Get all active employees
        const employees = await Employee.find({ isActive: true }).select('employeeInfo.name employeeInfo.employeeId').lean(); // Use lean for performance

        // 2. Determine the date range for the current page
        const today = moment().tz('Asia/Kolkata').startOf('day');
        const endDate = moment(today).subtract(skip, 'days'); // End date for the query (most recent day on this page)
        const startDate = moment(endDate).subtract(limit - 1, 'days'); // Start date for the query (oldest day on this page)

        const dateArray = [];
        for (let m = moment(startDate); m.isSameOrBefore(endDate); m.add(1, 'days')) {
            dateArray.push(m.toDate());
        }
        // Ensure dates are in descending order for display (Newest first)
        dateArray.reverse();

        // 3. Fetch attendance records for the date range and active employees
        const attendanceRecords = await Attendance.find({
            employee: { $in: employees.map(e => e._id) }, // Filter by active employee IDs
            date: { $gte: startDate.toDate(), $lte: endDate.toDate() }
        }).select('employee date status').lean(); // Select only needed fields

        // 4. Create a map for quick lookup: employeeId -> {date -> status}
        const attendanceMap = {};
        attendanceRecords.forEach(record => {
            const empId = record.employee.toString();
            if (!attendanceMap[empId]) {
                attendanceMap[empId] = {};
            }
            // Store status ('P' or 'A') for the specific date (use YYYY-MM-DD string as key)
            const dateKey = moment(record.date).format('YYYY-MM-DD');
            attendanceMap[empId][dateKey] = record.status === 'Present' ? 'P' : 'A'; // Assuming 'Leave' also counts as 'A' for this view for now
        });

        // 5. Structure the results: Employee -> Dates -> Status
        const results = employees.map(emp => {
            const empAttendance = {};
            const empIdString = emp._id.toString();
            dateArray.forEach(date => {
                const dateKey = moment(date).format('YYYY-MM-DD');
                // Default to 'A' if no record found for that employee on that date
                empAttendance[dateKey] = attendanceMap[empIdString]?.[dateKey] || 'A';
            });
            return {
                _id: emp._id,
                name: emp.employeeInfo.name,
                employeeId: emp.employeeInfo.employeeId,
                attendance: empAttendance,
            };
        });

        // 6. Calculate total number of days for pagination info (optional)
        // This is complex as it depends on when the first record exists, maybe skip for now or estimate

        res.json({
            employeesAttendance: results,
            dates: dateArray.map(d => moment(d).format('YYYY-MM-DD')), // Send the dates used
            currentPage: page,
            // totalPages: Calculate if needed
        });

    } catch (error) {
        console.error("Error fetching past attendance records:", error);
        res.status(500).json({ message: 'Server error fetching attendance history.' });
    }
};



export { getTodayAttendanceOverview, getPastAttendanceRecords };