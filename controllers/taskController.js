const Task = require('../models/Task');
const taskEmitter = require('../services/eventService');

/**
 * POST /api/tasks
 * Supports ?mode=async (default, using EventEmitter) and ?mode=sync (blocking demonstration)
 */
exports.createTask = async (req, res) => {
  const reqStart = Date.now();
  try {
    const { title, description, priority, status } = req.body;
    const mode = (req.query.mode || 'async').toLowerCase();

    if (!title) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    // 1. Save task to MongoDB
    const task = await Task.create({
      title,
      description,
      priority: priority || 'medium',
      status: status || 'pending',
      user: req.user._id
    });

    if (mode === 'sync') {
      // -------------------------------------------------------------
      // SYNCHRONOUS MODE: Blocks main HTTP request handler
      // -------------------------------------------------------------
      taskEmitter.stats.syncRequests++;
      const simulatedDelay = parseInt(process.env.SIMULATED_NOTIFICATION_DELAY_MS, 10) || 1500;
      
      console.log(`[SYNC MODE] Blocking API handler for ${simulatedDelay}ms to simulate inline notification...`);
      await new Promise(resolve => setTimeout(resolve, simulatedDelay));

      const reqEnd = Date.now();
      const responseTimeMs = reqEnd - reqStart;

      console.log(`[SYNC MODE] Finished blocking. API responded after ${responseTimeMs} ms.`);

      return res.status(201).json({
        success: true,
        message: 'Task created synchronously (notification blocked the HTTP response)',
        task,
        executionMode: 'SYNCHRONOUS_BLOCKING',
        requestReceivedAt: new Date(reqStart).toISOString(),
        apiResponseTime: new Date(reqEnd).toISOString(),
        responseTimeMs,
        studentId: '24CS038',
        studentName: 'Daksh Karangiya'
      });
    } else {
      // -------------------------------------------------------------
      // ASYNCHRONOUS MODE: Emits 'task-created' via EventEmitter & returns immediately
      // -------------------------------------------------------------
      taskEmitter.stats.asyncRequests++;
      const apiResponseTime = Date.now();
      const responseTimeMs = apiResponseTime - reqStart;

      // Emit event to background listener (non-blocking)
      taskEmitter.emit('task-created', {
        task,
        user: req.user,
        apiResponseTime,
        requestReceivedTime: reqStart
      });

      // API responds immediately (201) before background worker finishes
      return res.status(201).json({
        success: true,
        message: 'Task created successfully (background notification dispatched asynchronously via EventEmitter)',
        task,
        executionMode: 'ASYNCHRONOUS_EVENT_EMITTER',
        requestReceivedAt: new Date(reqStart).toISOString(),
        apiResponseTime: new Date(apiResponseTime).toISOString(),
        responseTimeMs,
        studentId: '24CS038',
        studentName: 'Daksh Karangiya'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/tasks
 */
exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/tasks/:id
 */
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.status(200).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/tasks/:id
 */
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.status(200).json({ success: true, message: 'Task updated successfully', task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/tasks/:id
 * Emits 'task-deleted' event to background listener
 */
exports.deleteTask = async (req, res) => {
  const reqStart = Date.now();
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const apiResponseTime = Date.now();

    // Emit 'task-deleted' event to background audit worker
    taskEmitter.emit('task-deleted', {
      taskId: task._id,
      taskTitle: task.title,
      user: req.user,
      apiResponseTime
    });

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully (audit event emitted asynchronously)',
      taskId: task._id,
      taskTitle: task.title,
      responseTimeMs: apiResponseTime - reqStart,
      studentId: '24CS038'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/events/trigger-error
 * Demonstrates catching errors gracefully via the EventEmitter error listener
 */
exports.triggerErrorEvent = (req, res) => {
  try {
    const customMessage = req.body.message || 'Simulated SMTP connection timeout during notification dispatch';
    
    // Safely emit 'error' event to demonstrate listener catches without crashing process
    taskEmitter.emit('error', new Error(customMessage));

    res.status(200).json({
      success: true,
      message: 'Simulated error emitted to EventEmitter and caught gracefully by listener without crashing process',
      errorEmitted: customMessage,
      timestamp: new Date().toISOString(),
      studentId: '24CS038'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/events/logs
 */
exports.getEventLogs = (req, res) => {
  res.status(200).json({
    success: true,
    count: taskEmitter.getLogs().length,
    logs: taskEmitter.getLogs()
  });
};

/**
 * GET /api/events/stats
 */
exports.getEventStats = (req, res) => {
  res.status(200).json({
    success: true,
    stats: taskEmitter.getStats()
  });
};

/**
 * DELETE /api/events/logs
 */
exports.clearEventLogs = (req, res) => {
  taskEmitter.clearLogs();
  res.status(200).json({
    success: true,
    message: 'Event logs cleared'
  });
};
