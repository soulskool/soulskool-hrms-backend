import mongoose from 'mongoose';


const bankDetailsSchema = new mongoose.Schema({
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    branchName: { type: String, trim: true },
    accountType: { type: String, enum: ['Savings', 'Current', 'Other'], trim: true }, // Added enum
    paymentType: { type: String, enum: ['Account Transfer', 'Cheque', 'Cash', 'Other'], default: 'Account Transfer', trim: true }, // Added enum
    nameAsPerBank: { type: String, trim: true }, // Name as in bank records
}, {_id: false});


const salarySchema = new mongoose.Schema({
  employee: { // Link to the Employee document
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Employee',
    unique: true, // Each employee should have only one salary record
    index: true,
  },
  employeeIdString: { // Store the string Employee ID for easier reference if needed
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  monthlySalary: { // The gross monthly salary set by admin
    type: Number,
    required: [true, 'Monthly salary amount is required.'],
    min: [0, 'Salary cannot be negative.'],
  },
  professionalTax: { // Monthly professional tax deduction set by admin
    type: Number,
    required: [true, 'Professional tax amount is required.'],
    default: 0,
    min: [0, 'Professional tax cannot be negative.'],
  },
 bankDetails: bankDetailsSchema,


}, {
  timestamps: true, // Adds createdAt, updatedAt
});

const Salary = mongoose.model('Salary', salarySchema);

export default Salary;