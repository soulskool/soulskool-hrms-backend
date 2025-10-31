import Attendance from '../../models/Attendance.js';
import Employee from '../../models/Employee.js';
import moment from 'moment-timezone';
import * as XLSX from 'xlsx';


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
// const getPastAttendanceRecords = async (req, res) => {
//     const page = parseInt(req.query.page) || 1;
//     const limit = 15; // Number of days per page
//     const skip = (page - 1) * limit;

//     try {
//         // 1. Get all active employees
//         const employees = await Employee.find({ isActive: true }).select('employeeInfo.name employeeInfo.employeeId').lean(); // Use lean for performance

//         // 2. Determine the date range for the current page
//         const today = moment().tz('Asia/Kolkata').startOf('day');
//         const endDate = moment(today).subtract(skip, 'days'); // End date for the query (most recent day on this page)
//         const startDate = moment(endDate).subtract(limit - 1, 'days'); // Start date for the query (oldest day on this page)

//         const dateArray = [];
//         for (let m = moment(startDate); m.isSameOrBefore(endDate); m.add(1, 'days')) {
//             dateArray.push(m.toDate());
//         }
//         // Ensure dates are in descending order for display (Newest first)
//         dateArray.reverse();

//         // 3. Fetch attendance records for the date range and active employees
//         const attendanceRecords = await Attendance.find({
//             employee: { $in: employees.map(e => e._id) }, // Filter by active employee IDs
//             date: { $gte: startDate.toDate(), $lte: endDate.toDate() }
//         }).select('employee date status').lean(); // Select only needed fields

//         // 4. Create a map for quick lookup: employeeId -> {date -> status}
//         const attendanceMap = {};
//         attendanceRecords.forEach(record => {
//             const empId = record.employee.toString();
//             if (!attendanceMap[empId]) {
//                 attendanceMap[empId] = {};
//             }
//             // Store status ('P' or 'A') for the specific date (use YYYY-MM-DD string as key)
//             const dateKey = moment(record.date).format('YYYY-MM-DD');
//             attendanceMap[empId][dateKey] = record.status === 'Present' ? 'P' : 'A'; // Assuming 'Leave' also counts as 'A' for this view for now
//         });

//         // 5. Structure the results: Employee -> Dates -> Status
//         const results = employees.map(emp => {
//             const empAttendance = {};
//             const empIdString = emp._id.toString();
//             dateArray.forEach(date => {
//                 const dateKey = moment(date).format('YYYY-MM-DD');
//                 // Default to 'A' if no record found for that employee on that date
//                 empAttendance[dateKey] = attendanceMap[empIdString]?.[dateKey] || 'A';
//             });
//             return {
//                 _id: emp._id,
//                 name: emp.employeeInfo.name,
//                 employeeId: emp.employeeInfo.employeeId,
//                 attendance: empAttendance,
//             };
//         });

//         // 6. Calculate total number of days for pagination info (optional)
//         // This is complex as it depends on when the first record exists, maybe skip for now or estimate

//         res.json({
//             employeesAttendance: results,
//             dates: dateArray.map(d => moment(d).format('YYYY-MM-DD')), // Send the dates used
//             currentPage: page,
//             // totalPages: Calculate if needed
//         });

//     } catch (error) {
//         console.error("Error fetching past attendance records:", error);
//         res.status(500).json({ message: 'Server error fetching attendance history.' });
//     }
// };





// const getPastAttendanceRecords = async (req, res) => {
//     const page = parseInt(req.query.page) || 1;
//     const limit = 15; // Number of days per page
//     const skip = (page - 1) * limit;

//     try {
//         const employees = await Employee.find({ isActive: true }).select('_id employeeInfo.name employeeInfo.employeeId').lean();
//         const employeeIds = employees.map(e => e._id);

//         // Calculate total number of relevant days (e.g., since first attendance record or company start date)
//         // For simplicity, let's find the date of the oldest attendance record
//         const oldestRecord = await Attendance.findOne({ employee: { $in: employeeIds } }).sort({ date: 1 }).limit(1).select('date').lean();

//         let totalDays = 0;
//         if (oldestRecord) {
//             const today = moment().tz('Asia/Kolkata').startOf('day');
//             const firstDate = moment(oldestRecord.date).tz('Asia/Kolkata').startOf('day');
//             totalDays = today.diff(firstDate, 'days') + 1; // +1 includes today
//         }
//         const totalPages = Math.ceil(totalDays / limit);

//         // Determine the date range for the current page (same as before)
//         const todayMoment = moment().tz('Asia/Kolkata').startOf('day');
//         const endDate = moment(todayMoment).subtract(skip, 'days');
//         const startDate = moment(endDate).subtract(limit - 1, 'days');

//         const dateArray = [];
//         // Only generate dates if the range is valid (startDate is not in the future relative to today)
//         if (startDate.isSameOrBefore(todayMoment)) {
//              for (let m = moment(startDate); m.isSameOrBefore(endDate); m.add(1, 'days')) {
//                 // Ensure we don't go past today if it's the first page
//                  if (m.isSameOrBefore(todayMoment)) {
//                      dateArray.push(m.toDate());
//                  }
//             }
//              dateArray.reverse(); // Newest first
//         }


//         // Fetch attendance records (only if dateArray is not empty)
//         let attendanceRecords = [];
//         if (dateArray.length > 0) {
//             attendanceRecords = await Attendance.find({
//                 employee: { $in: employeeIds },
//                 date: { $gte: dateArray[dateArray.length - 1], $lte: dateArray[0] } // Use actual min/max dates
//             }).select('employee date status').lean();
//         }


//         // Create map (same as before)
//         const attendanceMap = {};
//         attendanceRecords.forEach(record => {
//             const empId = record.employee.toString();
//             if (!attendanceMap[empId]) {
//                 attendanceMap[empId] = {};
//             }
//             // Store status ('P' or 'A') for the specific date (use YYYY-MM-DD string as key)
//             const dateKey = moment(record.date).format('YYYY-MM-DD');
//             attendanceMap[empId][dateKey] = record.status === 'Present' ? 'P' : 'A'; // Assuming 'Leave' also counts as 'A' for this view for now
//         });

//         // Structure results (same as before)
//         const results = employees.map(emp => {
//             const empAttendance = {};
//             const empIdString = emp._id.toString();
//             dateArray.forEach(date => {
//                 const dateKey = moment(date).format('YYYY-MM-DD');
//                 // Default to 'A' if no record found for that employee on that date
//                 empAttendance[dateKey] = attendanceMap[empIdString]?.[dateKey] || 'A';
//             });
//             return {
//                 _id: emp._id,
//                 name: emp.employeeInfo.name,
//                 employeeId: emp.employeeInfo.employeeId,
//                 attendance: empAttendance,
//             };
//         });

//         res.json({
//             employeesAttendance: results,
//             dates: dateArray.map(d => moment(d).format('YYYY-MM-DD')),
//             currentPage: page,
//             totalPages: totalPages, // Send total pages
//         });

//     } catch (error) {
//         console.error("Error fetching past attendance records:", error);
//         res.status(500).json({ message: 'Server error fetching attendance history.' });
//     }
// };


 const getPastAttendanceRecords = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const skipDays = (page - 1) * limit;

  try {
    // Active employees minimal projection
    const employees = await Employee.find({ isActive: true })
      .select('employeeInfo.name employeeInfo.employeeId')
      .lean();

    // If no employees, short-circuit
    if (!employees.length) {
      return res.json({
        employeesAttendance: [],
        dates: [],
        currentPage: page,
        hasMore: false,
      });
    }

    // Compute date window in IST
    const todayIST = moment().tz('Asia/Kolkata').startOf('day');
    const endDate = moment(todayIST).subtract(skipDays, 'days');
    const startDate = moment(endDate).subtract(limit - 1, 'days');

    // Clamp startDate not to go into future (safety)
    if (startDate.isAfter(endDate)) {
      return res.json({
        employeesAttendance: [],
        dates: [],
        currentPage: page,
        hasMore: false,
      });
    }

    // Build array of YYYY-MM-DD in descending display order (newest first)
    const dateArray = [];
    for (let m = moment(startDate); m.isSameOrBefore(endDate); m.add(1, 'days')) {
      dateArray.push(m.clone().format('YYYY-MM-DD'));
    }
    dateArray.reverse();

    // Fetch attendance in one query
    const attendanceRecords = await Attendance.find({
      date: { $gte: startDate.toDate(), $lte: endDate.toDate() },
      employee: { $in: employees.map(e => e._id) },
    })
      .select('employee date status')
      .lean();

    // Map: empId -> dateKey -> 'P' | 'A'
    const attendanceMap = new Map();
    for (const record of attendanceRecords) {
      const empId = String(record.employee);
      const dateKey = moment(record.date).tz('Asia/Kolkata').format('YYYY-MM-DD');
      if (!attendanceMap.has(empId)) attendanceMap.set(empId, {});
      attendanceMap.get(empId)[dateKey] = record.status === 'Present' ? 'P' : 'A';
    }

    const employeesAttendance = employees.map(emp => {
      const empId = String(emp._id);
      const perDay = {};
      for (const d of dateArray) {
        perDay[d] = attendanceMap.get(empId)?.[d] ?? 'A';
      }
      return {
        _id: emp._id,
        name: emp.employeeInfo?.name ?? '-',
        employeeId: emp.employeeInfo?.employeeId ?? '-',
        attendance: perDay,
      };
    });

    // Decide if more older days exist: if startDate is after a fixed floor, assume hasMore until no older Attendance exists.
    // Simple heuristic: if page produced no dates (shouldn't happen) or all 'A' AND there are no attendance docs older than startDate-1, then hasMore=false.
    // For simplicity: expose hasMore=false when the computed window yields no attendance AND startDate is > 3 years old.
    // Better: query count older than startDate-1 day.
    const olderCount = await Attendance.countDocuments({
      date: { $lt: startDate.toDate() },
      employee: { $in: employees.map(e => e._id) },
    });

    res.json({
      employeesAttendance,
      dates: dateArray, // already newest first
      currentPage: page,
      hasMore: olderCount > 0, // client can disable button when false
    });
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ message: 'Server error fetching attendance history.' });
  }
};






const ist = (d) => moment(d).tz('Asia/Kolkata');

const getMonthBoundsIST = (year, month1to12) => {
  const m0 = month1to12 - 1;
  const start = moment.tz({ year, month: m0, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 }, 'Asia/Kolkata');
  const end = start.clone().endOf('month');
  return { start: start.toDate(), end: end.toDate(), days: end.date() };
};

 const exportMonthlyAttendanceExcel = async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10); // 1..12
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Provide valid year and month (1-12).' });
    }

    // Active employees
    const employees = await Employee.find({ isActive: true })
      .select('employeeInfo.name employeeInfo.employeeId')
      .lean();

    // Month bounds (IST)
    const { start, end, days } = getMonthBoundsIST(year, month);

    // Pull attendance for active employees within the month
    const employeeIds = employees.map((e) => e._id);
    const records = await Attendance.find({
      employee: { $in: employeeIds },
      date: { $gte: start, $lte: end },
    })
      .select('employee date status checkInTime checkOutTime isLate')
      .lean();

    // Build a map: empId -> YYYY-MM-DD -> data
    const recMap = new Map();
    for (const r of records) {
      const empId = String(r.employee);
      const key = ist(r.date).format('YYYY-MM-DD');
      if (!recMap.has(empId)) recMap.set(empId, {});
      recMap.get(empId)[key] = {
        status: r.status,
        checkInTime: r.checkInTime ? ist(r.checkInTime).format('HH:mm') : '',
        checkOutTime: r.checkOutTime ? ist(r.checkOutTime).format('HH:mm') : '',
        isLate: !!r.isLate,
      };
    }

    // Build header: Employee ID, Name, for each date -> Check-In, Check-Out, Status
    const daysArray = Array.from({ length: days }, (_, i) =>
      moment.tz({ year, month: month - 1, day: i + 1 }, 'Asia/Kolkata').format('YYYY-MM-DD')
    );

    const header = ['Employee ID', 'Employee Name'];
    for (const d of daysArray) {
      header.push(`${d} Check-In`, `${d} Check-Out`, `${d} Status`);
    }

    // Rows
    const rows = [];
    for (const emp of employees) {
      const row = [emp?.employeeInfo?.employeeId || '', emp?.employeeInfo?.name || ''];
      const map = recMap.get(String(emp._id)) || {};
      for (const d of daysArray) {
        const cell = map[d];
        const status = cell?.status === 'Present'
          ? (cell?.isLate ? 'Late' : 'On Time')
          : 'Absent';
        row.push(cell?.checkInTime || '', cell?.checkOutTime || '', status);
      }
      rows.push(row);
    }

    // SheetJS: aoa -> sheet -> workbook
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    // Column widths (rough)
    const colWidths = [{ wch: 14 }, { wch: 24 }];
    for (let i = 0; i < daysArray.length; i++) {
      colWidths.push({ wch: 10 }); // Check-In
      colWidths.push({ wch: 10 }); // Check-Out
      colWidths.push({ wch: 10 }); // Status
    }
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    const sheetName = `Attendance_${year}-${String(month).padStart(2, '0')}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Stream workbook to response
    const filename = `${sheetName}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write as buffer and send
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    return res.send(wbout);
  } catch (err) {
    console.error('Export monthly attendance failed:', err);
    return res.status(500).json({ message: 'Failed to export attendance.' });
  }
};








export { getTodayAttendanceOverview, getPastAttendanceRecords, exportMonthlyAttendanceExcel};