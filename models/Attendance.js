import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Employee', // Reference to the Employee model
  },
  employeeIdString: { // Store the string ID for easier querying/display if needed
    type: String,
    required: true,
    index: true,
  },
  date: {
    type: Date, // Stores the date part only (e.g., YYYY-MM-DD 00:00:00 UTC)
    required: true,
    index: true,
  },
  checkInTime: {
    type: Date, // Stores the full timestamp of check-in
  },
  checkOutTime: {
    type: Date, // Stores the full timestamp of check-out
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Leave'], // Added 'Leave' for future use
    default: 'Absent', // Default to Absent until check-in
  },
  isLate: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true, // Adds createdAt, updatedAt
});

// Compound index for efficient lookups by employee and date
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;