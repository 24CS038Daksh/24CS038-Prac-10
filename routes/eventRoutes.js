const express = require('express');
const router = express.Router();
const {
  getEventLogs,
  getEventStats,
  clearEventLogs,
  triggerErrorEvent
} = require('../controllers/taskController');

// Debug and Event Monitoring Routes
router.get('/logs', getEventLogs);
router.get('/stats', getEventStats);
router.delete('/logs', clearEventLogs);
router.post('/trigger-error', triggerErrorEvent);

module.exports = router;
