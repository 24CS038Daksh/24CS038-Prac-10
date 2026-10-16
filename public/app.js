/**
 * Practical 10: Asynchronous Background Processing using Node.js Native EventEmitter
 * Student: Daksh Karangiya | Roll: 24CS038
 */

const API_BASE = '';
let authToken = null;
let currentUser = null;

// DOM Elements
const statCreated = document.getElementById('stat-created');
const statDeleted = document.getElementById('stat-deleted');
const statErrors = document.getElementById('stat-errors');
const eventLogsBody = document.getElementById('event-logs-body');
const tasksList = document.getElementById('tasks-list');
const taskForm = document.getElementById('task-form');
const actionFeedback = document.getElementById('action-feedback');
const btnRunBenchmark = document.getElementById('btn-run-benchmark');
const btnTriggerError = document.getElementById('btn-trigger-error');
const btnRefreshLogs = document.getElementById('btn-refresh-logs');
const btnClearLogs = document.getElementById('btn-clear-logs');

// Initial Setup
async function init() {
  await authenticateUser();
  await refreshAll();
  
  // Set up periodic poll for live events
  setInterval(refreshEventStatsAndLogs, 3000);
}

// Authenticate or register Daksh Karangiya (24CS038)
async function authenticateUser() {
  try {
    const creds = {
      username: 'daksh_24cs038',
      email: 'daksh.24cs038@university.edu',
      password: 'SecurePassword123!',
      name: 'Daksh Karangiya'
    };

    // Attempt login
    let res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: creds.username, password: creds.password })
    });

    if (!res.ok) {
      // Register if not existing
      res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds)
      });
    }

    const data = await res.json();
    if (data.token) {
      authToken = data.token;
      currentUser = data.user;
    }
  } catch (err) {
    console.error('Authentication error:', err);
  }
}

async function refreshAll() {
  await Promise.all([
    fetchTasks(),
    refreshEventStatsAndLogs()
  ]);
}

async function fetchTasks() {
  if (!authToken) return;
  try {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    renderTasks(data.tasks || []);
  } catch (err) {
    console.error('Fetch tasks error:', err);
  }
}

function renderTasks(tasks) {
  if (tasks.length === 0) {
    tasksList.innerHTML = `<p style="color:#64748b; font-size:0.85rem;">No tasks found. Create a new task above to see EventEmitter dispatching background notifications.</p>`;
    return;
  }

  tasksList.innerHTML = tasks.map(t => `
    <div class="task-item">
      <div>
        <div class="task-item-header">
          <span class="task-item-title">${escapeHtml(t.title)}</span>
          <span class="pill">${t.priority}</span>
        </div>
        <p class="task-item-desc">${escapeHtml(t.description || 'No description provided')}</p>
      </div>
      <div class="task-item-footer">
        <span>Status: <strong>${t.status}</strong></span>
        <button class="btn btn-sm btn-danger" onclick="deleteTaskItem('${t._id}', '${escapeHtml(t.title)}')">Delete (Emit Event)</button>
      </div>
    </div>
  `).join('');
}

async function deleteTaskItem(id, title) {
  if (!authToken) return;
  try {
    const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();

    showFeedback(
      `🗑️ Deleted task "${title}". 'task-deleted' event was emitted to background audit worker.`,
      'async'
    );

    await fetchTasks();
    setTimeout(refreshEventStatsAndLogs, 400);
  } catch (err) {
    console.error('Delete error:', err);
  }
}

// Form Submission (Single Task Creation)
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!authToken) return;

  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const priority = document.getElementById('task-priority').value;
  const mode = document.getElementById('execution-mode').value;

  const btnSubmit = document.getElementById('btn-submit');
  btnSubmit.disabled = true;
  btnSubmit.textContent = mode === 'sync' ? 'Executing Synchronously (Blocking)...' : 'Emitting Asynchronously...';

  const tStart = performance.now();

  try {
    const res = await fetch(`${API_BASE}/api/tasks?mode=${mode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ title, description, priority })
    });

    const elapsed = (performance.now() - tStart).toFixed(1);
    const data = await res.json();

    if (mode === 'sync') {
      showFeedback(
        `⏱️ SYNCHRONOUS MODE: API responded in ${elapsed} ms. Notification processing BLOCKED the client thread.`,
        'sync'
      );
    } else {
      showFeedback(
        `⚡ ASYNCHRONOUS MODE: API responded instantly in ${elapsed} ms! 'task-created' event was handed over to background worker.`,
        'async'
      );
    }

    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';

    await fetchTasks();
    // Refresh logs after simulated worker completes
    setTimeout(refreshEventStatsAndLogs, 1600);
  } catch (err) {
    showFeedback(`Error: ${err.message}`, 'sync');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Create Task & Measure Time';
  }
});

// Trigger Error Event
btnTriggerError.addEventListener('click', async () => {
  try {
    const res = await fetch(`${API_BASE}/api/events/trigger-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Simulated Notification Gateway Error (Roll 24CS038 Test)' })
    });
    const data = await res.json();
    showFeedback(`⚠️ Simulated error was emitted to taskEmitter. The 'error' listener caught it safely without crashing the server!`, 'sync');
    setTimeout(refreshEventStatsAndLogs, 300);
  } catch (err) {
    console.error('Trigger error fail:', err);
  }
});

// Refresh Event Logs and Stats
async function refreshEventStatsAndLogs() {
  try {
    const [statsRes, logsRes] = await Promise.all([
      fetch(`${API_BASE}/api/events/stats`),
      fetch(`${API_BASE}/api/events/logs`)
    ]);

    const statsData = await statsRes.json();
    const logsData = await logsRes.json();

    if (statsData.stats) {
      statCreated.textContent = statsData.stats.taskCreatedEvents;
      statDeleted.textContent = statsData.stats.taskDeletedEvents;
      statErrors.textContent = statsData.stats.errorEvents;
    }

    renderLogs(logsData.logs || []);
  } catch (err) {
    console.error('Stats refresh error:', err);
  }
}

function renderLogs(logs) {
  if (logs.length === 0) {
    eventLogsBody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:#64748b;">No events recorded yet. Create or delete a task to trigger background events.</td></tr>`;
    return;
  }

  eventLogsBody.innerHTML = logs.map(l => {
    const badgeClass = l.status === 'COMPLETED' ? 'badge-completed' : 'badge-error';
    const lagText = l.timeDeltaAfterApiResponseMs ? `+${l.timeDeltaAfterApiResponseMs} ms after API` : `${l.handlerDurationMs} ms`;
    return `
      <tr>
        <td><strong><code>${l.eventType}</code></strong></td>
        <td>${escapeHtml(l.taskTitle || 'N/A')}</td>
        <td>${escapeHtml(l.user || 'System')}</td>
        <td><code>${formatTime(l.apiResponseTime)}</code></td>
        <td><code>${formatTime(l.handlerEndTime)}</code></td>
        <td><span class="badge-fast">${lagText}</span></td>
        <td><span class="status-badge ${badgeClass}">${l.status}</span></td>
      </tr>
    `;
  }).join('');
}

// 3-Trial Automated Benchmark Runner
btnRunBenchmark.addEventListener('click', async () => {
  btnRunBenchmark.disabled = true;
  btnRunBenchmark.textContent = 'Running 3-Trial Benchmark...';

  try {
    const syncTimes = [];
    const asyncTimes = [];

    for (let i = 1; i <= 3; i++) {
      // 1. Run Sync Trial
      const tSyncStart = performance.now();
      await fetch(`${API_BASE}/api/tasks?mode=sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: `Benchmark Task Sync Trial ${i}`,
          description: `Measuring blocking synchronous latency (24CS038)`
        })
      });
      const tSync = Number((performance.now() - tSyncStart).toFixed(1));
      syncTimes.push(tSync);
      document.getElementById(`sync-t${i}`).textContent = `${tSync} ms`;

      // 2. Run Async Trial
      const tAsyncStart = performance.now();
      await fetch(`${API_BASE}/api/tasks?mode=async`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: `Benchmark Task Async Trial ${i}`,
          description: `Measuring non-blocking EventEmitter latency (24CS038)`
        })
      });
      const tAsync = Number((performance.now() - tAsyncStart).toFixed(1));
      asyncTimes.push(tAsync);
      document.getElementById(`async-t${i}`).textContent = `${tAsync} ms`;
    }

    const syncAvg = (syncTimes.reduce((a,b)=>a+b,0) / 3).toFixed(1);
    const asyncAvg = (asyncTimes.reduce((a,b)=>a+b,0) / 3).toFixed(1);
    const speedup = (syncAvg / asyncAvg).toFixed(1);

    document.getElementById('sync-avg').textContent = `${syncAvg} ms`;
    document.getElementById('async-avg').textContent = `${asyncAvg} ms`;

    showFeedback(
      `🏆 Benchmark Complete! Synchronous Avg: ${syncAvg} ms | Asynchronous Avg: ${asyncAvg} ms (~${speedup}x Faster with EventEmitter).`,
      'async'
    );

    await fetchTasks();
    setTimeout(refreshEventStatsAndLogs, 1600);
  } catch (err) {
    showFeedback(`Benchmark error: ${err.message}`, 'sync');
  } finally {
    btnRunBenchmark.disabled = false;
    btnRunBenchmark.textContent = 'Run 3-Trial Comparison';
  }
});

// Clear Logs
btnClearLogs.addEventListener('click', async () => {
  await fetch(`${API_BASE}/api/events/logs`, { method: 'DELETE' });
  await refreshEventStatsAndLogs();
});

btnRefreshLogs.addEventListener('click', refreshEventStatsAndLogs);

// Helpers
function showFeedback(msg, type) {
  actionFeedback.textContent = msg;
  actionFeedback.className = `action-feedback ${type}`;
}

function formatTime(isoStr) {
  if (!isoStr) return 'N/A';
  try {
    const d = new Date(isoStr);
    return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
  } catch (e) {
    return isoStr;
  }
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.deleteTaskItem = deleteTaskItem;
window.addEventListener('DOMContentLoaded', init);
