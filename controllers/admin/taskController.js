import Task from '../../models/Task.js';
import Employee from '../../models/Employee.js'; // Needed for assigning tasks
import Admin from '../../models/Admin.js'; // Needed for creator info
import mongoose from 'mongoose';

// @desc    Admin creates a task and assigns it to an employee
// @route   POST /api/admin/tasks
// @access  Private (Admin)
const adminCreateTask = async (req, res) => {
    const { taskName, description, priority, dueDate, tags, assigneeEmployeeId } = req.body; // Expect employee ID string
    const adminId = req.admin._id;

    if (!taskName || !assigneeEmployeeId) {
        return res.status(400).json({ message: 'Task Name and Assignee Employee ID are required.' });
    }

    try {
        // Find the assigned employee to get their ObjectId and Name
        const assignee = await Employee.findOne({ 'employeeInfo.employeeId': assigneeEmployeeId, isActive: true })
                                      .select('_id employeeInfo.name employeeInfo.employeeId');
        if (!assignee) {
            return res.status(404).json({ message: `Active employee with ID '${assigneeEmployeeId}' not found.` });
        }

        const newTask = await Task.create({
            taskName,
            description,
            priority,
            dueDate: dueDate ? new Date(dueDate) : null,
            tags: tags || [],
            assigneeObjectId: assignee._id,
            assigneeEmployeeId: assignee.employeeInfo.employeeId,
            assigneeName: assignee.employeeInfo.name,
            status: 'Open',
            createdByObjectId: adminId,
            createdByModel: 'Admin',
        });
        res.status(201).json(newTask);
    } catch (error) {
        console.error("Admin Error creating task:", error);
         if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Failed: ${messages.join(', ')}` });
        }
        res.status(500).json({ message: 'Server error creating task.' });
    }
};

// @desc    Admin gets all tasks (paginated, filterable)
// @route   GET /api/admin/tasks?status=Open&page=1&limit=10&assigneeId=...
// @access  Private (Admin)
const adminGetAllTasks = async (req, res) => {
    const { status = 'Open', assigneeId } = req.query; // Filter by status and optionally by assignee ObjectId
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {
        status: status === 'Completed' ? 'Completed' : 'Open',
    };

    // Add assignee filter if provided and valid ObjectId
    if (assigneeId && mongoose.Types.ObjectId.isValid(assigneeId)) {
        query.assigneeObjectId = assigneeId;
    }

    try {
        const tasks = await Task.find(query)
             // Populate creator name? Could be Admin or Employee
            // .populate('createdByObjectId', 'name employeeInfo.name') // This needs careful handling due to refPath
            .sort(status === 'Completed' ? { completedAt: -1 } : { dueDate: 1, createdAt: -1 })
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
        console.error(`Admin Error fetching tasks (Status: ${status}):`, error);
        res.status(500).json({ message: 'Server error fetching tasks.' });
    }
};

// @desc    Admin updates ANY task
// @route   PUT /api/admin/tasks/:taskId
// @access  Private (Admin)
const adminUpdateTask = async (req, res) => {
    const { taskId } = req.params;
    const { taskName, description, priority, dueDate, tags, assigneeEmployeeId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({ message: 'Invalid Task ID.' });
    }
    if (!taskName) {
        return res.status(400).json({ message: 'Task Name cannot be empty.' });
    }

    try {
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found.' });
        }

        // If assignee is being changed, validate the new assignee
        if (assigneeEmployeeId && assigneeEmployeeId !== task.assigneeEmployeeId) {
            const newAssignee = await Employee.findOne({ 'employeeInfo.employeeId': assigneeEmployeeId, isActive: true })
                                           .select('_id employeeInfo.name employeeInfo.employeeId');
            if (!newAssignee) {
                return res.status(404).json({ message: `New assignee employee with ID '${assigneeEmployeeId}' not found or is inactive.` });
            }
            task.assigneeObjectId = newAssignee._id;
            task.assigneeEmployeeId = newAssignee.employeeInfo.employeeId;
            task.assigneeName = newAssignee.employeeInfo.name;
        } else if (assigneeEmployeeId === '') {
             // Handle if admin tries to clear assignee? Should not be allowed usually.
             return res.status(400).json({ message: 'Assignee cannot be removed. Reassign if necessary.' });
        }


        // Update other fields
        task.taskName = taskName;
        task.description = description !== undefined ? description : task.description;
        task.priority = priority || task.priority;
        task.dueDate = dueDate ? new Date(dueDate) : (dueDate === null ? null : task.dueDate); // Allow setting null
        task.tags = tags !== undefined ? tags : task.tags;

        // Prevent updating completed task data other than status
        if (task.status === 'Completed') {
             console.warn(`Admin trying to update details of completed task ${taskId}. Only status can be changed.`);
            // Optionally, return an error or just save allowed fields (status handled separately)
            // For now, let's allow it but the status update endpoint is cleaner
        }


        const updatedTask = await task.save();
        res.json(updatedTask);

    } catch (error) {
        console.error("Admin Error updating task:", error);
         if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Failed: ${messages.join(', ')}` });
        }
        res.status(500).json({ message: 'Server error updating task.' });
    }
};

// @desc    Admin updates status of ANY task (Complete/Reopen)
// @route   PATCH /api/admin/tasks/:taskId/status
// @access  Private (Admin)
const adminUpdateTaskStatus = async (req, res) => {
     const { taskId } = req.params;
     const { status } = req.body; // Expect 'Completed' or 'Open'

      if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({ message: 'Invalid Task ID.' });
    }
     if (!['Completed', 'Open'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status provided. Use "Completed" or "Open".' });
    }

    try {
         const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found.' });
        }

        if (task.status === status) {
             return res.status(400).json({ message: `Task is already ${status.toLowerCase()}.` });
        }

        task.status = status;
        task.completedAt = (status === 'Completed') ? new Date() : null;

        const updatedTask = await task.save();
        res.json(updatedTask);

    } catch (error) {
         console.error("Admin Error updating task status:", error);
         res.status(500).json({ message: 'Server error updating task status.' });
    }
};

// @desc    Admin deletes ANY task
// @route   DELETE /api/admin/tasks/:taskId
// @access  Private (Admin)
const adminDeleteTask = async (req, res) => {
    const { taskId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({ message: 'Invalid Task ID.' });
    }

    try {
        const task = await Task.findByIdAndDelete(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found.' });
        }
        res.json({ message: 'Task deleted successfully.' });
    } catch (error) {
        console.error("Admin Error deleting task:", error);
        res.status(500).json({ message: 'Server error deleting task.' });
    }
};


export {
    adminCreateTask,
    adminGetAllTasks,
    adminUpdateTask,
    adminUpdateTaskStatus,
    adminDeleteTask,
};