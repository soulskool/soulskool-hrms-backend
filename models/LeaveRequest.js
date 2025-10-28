import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Employee',
    index: true,
  },
  leaveType: {
    type: String,
    required: true,
    enum: ['earned', 'sick', 'casual'], // Match balance keys
  },
  fromDate: {
    type: Date,
    required: true,
  },
  toDate: {
    type: Date,
    required: true,
  },
  fromSession: {
    type: String,
    required: true,
    enum: ['Session 1', 'Session 2'], // First half, Second half
  },
  toSession: {
    type: String,
    required: true,
    enum: ['Session 1', 'Session 2'],
  },
  reason: {
    type: String,
    required: true,
  },
  // 'applyingTo' might be the manager's ID/name, store as string for now
  applyingTo: {
    type: String,
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    index: true,
  },
  // Optional: Who approved/rejected and when
  actionTakenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin', // Assuming only Admins can approve/reject
  },
  actionTakenAt: {
    type: Date,
  },
  adminRemarks: { // Optional comments from admin
      type: String,
  },
  // Calculated field for number of days requested (useful for deduction)
  numberOfDays: {
      type: Number,
     // required: true,
      min: 0.5,
  }

}, {
  timestamps: true, // Adds createdAt (applied date), updatedAt
});

// Helper function to calculate leave duration in days (including half days)
// Note: This is a basic calculation assuming no weekends/holidays filtering needed here.
// More complex logic might be needed for company-specific rules.
//  const calculateLeaveDays = (fromDate, toDate, fromSession, toSession) => {
//     const start = new Date(fromDate);
//     const end = new Date(toDate);
//     start.setHours(0, 0, 0, 0); // Normalize dates to start of day
//     end.setHours(0, 0, 0, 0);

//     // Calculate difference in time and convert to days
//     const diffTime = Math.abs(end - start);
//     let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end day

//     // Adjust for half days
//     if (fromSession === 'Session 2') {
//         diffDays -= 0.5;
//     }
//     if (toSession === 'Session 1') {
//         diffDays -= 0.5;
//     }

//     // Ensure minimum is 0.5 days if start/end are same day with one session
//      if (diffDays <= 0 && fromSession === toSession) {
//          return 0.5;
//      }
//       if (diffDays <= 0 && fromSession !== toSession) {
//           return 1; // S1 to S2 on same day
//       }

//     return diffDays;
// };


// Pre-save hook to calculate numberOfDays
// leaveRequestSchema.pre('save', function (next) {
//     if (this.isModified('fromDate') || this.isModified('toDate') || this.isModified('fromSession') || this.isModified('toSession')) {
//         try {
//             this.numberOfDays = calculateLeaveDays(this.fromDate, this.toDate, this.fromSession, this.toSession);
//              if (this.numberOfDays < 0.5) {
//                 throw new Error("Leave duration cannot be less than a half day.");
//             }
//         } catch(e) {
//              return next(e); // Pass error if calculation fails
//         }
//     }
//     next();
// });

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

export default LeaveRequest;