// models/Employee.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const educationSchema = new mongoose.Schema({
  instituteName: String,
  qualification: String,
  grade: String,
  area: String,
  from: Date,
  to: Date,
});

const addressSchema = new mongoose.Schema({
  name: String,
  address: String,
  city: String,
  state: String,
  country: String,
  pincode: String,
  phoneNumber1: String,
  phoneNumber2: String,
  mobileNumber: String,
  email: String,
  otherContact: String,
});


const employeeSchema = new mongoose.Schema(
  {
    // Core Employee Info
    employeeInfo: {
      name: { type: String, required: [true, 'Name is required'] },
      email: { type: String, required: true, unique: true },
      number: { type: String },
      employeeId: { type: String, required: [true, 'Employee ID is required'], unique: true },
      password: { type: String, required: [true, 'Password is required'] },
      gender: { type: String, enum: ['Male', 'Female', 'Other'] },
      title: { type: String, enum: ['Mr.', 'Ms.', 'Mrs.'] },
      profilePicture: { type: String, default: '' },
    },

    // Personal Information
    personalInfo: {
      dob: { type: Date },
      fathersName: { type: String },
      maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'] },
      marriageDate: { type: Date },
      spouseName: { type: String },
      nationality: { type: String },
      placeOfBirth: { type: String },
      countryOfOrigin: { type: String },
      religion: { type: String },
      isInternationalEmployee: { type: Boolean, default: false },
      isPhysicallyChallenged: { type: Boolean, default: false },
      personalEmail: { type: String },
      height: { type: String },
      weight: { type: String },
      identificationMark: { type: String },
      caste: { type: String },
      hobby: { type: String },
      isDirector: { type: Boolean, default: false },
    },

    // Joining Details
    joiningDetails: {
      joiningDate: { type: Date },
      confirmationDate: { type: Date },
      status: { type: String, enum: ['Confirmed', 'Pending', 'Probation'] },
      probationPeriod: { type: String }, // e.g., '6 Months'
      noticePeriod: { type: String }, // e.g., '3 Months'
      currentCompanyExperience: { type: String },
      previousExperience: { type: String },
      totalExperience: { type: String },
      referredBy: { type: String },
    },

    // Job Details
    jobDetails: {
      currentPosition: { type: String },
      department: { type: String },
      reportsTo: { type: String }, 
    },

    // Identification Details
    identificationDetails: {
      aadharCardNo: { type: String },
      panCardNo: { type: String },
    },

    // Education Details - Array of qualifications
    educationDetails: [educationSchema],

    // Address Details
    addresses: {
      present: addressSchema,
      permanent: addressSchema,
    },
    
    // Background Check
    backgroundCheck: {
      verificationStatus: { type: String, enum: ['Pending', 'Completed', 'Failed'] },
      verificationCompletedOn: { type: Date },
      agencyName: { type: String },
      remarks: { type: String },
    },
     isActive: { type: Boolean, default: true },
     leaveBalances: {
        earned: { type: Number, default: 0, min: 0 },
        sick: { type: Number, default: 0, min: 0 },
        casual: { type: Number, default: 0, min: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
// employeeSchema.pre('save', async function (next) {
//     if (!this.isModified('employeeInfo.password')) {
//       next();
//     }
//     const salt = await bcrypt.genSalt(10);
//     this.employeeInfo.password = await bcrypt.hash(this.employeeInfo.password, salt);
// });

// employeeSchema.methods.matchPassword = async function (enteredPassword) {
//     const employeeWithPassword = await Employee.findById(this._id).select('+employeeInfo.password');
//     if (!employeeWithPassword || !employeeWithPassword.employeeInfo.password) {
//         return false;
//     }
//     return await bcrypt.compare(enteredPassword, employeeWithPassword.employeeInfo.password);
// };



const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;