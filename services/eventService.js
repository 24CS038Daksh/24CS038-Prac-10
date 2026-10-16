/**
 * Practical 10: Asynchronous Background Processing using Node.js native EventEmitter
 * Student: Daksh Karangiya | Roll: 24CS038
 * Core Module: 'events' (Zero external message broker dependencies)
 */

const EventEmitter = require('events');

class TaskEventEmitter extends EventEmitter {
  constructor() {
    super();
    // In-memory circular buffer for event logs (max 50)
    this.eventLogs = [];
    this.stats = {
      taskCreatedEvents: 0,
      taskDeletedEvents: 0,
      errorEvents: 0,
      syncRequests: 0,
      asyncRequests: 0,
      totalExecutionTimeMs: 0
    };

    // Register event listeners upon initialization
    this.setupListeners();
  }

  setupListeners() {
    // ------------------------------------------------------------------------
    // Listener 1: 'task-created' (Asynchronous Background Notification Worker)
    // ------------------------------------------------------------------------
    this.on('task-created', (payload) => {
      this.stats.taskCreatedEvents++;
      const { task, user, apiResponseTime, requestReceivedTime } = payload;

      // Using setImmediate ensures non-blocking execution in the next event loop iteration
      setImmediate(async () => {
        const handlerStartTime = Date.now();
        const handlerStartIso = new Date(handlerStartTime).toISOString();

        console.log(`\n======================================================`);
        console.log(`[BACKGROUND EVENT WORKER: task-created] STARTING`);
        console.log(`• Task Title      : "${task.title}" (ID: ${task._id})`);
        console.log(`• Assigned User   : ${user.username || user.email}`);
        console.log(`• API Responded At: ${new Date(apiResponseTime).toISOString()}`);
        console.log(`• Handler Started : ${handlerStartIso}`);
        console.log(`• Non-blocking lag: ${(handlerStartTime - apiResponseTime)} ms`);
        console.log(`------------------------------------------------------`);

        try {
          // Simulate slow background task (e.g. Email dispatch / webhook / push notification)
          const simulatedDelay = parseInt(process.env.SIMULATED_NOTIFICATION_DELAY_MS, 10) || 1500;
          await new Promise((resolve) => setTimeout(resolve, simulatedDelay));

          const handlerEndTime = Date.now();
          const handlerEndIso = new Date(handlerEndTime).toISOString();
          const duration = handlerEndTime - handlerStartTime;
          this.stats.totalExecutionTimeMs += duration;

          const logEntry = {
            id: 'evt_' + Math.random().toString(36).substring(2, 9),
            eventType: 'task-created',
            status: 'COMPLETED',
            taskTitle: task.title,
            taskId: task._id,
            user: user.username || user.email,
            requestReceivedTime: new Date(requestReceivedTime).toISOString(),
            apiResponseTime: new Date(apiResponseTime).toISOString(),
            handlerStartTime: handlerStartIso,
            handlerEndTime: handlerEndIso,
            handlerDurationMs: duration,
            timeDeltaAfterApiResponseMs: handlerEndTime - apiResponseTime,
            message: `Background notification dispatched to ${user.username || user.email} for task "${task.title}".`
          };

          this.addLog(logEntry);

          console.log(`[BACKGROUND EVENT WORKER: task-created] COMPLETED`);
          console.log(`• Notification sent after ${duration} ms background processing.`);
          console.log(`• Client received HTTP 201 response ${(handlerEndTime - apiResponseTime)} ms ago.`);
          console.log(`======================================================\n`);
        } catch (err) {
          this.emit('error', new Error(`Failed to process task-created notification: ${err.message}`));
        }
      });
    });

    // ------------------------------------------------------------------------
    // Listener 2: 'task-deleted' (Supplementary: Audit Log Worker)
    // ------------------------------------------------------------------------
    this.on('task-deleted', (payload) => {
      this.stats.taskDeletedEvents++;
      const { taskId, taskTitle, user, apiResponseTime } = payload;

      setImmediate(async () => {
        const handlerStartTime = Date.now();
        console.log(`[BACKGROUND EVENT WORKER: task-deleted] Task "${taskTitle}" (${taskId}) deleted by ${user.username}.`);

        // Simulate lightweight audit trail persistence
        await new Promise((resolve) => setTimeout(resolve, 300));
        const handlerEndTime = Date.now();

        const logEntry = {
          id: 'evt_' + Math.random().toString(36).substring(2, 9),
          eventType: 'task-deleted',
          status: 'COMPLETED',
          taskTitle,
          taskId,
          user: user.username || user.email,
          apiResponseTime: new Date(apiResponseTime).toISOString(),
          handlerStartTime: new Date(handlerStartTime).toISOString(),
          handlerEndTime: new Date(handlerEndTime).toISOString(),
          handlerDurationMs: handlerEndTime - handlerStartTime,
          timeDeltaAfterApiResponseMs: handlerEndTime - apiResponseTime,
          message: `Audit recorded: Task "${taskTitle}" was deleted by ${user.username}.`
        };

        this.addLog(logEntry);
      });
    });

    // ------------------------------------------------------------------------
    // Listener 3: 'error' (Supplementary: Graceful Error Handling Listener)
    // ------------------------------------------------------------------------
    this.on('error', (err) => {
      this.stats.errorEvents++;
      const errorTime = new Date().toISOString();
      console.error(`\n[EVENT EMITTER: ERROR CAUGHT] Safely handled error: "${err.message}" at ${errorTime}\n`);

      const logEntry = {
        id: 'err_' + Math.random().toString(36).substring(2, 9),
        eventType: 'error',
        status: 'CAUGHT_ERROR',
        taskTitle: 'N/A',
        taskId: 'N/A',
        user: 'System',
        apiResponseTime: errorTime,
        handlerStartTime: errorTime,
        handlerEndTime: errorTime,
        handlerDurationMs: 0,
        timeDeltaAfterApiResponseMs: 0,
        message: `Error trapped safely: ${err.message}`
      };

      this.addLog(logEntry);
    });
  }

  addLog(entry) {
    this.eventLogs.unshift(entry);
    if (this.eventLogs.length > 50) {
      this.eventLogs.pop();
    }
  }

  getLogs() {
    return this.eventLogs;
  }

  getStats() {
    const totalJobs = this.stats.taskCreatedEvents + this.stats.taskDeletedEvents;
    const avgDuration = totalJobs > 0 ? (this.stats.totalExecutionTimeMs / (this.stats.taskCreatedEvents || 1)).toFixed(1) : 0;
    return {
      ...this.stats,
      averageBackgroundDurationMs: Number(avgDuration),
      activeLogsCount: this.eventLogs.length,
      nodeVersion: process.version,
      studentId: process.env.STUDENT_ID || '24CS038',
      studentName: process.env.STUDENT_NAME || 'Daksh Karangiya'
    };
  }

  clearLogs() {
    this.eventLogs = [];
  }
}

// Singleton instance
const taskEmitter = new TaskEventEmitter();
module.exports = taskEmitter;
