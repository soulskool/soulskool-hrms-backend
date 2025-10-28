import Task from '../../models/Task.js';
import Employee from '../../models/Employee.js'; // Needed for creating self-assigned tasks
import mongoose from 'mongoose';

// @desc    Create a new task for oneself
// @route   POST /api/employee/tasks
// @access  Private (Employee)
const createMyTask = async (req, res) => {
    const { taskName, description, priority, dueDate, tags } = req.body;
    const employee = req.employee; // From protectEmployee middleware

    if (!taskName) {
        return res.status(400).json({ message: 'Task Name is required.' });
    }

    try {
        const newTask = await Task.create({
            taskName,
            description,
            priority,
            dueDate: dueDate ? new Date(dueDate) : null,
            tags: tags || [],
            assigneeObjectId: employee._id,
            assigneeEmployeeId: employee.employeeInfo.employeeId,
            assigneeName: employee.employeeInfo.name,
            status: 'Open',
            createdByObjectId: employee._id,
            createdByModel: 'Employee',
        });
        res.status(201).json(newTask);
    } catch (error) {
        console.error("Error creating task:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Failed: ${messages.join(', ')}` });
        }
        res.status(500).json({ message: 'Server error creating task.' });
    }
};

// @desc    Get employee's own tasks (paginated)
// @route   GET /api/employee/tasks?status=Open&page=1&limit=10
// @access  Private (Employee)
const getMyTasks = async (req, res) => {
    const employeeId = req.employee._id;
    const { status = 'Open' } = req.query; // Default to 'Open' tasks
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {
        assigneeObjectId: employeeId,
        status: status === 'Completed' ? 'Completed' : 'Open',
    };

    try {
        const tasks = await Task.find(query)
            .sort(status === 'Completed' ? { completedAt: -1 } : { dueDate: 1, createdAt: -1 }) // Sort completed by date, open by due date then creation
            .skip(skip)
            .limit(limit)
            .lean();

        const totalTasks = await Task.countDocuments(query);

        res.json({
            tasks,
            currentPage: page,
            totalPages: Math.ceil(totalTasks / limit),
            totalTasks,
        });
    } catch (error) {
        console.error(`Error fetching employee tasks (Status: ${status}):`, error);
        res.status(500).json({ message: 'Server error fetching tasks.' });
    }
};

// @desc    Update employee's own task
// @route   PUT /api/employee/tasks/:taskId
// @access  Private (Employee)
const updateMyTask = async (req, res) => {
    const { taskId } = req.params;
    const employeeId = req.employee._id;
    const { taskName, description, priority, dueDate, tags } = req.body;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({ message: 'Invalid Task ID.' });
    }
    if (!taskName) { // Task name is essential
        return res.status(400).json({ message: 'Task Name cannot be empty.' });
    }

    try {
        const task = await Task.findOne({ _id: taskId, assigneeObjectId: employeeId });

        if (!task) {
            return res.status(404).json({ message: 'Task not found or you do not have permission to edit it.' });
        }
        if (task.status === 'Completed') {
             return res.status(400).json({ message: 'Cannot update a completed task. Reopen it first.' });
        }

        // Update fields
        task.taskName = taskName;
        task.description = description || task.description;
        task.priority = priority || task.priority;
        task.dueDate = dueDate ? new Date(dueDate) : task.dueDate;
        task.tags = tags !== undefined ? tags : task.tags; // Allow clearing tags with empty array

        const updatedTask = await task.save();
        res.json(updatedTask);

    } catch (error) {
        console.error("Error updating task:", error);
         if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Failed: ${messages.join(', ')}` });
        }
        res.status(500).json({ message: 'Server error updating task.' });
    }
};

// @desc    Update task status (Complete/Reopen) for employee's own task
// @route   PATCH /api/employee/tasks/:taskId/status
// @access  Private (Employee)
const updateMyTaskStatus = async (req, res) => {
     const { taskId } = req.params;
     const employeeId = req.employee._id;
     const { status } = req.body; // Expect 'Completed' or 'Open'

      if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({ message: 'Invalid Task ID.' });
    }
     if (!['Completed', 'Open'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status provided. Use "Completed" or "Open".' });
    }

    try {
         const task = await Task.findOne({ _id: taskId, assigneeObjectId: employeeId });

        if (!task) {
            return res.status(404).json({ message: 'Task not found or you do not have permission.' });
        }

        // Prevent redundant updates
        if (task.status === status) {
             return res.status(400).json({ message: `Task is already ${status.toLowerCase()}.` });
        }

        task.status = status;
        task.completedAt = (status === 'Completed') ? new Date() : null; // Set/clear completed timestamp

        const updatedTask = await task.save();
        res.json(updatedTask);

    } catch (error) {
         console.error("Error updating task status:", error);
         res.status(500).json({ message: 'Server error updating task status.' });
    }
};


export { createMyTask, getMyTasks, updateMyTask, updateMyTaskStatus };