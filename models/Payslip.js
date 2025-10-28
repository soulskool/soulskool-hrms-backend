import mongoose from 'mongoose';

const payslipSchema = new mongoose.Schema({
  employee: { // Link to the Employee document
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Employee',
    index: true,
  },
  employeeIdString: { // Store the string Employee ID
    type: String,
    required: true,
    index: true,
  },
  salaryDetails: { // Link to the Salary document used for this payslip generation
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Salary',
  },
  month: { // Month number (1-12)
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  year: { // Year (e.g., 2025)
    type: Number,
    required: true,
  },
  // Calculated Earnings Breakdown
  earnings: {
    basic: { type: Number, required: true },
    hra: { type: Number, required: true },
    medicalAllowance: { type: Number, required: true },
    specialAllowance: { type: Number, required: true },
    total: { type: Number, required: true }, // Should equal monthlySalary
  },
  // Calculated Deductions Breakdown
  deductions: {
    professionalTax: { type: Number, required: true },
    // Add other deduction fields here if needed (e.g., PF, ESI)
    total: { type: Number, required: true },
  },
  netPay: { // Calculated Net Pay
    type: Number,
    required: true,
  },
  isReleased: { // Status controlled by admin
    type: Boolean,
    default: false,
    index: true,
  },
  generatedAt: { // Timestamp when admin generated this payslip
    type: Date,
    default: Date.now,
  },
  releasedAt: { // Timestamp when admin marked as released
    type: Date,
    default: null,
  },
  // Include basic employee info used in the payslip for historical record
  employeeSnapshot: {
      name: String,
      employeeId: String,
      designation: String,
      department: String,
      panNumber: String, // Add fields as available in your Employee model
      bankDetails: {
          bankName: String,
          accountNumber: String, 
          ifscCode: String,
  }
}
}, {
  timestamps: true, // Adds createdAt, updatedAt
});

// Ensure only one payslip per employee per month/year
payslipSchema.index({ employee: 1, year: 1, month: 1 }, { unique: true });

const Payslip = mongoose.model('Payslip', payslipSchema);

export default Payslip;