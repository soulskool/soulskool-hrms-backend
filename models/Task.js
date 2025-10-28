import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  taskName: {
    type: String,
    required: [true, 'Task name is required.'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  // Assignee Information
  assigneeObjectId: { // The ObjectId of the employee assigned
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Employee',
    index: true,
  },
  assigneeEmployeeId: { // The string Employee ID (from employeeInfo.employeeId)
    type: String,
    required: true,
    index: true,
  },
  assigneeName: { // Denormalized name for easier display
    type: String,
    required: true,
  },
  // Task Details
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  dueDate: {
    type: Date,
  },
  tags: {
    type: [String], // Array of strings
    default: [],
  },
  // Status and Completion
  status: {
    type: String,
    enum: ['Open', 'Completed'],
    default: 'Open',
    index: true,
  },
  completedAt: {
    type: Date, // Timestamp when the task was marked as completed
    default: null,
  },
  // Creator Information
  createdByObjectId: { // Who created the task
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'createdByModel', // Dynamic ref based on createdByModel
  },
  createdByModel: { // Specifies if creator was 'Admin' or 'Employee'
    type: String,
    required: true,
    enum: ['Admin', 'Employee'],
  },
}, {
  timestamps: true, // Adds createdAt, updatedAt
});

// Index to help query tasks by assignee and status
taskSchema.index({ assigneeObjectId: 1, status: 1 });

const Task = mongoose.model('Task', taskSchema);

export default Task;